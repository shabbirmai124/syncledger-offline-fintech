import React from 'react';

export type ActiveTab =
  | 'ledger'
  | 'conflicts'
  | 'debts'
  | 'forecast'
  | 'blueprint';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  conflictCount: number;
  onOpenNewExpense: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  conflictCount,
  onOpenNewExpense,
}) => {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'ledger', label: 'Expenses' },
    {
      id: 'conflicts',
      label:
        conflictCount > 0
          ? `Sync Conflicts (${conflictCount})`
          : 'Sync Conflicts',
    },
    { id: 'debts', label: 'Group Balances' },
    { id: 'forecast', label: 'Analytics & Forecast' },
    { id: 'blueprint', label: 'Kotlin & README' },
  ];

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-black">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#ledger"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('ledger');
        }}
        className="text-lg font-bold tracking-tight text-black whitespace-nowrap shrink-0 focus:outline-none focus-visible:underline"
      >
        SyncLedger
      </a>

      {/* Zone 2: 5 concise single-line text navigation links */}
      <nav
        aria-label="Primary Workspace Navigation"
        className="flex items-center gap-6 overflow-x-auto text-sm font-medium text-neutral-600"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 focus:outline-none ${
                isActive
                  ? 'border-black text-black font-semibold'
                  : 'border-transparent text-neutral-600 hover:text-black hover:border-neutral-400'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenNewExpense}
          className="px-4 py-2 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        >
          Add Expense
        </button>
      </div>
    </header>
  );
};
