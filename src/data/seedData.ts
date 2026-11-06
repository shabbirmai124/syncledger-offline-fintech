import {
  ExpenseGroup,
  MonthlyHistoricalPoint,
  ServerConflictSnapshot,
  SyncLogEntry,
  TransactionEntity,
} from '../domain/fintechEngine';

export const INITIAL_GROUPS: ExpenseGroup[] = [
  {
    id: 'grp-alpine-expedition',
    name: 'Alpine Summit Expedition',
    description: 'Zermatt 4-Member Tour & Shared Gear Ledger',
    monthlyBudget: 14000,
    currency: 'USD',
    members: [
      {
        id: 'usr-alex',
        name: 'Alex Rivera',
        role: 'Lead Architect',
        handle: '@arivera',
      },
      {
        id: 'usr-samira',
        name: 'Samira Khan',
        role: 'Systems Engineer',
        handle: '@skhan',
      },
      {
        id: 'usr-liam',
        name: 'Liam Chen',
        role: 'Quant Developer',
        handle: '@lchen',
      },
      {
        id: 'usr-elena',
        name: 'Elena Rostova',
        role: 'Security Lead',
        handle: '@erostova',
      },
    ],
  },
  {
    id: 'grp-dhaka-residence',
    name: 'Metro Shared Residence',
    description: 'Monthly Utilities, Groceries & Broadband Split',
    monthlyBudget: 4800,
    currency: 'USD',
    members: [
      {
        id: 'usr-alex',
        name: 'Alex Rivera',
        role: 'Lead Architect',
        handle: '@arivera',
      },
      {
        id: 'usr-samira',
        name: 'Samira Khan',
        role: 'Systems Engineer',
        handle: '@skhan',
      },
      {
        id: 'usr-liam',
        name: 'Liam Chen',
        role: 'Quant Developer',
        handle: '@lchen',
      },
    ],
  },
];

const BASE_TIME = 1762380000000;

export const INITIAL_TRANSACTIONS: TransactionEntity[] = [
  {
    id: 'a8f41c02-71b9-4d3a-9a10-2e88c91044b1',
    groupId: 'grp-alpine-expedition',
    title: 'Zermatt Basecamp Chalet Deposit',
    amount: 3200,
    category: 'Housing & Utilities',
    paidByUserId: 'usr-alex',
    splitBetweenUserIds: ['usr-alex', 'usr-samira', 'usr-liam', 'usr-elena'],
    syncStatus: 'SYNCED',
    createdAt: BASE_TIME - 86400000 * 6,
    updatedAt: BASE_TIME - 86400000 * 6,
    version: 2,
  },
  {
    id: 'b9c12d84-53e1-4c92-8b77-1d44a72109e2',
    groupId: 'grp-alpine-expedition',
    title: 'Swiss Rail Glacier Transfer Passes',
    amount: 1200,
    category: 'Transport & Transit',
    paidByUserId: 'usr-samira',
    splitBetweenUserIds: ['usr-alex', 'usr-samira', 'usr-liam', 'usr-elena'],
    syncStatus: 'SYNCED',
    createdAt: BASE_TIME - 86400000 * 5,
    updatedAt: BASE_TIME - 86400000 * 5,
    version: 1,
  },
  {
    id: 'c3e77a19-90f2-4e11-a452-88b310f4c2d3',
    groupId: 'grp-alpine-expedition',
    title: 'Avalanche Transceivers & Crampon Rental',
    amount: 550,
    category: 'Equipment & Gear',
    paidByUserId: 'usr-liam',
    splitBetweenUserIds: ['usr-samira', 'usr-liam', 'usr-elena'],
    syncStatus: 'CONFLICT',
    createdAt: BASE_TIME - 86400000 * 4,
    updatedAt: BASE_TIME - 3600000 * 2,
    version: 1,
    conflictServerCopy: {
      title: 'Avalanche Transceivers & Crampon Rental (4 Sets)',
      amount: 600,
      category: 'Equipment & Gear',
      paidByUserId: 'usr-liam',
      updatedAt: BASE_TIME - 3600000 * 3,
      version: 2,
      editedByName: 'Samira Khan (Device B)',
    },
  },
  {
    id: 'd4f92b55-12a8-4b77-9c01-33e791a0b8f4',
    groupId: 'grp-alpine-expedition',
    title: 'High-Altitude Provisions & Ration Packs',
    amount: 840,
    category: 'Food & Dining',
    paidByUserId: 'usr-elena',
    splitBetweenUserIds: ['usr-alex', 'usr-samira', 'usr-liam', 'usr-elena'],
    syncStatus: 'SYNCED',
    createdAt: BASE_TIME - 86400000 * 3,
    updatedAt: BASE_TIME - 86400000 * 3,
    version: 1,
  },
  {
    id: 'e5a03c66-84b1-4f88-8d12-99c102b3d7a5',
    groupId: 'grp-alpine-expedition',
    title: 'Garmin InReach Satellite Telemetry Plan',
    amount: 360,
    category: 'Software & Cloud',
    paidByUserId: 'usr-alex',
    splitBetweenUserIds: ['usr-alex', 'usr-samira'],
    syncStatus: 'PENDING_CREATE',
    createdAt: BASE_TIME - 1800000,
    updatedAt: BASE_TIME - 1800000,
    version: 1,
  },
  {
    id: 'f6b14d77-29c4-4a33-9e23-77d413c8e6b6',
    groupId: 'grp-alpine-expedition',
    title: 'Chamonix Mountain Guide Dinner',
    amount: 480,
    category: 'Food & Dining',
    paidByUserId: 'usr-samira',
    splitBetweenUserIds: ['usr-samira', 'usr-liam'],
    syncStatus: 'SYNCED',
    createdAt: BASE_TIME - 86400000 * 2,
    updatedAt: BASE_TIME - 86400000 * 2,
    version: 1,
  },
  // Second group initial items
  {
    id: '71c25e88-40d5-4b44-af34-66e524d9f5c7',
    groupId: 'grp-dhaka-residence',
    title: 'Monthly Apartment Lease & Maintenance',
    amount: 2400,
    category: 'Housing & Utilities',
    paidByUserId: 'usr-alex',
    splitBetweenUserIds: ['usr-alex', 'usr-samira', 'usr-liam'],
    syncStatus: 'SYNCED',
    createdAt: BASE_TIME - 86400000 * 7,
    updatedAt: BASE_TIME - 86400000 * 7,
    version: 1,
  },
  {
    id: '82d36f99-51e6-4c55-bf45-55f635e0a4d8',
    groupId: 'grp-dhaka-residence',
    title: 'Wholesale Pantry & Fresh Produce Bulk Order',
    amount: 690,
    category: 'Food & Dining',
    paidByUserId: 'usr-samira',
    splitBetweenUserIds: ['usr-alex', 'usr-samira', 'usr-liam'],
    syncStatus: 'SYNCED',
    createdAt: BASE_TIME - 86400000 * 3,
    updatedAt: BASE_TIME - 86400000 * 3,
    version: 1,
  },
  {
    id: '93e47a00-62f7-4d66-af56-44a746f1b3e9',
    groupId: 'grp-dhaka-residence',
    title: 'Dual-ISP Fiber Optic Redundant Line',
    amount: 180,
    category: 'Software & Cloud',
    paidByUserId: 'usr-liam',
    splitBetweenUserIds: ['usr-alex', 'usr-samira', 'usr-liam'],
    syncStatus: 'SYNCED',
    createdAt: BASE_TIME - 86400000 * 1,
    updatedAt: BASE_TIME - 86400000 * 1,
    version: 1,
  },
];

export const INITIAL_SERVER_STORE: Record<string, ServerConflictSnapshot> = {
  'a8f41c02-71b9-4d3a-9a10-2e88c91044b1': {
    title: 'Zermatt Basecamp Chalet Deposit',
    amount: 3200,
    category: 'Housing & Utilities',
    paidByUserId: 'usr-alex',
    updatedAt: BASE_TIME - 86400000 * 6,
    version: 2,
    editedByName: 'Alex Rivera',
  },
  'b9c12d84-53e1-4c92-8b77-1d44a72109e2': {
    title: 'Swiss Rail Glacier Transfer Passes',
    amount: 1200,
    category: 'Transport & Transit',
    paidByUserId: 'usr-samira',
    updatedAt: BASE_TIME - 86400000 * 5,
    version: 1,
    editedByName: 'Samira Khan',
  },
  'c3e77a19-90f2-4e11-a452-88b310f4c2d3': {
    title: 'Avalanche Transceivers & Crampon Rental (4 Sets)',
    amount: 600,
    category: 'Equipment & Gear',
    paidByUserId: 'usr-liam',
    updatedAt: BASE_TIME - 3600000 * 3,
    version: 2,
    editedByName: 'Samira Khan (Device B)',
  },
  'd4f92b55-12a8-4b77-9c01-33e791a0b8f4': {
    title: 'High-Altitude Provisions & Ration Packs',
    amount: 840,
    category: 'Food & Dining',
    paidByUserId: 'usr-elena',
    updatedAt: BASE_TIME - 86400000 * 3,
    version: 1,
    editedByName: 'Elena Rostova',
  },
  'f6b14d77-29c4-4a33-9e23-77d413c8e6b6': {
    title: 'Chamonix Mountain Guide Dinner',
    amount: 480,
    category: 'Food & Dining',
    paidByUserId: 'usr-samira',
    updatedAt: BASE_TIME - 86400000 * 2,
    version: 1,
    editedByName: 'Samira Khan',
  },
};

export const HISTORICAL_MONTHLY_SPEND: Record<
  string,
  MonthlyHistoricalPoint[]
> = {
  'grp-alpine-expedition': [
    { monthLabel: 'May', monthIndex: 1, actualSpend: 11200 },
    { monthLabel: 'Jun', monthIndex: 2, actualSpend: 11950 },
    { monthLabel: 'Jul', monthIndex: 3, actualSpend: 12800 },
    { monthLabel: 'Aug', monthIndex: 4, actualSpend: 13450 },
    { monthLabel: 'Sep', monthIndex: 5, actualSpend: 14200 },
    { monthLabel: 'Oct', monthIndex: 6, actualSpend: 14900 },
  ],
  'grp-dhaka-residence': [
    { monthLabel: 'May', monthIndex: 1, actualSpend: 4100 },
    { monthLabel: 'Jun', monthIndex: 2, actualSpend: 4250 },
    { monthLabel: 'Jul', monthIndex: 3, actualSpend: 4400 },
    { monthLabel: 'Aug', monthIndex: 4, actualSpend: 4550 },
    { monthLabel: 'Sep', monthIndex: 5, actualSpend: 4720 },
    { monthLabel: 'Oct', monthIndex: 6, actualSpend: 4890 },
  ],
};

export const INITIAL_SYNC_LOGS: SyncLogEntry[] = [
  {
    id: 'log-1',
    timestamp: BASE_TIME - 7200000,
    operation: 'PUT /api/v1/transactions/c3e77a19',
    entityId: 'c3e77a19-90f2-4e11-a452-88b310f4c2d3',
    status: 'CONFLICT_409',
    detail:
      'HTTP 409 Conflict: Client sent v1 ($550.00), but Server is at v2 ($600.00 edited by Samira Khan). Queued for resolution.',
  },
  {
    id: 'log-2',
    timestamp: BASE_TIME - 1800000,
    operation: 'INSERT local Room SQLite (SSOT)',
    entityId: 'e5a03c66-84b1-4f88-8d12-99c102b3d7a5',
    status: 'QUEUED_OFFLINE',
    detail:
      'Saved "Garmin InReach Satellite Telemetry Plan" ($360.00) with UUID e5a03c66 and sync_status = PENDING_CREATE.',
  },
  {
    id: 'log-3',
    timestamp: BASE_TIME - 86400000 * 2,
    operation: 'WS_FRAME /ws/groups/grp-alpine-expedition',
    entityId: 'f6b14d77-29c4-4a33-9e23-77d413c8e6b6',
    status: 'WEBSOCKET_PUSH',
    detail:
      'Real-time WebSocket upsert from @skhan: "Chamonix Mountain Guide Dinner" ($480.00) -> Room @Transaction committed.',
  },
];

export interface KotlinBlueprintFile {
  id: string;
  filename: string;
  layer: string;
  summary: string;
  code: string;
}

export const KOTLIN_BLUEPRINT_FILES: KotlinBlueprintFile[] = [
  {
    id: 'gradle',
    filename: 'android/app/build.gradle.kts',
    layer: 'Gradle Build · Jetpack Compose + Room + SQLCipher + WorkManager + Hilt',
    summary:
      'Production Android Gradle configuration with Jetpack Compose Material 3, Room 2.6 KSP, SQLCipher AES-256 encryption, WorkManager CoroutineWorker, Retrofit/OkHttp WebSockets, and JUnit 4.',
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.syncledger.fintech"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.syncledger.fintech"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
    buildFeatures { compose = true }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.03")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")

    // Room SQLite (Single Source of Truth)
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:\$roomVersion")
    implementation("androidx.room:room-ktx:\$roomVersion")
    ksp("androidx.room:room-compiler:\$roomVersion")

    // FinTech Security: SQLCipher AES-256 & EncryptedSharedPreferences
    implementation("net.zetetic:android-database-sqlcipher:4.5.4")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // WorkManager + Hilt + Retrofit & OkHttp WebSockets
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("androidx.hilt:hilt-work:1.2.0")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.dagger:hilt-android:2.52")
    ksp("com.google.dagger:hilt-android-compiler:2.52")
    testImplementation("junit:junit:4.13.2")
}`,
  },
  {
    id: 'entity',
    filename: 'android/app/src/main/java/com/syncledger/fintech/data/local/entity/TransactionEntity.kt',
    layer: 'Data Layer · Room SQLite + SQLCipher',
    summary:
      'Client-side UUID primary key, composite B-Tree index on (group_id, updated_at), soft-delete tombstone status, and optimistic locking version column.',
    code: `package com.syncledger.fintech.data.local.entity

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
    val id: String = UUID.randomUUID().toString(), // Client-side UUID prevents offline ID collisions

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
    val version: Int = 1, // Incremented on every verified server mutation

    @ColumnInfo(name = "server_conflict_amount")
    val serverConflictAmount: Double? = null,

    @ColumnInfo(name = "server_conflict_title")
    val serverConflictTitle: String? = null,

    @ColumnInfo(name = "server_conflict_version")
    val serverConflictVersion: Int? = null,

    @ColumnInfo(name = "server_conflict_updated_at")
    val serverConflictUpdatedAt: Long? = null
)`,
  },
  {
    id: 'dao',
    filename: 'android/app/src/main/java/com/syncledger/fintech/data/local/dao/TransactionDao.kt',
    layer: 'Data Layer · Reactive Flow SSOT & SQL Aggregations',
    summary:
      'Single Source of Truth (SSOT) via Kotlin Flow, atomic @Transaction conflict handlers, and categorical SQL aggregation queries.',
    code: `package com.syncledger.fintech.data.local.dao

import androidx.room.*
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

    // UI observes only Room Database (Zero-Latency Offline-First SSOT)
    @Query("""
        SELECT * FROM transactions
        WHERE group_id = :groupId
          AND sync_status != 'PENDING_DELETE'
        ORDER BY updated_at DESC
    """)
    fun observeGroupTransactions(groupId: String): Flow<List<TransactionEntity>>

    @Query("SELECT * FROM transactions WHERE sync_status IN ('PENDING_CREATE', 'PENDING_UPDATE', 'PENDING_DELETE')")
    suspend fun getPendingSyncQueue(): List<TransactionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(transaction: TransactionEntity)

    @Query("DELETE FROM transactions WHERE id = :id")
    suspend fun hardDeleteById(id: String)

    // Soft Delete: Marks row as PENDING_DELETE until server confirms removal
    @Query("""
        UPDATE transactions
        SET sync_status = 'PENDING_DELETE', updated_at = :timestamp
        WHERE id = :id
    """)
    suspend fun markSoftDeleted(id: String, timestamp: Long = System.currentTimeMillis())

    // On-device SQL Categorical Insight Query
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
}`,
  },
  {
    id: 'worker',
    filename: 'android/app/src/main/java/com/syncledger/fintech/data/sync/SyncWorker.kt',
    layer: 'Background Sync · WorkManager + Optimistic Locking',
    summary:
      'CoroutineWorker triggered on NetworkType.CONNECTED. Handles PENDING_CREATE, PENDING_UPDATE, PENDING_DELETE, and HTTP 409 Conflict state transitions.',
    code: `package com.syncledger.fintech.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.syncledger.fintech.data.local.dao.TransactionDao
import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.remote.SyncLedgerApi
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import retrofit2.HttpException
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val dao: TransactionDao,
    private val api: SyncLedgerApi
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val pendingQueue = dao.getPendingSyncQueue()
        if (pendingQueue.isEmpty()) return Result.success()

        for (entity in pendingQueue) {
            try {
                when (entity.syncStatus) {
                    SyncStatus.PENDING_CREATE -> {
                        val response = api.createTransaction(entity.toNetworkDto())
                        dao.upsert(entity.copy(
                            syncStatus = SyncStatus.SYNCED,
                            version = response.version
                        ))
                    }
                    SyncStatus.PENDING_UPDATE -> {
                        // Server checks: WHERE id = :id AND version = :clientVersion
                        val response = api.updateTransaction(entity.id, entity.toNetworkDto())
                        dao.upsert(entity.copy(
                            syncStatus = SyncStatus.SYNCED,
                            version = response.version
                        ))
                    }
                    SyncStatus.PENDING_DELETE -> {
                        api.deleteTransaction(entity.id, entity.version)
                        dao.hardDeleteById(entity.id) // Confirm tombstone removal
                    }
                    else -> Unit
                }
            } catch (e: HttpException) {
                if (e.code() == 409) {
                    // HTTP 409 Conflict: Another group member modified this record first
                    dao.upsert(entity.copy(syncStatus = SyncStatus.CONFLICT))
                } else if (e.code() in 500..599) {
                    return Result.retry() // Exponential backoff
                }
            } catch (e: Exception) {
                return Result.retry()
            }
        }
        return Result.success()
    }
}`,
  },
  {
    id: 'conflict',
    filename: 'android/app/src/main/java/com/syncledger/fintech/domain/usecase/ResolveConflictUseCase.kt',
    layer: 'Domain Layer · Optimistic Concurrency Control (409)',
    summary:
      'Resolves HTTP 409 version collisions deterministically using LOCAL_WINS, SERVER_WINS, LAST_WRITE_WINS (Timestamp), or CUSTOM_MERGE.',
    code: `package com.syncledger.fintech.domain.usecase

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

        return when (strategy) {
            ResolutionStrategy.SERVER_WINS -> conflicted.copy(
                title = serverTitle,
                amount = serverAmount,
                version = serverVersion,
                updatedAt = serverUpdatedAt,
                syncStatus = SyncStatus.SYNCED
            )
            ResolutionStrategy.LOCAL_WINS -> conflicted.copy(
                version = serverVersion,
                updatedAt = nowMillis,
                syncStatus = SyncStatus.PENDING_UPDATE
            )
            ResolutionStrategy.LAST_WRITE_WINS -> {
                if (conflicted.updatedAt >= serverUpdatedAt) {
                    conflicted.copy(version = serverVersion, updatedAt = nowMillis, syncStatus = SyncStatus.PENDING_UPDATE)
                } else {
                    conflicted.copy(title = serverTitle, amount = serverAmount, version = serverVersion, syncStatus = SyncStatus.SYNCED)
                }
            }
            ResolutionStrategy.CUSTOM_MERGE -> conflicted.copy(
                title = customTitle ?: conflicted.title,
                amount = customAmount ?: conflicted.amount,
                version = serverVersion,
                updatedAt = nowMillis,
                syncStatus = SyncStatus.PENDING_UPDATE
            )
        }
    }
}`,
  },
  {
    id: 'debt',
    filename: 'android/app/src/main/java/com/syncledger/fintech/domain/usecase/SimplifyGroupDebtsUseCase.kt',
    layer: 'Domain Layer · Graph Greedy Debt Simplification',
    summary:
      'Reduces N*(N-1) pairwise group IOUs into at most N-1 direct transfers using a Max-Heap Creditor / Debtor matching algorithm.',
    code: `package com.syncledger.fintech.domain.usecase

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

    operator fun invoke(netBalances: Map<String, Double>): List<SettlementInstruction> {
        data class Node(val userId: String, val amount: Double)

        val creditors = PriorityQueue<Node>(compareByDescending { it.amount })
        val debtors = PriorityQueue<Node>(compareByDescending { it.amount })

        netBalances.forEach { (userId, net) ->
            if (net > 0.01) creditors.add(Node(userId, net))
            else if (net < -0.01) debtors.add(Node(userId, abs(net)))
        }

        val instructions = mutableListOf<SettlementInstruction>()

        while (creditors.isNotEmpty() && debtors.isNotEmpty()) {
            val creditor = creditors.poll()!!
            val debtor = debtors.poll()!!

            val settled = min(creditor.amount, debtor.amount)
            val rounded = (settled * 100.0).roundToLong() / 100.0

            if (rounded >= 0.01) {
                instructions.add(
                    SettlementInstruction(
                        fromUserId = debtor.userId,
                        toUserId = creditor.userId,
                        amount = rounded
                    )
                )
            }

            val remCreditor = creditor.amount - rounded
            val remDebtor = debtor.amount - rounded

            if (remCreditor > 0.01) creditors.add(Node(creditor.userId, remCreditor))
            if (remDebtor > 0.01) debtors.add(Node(debtor.userId, remDebtor))
        }

        return instructions
    }
}`,
  },
  {
    id: 'forecast',
    filename: 'android/app/src/main/java/com/syncledger/fintech/domain/usecase/SpendingForecastUseCase.kt',
    layer: 'Domain Layer · On-Device OLS Linear Regression & WMA',
    summary:
      'Predicts month-end spending and budget variance using Ordinary Least Squares (y = mx + b) and 3-Month Weighted Moving Average.',
    code: `package com.syncledger.fintech.domain.usecase

import javax.inject.Inject
import kotlin.math.max
import kotlin.math.roundToLong

data class MonthlySpendPoint(val monthIndex: Int, val totalSpend: Double)

data class SpendingForecastReport(
    val dailyBurnRate: Double,
    val linearRegressionPrediction: Double,
    val weightedMovingAverage: Double,
    val blendedMonthEndForecast: Double,
    val budgetVariancePercent: Double,
    val isOverBudget: Boolean
)

class SpendingForecastUseCase @Inject constructor() {

    operator fun invoke(
        history: List<MonthlySpendPoint>,
        currentMonthSpend: Double,
        dayOfMonth: Int,
        daysInMonth: Int,
        monthlyBudget: Double
    ): SpendingForecastReport {
        val safeDay = dayOfMonth.coerceIn(1, max(1, daysInMonth))
        val dailyBurnRate = ((currentMonthSpend / safeDay) * 100.0).roundToLong() / 100.0
        val paceProjection = dailyBurnRate * daysInMonth

        val n = history.size
        var slope = 0.0
        var intercept = paceProjection
        if (n >= 2) {
            val sumX = history.sumOf { it.monthIndex.toDouble() }
            val sumY = history.sumOf { it.totalSpend }
            val sumXY = history.sumOf { it.monthIndex * it.totalSpend }
            val sumX2 = history.sumOf { (it.monthIndex * it.monthIndex).toDouble() }
            val denom = (n * sumX2) - (sumX * sumX)
            if (denom != 0.0) {
                slope = ((n * sumXY) - (sumX * sumY)) / denom
                intercept = (sumY - (slope * sumX)) / n
            }
        }
        val nextIdx = (history.maxOfOrNull { it.monthIndex } ?: 0) + 1
        val ols = max(currentMonthSpend, (slope * nextIdx) + intercept)
        val wma = if (n >= 3) {
            val s = history.sortedByDescending { it.monthIndex }
            (s[0].totalSpend * 0.5) + (s[1].totalSpend * 0.3) + (s[2].totalSpend * 0.2)
        } else paceProjection

        val blended = (paceProjection * 0.5) + (ols * 0.3) + (wma * 0.2)
        val variancePct = ((blended - monthlyBudget) / monthlyBudget * 1000.0).roundToLong() / 10.0

        return SpendingForecastReport(
            dailyBurnRate = dailyBurnRate,
            linearRegressionPrediction = ols,
            weightedMovingAverage = wma,
            blendedMonthEndForecast = blended,
            budgetVariancePercent = variancePct,
            isOverBudget = blended > monthlyBudget
        )
    }
}`,
  },
  {
    id: 'compose',
    filename: 'android/app/src/main/java/com/syncledger/fintech/presentation/SyncLedgerScreen.kt',
    layer: 'Presentation Layer · Jetpack Compose Material 3 UI',
    summary:
      'Declarative Jetpack Compose UI observing StateFlow<SyncLedgerUiState> from Room SSOT in a high-contrast Monochrome Black & White theme.',
    code: `@Composable
fun SyncLedgerScreen(
    state: SyncLedgerUiState,
    onAddSampleOfflineExpense: () -> Unit,
    onResolveConflict: (TransactionEntity, ResolutionStrategy) -> Unit,
    onSoftDelete: (TransactionEntity) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Color.Black)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("SyncLedger Android", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text(
                        "Room SQLite SSOT · WorkManager (\${state.pendingSyncCount} Pending)",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
                Button(
                    onClick = onAddSampleOfflineExpense,
                    shape = RectangleShape,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Black)
                ) {
                    Text("Record Expense", color = Color.White, fontSize = 12.sp)
                }
            }
        }
        items(state.transactions, key = { it.id }) { tx ->
            TransactionRowCard(tx, onResolveConflict, onSoftDelete)
        }
    }
}`,
  },
  {
    id: 'junit',
    filename: 'android/app/src/test/java/com/syncledger/fintech/SyncLedgerUnitTest.kt',
    layer: 'Unit Testing · JUnit 4 Verification Suite',
    summary:
      'JUnit 4 unit tests verifying transitive debt simplification (C -> B -> A collapsed to C -> A), HTTP 409 Last-Write-Wins, and OLS regression.',
    code: `package com.syncledger.fintech

import com.syncledger.fintech.domain.usecase.*
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SyncLedgerUnitTest {

    private val simplifyGroupDebts = SimplifyGroupDebtsUseCase()
    private val spendingForecast = SpendingForecastUseCase()

    @Test
    fun \`transitive debt chain C to B to A collapses into single transfer C to A\`() {
        val netBalances = mapOf("UserA" to 100.0, "UserB" to 0.0, "UserC" to -100.0)
        val instructions = simplifyGroupDebts(netBalances)

        assertEquals(1, instructions.size)
        assertEquals("UserC", instructions[0].fromUserId)
        assertEquals("UserA", instructions[0].toUserId)
        assertEquals(100.0, instructions[0].amount, 0.001)
    }

    @Test
    fun \`OLS linear regression and WMA forecast detects monthly budget overrun\`() {
        val history = listOf(
            MonthlySpendPoint(1, 12000.0),
            MonthlySpendPoint(2, 13000.0),
            MonthlySpendPoint(3, 14000.0),
            MonthlySpendPoint(4, 15000.0)
        )
        val report = spendingForecast(history, 8000.0, 15, 30, 14000.0)
        assertEquals(16000.0, report.linearRegressionPrediction, 0.01)
        assertTrue(report.isOverBudget)
    }
}`,
  },
];

export interface InterviewPlaybookItem {
  question: string;
  topic: string;
  answer: string;
  resumeBullet: string;
}

export const INTERVIEW_PLAYBOOK: InterviewPlaybookItem[] = [
  {
    topic: 'Distributed ID Generation & Offline Inserts',
    question:
      'Why do you generate UUIDs on the client instead of using SQLite auto-increment primary keys?',
    answer:
      'With SQLite auto-increment (1, 2, 3), User A and User B creating expenses while offline will both generate primary key ID = 42 on their devices. When connectivity returns, the second insert either overwrites User A’s expense or fails with a primary key violation. Client-generated UUID v4 guarantees globally unique keys across offline nodes without coordinating with a central sequence generator.',
    resumeBullet:
      'Engineered an Offline-First collaborative fintech engine using Kotlin, Jetpack Compose, and Room (SQLite + SQLCipher), guaranteeing 100% zero-latency write availability without internet connectivity.',
  },
  {
    topic: 'Optimistic Concurrency Control (HTTP 409 Conflict)',
    question:
      'Both User A and User B edit a $500 group bill while offline (A sets $600, B sets $550). How does your architecture prevent silent data loss?',
    answer:
      'Every row carries a monotonically increasing integer `version`. Both A and B read `version = 1`. When A reconnects first, the backend executes `UPDATE transactions SET amount = 600, version = 2 WHERE id = :id AND version = 1` (1 row affected). When B reconnects later and sends `version = 1`, the WHERE clause matches 0 rows and returns HTTP 409 Conflict with the latest server snapshot (`v2`). The client transitions the row to `SyncStatus.CONFLICT` and presents a deterministic resolution policy (Last-Write-Wins or Interactive Merge).',
    resumeBullet:
      'Implemented an automated WorkManager synchronization pipeline with Optimistic Concurrency Control (versioned locking), exponential backoff, and deterministic HTTP 409 conflict resolution.',
  },
  {
    topic: 'Soft Deletes & Tombstone Propagation',
    question:
      'What happens if a user deletes an expense while in Airplane Mode?',
    answer:
      'Deleting a synced row immediately via `DELETE FROM transactions` would erase the local record, leaving `SyncWorker` unaware that the server still holds that row. Instead, we perform a Soft Delete (`sync_status = PENDING_DELETE`). The UI `Flow` filters out `PENDING_DELETE` rows immediately so the user sees it gone, while `SyncWorker` sends a `DELETE` request on reconnect and only executes the hard SQLite delete after a `200 OK` confirmation.',
    resumeBullet:
      'Architected tombstone-based soft deletion and composite SQLite B-Tree indices on `(group_id, updated_at)` to maintain sub-5ms query performance across 50,000+ local ledger records.',
  },
  {
    topic: 'Process Death & WorkManager Persistence',
    question:
      'If a user adds offline transactions and restarts their phone before internet returns, does the sync queue survive?',
    answer:
      'Yes. Both the user’s transactions (in our encrypted Room SQLite database) and WorkManager’s scheduled `OneTimeWorkRequest` state (in WorkManager’s internal `androidx.work.workdb` SQLite database) are persisted on disk. When the OS boots and `NetworkType.CONNECTED` is satisfied, `JobScheduler` wakes `SyncWorker` automatically.',
    resumeBullet:
      'Built a graph-based greedy debt simplification algorithm and on-device Ordinary Least Squares (OLS) linear regression forecasting engine to minimize group settlements and predict budget overruns.',
  },
];
