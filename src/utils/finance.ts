import type { TransactionRow } from "@/types/database.types";
import { convertToUSD, getFallbackExchangeRateToUSD } from "./currency";

// Convert transaction date to YYYY-MM format
function getYearMonth(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// Convert transaction date to YYYY-MM-DD format for exchange rate API
function getYearMonthDay(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface ChartDataPoint {
  date: string; // YYYY-MM format
  amountUSD: number;
}

export interface MonthlyRevenueData {
  date: string; // YYYY-MM format
  incomeUSD: number;
  expenseUSD: number;
  netProfitUSD: number; // income - expense
}

/**
 * Convert transactions to chart data format
 * Groups transactions by month (YYYY-MM), calculates net income (income - expense),
 * and converts all amounts to USD
 */
export async function convertTransactionsToChartData(
  transactions: TransactionRow[]
): Promise<ChartDataPoint[]> {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Group transactions by month
  const monthlyData = new Map<
    string,
    {
      date: string; // YYYY-MM format
      income: number; // in original currency
      expense: number; // in original currency
      transactions: Array<{
        amount: number;
        currency: string;
        date: string; // YYYY-MM-DD format for exchange rate
        type: "income" | "expense";
      }>;
    }
  >();

  // First pass: group transactions by month and collect currency info
  transactions.forEach((transaction) => {
    if (!transaction.occurred_at) {
      return;
    }

    const yearMonth = getYearMonth(transaction.occurred_at);
    if (!yearMonth) {
      return;
    }

    if (!monthlyData.has(yearMonth)) {
      monthlyData.set(yearMonth, {
        date: yearMonth,
        income: 0,
        expense: 0,
        transactions: [],
      });
    }

    const monthData = monthlyData.get(yearMonth)!;
    const transactionDate = getYearMonthDay(transaction.occurred_at);

    if (transaction.type === "income") {
      monthData.income += transaction.amount;
    } else if (transaction.type === "expense") {
      monthData.expense += transaction.amount;
    }

    monthData.transactions.push({
      amount: transaction.amount,
      currency: transaction.currency || "USD",
      date: transactionDate,
      type: transaction.type,
    });
  });

  // Second pass: convert all amounts to USD
  const chartData: ChartDataPoint[] = [];

  for (const [yearMonth, monthData] of monthlyData.entries()) {
    let totalIncomeUSD = 0;
    let totalExpenseUSD = 0;

    // Convert each transaction to USD
    for (const tx of monthData.transactions) {
      try {
        const amountUSD = await convertToUSD(
          tx.amount,
          tx.currency,
          tx.date || undefined
        );

        if (tx.type === "income") {
          totalIncomeUSD += amountUSD;
        } else {
          totalExpenseUSD += amountUSD;
        }
      } catch (error) {
        console.warn(
          `[Finance] Failed to convert ${tx.amount} ${tx.currency} to USD for ${yearMonth}:`,
          error
        );
        // Use fallback rate on error
        const fallbackRate = getFallbackExchangeRateToUSD(tx.currency);
        const amountUSD = tx.amount * fallbackRate;
        if (tx.type === "income") {
          totalIncomeUSD += amountUSD;
        } else {
          totalExpenseUSD += amountUSD;
        }
      }
    }

    // Calculate net income (income - expense)
    const netAmountUSD = totalIncomeUSD - totalExpenseUSD;

    chartData.push({
      date: yearMonth,
      amountUSD: netAmountUSD,
    });
  }

  // Sort by date (ascending)
  chartData.sort((a, b) => a.date.localeCompare(b.date));

  return chartData;
}

/**
 * Convert transactions to monthly revenue data format
 * Groups transactions by month (YYYY-MM), calculates income, expense, and net profit,
 * and converts all amounts to USD
 */
export async function convertTransactionsToMonthlyRevenueData(
  transactions: TransactionRow[]
): Promise<MonthlyRevenueData[]> {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Group transactions by month
  const monthlyData = new Map<
    string,
    {
      date: string; // YYYY-MM format
      income: number; // in original currency
      expense: number; // in original currency
      transactions: Array<{
        amount: number;
        currency: string;
        date: string; // YYYY-MM-DD format for exchange rate
        type: "income" | "expense";
      }>;
    }
  >();

  // First pass: group transactions by month and collect currency info
  transactions.forEach((transaction) => {
    if (!transaction.occurred_at) {
      return;
    }

    const yearMonth = getYearMonth(transaction.occurred_at);
    if (!yearMonth) {
      return;
    }

    if (!monthlyData.has(yearMonth)) {
      monthlyData.set(yearMonth, {
        date: yearMonth,
        income: 0,
        expense: 0,
        transactions: [],
      });
    }

    const monthData = monthlyData.get(yearMonth)!;
    const transactionDate = getYearMonthDay(transaction.occurred_at);

    if (transaction.type === "income") {
      monthData.income += transaction.amount;
    } else if (transaction.type === "expense") {
      monthData.expense += transaction.amount;
    }

    monthData.transactions.push({
      amount: transaction.amount,
      currency: transaction.currency || "USD",
      date: transactionDate,
      type: transaction.type,
    });
  });

  // Second pass: convert all amounts to USD
  const revenueData: MonthlyRevenueData[] = [];

  for (const [yearMonth, monthData] of monthlyData.entries()) {
    let totalIncomeUSD = 0;
    let totalExpenseUSD = 0;

    // Convert each transaction to USD
    for (const tx of monthData.transactions) {
      try {
        const amountUSD = await convertToUSD(
          tx.amount,
          tx.currency,
          tx.date || undefined
        );

        if (tx.type === "income") {
          totalIncomeUSD += amountUSD;
        } else {
          totalExpenseUSD += amountUSD;
        }
      } catch (error) {
        console.warn(
          `[Finance] Failed to convert ${tx.amount} ${tx.currency} to USD for ${yearMonth}:`,
          error
        );
        // Use fallback rate on error
        const fallbackRate = getFallbackExchangeRateToUSD(tx.currency);
        const amountUSD = tx.amount * fallbackRate;
        if (tx.type === "income") {
          totalIncomeUSD += amountUSD;
        } else {
          totalExpenseUSD += amountUSD;
        }
      }
    }

    // Calculate net profit (income - expense)
    const netProfitUSD = totalIncomeUSD - totalExpenseUSD;

    revenueData.push({
      date: yearMonth,
      incomeUSD: totalIncomeUSD,
      expenseUSD: totalExpenseUSD,
      netProfitUSD: netProfitUSD,
    });
  }

  // Sort by date (ascending)
  revenueData.sort((a, b) => a.date.localeCompare(b.date));

  return revenueData;
}

