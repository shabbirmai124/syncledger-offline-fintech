package com.syncledger.fintech.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import kotlinx.coroutines.flow.Flow

data class CategoryAggregationTuple(
    val category: String,
    val totalAmount: Double,
    val txCount: Int
)

@Dao
interface TransactionDao {

    /**
     * Single Source of Truth (SSOT):
     * Jetpack Compose UI observes only Room Database via Flow.
     * Excludes soft-deleted tombstones (PENDING_DELETE) immediately for zero-latency UX.
     */
    @Query("""
        SELECT * FROM transactions
        WHERE group_id = :groupId
          AND sync_status != 'PENDING_DELETE'
        ORDER BY updated_at DESC
    """)
    fun observeGroupTransactions(groupId: String): Flow<List<TransactionEntity>>

    @Query("""
        SELECT * FROM transactions
        WHERE sync_status IN ('PENDING_CREATE', 'PENDING_UPDATE', 'PENDING_DELETE')
        ORDER BY updated_at ASC
    """)
    suspend fun getPendingSyncQueue(): List<TransactionEntity>

    @Query("SELECT * FROM transactions WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): TransactionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(transaction: TransactionEntity)

    @Query("DELETE FROM transactions WHERE id = :id")
    suspend fun hardDeleteById(id: String)

    /**
     * Soft Delete (Tombstone):
     * Marks row as PENDING_DELETE while offline so SyncWorker can propagate deletion to the server.
     */
    @Query("""
        UPDATE transactions
        SET sync_status = 'PENDING_DELETE',
            updated_at = :timestamp
        WHERE id = :id
    """)
    suspend fun markSoftDeleted(id: String, timestamp: Long = System.currentTimeMillis())

    /**
     * Atomic WebSocket Upsert:
     * Prevents overwriting local unsynced offline edits when a WebSocket frame arrives.
     */
    @Transaction
    suspend fun upsertFromWebSocketIfClean(incoming: TransactionEntity) {
        val existing = getById(incoming.id)
        if (existing == null || existing.syncStatus == SyncStatus.SYNCED) {
            upsert(incoming.copy(syncStatus = SyncStatus.SYNCED))
        }
    }

    /**
     * On-Device SQL Categorical Breakdown Query:
     * Uses composite index idx_transactions_group_updated for fast aggregation.
     */
    @Query("""
        SELECT category,
               SUM(amount) AS totalAmount,
               COUNT(*) AS txCount
        FROM transactions
        WHERE group_id = :groupId
          AND sync_status != 'PENDING_DELETE'
          AND category != 'Settlement'
        GROUP BY category
        ORDER BY totalAmount DESC
    """)
    fun observeCategoryBreakdown(groupId: String): Flow<List<CategoryAggregationTuple>>
}
