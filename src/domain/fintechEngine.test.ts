import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateClientUuid,
  createOfflineTransaction,
  updateLocalTransaction,
  softDeleteLocalTransaction,
  executeSyncCycle,
  resolveTransactionConflict,
  calculateGroupBalancesAndSimplification,
  computeCategoricalInsights,
  computeSpendingForecast,
} from './fintechEngine';

test('generateClientUuid generates unique RFC4122 v4 identifiers for offline inserts', () => {
  const id1 = generateClientUuid();
  const id2 = generateClientUuid();
  assert.notEqual(id1, id2);
  assert.match(
    id1,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  );
});

test('SSOT offline creation, update, and soft-delete tombstone rules', () => {
  const tx = createOfflineTransaction({
    id: 'tx-offline-1',
    groupId: 'grp-1',
    title: 'Glacier Express Tickets',
    amount: 240,
    category: 'Transport & Transit',
    paidByUserId: 'u1',
    splitBetweenUserIds: ['u1', 'u2'],
    now: 1000,
  });

  assert.equal(tx.syncStatus, 'PENDING_CREATE');
  assert.equal(tx.version, 1);

  // Updating an unsynced transaction preserves PENDING_CREATE
  const updatedUnsynced = updateLocalTransaction(tx, { amount: 260 }, 2000);
  assert.equal(updatedUnsynced.syncStatus, 'PENDING_CREATE');
  assert.equal(updatedUnsynced.amount, 260);

  // Soft-deleting an unsynced PENDING_CREATE transaction purges it immediately (null)
  assert.equal(softDeleteLocalTransaction(updatedUnsynced, 2500), null);

  // Once synced, updating transitions to PENDING_UPDATE and soft-deleting sets PENDING_DELETE
  const syncedTx = { ...updatedUnsynced, syncStatus: 'SYNCED' as const };
  const editedSynced = updateLocalTransaction(syncedTx, { amount: 300 }, 3000);
  assert.equal(editedSynced.syncStatus, 'PENDING_UPDATE');

  const tombstone = softDeleteLocalTransaction(syncedTx, 4000);
  assert.ok(tombstone);
  assert.equal(tombstone.syncStatus, 'PENDING_DELETE');
});

test('Optimistic Concurrency Control (OCC) detects HTTP 409 Conflict on version mismatch and resolves cleanly', () => {
  const txA = createOfflineTransaction({
    id: 'tx-shared-500',
    groupId: 'grp-1',
    title: 'Basecamp Lodge Booking',
    amount: 550, // User B edited offline to 550 while still at version 1
    category: 'Housing & Utilities',
    paidByUserId: 'u1',
    splitBetweenUserIds: ['u1', 'u2'],
    now: 5000,
  });

  // Pretend txA was previously synced at v1 and then edited offline (PENDING_UPDATE, v1)
  const localEditedByUserB = {
    ...txA,
    syncStatus: 'PENDING_UPDATE' as const,
    version: 1,
  };

  // Meanwhile User A already synced an edit to the server, bumping server version to v2 ($600)
  const serverStore = {
    'tx-shared-500': {
      title: 'Basecamp Lodge Booking',
      amount: 600,
      category: 'Housing & Utilities' as const,
      paidByUserId: 'u1',
      updatedAt: 4800,
      version: 2,
      editedByName: 'Alex Rivera',
    },
  };

  const syncResult = executeSyncCycle([localEditedByUserB], serverStore, 6000);
  assert.equal(syncResult.conflictCount, 1);
  assert.equal(syncResult.updatedTransactions[0].syncStatus, 'CONFLICT');
  assert.equal(
    syncResult.updatedTransactions[0].conflictServerCopy?.amount,
    600
  );
  assert.equal(
    syncResult.updatedTransactions[0].conflictServerCopy?.version,
    2
  );

  // Resolve conflict using LAST_WRITE_WINS (local updatedAt 5000 > server updatedAt 4800)
  const resolved = resolveTransactionConflict(
    syncResult.updatedTransactions[0],
    'LAST_WRITE_WINS',
    undefined,
    7000
  );
  assert.equal(resolved.syncStatus, 'SYNCED');
  assert.equal(resolved.amount, 550);
  assert.equal(resolved.version, 3); // Bumped above server v2 -> v3
});

test('Graph Debt Simplification reduces transitive chain C -> B -> A into single transfer C -> A', () => {
  // Scenario from prompt: A is owed 100 by B, and B is owed 100 by C.
  // Specifically:
  // Tx 1: A pays $200 split equally between A and B -> B owes A $100
  // Tx 2: B pays $200 split equally between B and C -> C owes B $100
  const tx1 = createOfflineTransaction({
    groupId: 'grp-1',
    title: 'Hotel paid by A for A & B',
    amount: 200,
    category: 'Housing & Utilities',
    paidByUserId: 'A',
    splitBetweenUserIds: ['A', 'B'],
  });
  const tx2 = createOfflineTransaction({
    groupId: 'grp-1',
    title: 'Dinner paid by B for B & C',
    amount: 200,
    category: 'Food & Dining',
    paidByUserId: 'B',
    splitBetweenUserIds: ['B', 'C'],
  });

  const result = calculateGroupBalancesAndSimplification(
    [tx1, tx2],
    ['A', 'B', 'C']
  );

  // Raw pairwise has 2 transfers (B -> A $100, C -> B $100)
  assert.equal(result.rawPairwiseCount, 2);
  // Simplified has 1 transfer: C -> A $100!
  assert.equal(result.simplifiedCount, 1);
  assert.equal(result.simplifiedTransfers[0].fromUserId, 'C');
  assert.equal(result.simplifiedTransfers[0].toUserId, 'A');
  assert.equal(result.simplifiedTransfers[0].amount, 100);
  assert.equal(result.transactionsSaved, 1);
  assert.equal(result.reductionPercent, 50);
});

test('SQL Categorical Aggregation and Linear Regression Forecasting compute accurate metrics', () => {
  const t1 = createOfflineTransaction({
    groupId: 'grp-1',
    title: 'Cloud Server',
    amount: 300,
    category: 'Software & Cloud',
    paidByUserId: 'u1',
    splitBetweenUserIds: ['u1'],
  });
  const t2 = createOfflineTransaction({
    groupId: 'grp-1',
    title: 'Team Groceries',
    amount: 700,
    category: 'Food & Dining',
    paidByUserId: 'u1',
    splitBetweenUserIds: ['u1'],
  });

  const insights = computeCategoricalInsights([t1, t2]);
  assert.equal(insights.length, 2);
  assert.equal(insights[0].category, 'Food & Dining');
  assert.equal(insights[0].percentageOfTotal, 70);
  assert.equal(insights[1].category, 'Software & Cloud');
  assert.equal(insights[1].percentageOfTotal, 30);

  const forecast = computeSpendingForecast({
    history: [
      { monthLabel: 'Jun', monthIndex: 1, actualSpend: 12000 },
      { monthLabel: 'Jul', monthIndex: 2, actualSpend: 13000 },
      { monthLabel: 'Aug', monthIndex: 3, actualSpend: 14000 },
      { monthLabel: 'Sep', monthIndex: 4, actualSpend: 15000 },
    ],
    currentSpend: 8000,
    dayOfMonth: 15,
    daysInMonth: 30,
    monthlyBudget: 14000,
  });

  assert.equal(forecast.regressionSlope, 1000);
  assert.equal(forecast.linearRegressionPrediction, 16000);
  assert.equal(forecast.isOverBudget, true);
  assert.ok(forecast.projectedMonthEnd > 14000);
});
