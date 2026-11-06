package com.syncledger.fintech.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.syncledger.fintech.data.local.dao.CategoryAggregationTuple
import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import com.syncledger.fintech.data.repository.TransactionRepositoryImpl
import com.syncledger.fintech.domain.usecase.MonthlySpendPoint
import com.syncledger.fintech.domain.usecase.ResolutionStrategy
import com.syncledger.fintech.domain.usecase.ResolveConflictUseCase
import com.syncledger.fintech.domain.usecase.SettlementInstruction
import com.syncledger.fintech.domain.usecase.SimplifyGroupDebtsUseCase
import com.syncledger.fintech.domain.usecase.SpendingForecastReport
import com.syncledger.fintech.domain.usecase.SpendingForecastUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SyncLedgerUiState(
    val groupId: String = "grp-alpine-expedition",
    val groupMembers: List<String> = listOf("usr-alex", "usr-samira", "usr-liam", "usr-elena"),
    val transactions: List<TransactionEntity> = emptyList(),
    val categoryBreakdown: List<CategoryAggregationTuple> = emptyList(),
    val simplifiedSettlements: List<SettlementInstruction> = emptyList(),
    val forecastReport: SpendingForecastReport? = null,
    val pendingSyncCount: Int = 0,
    val conflictCount: Int = 0
)

@HiltViewModel
class SyncLedgerViewModel @Inject constructor(
    private val repository: TransactionRepositoryImpl,
    private val simplifyGroupDebtsUseCase: SimplifyGroupDebtsUseCase,
    private val resolveConflictUseCase: ResolveConflictUseCase,
    private val spendingForecastUseCase: SpendingForecastUseCase
) : ViewModel() {

    private val activeGroupId = MutableStateFlow("grp-alpine-expedition")
    private val members = listOf("usr-alex", "usr-samira", "usr-liam", "usr-elena")

    private val historicalMonths = listOf(
        MonthlySpendPoint(1, 11200.0),
        MonthlySpendPoint(2, 11950.0),
        MonthlySpendPoint(3, 12800.0),
        MonthlySpendPoint(4, 13450.0),
        MonthlySpendPoint(5, 14200.0),
        MonthlySpendPoint(6, 14900.0)
    )

    /**
     * Single Source of Truth (SSOT) StateFlow:
     * Combines Room SQLite Flows with on-device Graph Debt Simplification and Linear Regression.
     */
    val uiState: StateFlow<SyncLedgerUiState> = combine(
        repository.observeGroupTransactions(activeGroupId.value),
        repository.observeCategoryBreakdown(activeGroupId.value)
    ) { transactions, categories ->
        val activeSpend = transactions
            .filter { it.category != "Settlement" }
            .sumOf { it.amount }

        val settlements = simplifyGroupDebtsUseCase.simplifyFromTransactions(
            transactions = transactions,
            memberIds = members
        )

        val forecast = spendingForecastUseCase(
            history = historicalMonths,
            currentMonthSpend = activeSpend,
            dayOfMonth = 15,
            daysInMonth = 30,
            monthlyBudget = 14000.0
        )

        SyncLedgerUiState(
            groupId = activeGroupId.value,
            groupMembers = members,
            transactions = transactions,
            categoryBreakdown = categories,
            simplifiedSettlements = settlements,
            forecastReport = forecast,
            pendingSyncCount = transactions.count {
                it.syncStatus == SyncStatus.PENDING_CREATE ||
                    it.syncStatus == SyncStatus.PENDING_UPDATE
            },
            conflictCount = transactions.count { it.syncStatus == SyncStatus.CONFLICT }
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = SyncLedgerUiState()
    )

    fun addOfflineExpense(
        title: String,
        amount: Double,
        category: String,
        paidByUserId: String,
        splitBetweenUserIds: List<String>
    ) {
        viewModelScope.launch {
            repository.createOfflineExpense(
                groupId = activeGroupId.value,
                title = title,
                amount = amount,
                category = category,
                paidByUserId = paidByUserId,
                splitBetweenUserIds = splitBetweenUserIds
            )
        }
    }

    fun deleteExpense(entity: TransactionEntity) {
        viewModelScope.launch {
            repository.softDeleteExpense(entity)
        }
    }

    fun resolveConflict(
        conflicted: TransactionEntity,
        strategy: ResolutionStrategy,
        customTitle: String? = null,
        customAmount: Double? = null
    ) {
        viewModelScope.launch {
            val resolved = resolveConflictUseCase(
                conflicted = conflicted,
                strategy = strategy,
                customTitle = customTitle,
                customAmount = customAmount
            )
            repository.saveResolvedConflict(resolved)
        }
    }
}
