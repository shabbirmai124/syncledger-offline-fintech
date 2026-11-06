import React, { useMemo } from 'react';
import {
  calculateGroupBalancesAndSimplification,
  ExpenseGroup,
  SettlementTransfer,
  TransactionEntity,
} from '../domain/fintechEngine';

interface DebtSimplifierViewProps {
  group: ExpenseGroup;
  transactions: TransactionEntity[];
  onSettleDebt: (transfer: SettlementTransfer) => void;
  onInjectTransitiveDemo: () => void;
}

export const DebtSimplifierView: React.FC<DebtSimplifierViewProps> = ({
  group,
  transactions,
  onSettleDebt,
  onInjectTransitiveDemo,
}) => {
  const groupTransactions = useMemo(
    () => transactions.filter((t) => t.groupId === group.id),
    [transactions, group.id]
  );

  const memberIds = useMemo(
    () => group.members.map((m) => m.id),
    [group.members]
  );

  const simplification = useMemo(
    () =>
      calculateGroupBalancesAndSimplification(groupTransactions, memberIds),
    [groupTransactions, memberIds]
  );

  const getMemberName = (userId: string) =>
    group.members.find((m) => m.id === userId)?.name ?? userId;

  const getMemberHandle = (userId: string) =>
    group.members.find((m) => m.id === userId)?.handle ?? '';

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-black">
        <div className="space-y-1 max-w-3xl">
          <h1 className="text-xl font-bold tracking-tight text-black">
            Group Balances & Smart Settlement
          </h1>
          <p className="text-xs text-neutral-600">
            Automatically simplifies circular and pass-through debts across
            members (for example, if C owes B $100 and B owes A $100, C pays A
            $100 directly) to minimize the number of payments required.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onInjectTransitiveDemo}
            className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-black hover:text-white transition-colors whitespace-nowrap"
          >
            Add Pass-Through Split Example ($100)
          </button>
        </div>
      </section>

      {/* 4-Column Optimization Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-black divide-y sm:divide-y-0 sm:divide-x divide-black bg-white">
        <div className="p-5">
          <div className="text-xs font-medium text-neutral-600">
            Individual Bill Splits
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            {simplification.rawPairwiseCount} Splits
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            Total pairwise IOUs before simplification
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-neutral-600">
            Payments Needed to Settle
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            {simplification.simplifiedCount} Payments
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            At most {group.members.length - 1} transfers for{' '}
            {group.members.length} members
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-neutral-600">
            Transfers Eliminated
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            {simplification.transactionsSaved} Fewer
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            Redundant intermediate payments removed
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-neutral-600">
            Transfer Reduction
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            {simplification.reductionPercent}% Saved
          </div>
          <div className="mt-1 text-xs text-neutral-600">
            Simplified via net-balance matching
          </div>
        </div>
      </section>

      {/* Member Net Balance Ledger */}
      <section aria-label="Member Net Balances" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-black">
            01. Member Standing (Total Paid vs. Fair Share)
          </h2>
          <span className="text-xs font-mono-tabular text-neutral-600">
            {group.name}
          </span>
        </div>

        <div className="border border-black bg-white overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black bg-neutral-100 text-xs font-semibold text-black">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4 text-right font-mono-tabular">
                  Total Paid
                </th>
                <th className="py-3 px-4 text-right font-mono-tabular">
                  Fair Share
                </th>
                <th className="py-3 px-4 text-right font-mono-tabular">
                  Net Balance
                </th>
                <th className="py-3 px-4">Standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-sm">
              {simplification.netBalances.map((b) => {
                const isCreditor = b.net > 0.01;
                const isDebtor = b.net < -0.01;
                return (
                  <tr key={b.userId} className="hover:bg-neutral-50">
                    <td className="py-3 px-4 font-semibold text-black">
                      {getMemberName(b.userId)}{' '}
                      <span className="font-normal text-xs text-neutral-500 font-mono-tabular">
                        {getMemberHandle(b.userId)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-neutral-800">
                      ${b.paid.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-neutral-800">
                      ${b.owed.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-bold text-black">
                      {b.net >= 0
                        ? `+$${b.net.toFixed(2)}`
                        : `-$${Math.abs(b.net).toFixed(2)}`}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono-tabular text-neutral-700">
                      {isCreditor
                        ? `Gets back $${b.net.toFixed(2)}`
                        : isDebtor
                          ? `Owes $${Math.abs(b.net).toFixed(2)}`
                          : 'Settled up ($0.00)'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Side-by-Side Comparison: Simplified vs Raw Pairwise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Simplified Minimum Settlement Instructions */}
        <section
          aria-label="Recommended Settlement Plan"
          className="border-2 border-black bg-white p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-black flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-black">
                  02. Recommended Settlement Plan ({simplification.simplifiedCount})
                </h2>
                <p className="text-xs text-neutral-600">
                  Fewest direct payments required so everyone is settled up.
                </p>
              </div>
              <span className="text-xs font-mono-tabular font-semibold text-black">
                SIMPLIFIED
              </span>
            </div>

            {simplification.simplifiedTransfers.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-600">
                Everyone in this group is completely settled up.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {simplification.simplifiedTransfers.map((tr, idx) => (
                  <div
                    key={`${tr.fromUserId}-${tr.toUserId}-${idx}`}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-black">
                        {getMemberName(tr.fromUserId)}{' '}
                        <span className="font-mono-tabular text-xs font-normal text-neutral-600">
                          pays
                        </span>{' '}
                        {getMemberName(tr.toUserId)}
                      </div>
                      <div className="text-xs font-mono-tabular text-neutral-500">
                        Payment {idx + 1} of {simplification.simplifiedCount}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base font-bold font-mono-tabular text-black">
                        ${tr.amount.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSettleDebt(tr)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors"
                      >
                        Record Payment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-200 text-xs text-neutral-600">
            Recording a payment adds a settlement entry to the group ledger and
            updates member balances immediately.
          </div>
        </section>

        {/* Raw Pairwise Unsimplified Debts */}
        <section
          aria-label="Unsimplified Bill Splits"
          className="border border-black bg-neutral-50 p-6 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-neutral-300 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-black">
                  03. Unsimplified Bill-by-Bill IOUs ({simplification.rawPairwiseCount})
                </h2>
                <p className="text-xs text-neutral-600">
                  Raw member-to-member obligations before net-balance reduction.
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-neutral-600">
                RAW SPLITS
              </span>
            </div>

            {simplification.rawPairwiseTransfers.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-600">
                No individual bill splits recorded.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 max-h-72 overflow-y-auto">
                {simplification.rawPairwiseTransfers.map((raw, idx) => (
                  <div
                    key={`${raw.fromUserId}-${raw.toUserId}-${idx}`}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="text-neutral-700">
                      <strong className="text-black">
                        {getMemberName(raw.fromUserId)}
                      </strong>{' '}
                      owes{' '}
                      <strong className="text-black">
                        {getMemberName(raw.toUserId)}
                      </strong>
                    </span>
                    <span className="font-mono-tabular font-semibold text-neutral-800">
                      ${raw.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-300 text-xs font-mono-tabular text-neutral-600">
            Smart simplification saves {simplification.transactionsSaved}{' '}
            separate transfers ({simplification.reductionPercent}% reduction).
          </div>
        </section>
      </div>
    </div>
  );
};
