import React, { useState } from 'react';
import {
  ConflictResolutionStrategy,
  ExpenseGroup,
  TransactionEntity,
} from '../domain/fintechEngine';

interface ConflictResolutionViewProps {
  group: ExpenseGroup;
  transactions: TransactionEntity[];
  onResolveConflict: (
    txId: string,
    strategy: ConflictResolutionStrategy,
    customMerge?: { title: string; amount: number }
  ) => void;
  onSimulateNewConflict: () => void;
}

export const ConflictResolutionView: React.FC<ConflictResolutionViewProps> = ({
  group,
  transactions,
  onResolveConflict,
  onSimulateNewConflict,
}) => {
  const conflicts = transactions.filter((t) => t.syncStatus === 'CONFLICT');
  const [customEditId, setCustomEditId] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  const getMemberName = (userId: string) =>
    group.members.find((m) => m.id === userId)?.name ?? userId;

  const openCustomMerge = (tx: TransactionEntity) => {
    setCustomEditId(tx.id);
    setCustomTitle(tx.title);
    const avgAmount = tx.conflictServerCopy
      ? Math.round(((tx.amount + tx.conflictServerCopy.amount) / 2) * 100) /
        100
      : tx.amount;
    setCustomAmount(String(avgAmount));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-black">
        <div className="space-y-1 max-w-3xl">
          <h1 className="text-xl font-bold tracking-tight text-black">
            Sync Conflicts & Version Review
          </h1>
          <p className="text-xs text-neutral-600">
            When two group members edit the same expense while offline,
            optimistic locking flags a version mismatch (HTTP 409) so neither
            member&rsquo;s changes are silently overwritten.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onSimulateNewConflict}
            className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors whitespace-nowrap"
          >
            Create Sample Version Conflict
          </button>
        </div>
      </section>

      {/* How Optimistic Locking Works */}
      <section className="grid grid-cols-1 md:grid-cols-4 border border-black divide-y md:divide-y-0 md:divide-x divide-black bg-white text-xs">
        <div className="p-4">
          <div className="font-semibold text-black">01. Shared Baseline</div>
          <div className="mt-1 text-neutral-600">
            Both members start with the same expense cached locally at{' '}
            <span className="font-mono-tabular">v1</span>.
          </div>
        </div>
        <div className="p-4">
          <div className="font-semibold text-black">02. Offline Edits</div>
          <div className="mt-1 text-neutral-600">
            Both members edit the amount on their devices before reconnecting.
          </div>
        </div>
        <div className="p-4">
          <div className="font-semibold text-black">03. Version Check</div>
          <div className="mt-1 text-neutral-600">
            First member syncs and increments the record to{' '}
            <span className="font-mono-tabular">v2</span>. Second member gets a{' '}
            <span className="font-mono-tabular">409</span> conflict.
          </div>
        </div>
        <div className="p-4">
          <div className="font-semibold text-black">04. Clean Resolution</div>
          <div className="mt-1 text-neutral-600">
            Keep your edit, accept the server version, or merge both into{' '}
            <span className="font-mono-tabular">v3</span>.
          </div>
        </div>
      </section>

      {/* Active Conflicts List */}
      {conflicts.length === 0 ? (
        <section className="border border-black bg-white p-10 text-center space-y-4">
          <h2 className="text-base font-bold text-black">
            All Group Expenses Are in Sync
          </h2>
          <p className="text-xs text-neutral-600 max-w-lg mx-auto">
            There are no unresolved version conflicts in {group.name}. You can
            trigger a sample concurrent edit below to test the side-by-side
            resolution workflow.
          </p>
          <button
            type="button"
            onClick={onSimulateNewConflict}
            className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors"
          >
            Create Sample Version Conflict
          </button>
        </section>
      ) : (
        <div className="space-y-6">
          {conflicts.map((tx) => {
            const server = tx.conflictServerCopy;
            const localNewer = server ? tx.updatedAt >= server.updatedAt : true;

            return (
              <section
                key={tx.id}
                aria-label={`Conflict for ${tx.title}`}
                className="border-2 border-black bg-white p-6 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-neutral-300">
                  <div>
                    <div className="text-xs font-mono-tabular text-neutral-600">
                      Reference: {tx.id.slice(0, 8)} · Group: {group.name}
                    </div>
                    <h2 className="text-base font-bold text-black mt-0.5">
                      {tx.title}
                    </h2>
                  </div>
                  <div className="text-xs font-mono-tabular font-semibold text-black">
                    Most recent edit:{' '}
                    {localNewer ? 'Your Local Device' : server?.editedByName ?? 'Server Version'}
                  </div>
                </div>

                {/* Side-by-Side Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Local Client Version */}
                  <div className="border border-black p-5 bg-neutral-50 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-300 pb-2">
                      <span className="text-xs font-bold text-black">
                        Your Offline Edit (Local)
                      </span>
                      <span className="text-xs font-mono-tabular font-semibold text-black">
                        Base Version: v{tx.version}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-y-2 text-xs">
                      <dt className="text-neutral-600">Description:</dt>
                      <dd className="font-semibold text-black text-right">
                        {tx.title}
                      </dd>
                      <dt className="text-neutral-600">Amount:</dt>
                      <dd className="font-mono-tabular font-bold text-base text-black text-right">
                        ${tx.amount.toFixed(2)}
                      </dd>
                      <dt className="text-neutral-600">Category:</dt>
                      <dd className="text-black text-right">{tx.category}</dd>
                      <dt className="text-neutral-600">Paid By:</dt>
                      <dd className="text-black text-right">
                        {getMemberName(tx.paidByUserId)}
                      </dd>
                      <dt className="text-neutral-600">Edited At:</dt>
                      <dd className="font-mono-tabular text-black text-right">
                        {new Date(tx.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </dd>
                    </dl>
                  </div>

                  {/* Remote Server Version */}
                  <div className="border border-black p-5 bg-white space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-300 pb-2">
                      <span className="text-xs font-bold text-black">
                        Member&rsquo;s Synced Edit (Server)
                      </span>
                      <span className="text-xs font-mono-tabular font-semibold text-black">
                        Server Version: v{server?.version ?? tx.version + 1}
                      </span>
                    </div>
                    <dl className="grid grid-cols-2 gap-y-2 text-xs">
                      <dt className="text-neutral-600">Description:</dt>
                      <dd className="font-semibold text-black text-right">
                        {server?.title ?? tx.title}
                      </dd>
                      <dt className="text-neutral-600">Amount:</dt>
                      <dd className="font-mono-tabular font-bold text-base text-black text-right">
                        ${(server?.amount ?? tx.amount).toFixed(2)}
                      </dd>
                      <dt className="text-neutral-600">Category:</dt>
                      <dd className="text-black text-right">
                        {server?.category ?? tx.category}
                      </dd>
                      <dt className="text-neutral-600">Edited By:</dt>
                      <dd className="text-black text-right">
                        {server?.editedByName ?? 'Group Member'}
                      </dd>
                      <dt className="text-neutral-600">Synced At:</dt>
                      <dd className="font-mono-tabular text-black text-right">
                        {new Date(
                          server?.updatedAt ?? tx.updatedAt
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </dd>
                    </dl>
                  </div>
                </div>

                {/* Custom Merge Inline Form if opened */}
                {customEditId === tx.id && (
                  <div className="border border-black p-4 bg-neutral-100 space-y-3">
                    <div className="text-xs font-bold text-black">
                      Merge Details Manually (Saves as v
                      {(server?.version ?? tx.version) + 1})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor={`merge-title-${tx.id}`}
                          className="block text-xs font-medium text-neutral-700"
                        >
                          Expense Description
                        </label>
                        <input
                          id={`merge-title-${tx.id}`}
                          type="text"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-black"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`merge-amount-${tx.id}`}
                          className="block text-xs font-medium text-neutral-700"
                        >
                          Final Amount (USD)
                        </label>
                        <input
                          id={`merge-amount-${tx.id}`}
                          type="number"
                          step="0.01"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 text-xs font-mono-tabular bg-white border border-black"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = Number(customAmount);
                          if (Number.isFinite(parsed) && parsed > 0) {
                            onResolveConflict(tx.id, 'CUSTOM_MERGE', {
                              title: customTitle,
                              amount: parsed,
                            });
                            setCustomEditId(null);
                          }
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800"
                      >
                        Save Merged Version
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomEditId(null)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-black bg-white border border-black"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolution Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-neutral-600">
                    Select which version should become the official group
                    record:
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onResolveConflict(tx.id, 'LOCAL_WINS')}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors"
                    >
                      Keep My Edit (${tx.amount.toFixed(2)})
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveConflict(tx.id, 'SERVER_WINS')}
                      className="px-3.5 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      Keep Server Version ($
                      {(server?.amount ?? tx.amount).toFixed(2)})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onResolveConflict(tx.id, 'LAST_WRITE_WINS')
                      }
                      className="px-3.5 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors"
                    >
                      Use Most Recent Timestamp
                    </button>
                    <button
                      type="button"
                      onClick={() => openCustomMerge(tx)}
                      className="px-3.5 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 transition-colors"
                    >
                      Merge Manually...
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
