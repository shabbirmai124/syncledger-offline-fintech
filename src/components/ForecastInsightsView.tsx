import React, { useMemo, useState } from 'react';
import {
  computeCategoricalInsights,
  computeSpendingForecast,
  ExpenseGroup,
  MonthlyHistoricalPoint,
  TransactionEntity,
} from '../domain/fintechEngine';

interface ForecastInsightsViewProps {
  group: ExpenseGroup;
  transactions: TransactionEntity[];
  history: MonthlyHistoricalPoint[];
  onUpdateGroupBudget: (groupId: string, newBudget: number) => void;
}

export const ForecastInsightsView: React.FC<ForecastInsightsViewProps> = ({
  group,
  transactions,
  history,
  onUpdateGroupBudget,
}) => {
  const [simulatedDayOfMonth, setSimulatedDayOfMonth] = useState<number>(15);
  const [budgetInput, setBudgetInput] = useState<string>(
    String(group.monthlyBudget)
  );

  const groupTransactions = useMemo(
    () => transactions.filter((t) => t.groupId === group.id),
    [transactions, group.id]
  );

  const categoricalInsights = useMemo(
    () => computeCategoricalInsights(groupTransactions),
    [groupTransactions]
  );

  const currentSpend = useMemo(
    () =>
      groupTransactions
        .filter(
          (t) =>
            t.syncStatus !== 'PENDING_DELETE' && t.category !== 'Settlement'
        )
        .reduce((s, t) => s + t.amount, 0),
    [groupTransactions]
  );

  const forecast = useMemo(
    () =>
      computeSpendingForecast({
        history,
        currentSpend,
        dayOfMonth: simulatedDayOfMonth,
        daysInMonth: 30,
        monthlyBudget: group.monthlyBudget,
      }),
    [history, currentSpend, simulatedDayOfMonth, group.monthlyBudget]
  );

  const handleBudgetApply = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(budgetInput);
    if (Number.isFinite(parsed) && parsed > 0) {
      onUpdateGroupBudget(group.id, parsed);
    }
  };

  // Build SVG chart points for 6 historical months + current month projection
  const chartPoints = useMemo(() => {
    const all = [
      ...history.map((h) => ({
        label: h.monthLabel,
        value: h.actualSpend,
        isProjected: false,
      })),
      {
        label: 'Nov (Proj)',
        value: forecast.projectedMonthEnd,
        isProjected: true,
      },
    ];
    const maxVal = Math.max(
      ...all.map((p) => p.value),
      group.monthlyBudget * 1.15,
      1000
    );
    return { all, maxVal };
  }, [history, forecast.projectedMonthEnd, group.monthlyBudget]);

  return (
    <div className="space-y-8">
      {/* Header & Interactive Forecasting Parameters */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-black">
        <div className="space-y-1 max-w-3xl">
          <h1 className="text-xl font-bold tracking-tight text-black">
            Spending Analytics & Monthly Forecast
          </h1>
          <p className="text-xs text-neutral-600">
            Breaks down group spending by category and projects end-of-month
            costs using your daily spending pace, 6-month linear trend, and
            3-month weighted moving average.
          </p>
        </div>

        {/* Simulation Controls */}
        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 border border-black px-3 py-1.5 bg-white">
            <label
              htmlFor="day-slider"
              className="text-xs font-semibold text-black whitespace-nowrap"
            >
              Day of Month:{' '}
              <span className="font-mono-tabular">
                {simulatedDayOfMonth}/30
              </span>
            </label>
            <input
              id="day-slider"
              type="range"
              min={3}
              max={30}
              value={simulatedDayOfMonth}
              onChange={(e) => setSimulatedDayOfMonth(Number(e.target.value))}
              className="w-24 accent-black cursor-pointer"
            />
          </div>

          <form
            onSubmit={handleBudgetApply}
            className="flex items-center gap-1.5"
          >
            <label htmlFor="budget-target-input" className="sr-only">
              Monthly Budget Target
            </label>
            <input
              id="budget-target-input"
              type="number"
              step="100"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-28 px-2.5 py-1.5 text-xs font-mono-tabular text-black bg-white border border-black"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-neutral-800 transition-colors"
            >
              Update Budget
            </button>
          </form>
        </div>
      </section>

      {/* Natural Language Automated Insight Callout */}
      <section
        aria-label="Monthly Forecast Summary"
        className="border-2 border-black bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="text-xs font-mono-tabular font-semibold text-neutral-600">
            MONTHLY PACE ESTIMATE · DAY {simulatedDayOfMonth} OF 30
          </div>
          <p className="text-base font-bold text-black">
            At your current pace (${forecast.dailyBurnRate.toFixed(2)}/day),
            your group is projected to finish the month at{' '}
            <span className="font-mono-tabular underline">
              $
              {forecast.projectedMonthEnd.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>{' '}
            (
            {forecast.isOverBudget
              ? `${Math.abs(forecast.budgetVariancePercent)}% above your $${group.monthlyBudget.toLocaleString('en-US')} budget`
              : `${Math.abs(forecast.budgetVariancePercent)}% under your $${group.monthlyBudget.toLocaleString('en-US')} budget`}
            ).
          </p>
        </div>

        <div className="text-right font-mono-tabular shrink-0">
          <div className="text-xs text-neutral-600">Projected Difference</div>
          <div className="text-xl font-bold text-black">
            {forecast.budgetVariance >= 0
              ? `+$${forecast.budgetVariance.toFixed(2)} Over`
              : `-$${Math.abs(forecast.budgetVariance).toFixed(2)} Under`}
          </div>
        </div>
      </section>

      {/* 4-Column Mathematical Model Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-black divide-y sm:divide-y-0 sm:divide-x divide-black bg-white">
        <div className="p-5">
          <div className="text-xs font-medium text-neutral-600">
            Spend So Far (Day {simulatedDayOfMonth})
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            $
            {forecast.currentSpend.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-neutral-600">
            Daily average: ${forecast.dailyBurnRate.toFixed(2)} / day
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-neutral-600">
            Linear Trend Projection
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            $
            {forecast.linearRegressionPrediction.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-neutral-600">
            Trend: +${forecast.regressionSlope.toFixed(0)}/mo over 6 months
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-neutral-600">
            3-Month Weighted Average
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            $
            {forecast.weightedMovingAverage.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-neutral-600">
            Recent 3 months weighted 50% · 30% · 20%
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-neutral-600">
            Projected Month-End Total
          </div>
          <div className="mt-2 text-2xl font-bold font-mono-tabular text-black">
            $
            {forecast.projectedMonthEnd.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-neutral-600">
            {forecast.isOverBudget
              ? 'Pacing above monthly budget'
              : 'Pacing within monthly budget'}
          </div>
        </div>
      </section>

      {/* Two-Column Split: Categorical Breakdown & Historical Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Categorical Breakdown */}
        <section
          aria-label="Spend by Category"
          className="border border-black bg-white p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-black flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-black">
                  01. Spend by Category
                </h2>
                <p className="text-xs text-neutral-600">
                  Share of total group expenses across categories
                </p>
              </div>
              <span className="text-xs font-mono-tabular font-semibold text-black">
                {categoricalInsights.length} Categories
              </span>
            </div>

            {categoricalInsights.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-600">
                No expenses recorded for this group yet.
              </div>
            ) : (
              <div className="space-y-4">
                {categoricalInsights.map((item) => (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-black">
                        {item.category}{' '}
                        <span className="font-normal text-neutral-500 font-mono-tabular">
                          ({item.transactionCount}{' '}
                          {item.transactionCount === 1 ? 'entry' : 'entries'} ·
                          avg ${item.averageTransaction.toFixed(0)})
                        </span>
                      </span>
                      <span className="font-mono-tabular font-bold text-black">
                        $
                        {item.totalAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ({item.percentageOfTotal.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-neutral-100 border border-black overflow-hidden">
                      <div
                        className="h-full bg-black transition-all duration-200"
                        style={{
                          width: `${Math.min(100, Math.max(2, item.percentageOfTotal))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-neutral-200 text-xs font-mono-tabular text-neutral-600">
            Excludes settlement transfers between members
          </div>
        </section>

        {/* Right: 6-Month Historical + Projected Bar/Line SVG Trajectory */}
        <section
          aria-label="Monthly Spend Trajectory Chart"
          className="border border-black bg-white p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            <div className="pb-3 border-b border-black flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-black">
                  02. Monthly Spend History & Forecast
                </h2>
                <p className="text-xs text-neutral-600">
                  Last 6 months vs. monthly budget ($
                  {group.monthlyBudget.toLocaleString('en-US')}) and November
                  projection.
                </p>
              </div>
              <span className="text-xs font-mono-tabular font-semibold text-black whitespace-nowrap shrink-0">
                May – Nov
              </span>
            </div>

            {/* Crisp Monochrome SVG Bar & Threshold Chart */}
            <div className="pt-2">
              <svg
                viewBox="0 0 560 240"
                className="w-full h-60 border border-neutral-200 bg-neutral-50"
                role="img"
                aria-label="6-month historical spending and month-end forecast bar chart"
              >
                {/* Top Legend for Budget Ceiling */}
                <text
                  x={42}
                  y={18}
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                  fontWeight="600"
                  fill="#000000"
                >
                  --- Dashed Line: Monthly Budget Target ($
                  {group.monthlyBudget.toLocaleString('en-US')})
                </text>

                {/* Bars */}
                {chartPoints.all.map((pt, idx) => {
                  const chartTop = 44;
                  const chartBottom = 200;
                  const chartHeight = chartBottom - chartTop;
                  const barWidth = 46;
                  const gap = 24;
                  const x = 42 + idx * (barWidth + gap);
                  const barH = Math.max(
                    24,
                    (pt.value / chartPoints.maxVal) * chartHeight
                  );
                  const y = chartBottom - barH;

                  return (
                    <g key={pt.label}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barH}
                        fill={pt.isProjected ? '#ffffff' : '#000000'}
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeDasharray={pt.isProjected ? '3 2' : undefined}
                      />
                      <text
                        x={x + barWidth / 2}
                        y={y + 15}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="600"
                        fill={pt.isProjected ? '#000000' : '#ffffff'}
                      >
                        ${Math.round(pt.value).toLocaleString('en-US')}
                      </text>
                      <text
                        x={x + barWidth / 2}
                        y={chartBottom + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#000000"
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}

                {/* Budget Threshold Horizontal Dashed Line rendered on top with crisp contrast */}
                {(() => {
                  const chartTop = 44;
                  const chartBottom = 200;
                  const chartHeight = chartBottom - chartTop;
                  const budgetY =
                    chartBottom -
                    (group.monthlyBudget / chartPoints.maxVal) * chartHeight;
                  return (
                    <line
                      x1={32}
                      y1={budgetY}
                      x2={536}
                      y2={budgetY}
                      stroke="#525252"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                    />
                  );
                })()}
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-between text-xs font-mono-tabular text-neutral-600">
            <span>Solid Black: Actual Monthly Spend</span>
            <span>Dashed Bar: Projected Month-End</span>
          </div>
        </section>
      </div>
    </div>
  );
};
