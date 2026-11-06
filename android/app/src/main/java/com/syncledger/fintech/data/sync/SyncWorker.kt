package com.syncledger.fintech.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.syncledger.fintech.data.local.dao.TransactionDao
import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import com.syncledger.fintech.data.remote.SyncLedgerApi
import com.syncledger.fintech.data.remote.TransactionNetworkDto
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import org.json.JSONObject
import retrofit2.HttpException
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val transactionDao: TransactionDao,
    private val api: SyncLedgerApi
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val pendingItems = transactionDao.getPendingSyncQueue()
        if (pendingItems.isEmpty()) return Result.success()

        for (entity in pendingItems) {
            try {
                when (entity.syncStatus) {
                    SyncStatus.PENDING_CREATE -> {
                        val response = api.createTransaction(entity.toNetworkDto())
                        transactionDao.upsert(
                            entity.copy(
                                syncStatus = SyncStatus.SYNCED,
                                version = response.version,
                                updatedAt = response.updatedAt
                            )
                        )
                    }

                    SyncStatus.PENDING_UPDATE -> {
                        val response = api.updateTransaction(entity.id, entity.toNetworkDto())
                        transactionDao.upsert(
                            entity.copy(
                                syncStatus = SyncStatus.SYNCED,
                                version = response.version,
                                updatedAt = response.updatedAt,
                                serverConflictAmount = null,
                                serverConflictTitle = null,
                                serverConflictVersion = null
                            )
                        )
                    }

                    SyncStatus.PENDING_DELETE -> {
                        api.deleteTransaction(entity.id, entity.version)
                        // Tombstone confirmed by server; purge row from local SQLite
                        transactionDao.hardDeleteById(entity.id)
                    }

                    else -> Unit
                }
            } catch (e: HttpException) {
                if (e.code() == 409) {
                    // HTTP 409 Conflict: Another group member updated this record first!
                    val errorBody = e.response()?.errorBody()?.string()
                    val serverSnapshot = parseConflictSnapshot(errorBody, entity)
                    transactionDao.upsert(serverSnapshot)
                } else if (e.code() in 500..599) {
                    return Result.retry() // Exponential backoff on transient server errors
                }
            } catch (e: Exception) {
                return Result.retry()
            }
        }
        return Result.success()
    }

    private fun TransactionEntity.toNetworkDto() = TransactionNetworkDto(
        id = id,
        groupId = groupId,
        title = title,
        amount = amount,
        category = category,
        paidByUserId = paidByUserId,
        splitBetweenCsv = splitBetweenCsv,
        updatedAt = updatedAt,
        version = version
    )

    private fun parseConflictSnapshot(
        rawJson: String?,
        localEntity: TransactionEntity
    ): TransactionEntity {
        return try {
            val obj = JSONObject(rawJson ?: "{}")
            localEntity.copy(
                syncStatus = SyncStatus.CONFLICT,
                serverConflictTitle = obj.optString("title", localEntity.title),
                serverConflictAmount = obj.optDouble("amount", localEntity.amount),
                serverConflictVersion = obj.optInt("version", localEntity.version + 1),
                serverConflictUpdatedAt = obj.optLong("updatedAt", System.currentTimeMillis()),
                serverConflictEditor = obj.optString("editedByName", "Remote Group Member")
            )
        } catch (_: Exception) {
            localEntity.copy(
                syncStatus = SyncStatus.CONFLICT,
                serverConflictVersion = localEntity.version + 1
            )
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "SyncLedgerOfflineOutboxWorker"

        fun enqueueWhenNetworkConnected(workManager: WorkManager) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<SyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                .build()

            workManager.enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.APPEND_OR_REPLACE,
                workRequest
            )
        }
    }
}
