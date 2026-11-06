import React, { useEffect, useState } from 'react';
import {
  ExpenseGroup,
  TransactionCategory,
  TransactionEntity,
} from '../domain/fintechEngine';

const CATEGORIES: TransactionCategory[] = [
  'Housing & Utilities',
  'Food & Dining',
  'Transport & Transit',
  'Equipment & Gear',
  'Software & Cloud',
  'Settlement',
];

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: ExpenseGroup;
  isOnline: boolean;
  editingTransaction: TransactionEntity | null;
  onSubmit: (data: {
    title: string;
    amount: number;
    category: TransactionCategory;
    paidByUserId: string;
    splitBetweenUserIds: string[];
  }) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  group,
  isOnline,
  editingTransaction,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] =
    useState<TransactionCategory>('Food & Dining');
  const [paidByUserId, setPaidByUserId] = useState(
    group.members[0]?.id ?? 'usr-alex'
  );
  const [splitBetweenUserIds, setSplitBetweenUserIds] = useState<string[]>(
    group.members.map((m) => m.id)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setTitle(editingTransaction.title);
        setAmountInput(String(editingTransaction.amount));
        setCategory(editingTransaction.category);
        setPaidByUserId(editingTransaction.paidByUserId);
        setSplitBetweenUserIds(editingTransaction.splitBetweenUserIds);
      } else {
        setTitle('');
        setAmountInput('');
        setCategory('Food & Dining');
        setPaidByUserId(group.members[0]?.id ?? 'usr-alex');
        setSplitBetweenUserIds(group.members.map((m) => m.id));
      }
      setErrorMessage(null);
    }
  }, [isOpen, editingTransaction, group]);

  if (!isOpen) return null;

  const toggleParticipant = (userId: string) => {
    setSplitBetweenUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const numericAmount = Number(amountInput);

    if (!trimmedTitle) {
      setErrorMessage('Please enter an expense description.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter an amount greater than 0.');
      return;
    }
    if (splitBetweenUserIds.length === 0) {
      setErrorMessage('Select at least one member to split the expense.');
      return;
    }

    onSubmit({
      title: trimmedTitle,
      amount: numericAmount,
      category,
      paidByUserId,
      splitBetweenUserIds,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-transaction-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-lg bg-white border-2 border-black p-6">
        <div className="flex items-start justify-between pb-4 border-b border-neutral-300">
          <div>
            <h2
              id="modal-transaction-heading"
              className="text-lg font-bold tracking-tight text-black"
            >
              {editingTransaction ? 'Edit Expense' : 'Add Group Expense'}
            </h2>
            <p className="mt-1 text-xs text-neutral-600">
              {isOnline
                ? 'Saves locally and syncs with your group immediately.'
                : 'Offline Mode: Saves locally now and syncs automatically when back online.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="px-2.5 py-1 text-xs font-semibold text-black border border-black hover:bg-black hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 text-xs font-medium text-white bg-black"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="tx-title-input"
              className="block text-xs font-semibold text-black"
            >
              Description
            </label>
            <input
              id="tx-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Glacier Gondola Passes or Monthly Broadband"
              className="w-full mt-1.5 px-3 py-2 text-sm text-black bg-white border border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tx-amount-input"
                className="block text-xs font-semibold text-black"
              >
                Amount ({group.currency})
              </label>
              <input
                id="tx-amount-input"
                type="number"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full mt-1.5 px-3 py-2 text-sm text-black bg-white border border-black font-mono-tabular focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label
                htmlFor="tx-category-select"
                className="block text-xs font-semibold text-black"
              >
                Category
              </label>
              <select
                id="tx-category-select"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TransactionCategory)
                }
                className="w-full mt-1.5 px-3 py-2 text-sm text-black bg-white border border-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="tx-paidby-select"
              className="block text-xs font-semibold text-black"
            >
              Paid By
            </label>
            <select
              id="tx-paidby-select"
              value={paidByUserId}
              onChange={(e) => setPaidByUserId(e.target.value)}
              className="w-full mt-1.5 px-3 py-2 text-sm text-black bg-white border border-black focus:outline-none focus:ring-2 focus:ring-black"
            >
              {group.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.handle})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-black">
                Split Equally Between ({splitBetweenUserIds.length} Selected)
              </span>
              <button
                type="button"
                onClick={() =>
                  setSplitBetweenUserIds(group.members.map((m) => m.id))
                }
                className="text-xs underline text-neutral-700 hover:text-black"
              >
                Select All
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {group.members.map((member) => {
                const checked = splitBetweenUserIds.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-black text-white border-black font-medium'
                        : 'bg-white text-black border-neutral-300 hover:border-black'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParticipant(member.id)}
                      className="sr-only"
                    />
                    <span className="font-mono-tabular">
                      {checked ? '[x]' : '[ ]'}
                    </span>
                    <span className="truncate">{member.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-300 flex items-center justify-between gap-3">
            <div className="text-xs font-mono-tabular text-neutral-600">
              {editingTransaction
                ? `Version v${editingTransaction.version}`
                : 'New Entry · v1'}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-black bg-white border border-black hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors"
              >
                {editingTransaction ? 'Save Changes' : 'Save Expense'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
