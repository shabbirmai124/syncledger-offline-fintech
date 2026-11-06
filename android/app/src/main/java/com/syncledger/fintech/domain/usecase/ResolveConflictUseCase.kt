package com.syncledger.fintech.domain.usecase

import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import javax.inject.Inject

enum class ResolutionStrategy {
    LOCAL_WINS,
    SERVER_WINS,
    LAST_WRITE_WINS,
    CUSTOM_MERGE
}

class ResolveConflictUseCase @Inject constructor() {

    operator fun invoke(
        conflicted: TransactionEntity,
        strategy: ResolutionStrategy,
        customTitle: String? = null,
        customAmount: Double? = null,
        nowMillis: Long = System.currentTimeMillis()
    ): TransactionEntity {
        val serverVersion = conflicted.serverConflictVersion ?: (conflicted.version + 1)
        val serverAmount = conflicted.serverConflictAmount ?: conflicted.amount
        val serverTitle = conflicted.serverConflictTitle ?: conflicted.title
        val serverUpdatedAt = conflicted.serverConflictUpdatedAt ?: nowMillis

        val resolvedBase = when (strategy) {
            ResolutionStrategy.SERVER_WINS -> conflicted.copy(
                title = serverTitle,
                amount = serverAmount,
                version = serverVersion,
                updatedAt = serverUpdatedAt,
                syncStatus = SyncStatus.SYNCED
            )

            ResolutionStrategy.LOCAL_WINS -> conflicted.copy(
                version = serverVersion, // Ready to send v2 to server so server increments to v3
                updatedAt = nowMillis,
                syncStatus = SyncStatus.PENDING_UPDATE
            )

            ResolutionStrategy.LAST_WRITE_WINS -> {
                val localIsNewer = conflicted.updatedAt >= serverUpdatedAt
                if (localIsNewer) {
                    conflicted.copy(
                        version = serverVersion,
                        updatedAt = nowMillis,
                        syncStatus = SyncStatus.PENDING_UPDATE
                    )
                } else {
                    conflicted.copy(
                        title = serverTitle,
                        amount = serverAmount,
                        version = serverVersion,
                        updatedAt = serverUpdatedAt,
                        syncStatus = SyncStatus.SYNCED
                    )
                }
            }

            ResolutionStrategy.CUSTOM_MERGE -> conflicted.copy(
                title = customTitle?.trim()?.takeIf { it.isNotEmpty() } ?: conflicted.title,
                amount = customAmount ?: conflicted.amount,
                version = serverVersion,
                updatedAt = nowMillis,
                syncStatus = SyncStatus.PENDING_UPDATE
            )
        }

        return resolvedBase.copy(
            serverConflictAmount = null,
            serverConflictTitle = null,
            serverConflictVersion = null,
            serverConflictUpdatedAt = null,
            serverConflictEditor = null
        )
    }
}
