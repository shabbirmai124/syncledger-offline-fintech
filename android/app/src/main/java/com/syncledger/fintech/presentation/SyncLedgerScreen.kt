package com.syncledger.fintech.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import com.syncledger.fintech.domain.usecase.ResolutionStrategy
import dagger.hilt.android.AndroidEntryPoint

private val MonochromeColorScheme = lightColorScheme(
    primary = Color.Black,
    onPrimary = Color.White,
    background = Color.White,
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black
)

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = MonochromeColorScheme) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color.White
                ) {
                    val vm: SyncLedgerViewModel = viewModel()
                    val state by vm.uiState.collectAsStateWithLifecycle()
                    SyncLedgerScreen(
                        state = state,
                        onAddSampleOfflineExpense = {
                            vm.addOfflineExpense(
                                title = "Mountain Gondola Pass",
                                amount = 180.0,
                                category = "Transport & Transit",
                                paidByUserId = "usr-alex",
                                splitBetweenUserIds = state.groupMembers
                            )
                        },
                        onResolveConflict = { tx, strategy ->
                            vm.resolveConflict(tx, strategy)
                        },
                        onSoftDelete = { tx ->
                            vm.deleteExpense(tx)
                        }
                    )
                }
            }
        }
    }
}

@Composable
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
        // Header
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
                    Text(
                        text = "SyncLedger Android",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                    Text(
                        text = "Room SQLite SSOT · WorkManager (${state.pendingSyncCount} Pending) · ${state.conflictCount} Conflicts",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color.DarkGray
                    )
                }

                Button(
                    onClick = onAddSampleOfflineExpense,
                    shape = RectangleShape,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Black,
                        contentColor = Color.White
                    )
                ) {
                    Text("Record Expense", fontSize = 12.sp)
                }
            }
        }

        // Forecast Summary Banner
        state.forecastReport?.let { forecast ->
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(2.dp, Color.Black)
                        .padding(16.dp)
                ) {
                    Text(
                        text = "ON-DEVICE OLS REGRESSION & WMA FORECAST",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Projected Month-End: $${String.format("%.2f", forecast.blendedMonthEndForecast)} " +
                            "(Burn: $${String.format("%.2f", forecast.dailyBurnRate)}/day · Variance: ${forecast.budgetVariancePercent}%)",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.Black
                    )
                }
            }
        }

        // Simplified Settlements Section
        if (state.simplifiedSettlements.isNotEmpty()) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, Color.Black)
                        .padding(16.dp)
                ) {
                    Text(
                        text = "GRAPH SIMPLIFIED GROUP SETTLEMENTS (${state.simplifiedSettlements.size})",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    state.simplifiedSettlements.forEach { instruction ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "${instruction.fromUserId} pays directly to ${instruction.toUserId}",
                                fontSize = 13.sp,
                                color = Color.Black
                            )
                            Text(
                                text = "$${String.format("%.2f", instruction.amount)}",
                                fontSize = 13.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = Color.Black
                            )
                        }
                    }
                }
            }
        }

        // Room SQLite Transactions List
        items(state.transactions, key = { it.id }) { tx ->
            TransactionRowCard(
                tx = tx,
                onResolveConflict = onResolveConflict,
                onSoftDelete = onSoftDelete
            )
        }
    }
}

@Composable
private fun TransactionRowCard(
    tx: TransactionEntity,
    onResolveConflict: (TransactionEntity, ResolutionStrategy) -> Unit,
    onSoftDelete: (TransactionEntity) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color.Black)
            .background(Color.White)
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tx.title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Text(
                    text = "${tx.category} · UUID ${tx.id.take(8)} · ${tx.syncStatus} (v${tx.version})",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    color = Color.DarkGray
                )
            }
            Text(
                text = "$${String.format("%.2f", tx.amount)}",
                fontSize = 15.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
        }

        Spacer(modifier = Modifier.height(8.dp))
        HorizontalDivider(color = Color.LightGray)
        Spacer(modifier = Modifier.height(8.dp))

        if (tx.syncStatus == SyncStatus.CONFLICT) {
            Text(
                text = "HTTP 409 Conflict: Local $${tx.amount} (v${tx.version}) vs Server $${tx.serverConflictAmount ?: 0.0} (v${tx.serverConflictVersion ?: 2})",
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { onResolveConflict(tx, ResolutionStrategy.LAST_WRITE_WINS) },
                    shape = RectangleShape,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Black,
                        contentColor = Color.White
                    )
                ) {
                    Text("Last-Write-Wins", fontSize = 11.sp)
                }
                OutlinedButton(
                    onClick = { onResolveConflict(tx, ResolutionStrategy.SERVER_WINS) },
                    shape = RectangleShape,
                    border = BorderStroke(1.dp, Color.Black)
                ) {
                    Text("Accept Server", fontSize = 11.sp, color = Color.Black)
                }
            }
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                OutlinedButton(
                    onClick = { onSoftDelete(tx) },
                    shape = RectangleShape,
                    border = BorderStroke(1.dp, Color.Black)
                ) {
                    Text("Soft Delete (Tombstone)", fontSize = 11.sp, color = Color.Black)
                }
            }
        }
    }
}
