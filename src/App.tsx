import React, { useEffect, useMemo, useState } from 'react';
import { ConflictResolutionView } from './components/ConflictResolutionView';
import { DebtSimplifierView } from './components/DebtSimplifierView';
import { ForecastInsightsView } from './components/ForecastInsightsView';
import { KotlinBlueprintView } from './components/KotlinBlueprintView';
import { LedgerSyncView } from './components/LedgerSyncView';
import { ActiveTab, TopBar } from './components/TopBar';
import { TransactionModal } from './components/TransactionModal';
import {
  HISTORICAL_MONTHLY_SPEND,
  INITIAL_GROUPS,
  INITIAL_SERVER_STORE,
  INITIAL_SYNC_LOGS,
  INITIAL_TRANSACTIONS,
} from './data/seedData';
import {
  ConflictResolutionStrategy,
  createOfflineTransaction,
  executeSyncCycle,
  ExpenseGroup,
  generateClientUuid,
  resolveTransactionConflict,
  ServerConflictSnapshot,
  SettlementTransfer,
  softDeleteLocalTransaction,
  SyncLogEntry,
  TransactionCategory,
  TransactionEntity,
  updateLocalTransaction,
} from './domain/fintechEngine';

const STORAGE_KEY_TX = 'syncledger_ssot_transactions_v1';
const STORAGE_KEY_SERVER = 'syncledger_server_store_v1';
const STORAGE_KEY_GROUPS = 'syncledger_groups_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ledger');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const [groups, setGroups] = useState<ExpenseGroup[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GROUPS);
      return saved ? JSON.parse(saved) : INITIAL_GROUPS;
    } catch {
      return INITIAL_GROUPS;
    }
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    INITIAL_GROUPS[0].id
  );

  const [transactions, setTransactions] = useState<TransactionEntity[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TX);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [serverStore, setServerStore] = useState<
    Record<string, ServerConflictSnapshot>
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SERVER);
      return saved ? JSON.parse(saved) : INITIAL_SERVER_STORE;
    } catch {
      return INITIAL_SERVER_STORE;
    }
  });

  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(INITIAL_SYNC_LOGS);
  const [liveBanner, setLiveBanner] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionEntity | null>(null);

  // Persist SSOT state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
    } catch {
      // Ignore quota errors
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SERVER, JSON.stringify(serverStore));
    } catch {
      // Ignore quota errors
    }
  }, [serverStore]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
    } catch {
      // Ignore quota errors
    }
  }, [groups]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId]
  );

  const totalConflictCount = useMemo(
    () =>
      transactions.filter(
        (t) => t.groupId === selectedGroup.id && t.syncStatus === 'CONFLICT'
      ).length,
    [transactions, selectedGroup.id]
  );

  const triggerBanner = (msg: string) => {
    setLiveBanner(msg);
  };

  // Run background synchronization
  const handleRunSyncNow = (overrideTxList?: TransactionEntity[]) => {
    const listToSync = overrideTxList ?? transactions;
    const now = Date.now();
    const result = executeSyncCycle(listToSync, serverStore, now);

    setTransactions(result.updatedTransactions);
    setServerStore(result.updatedServerStore);

    if (result.logs.length > 0) {
      setSyncLogs((prev) => [...result.logs, ...prev].slice(0, 40));
    }

    if (
      result.syncedCount === 0 &&
      result.deletedCount === 0 &&
      result.conflictCount === 0
    ) {
      triggerBanner('All local expenses are up to date with the group ledger.');
    } else {
      triggerBanner(
        `Sync complete: ${result.syncedCount} synced, ${result.deletedCount} removed, ${result.conflictCount} conflicts flagged.`
      );
    }
  };

  // Toggle Online / Offline Mode
  const handleToggleOnline = () => {
    setIsOnline((prev) => {
      const nextOnline = !prev;
      if (nextOnline) {
        setTimeout(() => {
          handleRunSyncNow();
        }, 50);
      } else {
        triggerBanner(
          'Offline Mode enabled: Changes save locally and will sync automatically when you reconnect.'
        );
      }
      return nextOnline;
    });
  };

  // Create or Update Transaction in Local SSOT
  const handleSaveTransaction = (data: {
    title: string;
    amount: number;
    category: TransactionCategory;
    paidByUserId: string;
    splitBetweenUserIds: string[];
  }) => {
    const now = Date.now();

    if (editingTransaction) {
      const updated = updateLocalTransaction(editingTransaction, data, now);
      const nextList = transactions.map((t) =>
        t.id === editingTransaction.id ? updated : t
      );
      setTransactions(nextList);

      const newLog: SyncLogEntry = {
        id: generateClientUuid(),
        timestamp: now,
        operation: 'Updated expense',
        entityId: updated.id,
        status: isOnline ? 'SUCCESS' : 'QUEUED_OFFLINE',
        detail: `Updated "${updated.title}" ($${updated.amount.toFixed(2)}).`,
      };
      setSyncLogs((prev) => [newLog, ...prev]);

      if (isOnline) {
        handleRunSyncNow(nextList);
      } else {
        triggerBanner(
          `Saved "${updated.title}" offline. Queued for background sync.`
        );
      }
    } else {
      const created = createOfflineTransaction({
        groupId: selectedGroup.id,
        title: data.title,
        amount: data.amount,
        category: data.category,
        paidByUserId: data.paidByUserId,
        splitBetweenUserIds: data.splitBetweenUserIds,
        now,
      });

      const nextList = [created, ...transactions];
      setTransactions(nextList);

      const newLog: SyncLogEntry = {
        id: generateClientUuid(),
        timestamp: now,
        operation: 'Added expense',
        entityId: created.id,
        status: isOnline ? 'SUCCESS' : 'QUEUED_OFFLINE',
        detail: `Added "${created.title}" ($${created.amount.toFixed(2)}).`,
      };
      setSyncLogs((prev) => [newLog, ...prev]);

      if (isOnline) {
        handleRunSyncNow(nextList);
      } else {
        triggerBanner(
          `Saved "${created.title}" ($${created.amount.toFixed(2)}) offline.`
        );
      }
    }
  };

  // Soft Delete Transaction
  const handleSoftDelete = (txId: string) => {
    const target = transactions.find((t) => t.id === txId);
    if (!target) return;

    const now = Date.now();
    const tombstone = softDeleteLocalTransaction(target, now);

    let nextList: TransactionEntity[];
    if (tombstone === null) {
      nextList = transactions.filter((t) => t.id !== txId);
      triggerBanner(`Removed unsynced draft "${target.title}".`);
    } else {
      nextList = transactions.map((t) => (t.id === txId ? tombstone : t));
      const newLog: SyncLogEntry = {
        id: generateClientUuid(),
        timestamp: now,
        operation: 'Deleted expense',
        entityId: target.id,
        status: 'QUEUED_OFFLINE',
        detail: `Marked "${target.title}" for deletion on next sync.`,
      };
      setSyncLogs((prev) => [newLog, ...prev]);
      triggerBanner(
        `Marked "${target.title}" for deletion. Click Sync Outbox to finalize removal.`
      );
    }

    setTransactions(nextList);
  };

  // Receive Shared Peer Expense
  const handleSimulateWebSocketPush = () => {
    const now = Date.now();
    const peerSamples = [
      {
        title: 'Gornergrat Alpine Cogwheel Tickets',
        amount: 420,
        category: 'Transport & Transit' as TransactionCategory,
        peerIndex: 1,
      },
      {
        title: 'Shared Fondue & Glacier Provisions',
        amount: 310,
        category: 'Food & Dining' as TransactionCategory,
        peerIndex: 2,
      },
      {
        title: 'Emergency Satellite Beacon Battery Pack',
        amount: 260,
        category: 'Equipment & Gear' as TransactionCategory,
        peerIndex: 3,
      },
    ];
    const sample =
      peerSamples[transactions.length % peerSamples.length] ?? peerSamples[0];
    const peerMember =
      selectedGroup.members[sample.peerIndex % selectedGroup.members.length] ??
      selectedGroup.members[0];

    const wsTx: TransactionEntity = {
      id: generateClientUuid(),
      groupId: selectedGroup.id,
      title: sample.title,
      amount: sample.amount,
      category: sample.category,
      paidByUserId: peerMember.id,
      splitBetweenUserIds: selectedGroup.members.map((m) => m.id),
      syncStatus: 'SYNCED',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    setTransactions((prev) => [wsTx, ...prev]);
    setServerStore((prev) => ({
      ...prev,
      [wsTx.id]: {
        title: wsTx.title,
        amount: wsTx.amount,
        category: wsTx.category,
        paidByUserId: wsTx.paidByUserId,
        updatedAt: now,
        version: 1,
        editedByName: peerMember.name,
      },
    }));

    const wsLog: SyncLogEntry = {
      id: generateClientUuid(),
      timestamp: now,
      operation: 'Shared update',
      entityId: wsTx.id,
      status: 'WEBSOCKET_PUSH',
      detail: `${peerMember.name} added "${wsTx.title}" ($${wsTx.amount.toFixed(2)}).`,
    };
    setSyncLogs((prev) => [wsLog, ...prev]);
    triggerBanner(
      `${peerMember.name} added "${wsTx.title}" ($${wsTx.amount.toFixed(2)}).`
    );
  };

  // Flag Concurrent Offline Edit (HTTP 409 Conflict)
  const handleSimulatePeerConflict = (specificTxId?: string) => {
    const now = Date.now();
    const candidates = transactions.filter(
      (t) =>
        t.groupId === selectedGroup.id &&
        t.syncStatus !== 'PENDING_DELETE' &&
        t.syncStatus !== 'CONFLICT'
    );

    const target = specificTxId
      ? transactions.find((t) => t.id === specificTxId)
      : candidates[0];

    if (!target) {
      triggerBanner('Add an expense first to test version conflict resolution.');
      return;
    }

    const peerEditor =
      selectedGroup.members.find((m) => m.id !== target.paidByUserId)?.name ??
      'Samira Khan';

    const serverConflictingAmount =
      Math.round((target.amount + 75) * 100) / 100;
    const localOfflineAmount = Math.round((target.amount + 25) * 100) / 100;
    const nextServerVersion = target.version + 1;

    const serverSnapshot: ServerConflictSnapshot = {
      title: `${target.title} (Updated)`,
      amount: serverConflictingAmount,
      category: target.category,
      paidByUserId: target.paidByUserId,
      updatedAt: now - 60000,
      version: nextServerVersion,
      editedByName: peerEditor,
    };

    const conflictedTx: TransactionEntity = {
      ...target,
      amount: localOfflineAmount,
      updatedAt: now,
      syncStatus: 'CONFLICT',
      conflictServerCopy: serverSnapshot,
    };

    setServerStore((prev) => ({
      ...prev,
      [target.id]: serverSnapshot,
    }));

    setTransactions((prev) =>
      prev.map((t) => (t.id === target.id ? conflictedTx : t))
    );

    const logEntry: SyncLogEntry = {
      id: generateClientUuid(),
      timestamp: now,
      operation: 'Version conflict',
      entityId: target.id,
      status: 'CONFLICT_409',
      detail: `Conflict on "${target.title}": Local v${target.version} ($${localOfflineAmount.toFixed(2)}) vs Server v${nextServerVersion} ($${serverConflictingAmount.toFixed(2)} by ${peerEditor}).`,
    };
    setSyncLogs((prev) => [logEntry, ...prev]);
    triggerBanner(
      `Version conflict flagged on "${target.title}" (Local v${target.version} vs Server v${nextServerVersion}).`
    );
  };

  // Resolve HTTP 409 Conflict
  const handleResolveConflict = (
    txId: string,
    strategy: ConflictResolutionStrategy,
    customMerge?: { title: string; amount: number }
  ) => {
    const target = transactions.find((t) => t.id === txId);
    if (!target) return;

    const now = Date.now();
    const resolved = resolveTransactionConflict(
      target,
      strategy,
      customMerge,
      now
    );

    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? resolved : t))
    );

    setServerStore((prev) => ({
      ...prev,
      [txId]: {
        title: resolved.title,
        amount: resolved.amount,
        category: resolved.category,
        paidByUserId: resolved.paidByUserId,
        updatedAt: resolved.updatedAt,
        version: resolved.version,
        editedByName: 'Resolved',
      },
    }));

    const logEntry: SyncLogEntry = {
      id: generateClientUuid(),
      timestamp: now,
      operation: 'Resolved conflict',
      entityId: resolved.id,
      status: 'SUCCESS',
      detail: `Resolved "${resolved.title}" -> $${resolved.amount.toFixed(2)} (v${resolved.version}).`,
    };
    setSyncLogs((prev) => [logEntry, ...prev]);
    triggerBanner(
      `Resolved conflict on "${resolved.title}" -> Saved v${resolved.version} ($${resolved.amount.toFixed(2)}).`
    );
  };

  // Settle a Simplified Debt Transfer
  const handleSettleDebt = (transfer: SettlementTransfer) => {
    const fromName =
      selectedGroup.members.find((m) => m.id === transfer.fromUserId)?.name ??
      transfer.fromUserId;
    const toName =
      selectedGroup.members.find((m) => m.id === transfer.toUserId)?.name ??
      transfer.toUserId;

    const now = Date.now();
    const settlementTx = createOfflineTransaction({
      groupId: selectedGroup.id,
      title: `Settlement: ${fromName} → ${toName}`,
      amount: transfer.amount,
      category: 'Settlement',
      paidByUserId: transfer.fromUserId,
      splitBetweenUserIds: [transfer.toUserId],
      now,
    });

    const syncedSettlement: TransactionEntity = isOnline
      ? { ...settlementTx, syncStatus: 'SYNCED' }
      : settlementTx;

    setTransactions((prev) => [syncedSettlement, ...prev]);
    triggerBanner(
      `Recorded payment of $${transfer.amount.toFixed(2)} from ${fromName} to ${toName}.`
    );
  };

  // Inject Pass-Through Split Example ($100)
  const handleInjectTransitiveDemo = () => {
    const members = selectedGroup.members;
    if (members.length < 3) return;
    const userA = members[0];
    const userB = members[1];
    const userC = members[2];
    const now = Date.now();

    const txAB = createOfflineTransaction({
      groupId: selectedGroup.id,
      title: `Shared Dinner (${userA.name} paid for ${userB.name})`,
      amount: 100,
      category: 'Food & Dining',
      paidByUserId: userA.id,
      splitBetweenUserIds: [userB.id],
      now: now - 1000,
    });

    const txBC = createOfflineTransaction({
      groupId: selectedGroup.id,
      title: `Train Tickets (${userB.name} paid for ${userC.name})`,
      amount: 100,
      category: 'Transport & Transit',
      paidByUserId: userB.id,
      splitBetweenUserIds: [userC.id],
      now,
    });

    const status = isOnline ? ('SYNCED' as const) : ('PENDING_CREATE' as const);
    setTransactions((prev) => [
      { ...txBC, syncStatus: status },
      { ...txAB, syncStatus: status },
      ...prev,
    ]);

    triggerBanner(
      `Added pass-through split: ${userC.name} owes ${userB.name} $100, and ${userB.name} owes ${userA.name} $100 -> Simplified so ${userC.name} pays ${userA.name} $100 directly.`
    );
  };

  const handleUpdateGroupBudget = (groupId: string, newBudget: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, monthlyBudget: newBudget } : g
      )
    );
    triggerBanner(
      `Updated monthly budget for ${selectedGroup.name} to $${newBudget.toLocaleString('en-US')}.`
    );
  };

  const handleExportCsv = () => {
    const groupTx = transactions.filter((t) => t.groupId === selectedGroup.id);
    const header = 'id,title,category,amount,paid_by,sync_status,version,updated_at\n';
    const rows = groupTx
      .map(
        (t) =>
          `"${t.id}","${t.title.replace(/"/g, '""')}","${t.category}",${t.amount},"${t.paidByUserId}","${t.syncStatus}",${t.version},"${new Date(t.updatedAt).toISOString()}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedGroup.id}-ledger.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetDemoData = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    setServerStore(INITIAL_SERVER_STORE);
    setGroups(INITIAL_GROUPS);
    setSyncLogs(INITIAL_SYNC_LOGS);
    setIsOnline(true);
    triggerBanner('Restored default sample expenses.');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      {/* Top Navigation Bar */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        conflictCount={totalConflictCount}
        onOpenNewExpense={() => {
          setEditingTransaction(null);
          setIsModalOpen(true);
        }}
      />

      {/* Notification Banner */}
      {liveBanner && (
        <div
          role="status"
          aria-live="polite"
          className="px-6 py-2.5 bg-black text-white border-b border-black flex items-center justify-between gap-4 text-xs"
        >
          <span className="font-mono-tabular">{liveBanner}</span>
          <button
            type="button"
            onClick={() => setLiveBanner(null)}
            className="underline font-semibold shrink-0 hover:text-neutral-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'ledger' && (
          <LedgerSyncView
            groups={groups}
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroupId}
            transactions={transactions}
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            onRunSyncNow={() => handleRunSyncNow()}
            onSimulateWebSocketPush={handleSimulateWebSocketPush}
            onSimulatePeerConflict={handleSimulatePeerConflict}
            onOpenNewExpense={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsModalOpen(true);
            }}
            onSoftDeleteTransaction={handleSoftDelete}
            onOpenConflictCenter={() => setActiveTab('conflicts')}
            syncLogs={syncLogs}
          />
        )}

        {activeTab === 'conflicts' && (
          <ConflictResolutionView
            group={selectedGroup}
            transactions={transactions.filter(
              (t) => t.groupId === selectedGroup.id
            )}
            onResolveConflict={handleResolveConflict}
            onSimulateNewConflict={() => handleSimulatePeerConflict()}
          />
        )}

        {activeTab === 'debts' && (
          <DebtSimplifierView
            group={selectedGroup}
            transactions={transactions}
            onSettleDebt={handleSettleDebt}
            onInjectTransitiveDemo={handleInjectTransitiveDemo}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastInsightsView
            group={selectedGroup}
            transactions={transactions}
            history={
              HISTORICAL_MONTHLY_SPEND[selectedGroup.id] ??
              HISTORICAL_MONTHLY_SPEND['grp-alpine-expedition']
            }
            onUpdateGroupBudget={handleUpdateGroupBudget}
          />
        )}

        {activeTab === 'blueprint' && <KotlinBlueprintView />}
      </main>

      {/* Clean Single-Line Product Footer */}
      <footer className="border-t border-black bg-white px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="whitespace-nowrap">
            <strong className="text-black">SyncLedger</strong> · Shared Expense
            &amp; Bill Split Manager
          </div>
          <div className="flex flex-wrap items-center gap-5 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="underline text-black font-medium hover:text-neutral-700 whitespace-nowrap shrink-0"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('blueprint')}
              className="underline text-black font-medium hover:text-neutral-700 whitespace-nowrap shrink-0"
            >
              GitHub README &amp; Kotlin Code
            </button>
            <button
              type="button"
              onClick={handleResetDemoData}
              className="underline text-neutral-600 hover:text-black whitespace-nowrap shrink-0"
            >
              Reset Sample Data
            </button>
          </div>
        </div>
      </footer>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        group={selectedGroup}
        isOnline={isOnline}
        editingTransaction={editingTransaction}
        onSubmit={handleSaveTransaction}
      />
    </div>
  );
}
