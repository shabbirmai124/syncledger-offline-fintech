package com.syncledger.fintech.domain.usecase

import javax.inject.Inject
import kotlin.math.max
import kotlin.math.roundToLong

data class MonthlySpendPoint(
    val monthIndex: Int, // 1..N
    val totalSpend: Double
)

data class SpendingForecastReport(
    val dailyBurnRate: Double,
    val linearRegressionPrediction: Double,
    val weightedMovingAverage: Double,
    val blendedMonthEndForecast: Double,
    val budgetVariance: Double,
    val budgetVariancePercent: Double,
    val isOverBudget: Boolean
)

class SpendingForecastUseCase @Inject constructor() {

    /**
     * On-Device Mathematical Forecasting:
     * Combines Ordinary Least Squares (OLS) Simple Linear Regression (y = mx + b),
     * 3-Month Weighted Moving Average (0.5, 0.3, 0.2), and current daily burn rate.
     */
    operator fun invoke(
        history: List<MonthlySpendPoint>,
        currentMonthSpend: Double,
        dayOfMonth: Int,
        daysInMonth: Int,
        monthlyBudget: Double
    ): SpendingForecastReport {
        val safeDay = dayOfMonth.coerceIn(1, max(1, daysInMonth))
        val dailyBurnRate = roundCurrency(currentMonthSpend / safeDay)
        val paceProjection = dailyBurnRate * daysInMonth

        // 1. Simple Linear Regression (OLS: y = mx + b)
        val n = history.size
        var slope = 0.0
        var intercept = paceProjection

        if (n >= 2) {
            val sumX = history.sumOf { it.monthIndex.toDouble() }
            val sumY = history.sumOf { it.totalSpend }
            val sumXY = history.sumOf { it.monthIndex * it.totalSpend }
            val sumX2 = history.sumOf { (it.monthIndex * it.monthIndex).toDouble() }

            val denominator = (n * sumX2) - (sumX * sumX)
            if (denominator != 0.0) {
                slope = ((n * sumXY) - (sumX * sumY)) / denominator
                intercept = (sumY - (slope * sumX)) / n
            }
        }

        val nextMonthIdx = (history.maxOfOrNull { it.monthIndex } ?: 0) + 1
        val olsPrediction = roundCurrency(max(currentMonthSpend, (slope * nextMonthIdx) + intercept))

        // 2. 3-Month Weighted Moving Average (WMA)
        val wma = if (n >= 3) {
            val sortedDesc = history.sortedByDescending { it.monthIndex }
            roundCurrency(
                (sortedDesc[0].totalSpend * 0.50) +
                    (sortedDesc[1].totalSpend * 0.30) +
                    (sortedDesc[2].totalSpend * 0.20)
            )
        } else if (n > 0) {
            roundCurrency(history.sumOf { it.totalSpend } / n)
        } else {
            roundCurrency(paceProjection)
        }

        // 3. Blended Forecast (50% Current Run-Rate, 30% OLS Regression, 20% WMA)
        val blended = roundCurrency(
            max(
                currentMonthSpend,
                (paceProjection * 0.50) + (olsPrediction * 0.30) + (wma * 0.20)
            )
        )

        val variance = roundCurrency(blended - monthlyBudget)
        val variancePct = if (monthlyBudget > 0.0) {
            ((variance / monthlyBudget) * 1000.0).roundToLong() / 10.0
        } else {
            0.0
        }

        return SpendingForecastReport(
            dailyBurnRate = dailyBurnRate,
            linearRegressionPrediction = olsPrediction,
            weightedMovingAverage = wma,
            blendedMonthEndForecast = blended,
            budgetVariance = variance,
            budgetVariancePercent = variancePct,
            isOverBudget = blended > monthlyBudget
        )
    }

    private fun roundCurrency(value: Double): Double =
        (value * 100.0).roundToLong() / 100.0
}
