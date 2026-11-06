import React, { useMemo, useState } from 'react';
import {
  ExpenseGroup,
  SyncLogEntry,
  TransactionEntity,
} from '../domain/fintechEngine';

interface LedgerSyncViewProps {
  groups: ExpenseGroup[];
  selectedGroup: ExpenseGroup;
  onSelectGroup: (groupId: string) => void;
  transactions: TransactionEntity[];
  isOnline: boolean;
  onToggleOnline: () => void;
  onRunSyncNow: () => void;
  onSimulateWebSocketPush: () => void;
  onSimulatePeerConflict: (txId?: string) => void;
  onOpenNewExpense: () => void;
  onEditTransaction: (tx: TransactionEntity) => void;
  onSoftDeleteTransaction: (txId: string) => void;
  onOpenConflictCenter: () => void;
  syncLogs: SyncLogEntry[];
}

type StatusFilter =
  | 'ALL'
  | 'SYNCED'
  | 'PENDING'
  | 'CONFLICT'
  | 'PENDING_DELETE';

export const LedgerSyncView: React.FC<LedgerSyncViewProps> = ({
  groups,
  selectedGroup,
  onSelectGroup,
  transactions,
  isOnline,
  onToggleOnline,
  onRunSyncNow,
  onSimulateWebSocketPush,
  onSimulatePeerConflict,
  onOpenNewExpense,
  onEditTransaction,
  onSoftDeleteTransaction,
  onOpenConflictCenter,
  syncLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const groupTransactions = useMemo(
    () => transactions.filter((t) => t.groupId === selectedGroup.id),
    [transactions, selectedGroup.id]
  );

  const activeSpend = useMemo(
    () =>
      groupTransactions
        .filter(
          (t) =>
            t.syncStatus !== 'PENDING_DELETE' && t.category !== 'Settlement'
        )
        .reduce((sum, t) => sum + t.amount, 0),
    [groupTransactions]
  );

  const pendingSyncCount = useMemo(
    () =>
      groupTransactions.filter(
        (t) =>
          t.syncStatus === 'PENDING_CREATE' ||
          t.syncStatus === 'PENDING_UPDATE' ||
          t.syncStatus === 'PENDING_DELETE'
      ).length,
    [groupTransactions]
  );

  const tombstoneCount = useMemo(
    () =>
      groupTransactions.filter((t) => t.syncStatus === 'PENDING_DELETE').length,
    [groupTransactions]
  );

  const conflictCount = useMemo(
    () => groupTransactions.filter((t) => t.syncStatus === 'CONFLICT').length,
    [groupTransactions]
  );

  const filteredTransactions = useMemo(() => {
    return groupTransactions.filter((tx) => {
      if (statusFilter === 'SYNCED' && tx.syncStatus !== 'SYNCED') return false;
      if (
        statusFilter === 'PENDING' &&
        tx.syncStatus !== 'PENDING_CREATE' &&
        tx.syncStatus !== 'PENDING_UPDATE'
      ) {
        return false;
      }
      if (statusFilter === 'CONFLICT' && tx.syncStatus !== 'CONFLICT')
        return false;
      if (
        statusFilter === 'PENDING_DELETE' &&
        tx.syncStatus !== 'PENDING_DELETE'
      ) {
        return false;
      }
      if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(q);
        const matchesUuid = tx.id.toLowerCase().includes(q);
        const matchesCategory = tx.category.toLowerCase().includes(q);
        return matchesTitle || matchesUuid || matchesCategory;
      }
      return true;
    });
  }, [groupTransactions, statusFilter, categoryFilter, searchQuery]);

  const getMemberName = (userId: string): string => {
    const found = selectedGroup.members.find((m) => m.id === userId);
    return found ? found.name : userId;
  };

  const formatSyncStatusLabel = (tx: TransactionEntity): string => {
    switch (tx.syncStatus) {
      case 'SYNCED':
        return `Synced · v${tx.version}`;
      case 'PENDING_CREATE':
        return `Queued Offline · v${tx.version}`;
      case 'PENDING_UPDATE':
        return `Edited Offline · v${tx.version}`;
      case 'PENDING_DELETE':
        return `Pending Delete · v${tx.version}`;
      case 'CONFLICT':
        return `Conflict (409) · v${tx.version} vs v${tx.conflictServerCopy?.version ?? '?'}`;
      default:
        return tx.syncStatus;
    }
  };

  return (
    <div className="space-y-8">
      {/* Workspace Header & Controls */}
      <section
        aria-label="Group and Connectivity Controls"
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-black"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="group-selector" className="sr-only">
              Select Group
            </label>
            <select
              id="group-selector"
              value={selectedGroup.id}
              onChange={(e) => onSelectGroup(e.target.value)}
              className="px-3 py-1.5 text-base font-bold text-black bg-white border-2 border-black focus:outline-none"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-neutral-600">
              {selectedGroup.description} · {selectedGroup.members.length}{' '}
              members
            </span>
          </div>
          <p className="text-xs text-neutral-600">
            Expenses save to local storage first so you can record and split
            bills without internet access.
          </p>
        </div>

        {/* Network Mode & Sync Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleOnline}
            aria-pressed={!isOnline}
            className={`px-3.5 py-2 text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              isOnline
                ? 'bg-white text-black border-black hover:bg-neutral-100'
                : 'bg-black text-white border-black'
            }`}
          >
            {isOnline ? 'Status: Online' : 'Status: Offline Mode'}
          </button>

          <button
            type="button"
            onClick={onRunSyncNow}
            className="px-3.5 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Sync Outbox ({pendingSyncCount})
          </button>

          <button
            type="button"
            onClick={onSimulateWebSocketPush}
            className="px-3.5 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Receive Shared Bill
          </button>

          <button
            type="button"
            onClick={() => onSimulatePeerConflict()}
            className="px-3.5 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Flag Version Conflict
          </button>
        </div>
      </section>

      {/* 4-Column Full-Width Summary Strip */}
      <section
        aria-label="Group Expense Summary"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-black divide-y sm:divide-y-0 sm:divide-x divide-black"
      >
        <div className="p-5 bg-white">
          <div className="text-xs font-medium text-neutral-600">
            Total Group Spend
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            $
            {activeSpend.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-1 text-xs text-neutral-600 font-mono-tabular">
            Monthly budget: ${selectedGroup.monthlyBudget.toLocaleString('en-US')}{' '}
            ·{' '}
            {
              groupTransactions.filter((t) => t.syncStatus !== 'PENDING_DELETE')
                .length
            }{' '}
            entries
          </div>
        </div>

        <div className="p-5 bg-white">
          <div className="text-xs font-medium text-neutral-600">
            Outbox Sync Queue
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            {pendingSyncCount} Queued
          </div>
          <div className="mt-1 text-xs text-neutral-600 font-mono-tabular">
            {tombstoneCount} pending deletions · Auto-sync enabled
          </div>
        </div>

        <div className="p-5 bg-white">
          <div className="text-xs font-medium text-neutral-600">
            Version Conflicts
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono-tabular text-black">
              {conflictCount} {conflictCount === 1 ? 'Conflict' : 'Conflicts'}
            </span>
            {conflictCount > 0 && (
              <button
                type="button"
                onClick={onOpenConflictCenter}
                className="text-xs font-semibold underline text-black hover:text-neutral-700 whitespace-nowrap"
              >
                Review →
              </button>
            )}
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            Concurrent offline edits requiring review
          </div>
        </div>

        <div className="p-5 bg-white">
          <div className="text-xs font-medium text-neutral-600">
            Connection & Local Store
          </div>
          <div className="mt-2 text-lg font-bold font-mono-tabular text-black">
            {isOnline ? 'Online · Live Sync' : 'Offline · Local Only'}
          </div>
          <div className="mt-1 text-xs text-neutral-600 font-mono-tabular">
            SQLite SSOT · Encrypted · Client UUID v4
          </div>
        </div>
      </section>

      {/* Search & Segmented Status Filter Bar */}
      <section
        aria-label="Filter Expenses"
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 border border-black">
          {(
            [
              { id: 'ALL', label: `All (${groupTransactions.length})` },
              {
                id: 'SYNCED',
                label: `Synced (${groupTransactions.filter((t) => t.syncStatus === 'SYNCED').length})`,
              },
              {
                id: 'PENDING',
                label: `Unsynced (${groupTransactions.filter((t) => t.syncStatus === 'PENDING_CREATE' || t.syncStatus === 'PENDING_UPDATE').length})`,
              },
              {
                id: 'CONFLICT',
                label: `Conflicts (${conflictCount})`,
              },
              {
                id: 'PENDING_DELETE',
                label: `Deleted (${tombstoneCount})`,
              },
            ] as { id: StatusFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-black text-white'
                  : 'bg-transparent text-neutral-700 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="category-filter-select" className="sr-only">
            Filter by Category
          </label>
          <select
            id="category-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium text-black bg-white border border-black focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Housing & Utilities">Housing & Utilities</option>
            <option value="Food & Dining">Food & Dining</option>
            <option value="Transport & Transit">Transport & Transit</option>
            <option value="Equipment & Gear">Equipment & Gear</option>
            <option value="Software & Cloud">Software & Cloud</option>
            <option value="Settlement">Settlement</option>
          </select>

          <label htmlFor="ledger-search-input" className="sr-only">
            Search Expenses
          </label>
          <input
            id="ledger-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expenses or ID..."
            className="w-60 px-3 py-1.5 text-xs text-black bg-white border border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </section>

      {/* Expenses Ledger Table */}
      <section aria-label="Group Expenses Table">
        <div className="border border-black bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black bg-neutral-100 text-xs font-semibold text-black">
                <th className="py-3 px-4 font-mono-tabular">Reference</th>
                <th className="py-3 px-4">Expense</th>
                <th className="py-3 px-4">Paid By · Split</th>
                <th className="py-3 px-4">Sync Status</th>
                <th className="py-3 px-4 text-right font-mono-tabular">
                  Amount
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-sm font-semibold text-black">
                        No expenses match your current filter.
                      </p>
                      <p className="text-xs text-neutral-600">
                        Add a new group expense to split costs across members,
                        even while working offline.
                      </p>
                      <button
                        type="button"
                        onClick={onOpenNewExpense}
                        className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors"
                      >
                        Add First Expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isTombstone = tx.syncStatus === 'PENDING_DELETE';
                  const isConflict = tx.syncStatus === 'CONFLICT';
                  return (
                    <tr
                      key={tx.id}
                      className={`transition-colors ${
                        isTombstone
                          ? 'bg-neutral-100 text-neutral-500 line-through'
                          : isConflict
                            ? 'bg-neutral-50 font-medium'
                            : 'hover:bg-neutral-50'
                      }`}
                    >
                      <td className="py-3 px-4 align-top font-mono-tabular text-xs text-neutral-700 whitespace-nowrap">
                        <div>{tx.id.slice(0, 8)}</div>
                        <div className="text-[11px] text-neutral-500">
                          {new Date(tx.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-black">
                          {tx.title}
                        </div>
                        <div className="text-xs text-neutral-600 mt-0.5">
                          {tx.category}
                          {isConflict && tx.conflictServerCopy && (
                            <span className="text-black font-semibold">
                              {' '}
                              · Server version: $
                              {tx.conflictServerCopy.amount.toFixed(2)} (v
                              {tx.conflictServerCopy.version})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-xs text-neutral-700">
                        <div className="font-medium text-black">
                          {getMemberName(tx.paidByUserId)}
                        </div>
                        <div className="text-neutral-600 mt-0.5">
                          Split: {tx.splitBetweenUserIds.length} member
                          {tx.splitBetweenUserIds.length === 1 ? '' : 's'} ($
                          {(
                            tx.amount /
                            Math.max(1, tx.splitBetweenUserIds.length)
                          ).toFixed(2)}{' '}
                          each)
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top font-mono-tabular text-xs whitespace-nowrap">
                        <span
                          className={
                            isConflict
                              ? 'font-bold text-black underline'
                              : isTombstone
                                ? 'text-neutral-500'
                                : 'text-neutral-800'
                          }
                        >
                          {formatSyncStatusLabel(tx)}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-top text-right font-mono-tabular font-semibold text-black whitespace-nowrap">
                        $
                        {tx.amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {isConflict ? (
                            <button
                              type="button"
                              onClick={onOpenConflictCenter}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors"
                            >
                              Resolve
                            </button>
                          ) : (
                            !isTombstone && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onEditTransaction(tx)}
                                  aria-label={`Edit ${tx.title}`}
                                  className="px-2.5 py-1 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSimulatePeerConflict(tx.id)}
                                  aria-label={`Flag version conflict on ${tx.title}`}
                                  className="px-2.5 py-1 text-xs font-medium text-black bg-white border border-neutral-400 hover:border-black transition-colors"
                                >
                                  Conflict
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSoftDeleteTransaction(tx.id)}
                                  aria-label={`Delete ${tx.title}`}
                                  className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:border-black hover:text-black transition-colors"
                                >
                                  Delete
                                </button>
                              </>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sync Activity Log */}
      <section
        aria-label="Recent Sync Activity"
        className="border border-black bg-white p-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-300">
          <div>
            <h2 className="text-sm font-bold text-black">
              Recent Sync & Ledger Activity
            </h2>
            <p className="text-xs text-neutral-600">
              History of background sync runs, offline saves, and shared member
              updates.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-neutral-600">
            {syncLogs.length} events
          </span>
        </div>

        <div className="mt-3 divide-y divide-neutral-200 max-h-56 overflow-y-auto">
          {syncLogs.map((entry) => (
            <div
              key={entry.id}
              className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 text-xs"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono-tabular font-semibold text-black whitespace-nowrap">
                  {entry.status === 'CONFLICT_409'
                    ? 'Conflict'
                    : entry.status === 'QUEUED_OFFLINE'
                      ? 'Saved Offline'
                      : entry.status === 'WEBSOCKET_PUSH'
                        ? 'Live Update'
                        : 'Synced'}
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-800">{entry.detail}</span>
              </div>
              <span className="font-mono-tabular text-neutral-500 whitespace-nowrap shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
