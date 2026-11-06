export type SyncStatus =
  | 'SYNCED'
  | 'PENDING_CREATE'
  | 'PENDING_UPDATE'
  | 'PENDING_DELETE'
  | 'CONFLICT';

export type TransactionCategory =
  | 'Housing & Utilities'
  | 'Food & Dining'
  | 'Transport & Transit'
  | 'Equipment & Gear'
  | 'Software & Cloud'
  | 'Settlement';

export interface GroupMember {
  id: string;
  name: string;
  role: string;
  handle: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  description: string;
  monthlyBudget: number;
  currency: string;
  members: GroupMember[];
}

export interface ServerConflictSnapshot {
  title: string;
  amount: number;
  category: TransactionCategory;
  paidByUserId: string;
  updatedAt: number;
  version: number;
  editedByName: string;
}

export interface TransactionEntity {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  category: TransactionCategory;
  paidByUserId: string;
  splitBetweenUserIds: string[];
  syncStatus: SyncStatus;
  updatedAt: number;
  createdAt: number;
  version: number;
  conflictServerCopy?: ServerConflictSnapshot;
}

export type ConflictResolutionStrategy =
  | 'LOCAL_WINS'
  | 'SERVER_WINS'
  | 'LAST_WRITE_WINS'
  | 'CUSTOM_MERGE';

export interface MemberNetBalance {
  userId: string;
  paid: number;
  owed: number;
  net: number; // positive = creditor (is owed money), negative = debtor (owes money)
}

export interface SettlementTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface DebtSimplificationResult {
  netBalances: MemberNetBalance[];
  rawPairwiseTransfers: SettlementTransfer[];
  simplifiedTransfers: SettlementTransfer[];
  rawPairwiseCount: number;
  simplifiedCount: number;
  transactionsSaved: number;
  reductionPercent: number;
}

export interface CategoryInsight {
  category: TransactionCategory;
  totalAmount: number;
  transactionCount: number;
  percentageOfTotal: number;
  averageTransaction: number;
}

export interface MonthlyHistoricalPoint {
  monthLabel: string;
  monthIndex: number; // 1..N
  actualSpend: number;
}

export interface ForecastResult {
  currentSpend: number;
  monthlyBudget: number;
  dailyBurnRate: number;
  linearRegressionPrediction: number;
  weightedMovingAverage: number;
  projectedMonthEnd: number;
  budgetVariance: number; // positive = over budget, negative = under budget
  budgetVariancePercent: number;
  regressionSlope: number;
  regressionIntercept: number;
  isOverBudget: boolean;
}

export interface SyncLogEntry {
  id: string;
  timestamp: number;
  operation: string;
  entityId: string;
  status: 'SUCCESS' | 'CONFLICT_409' | 'QUEUED_OFFLINE' | 'WEBSOCKET_PUSH';
  detail: string;
}

/**
 * Generates an RFC4122-compliant v4 UUID on the client so offline inserts
 * never collide across distributed devices.
 */
export function generateClientUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomNibble = (Math.random() * 16) | 0;
    const value = char === 'x' ? randomNibble : (randomNibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * Creates a new local TransactionEntity inside Room/SQLite SSOT with PENDING_CREATE status.
 */
export function createOfflineTransaction(params: {
  id?: string;
  groupId: string;
  title: string;
  amount: number;
  category: TransactionCategory;
  paidByUserId: string;
  splitBetweenUserIds: string[];
  now?: number;
}): TransactionEntity {
  const timestamp = params.now ?? Date.now();
  return {
    id: params.id ?? generateClientUuid(),
    groupId: params.groupId,
    title: params.title.trim(),
    amount: Math.round(params.amount * 100) / 100,
    category: params.category,
    paidByUserId: params.paidByUserId,
    splitBetweenUserIds:
      params.splitBetweenUserIds.length > 0
        ? params.splitBetweenUserIds
        : [params.paidByUserId],
    syncStatus: 'PENDING_CREATE',
    updatedAt: timestamp,
    createdAt: timestamp,
    version: 1,
  };
}

/**
 * Updates an existing TransactionEntity in the local SSOT database.
 * Preserves PENDING_CREATE if never synced yet; otherwise transitions to PENDING_UPDATE.
 */
export function updateLocalTransaction(
  existing: TransactionEntity,
  patch: Partial<
    Pick<
      TransactionEntity,
      'title' | 'amount' | 'category' | 'paidByUserId' | 'splitBetweenUserIds'
    >
  >,
  now: number = Date.now()
): TransactionEntity {
  const nextStatus: SyncStatus =
    existing.syncStatus === 'PENDING_CREATE' ? 'PENDING_CREATE' : 'PENDING_UPDATE';

  return {
    ...existing,
    title: patch.title !== undefined ? patch.title.trim() : existing.title,
    amount:
      patch.amount !== undefined
        ? Math.round(patch.amount * 100) / 100
        : existing.amount,
    category: patch.category ?? existing.category,
    paidByUserId: patch.paidByUserId ?? existing.paidByUserId,
    splitBetweenUserIds:
      patch.splitBetweenUserIds && patch.splitBetweenUserIds.length > 0
        ? patch.splitBetweenUserIds
        : existing.splitBetweenUserIds,
    syncStatus: nextStatus,
    updatedAt: now,
  };
}

/**
 * Marks a transaction with PENDING_DELETE (Soft Delete) rather than immediately
 * dropping the row while offline, ensuring tombstone propagation to the backend.
 */
export function softDeleteLocalTransaction(
  existing: TransactionEntity,
  now: number = Date.now()
): TransactionEntity | null {
  if (existing.syncStatus === 'PENDING_CREATE') {
    // Never existed on the server; safe to purge immediately from local SQLite
    return null;
  }
  return {
    ...existing,
    syncStatus: 'PENDING_DELETE',
    updatedAt: now,
  };
}

/**
 * Simulates the WorkManager background synchronization cycle with Optimistic
 * Concurrency Control (version comparison -> 200 OK or 409 Conflict).
 */
export function executeSyncCycle(
  localTransactions: TransactionEntity[],
  serverStore: Record<string, ServerConflictSnapshot>,
  now: number = Date.now()
): {
  updatedTransactions: TransactionEntity[];
  updatedServerStore: Record<string, ServerConflictSnapshot>;
  logs: SyncLogEntry[];
  syncedCount: number;
  conflictCount: number;
  deletedCount: number;
} {
  const nextServerStore: Record<string, ServerConflictSnapshot> = {
    ...serverStore,
  };
  const updatedTransactions: TransactionEntity[] = [];
  const logs: SyncLogEntry[] = [];
  let syncedCount = 0;
  let conflictCount = 0;
  let deletedCount = 0;

  for (const tx of localTransactions) {
    if (tx.syncStatus === 'SYNCED') {
      updatedTransactions.push(tx);
      continue;
    }

    if (tx.syncStatus === 'CONFLICT') {
      // Remains in conflict until resolved by user or policy
      updatedTransactions.push(tx);
      conflictCount++;
      continue;
    }

    if (tx.syncStatus === 'PENDING_DELETE') {
      delete nextServerStore[tx.id];
      deletedCount++;
      logs.push({
        id: generateClientUuid(),
        timestamp: now,
        operation: 'DELETE /api/v1/transactions/' + tx.id.slice(0, 8),
        entityId: tx.id,
        status: 'SUCCESS',
        detail: `Confirmed tombstone deletion for "${tx.title}"; purged row from local SQLite.`,
      });
      continue; // Purged from local SSOT
    }

    if (tx.syncStatus === 'PENDING_CREATE') {
      const createdVersion = 1;
      nextServerStore[tx.id] = {
        title: tx.title,
        amount: tx.amount,
        category: tx.category,
        paidByUserId: tx.paidByUserId,
        updatedAt: tx.updatedAt,
        version: createdVersion,
        editedByName: 'Local Client',
      };
      updatedTransactions.push({
        ...tx,
        syncStatus: 'SYNCED',
        version: createdVersion,
        conflictServerCopy: undefined,
      });
      syncedCount++;
      logs.push({
        id: generateClientUuid(),
        timestamp: now,
        operation: 'POST /api/v1/transactions',
        entityId: tx.id,
        status: 'SUCCESS',
        detail: `Synced UUID ${tx.id.slice(0, 8)} ("${tx.title}", $${tx.amount.toFixed(2)}) -> v1.`,
      });
      continue;
    }

    if (tx.syncStatus === 'PENDING_UPDATE') {
      const serverRecord = nextServerStore[tx.id];
      if (!serverRecord || serverRecord.version === tx.version) {
        const nextVersion = tx.version + 1;
        nextServerStore[tx.id] = {
          title: tx.title,
          amount: tx.amount,
          category: tx.category,
          paidByUserId: tx.paidByUserId,
          updatedAt: now,
          version: nextVersion,
          editedByName: 'Local Client',
        };
        updatedTransactions.push({
          ...tx,
          syncStatus: 'SYNCED',
          version: nextVersion,
          updatedAt: now,
          conflictServerCopy: undefined,
        });
        syncedCount++;
        logs.push({
          id: generateClientUuid(),
          timestamp: now,
          operation: `PUT /api/v1/transactions/${tx.id.slice(0, 8)}`,
          entityId: tx.id,
          status: 'SUCCESS',
          detail: `Optimistic lock verified (v${tx.version} -> v${nextVersion}) for "${tx.title}".`,
        });
      } else {
        // Optimistic Concurrency Control failure: Server version > Client version!
        conflictCount++;
        updatedTransactions.push({
          ...tx,
          syncStatus: 'CONFLICT',
          conflictServerCopy: { ...serverRecord },
        });
        logs.push({
          id: generateClientUuid(),
          timestamp: now,
          operation: `PUT /api/v1/transactions/${tx.id.slice(0, 8)}`,
          entityId: tx.id,
          status: 'CONFLICT_409',
          detail: `HTTP 409 Conflict: Client sent v${tx.version} ($${tx.amount.toFixed(2)}), but Server is at v${serverRecord.version} ($${serverRecord.amount.toFixed(2)} by ${serverRecord.editedByName}).`,
        });
      }
    }
  }

  return {
    updatedTransactions,
    updatedServerStore: nextServerStore,
    logs,
    syncedCount,
    conflictCount,
    deletedCount,
  };
}

/**
 * Resolves an Optimistic Locking 409 Conflict using one of four deterministic strategies:
 * LOCAL_WINS, SERVER_WINS, LAST_WRITE_WINS, or CUSTOM_MERGE.
 */
export function resolveTransactionConflict(
  tx: TransactionEntity,
  strategy: ConflictResolutionStrategy,
  customMerge?: { title: string; amount: number },
  now: number = Date.now()
): TransactionEntity {
  const serverCopy = tx.conflictServerCopy;
  if (!serverCopy) {
    return { ...tx, syncStatus: 'SYNCED' };
  }

  if (strategy === 'SERVER_WINS') {
    return {
      ...tx,
      title: serverCopy.title,
      amount: serverCopy.amount,
      category: serverCopy.category,
      paidByUserId: serverCopy.paidByUserId,
      version: serverCopy.version,
      updatedAt: serverCopy.updatedAt,
      syncStatus: 'SYNCED',
      conflictServerCopy: undefined,
    };
  }

  if (strategy === 'LOCAL_WINS') {
    return {
      ...tx,
      version: serverCopy.version + 1,
      updatedAt: now,
      syncStatus: 'SYNCED',
      conflictServerCopy: undefined,
    };
  }

  if (strategy === 'LAST_WRITE_WINS') {
    const localIsNewer = tx.updatedAt >= serverCopy.updatedAt;
    if (localIsNewer) {
      return {
        ...tx,
        version: serverCopy.version + 1,
        updatedAt: now,
        syncStatus: 'SYNCED',
        conflictServerCopy: undefined,
      };
    } else {
      return {
        ...tx,
        title: serverCopy.title,
        amount: serverCopy.amount,
        category: serverCopy.category,
        paidByUserId: serverCopy.paidByUserId,
        version: serverCopy.version,
        updatedAt: serverCopy.updatedAt,
        syncStatus: 'SYNCED',
        conflictServerCopy: undefined,
      };
    }
  }

  // CUSTOM_MERGE
  return {
    ...tx,
    title: customMerge?.title.trim() || tx.title,
    amount:
      customMerge?.amount !== undefined
        ? Math.round(customMerge.amount * 100) / 100
        : tx.amount,
    version: serverCopy.version + 1,
    updatedAt: now,
    syncStatus: 'SYNCED',
    conflictServerCopy: undefined,
  };
}

/**
 * Graph-Based Greedy Debt Simplification Algorithm.
 * Minimizes the number of transactions required to settle all group debts.
 * Example: If C owes B $100 and B owes A $100, simplifies to C pays A $100 directly.
 */
export function calculateGroupBalancesAndSimplification(
  transactions: TransactionEntity[],
  memberIds: string[]
): DebtSimplificationResult {
  const activeTransactions = transactions.filter(
    (t) => t.syncStatus !== 'PENDING_DELETE' && t.amount > 0
  );

  const paidMap: Record<string, number> = {};
  const owedMap: Record<string, number> = {};
  const pairwiseMatrix: Record<string, Record<string, number>> = {};

  for (const id of memberIds) {
    paidMap[id] = 0;
    owedMap[id] = 0;
    pairwiseMatrix[id] = {};
    for (const otherId of memberIds) {
      pairwiseMatrix[id][otherId] = 0;
    }
  }

  for (const tx of activeTransactions) {
    const participants = tx.splitBetweenUserIds.filter((uid) =>
      memberIds.includes(uid)
    );
    if (participants.length === 0 || !memberIds.includes(tx.paidByUserId)) {
      continue;
    }

    const share = tx.amount / participants.length;
    paidMap[tx.paidByUserId] = (paidMap[tx.paidByUserId] ?? 0) + tx.amount;

    for (const participantId of participants) {
      owedMap[participantId] = (owedMap[participantId] ?? 0) + share;
      if (participantId !== tx.paidByUserId) {
        pairwiseMatrix[participantId][tx.paidByUserId] =
          (pairwiseMatrix[participantId][tx.paidByUserId] ?? 0) + share;
      }
    }
  }

  // Extract raw directed pairwise obligations (where debtor -> creditor > 0.01)
  const rawPairwiseTransfers: SettlementTransfer[] = [];
  for (const fromId of memberIds) {
    for (const toId of memberIds) {
      if (fromId !== toId) {
        const rawAmount = Math.round(pairwiseMatrix[fromId][toId] * 100) / 100;
        if (rawAmount >= 0.01) {
          rawPairwiseTransfers.push({
            fromUserId: fromId,
            toUserId: toId,
            amount: rawAmount,
          });
        }
      }
    }
  }

  const netBalances: MemberNetBalance[] = memberIds.map((userId) => {
    const paid = Math.round((paidMap[userId] ?? 0) * 100) / 100;
    const owed = Math.round((owedMap[userId] ?? 0) * 100) / 100;
    const net = Math.round((paid - owed) * 100) / 100;
    return { userId, paid, owed, net };
  });

  // Separate into creditors (net > 0.01) and debtors (net < -0.01)
  const creditors = netBalances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ userId: b.userId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = netBalances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ userId: b.userId, amount: Math.abs(b.net) }))
    .sort((a, b) => b.amount - a.amount);

  const simplifiedTransfers: SettlementTransfer[] = [];

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    // Re-sort remaining to greedily match largest debtor with largest creditor
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settledAmount = Math.min(debtor.amount, creditor.amount);
    const roundedSettled = Math.round(settledAmount * 100) / 100;

    if (roundedSettled >= 0.01) {
      simplifiedTransfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: roundedSettled,
      });
    }

    debtor.amount = Math.round((debtor.amount - roundedSettled) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - roundedSettled) * 100) / 100;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  const rawPairwiseCount = rawPairwiseTransfers.length;
  const simplifiedCount = simplifiedTransfers.length;
  const transactionsSaved = Math.max(0, rawPairwiseCount - simplifiedCount);
  const reductionPercent =
    rawPairwiseCount > 0
      ? Math.round((transactionsSaved / rawPairwiseCount) * 100)
      : 0;

  return {
    netBalances,
    rawPairwiseTransfers,
    simplifiedTransfers,
    rawPairwiseCount,
    simplifiedCount,
    transactionsSaved,
    reductionPercent,
  };
}

/**
 * Equivalent to Room SQL query:
 * SELECT category, SUM(amount) AS totalAmount, COUNT(*) AS transactionCount
 * FROM transactions WHERE sync_status != 'PENDING_DELETE' AND category != 'Settlement'
 * GROUP BY category ORDER BY totalAmount DESC
 */
export function computeCategoricalInsights(
  transactions: TransactionEntity[]
): CategoryInsight[] {
  const valid = transactions.filter(
    (t) => t.syncStatus !== 'PENDING_DELETE' && t.category !== 'Settlement'
  );

  const totalSpend = valid.reduce((acc, t) => acc + t.amount, 0);
  const grouped = new Map<
    TransactionCategory,
    { sum: number; count: number }
  >();

  for (const tx of valid) {
    const prev = grouped.get(tx.category) ?? { sum: 0, count: 0 };
    grouped.set(tx.category, {
      sum: prev.sum + tx.amount,
      count: prev.count + 1,
    });
  }

  const insights: CategoryInsight[] = [];
  for (const [category, stats] of grouped.entries()) {
    const totalAmount = Math.round(stats.sum * 100) / 100;
    const percentageOfTotal =
      totalSpend > 0
        ? Math.round((totalAmount / totalSpend) * 1000) / 10
        : 0;
    const averageTransaction =
      stats.count > 0 ? Math.round((totalAmount / stats.count) * 100) / 100 : 0;
    insights.push({
      category,
      totalAmount,
      transactionCount: stats.count,
      percentageOfTotal,
      averageTransaction,
    });
  }

  return insights.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * On-Device Spending Forecast using Simple Linear Regression (OLS: y = mx + b)
 * combined with 3-Month Weighted Moving Average (WMA) and Current Daily Burn Rate.
 */
export function computeSpendingForecast(params: {
  history: MonthlyHistoricalPoint[];
  currentSpend: number;
  dayOfMonth: number;
  daysInMonth: number;
  monthlyBudget: number;
}): ForecastResult {
  const { history, currentSpend, dayOfMonth, daysInMonth, monthlyBudget } =
    params;

  const safeDay = Math.max(1, Math.min(dayOfMonth, daysInMonth));
  const dailyBurnRate = Math.round((currentSpend / safeDay) * 100) / 100;
  const paceProjection = dailyBurnRate * daysInMonth;

  // Ordinary Least Squares (OLS) Simple Linear Regression over historical months
  const n = history.length;
  let slope = 0;
  let intercept = paceProjection;

  if (n >= 2) {
    const sumX = history.reduce((acc, p) => acc + p.monthIndex, 0);
    const sumY = history.reduce((acc, p) => acc + p.actualSpend, 0);
    const sumXY = history.reduce(
      (acc, p) => acc + p.monthIndex * p.actualSpend,
      0
    );
    const sumX2 = history.reduce(
      (acc, p) => acc + p.monthIndex * p.monthIndex,
      0
    );

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator !== 0) {
      slope = (n * sumXY - sumX * sumY) / denominator;
      intercept = (sumY - slope * sumX) / n;
    }
  }

  const nextMonthIndex =
    n > 0 ? Math.max(...history.map((h) => h.monthIndex)) + 1 : 1;
  const linearRegressionPrediction = Math.max(
    currentSpend,
    Math.round((slope * nextMonthIndex + intercept) * 100) / 100
  );

  // 3-Month Weighted Moving Average (weights: 0.5, 0.3, 0.2 for most recent 3 months)
  let weightedMovingAverage = paceProjection;
  if (n >= 3) {
    const sorted = [...history].sort((a, b) => b.monthIndex - a.monthIndex);
    weightedMovingAverage =
      Math.round(
        (sorted[0].actualSpend * 0.5 +
          sorted[1].actualSpend * 0.3 +
          sorted[2].actualSpend * 0.2) *
          100
      ) / 100;
  } else if (n > 0) {
    weightedMovingAverage =
      Math.round(
        (history.reduce((s, p) => s + p.actualSpend, 0) / n) * 100
      ) / 100;
  }

  // Ensemble forecast blending current month run-rate (50%), linear regression (30%), and WMA (20%)
  const blended =
    paceProjection * 0.5 +
    linearRegressionPrediction * 0.3 +
    weightedMovingAverage * 0.2;
  const projectedMonthEnd = Math.max(
    currentSpend,
    Math.round(blended * 100) / 100
  );

  const budgetVariance =
    Math.round((projectedMonthEnd - monthlyBudget) * 100) / 100;
  const budgetVariancePercent =
    monthlyBudget > 0
      ? Math.round((budgetVariance / monthlyBudget) * 1000) / 10
      : 0;

  return {
    currentSpend: Math.round(currentSpend * 100) / 100,
    monthlyBudget,
    dailyBurnRate,
    linearRegressionPrediction,
    weightedMovingAverage,
    projectedMonthEnd,
    budgetVariance,
    budgetVariancePercent,
    regressionSlope: Math.round(slope * 100) / 100,
    regressionIntercept: Math.round(intercept * 100) / 100,
    isOverBudget: projectedMonthEnd > monthlyBudget,
  };
}
