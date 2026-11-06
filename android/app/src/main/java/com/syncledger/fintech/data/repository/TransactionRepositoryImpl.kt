package com.syncledger.fintech.data.repository

import androidx.work.WorkManager
import com.syncledger.fintech.data.local.dao.CategoryAggregationTuple
import com.syncledger.fintech.data.local.dao.TransactionDao
import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import com.syncledger.fintech.data.sync.SyncWorker
import kotlinx.coroutines.flow.Flow
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TransactionRepositoryImpl @Inject constructor(
    private val dao: TransactionDao,
    private val workManager: WorkManager
) {

    fun observeGroupTransactions(groupId: String): Flow<List<TransactionEntity>> =
        dao.observeGroupTransactions(groupId)

    fun observeCategoryBreakdown(groupId: String): Flow<List<CategoryAggregationTuple>> =
        dao.observeCategoryBreakdown(groupId)

    /**
     * Offline-First Write Path:
     * 1. Generates UUID v4 on the client.
     * 2. Saves directly to Room SQLite with PENDING_CREATE (Zero Latency).
     * 3. Schedules WorkManager to sync in the background when NetworkType.CONNECTED.
     */
    suspend fun createOfflineExpense(
        groupId: String,
        title: String,
        amount: Double,
        category: String,
        paidByUserId: String,
        splitBetweenUserIds: List<String>
    ) {
        val entity = TransactionEntity(
            id = UUID.randomUUID().toString(),
            groupId = groupId,
            title = title.trim(),
            amount = amount,
            category = category,
            paidByUserId = paidByUserId,
            splitBetweenCsv = splitBetweenUserIds.joinToString(","),
            syncStatus = SyncStatus.PENDING_CREATE,
            updatedAt = System.currentTimeMillis(),
            version = 1
        )
        dao.upsert(entity)
        SyncWorker.enqueueWhenNetworkConnected(workManager)
    }

    suspend fun updateLocalExpense(
        existing: TransactionEntity,
        newTitle: String,
        newAmount: Double,
        newCategory: String
    ) {
        val nextStatus = if (existing.syncStatus == SyncStatus.PENDING_CREATE) {
            SyncStatus.PENDING_CREATE
        } else {
            SyncStatus.PENDING_UPDATE
        }

        dao.upsert(
            existing.copy(
                title = newTitle.trim(),
                amount = newAmount,
                category = newCategory,
                syncStatus = nextStatus,
                updatedAt = System.currentTimeMillis()
            )
        )
        SyncWorker.enqueueWhenNetworkConnected(workManager)
    }

    suspend fun softDeleteExpense(entity: TransactionEntity) {
        if (entity.syncStatus == SyncStatus.PENDING_CREATE) {
            // Never synced to server; safe to delete immediately from local SQLite
            dao.hardDeleteById(entity.id)
        } else {
            dao.markSoftDeleted(entity.id, System.currentTimeMillis())
            SyncWorker.enqueueWhenNetworkConnected(workManager)
        }
    }

    suspend fun saveResolvedConflict(resolvedEntity: TransactionEntity) {
        dao.upsert(resolvedEntity)
        SyncWorker.enqueueWhenNetworkConnected(workManager)
    }
}
