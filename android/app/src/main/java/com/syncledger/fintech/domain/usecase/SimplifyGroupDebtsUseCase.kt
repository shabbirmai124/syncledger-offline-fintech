package com.syncledger.fintech.domain.usecase

import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import java.util.PriorityQueue
import javax.inject.Inject
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToLong

data class SettlementInstruction(
    val fromUserId: String,
    val toUserId: String,
    val amount: Double
)

class SimplifyGroupDebtsUseCase @Inject constructor() {

    /**
     * Computes net balances across all active group transactions and runs a
     * Greedy Max-Creditor / Max-Debtor graph reduction in O(N log N) time.
     * Example: If C owes B $100 and B owes A $100, simplifies to C pays A $100 directly.
     */
    fun simplifyFromTransactions(
        transactions: List<TransactionEntity>,
        memberIds: List<String>
    ): List<SettlementInstruction> {
        val netBalances = mutableMapOf<String, Double>()
        memberIds.forEach { netBalances[it] = 0.0 }

        for (tx in transactions) {
            if (tx.syncStatus == SyncStatus.PENDING_DELETE || tx.amount <= 0.0) continue
            val participants = tx.splitBetweenCsv
                .split(",")
                .map { it.trim() }
                .filter { it.isNotEmpty() && memberIds.contains(it) }

            if (participants.isEmpty() || !memberIds.contains(tx.paidByUserId)) continue

            val share = tx.amount / participants.size
            netBalances[tx.paidByUserId] = (netBalances[tx.paidByUserId] ?: 0.0) + tx.amount
            for (participant in participants) {
                netBalances[participant] = (netBalances[participant] ?: 0.0) - share
            }
        }

        return invoke(netBalances)
    }

    operator fun invoke(netBalances: Map<String, Double>): List<SettlementInstruction> {
        data class BalanceNode(val userId: String, val amount: Double)

        val creditors = PriorityQueue<BalanceNode>(compareByDescending { it.amount })
        val debtors = PriorityQueue<BalanceNode>(compareByDescending { it.amount })

        netBalances.forEach { (userId, net) ->
            val rounded = (net * 100.0).roundToLong() / 100.0
            if (rounded > 0.01) creditors.add(BalanceNode(userId, rounded))
            else if (rounded < -0.01) debtors.add(BalanceNode(userId, abs(rounded)))
        }

        val instructions = mutableListOf<SettlementInstruction>()

        while (creditors.isNotEmpty() && debtors.isNotEmpty()) {
            val creditor = creditors.poll()!!
            val debtor = debtors.poll()!!

            val settled = min(creditor.amount, debtor.amount)
            val roundedSettled = (settled * 100.0).roundToLong() / 100.0

            if (roundedSettled >= 0.01) {
                instructions.add(
                    SettlementInstruction(
                        fromUserId = debtor.userId,
                        toUserId = creditor.userId,
                        amount = roundedSettled
                    )
                )
            }

            val remCreditor = ((creditor.amount - roundedSettled) * 100.0).roundToLong() / 100.0
            val remDebtor = ((debtor.amount - roundedSettled) * 100.0).roundToLong() / 100.0

            if (remCreditor > 0.01) creditors.add(BalanceNode(creditor.userId, remCreditor))
            if (remDebtor > 0.01) debtors.add(BalanceNode(debtor.userId, remDebtor))
        }

        return instructions
    }
}
