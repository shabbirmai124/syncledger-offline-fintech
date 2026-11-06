package com.syncledger.fintech.data.remote

import com.syncledger.fintech.data.local.dao.TransactionDao
import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import javax.inject.Inject
import javax.inject.Singleton

data class TransactionNetworkDto(
    val id: String,
    val groupId: String,
    val title: String,
    val amount: Double,
    val category: String,
    val paidByUserId: String,
    val splitBetweenCsv: String,
    val updatedAt: Long,
    val version: Int,
    val editedByName: String = "Android Client"
)

interface SyncLedgerApi {

    @POST("/api/v1/transactions")
    suspend fun createTransaction(
        @Body dto: TransactionNetworkDto
    ): TransactionNetworkDto

    /**
     * Optimistic Concurrency Control:
     * Server verifies `WHERE id = :id AND version = :dto.version`.
     * Returns HTTP 200 with `version + 1` or HTTP 409 Conflict with current server snapshot.
     */
    @PUT("/api/v1/transactions/{id}")
    suspend fun updateTransaction(
        @Path("id") id: String,
        @Body dto: TransactionNetworkDto
    ): TransactionNetworkDto

    @DELETE("/api/v1/transactions/{id}")
    suspend fun deleteTransaction(
        @Path("id") id: String,
        @Query("version") version: Int
    )
}

@Singleton
class RealtimeWebSocketManager @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val transactionDao: TransactionDao
) {
    private var webSocket: WebSocket? = null
    private val ioScope = CoroutineScope(Dispatchers.IO)

    fun connectToGroupStream(wsUrl: String, groupId: String) {
        val request = Request.Builder()
            .url("$wsUrl/ws/groups/$groupId")
            .build()

        webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                ioScope.launch {
                    val json = JSONObject(text)
                    val incoming = TransactionEntity(
                        id = json.getString("id"),
                        groupId = json.getString("groupId"),
                        title = json.getString("title"),
                        amount = json.getDouble("amount"),
                        category = json.getString("category"),
                        paidByUserId = json.getString("paidByUserId"),
                        splitBetweenCsv = json.getString("splitBetweenCsv"),
                        syncStatus = SyncStatus.SYNCED,
                        updatedAt = json.getLong("updatedAt"),
                        version = json.getInt("version")
                    )
                    // Insert directly into Room SSOT; UI Flow updates automatically
                    transactionDao.upsertFromWebSocketIfClean(incoming)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                // WorkManager handles eventual consistency if socket drops
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "Client closed")
        webSocket = null
    }
}
