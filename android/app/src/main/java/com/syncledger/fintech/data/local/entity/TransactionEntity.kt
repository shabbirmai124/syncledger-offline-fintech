package com.syncledger.fintech.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

enum class SyncStatus {
    SYNCED,
    PENDING_CREATE,
    PENDING_UPDATE,
    PENDING_DELETE,
    CONFLICT
}

@Entity(
    tableName = "transactions",
    indices = [
        Index(value = ["group_id", "updated_at"], name = "idx_transactions_group_updated"),
        Index(value = ["sync_status"], name = "idx_transactions_sync_status")
    ]
)
data class TransactionEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(), // Client-side UUID v4 prevents offline primary key collisions

    @ColumnInfo(name = "group_id")
    val groupId: String,

    val title: String,
    val amount: Double,
    val category: String,

    @ColumnInfo(name = "paid_by_user_id")
    val paidByUserId: String,

    @ColumnInfo(name = "split_between_csv")
    val splitBetweenCsv: String,

    // Sync & Optimistic Concurrency Control Metadata
    @ColumnInfo(name = "sync_status")
    val syncStatus: SyncStatus = SyncStatus.PENDING_CREATE,

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis(),

    @ColumnInfo(name = "version")
    val version: Int = 1, // Monotonically increasing version for Optimistic Locking

    // Populated when HTTP 409 Conflict occurs during SyncWorker execution
    @ColumnInfo(name = "server_conflict_amount")
    val serverConflictAmount: Double? = null,

    @ColumnInfo(name = "server_conflict_title")
    val serverConflictTitle: String? = null,

    @ColumnInfo(name = "server_conflict_version")
    val serverConflictVersion: Int? = null,

    @ColumnInfo(name = "server_conflict_updated_at")
    val serverConflictUpdatedAt: Long? = null,

    @ColumnInfo(name = "server_conflict_editor")
    val serverConflictEditor: String? = null
)
