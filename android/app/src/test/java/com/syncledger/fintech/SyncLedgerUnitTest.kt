package com.syncledger.fintech

import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import com.syncledger.fintech.domain.usecase.MonthlySpendPoint
import com.syncledger.fintech.domain.usecase.ResolutionStrategy
import com.syncledger.fintech.domain.usecase.ResolveConflictUseCase
import com.syncledger.fintech.domain.usecase.SimplifyGroupDebtsUseCase
import com.syncledger.fintech.domain.usecase.SpendingForecastUseCase
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncLedgerUnitTest {

    private val simplifyGroupDebts = SimplifyGroupDebtsUseCase()
    private val resolveConflict = ResolveConflictUseCase()
    private val spendingForecast = SpendingForecastUseCase()

    @Test
    fun `transitive debt chain C to B to A collapses into single transfer C to A`() {
        // User A is owed +100, User B has 0 net (owed 100 by C, owes 100 to A), User C owes -100
        val netBalances = mapOf(
            "UserA" to 100.0,
            "UserB" to 0.0,
            "UserC" to -100.0
        )

        val instructions = simplifyGroupDebts(netBalances)

        assertEquals(1, instructions.size)
        assertEquals("UserC", instructions[0].fromUserId)
        assertEquals("UserA", instructions[0].toUserId)
        assertEquals(100.0, instructions[0].amount, 0.001)
    }

    @Test
    fun `optimistic locking conflict resolution applies Last-Write-Wins accurately`() {
        val conflictedEntity = TransactionEntity(
            id = "uuid-conflict-409",
            groupId = "grp-1",
            title = "Hotel Basecamp",
            amount = 550.0, // Local edit by User B
            category = "Housing & Utilities",
            paidByUserId = "UserB",
            splitBetweenCsv = "UserA,UserB",
            syncStatus = SyncStatus.CONFLICT,
            updatedAt = 20_000L, // Newer timestamp
            version = 1,
            serverConflictTitle = "Hotel Basecamp",
            serverConflictAmount = 600.0, // Server edit by User A
            serverConflictVersion = 2,
            serverConflictUpdatedAt = 15_000L // Older timestamp
        )

        val resolved = resolveConflict(
            conflicted = conflictedEntity,
            strategy = ResolutionStrategy.LAST_WRITE_WINS,
            nowMillis = 25_000L
        )

        assertEquals(550.0, resolved.amount, 0.001)
        assertEquals(2, resolved.version)
        assertEquals(SyncStatus.PENDING_UPDATE, resolved.syncStatus)
        assertNull(resolved.serverConflictAmount)
    }

    @Test
    fun `OLS linear regression and WMA forecast detects monthly budget overrun`() {
        val history = listOf(
            MonthlySpendPoint(1, 12000.0),
            MonthlySpendPoint(2, 13000.0),
            MonthlySpendPoint(3, 14000.0),
            MonthlySpendPoint(4, 15000.0)
        )

        val report = spendingForecast(
            history = history,
            currentMonthSpend = 8000.0,
            dayOfMonth = 15,
            daysInMonth = 30,
            monthlyBudget = 14000.0
        )

        assertEquals(16000.0, report.linearRegressionPrediction, 0.01)
        assertTrue(report.isOverBudget)
        assertTrue(report.blendedMonthEndForecast > 14000.0)
    }
}
