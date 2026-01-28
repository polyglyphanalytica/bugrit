/**
 * Admin Costs API
 *
 * GET /api/admin/costs - Get platform cost vs revenue analysis
 *
 * Returns:
 * - GCP infrastructure costs
 * - User revenue (credits charged)
 * - Profit margin analysis
 * - Cost trends and projections
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperadmin } from '@/lib/admin/middleware';
import { db } from '@/lib/firebase/admin';
import {
  fetchGCPCosts,
  fetchGCPCostTrend,
  fetchServiceCostBreakdown,
  GCPCostSummary,
  CostTrend,
  ServiceCostBreakdown,
} from '@/lib/admin/gcp-billing';
import { logger } from '@/lib/logger';

interface RevenueData {
  totalCreditsCharged: number;
  totalRevenue: number;
  subscriptionRevenue: number;
  creditPurchaseRevenue: number;
  autoTopupRevenue: number;
  transactionCount: number;
}

interface ProfitabilityAnalysis {
  grossProfit: number;
  grossMargin: number;
  costPerScan: number;
  revenuePerScan: number;
  profitPerScan: number;
  breakEvenScans: number;
  status: 'healthy' | 'warning' | 'critical';
  recommendation: string;
}

interface MonthlyBudget {
  month: string; // YYYY-MM format
  prepaidRevenue: number; // All revenue received this month (prepaid usage)
  costsIncurred: number; // GCP costs spent
  budgetRemaining: number; // prepaidRevenue - costsIncurred
  budgetUtilization: number; // percentage of budget used
  daysElapsed: number;
  daysRemaining: number;
  projectedEndOfMonth: number; // projected costs by month end
  projectedProfit: number; // projected profit if trend continues
  status: 'on_track' | 'at_risk' | 'over_budget';
  dailyBudget: number; // how much we can spend per day
  dailyActual: number; // how much we're actually spending per day
}

interface CostsResponse {
  period: {
    start: string;
    end: string;
    days: number;
  };
  currentMonthBudget: MonthlyBudget;
  previousMonths: MonthlyBudget[];
  infrastructure: {
    summary: GCPCostSummary | null;
    trend: CostTrend | null;
    breakdown: ServiceCostBreakdown | null;
  };
  revenue: RevenueData;
  profitability: ProfitabilityAnalysis;
  usage: {
    totalScans: number;
    totalUsers: number;
    activeUsers: number;
    avgScansPerUser: number;
  };
  alerts: Array<{
    type: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

/**
 * Fetch revenue data from Firestore
 */
async function fetchRevenueData(startDate: Date, endDate: Date): Promise<RevenueData> {
  try {
    // Query credit transactions for the period
    const transactionsRef = db.collection('credit_transactions');
    const snapshot = await transactionsRef
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    let totalCreditsCharged = 0;
    let subscriptionRevenue = 0;
    let creditPurchaseRevenue = 0;
    let autoTopupRevenue = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const type = data.type;
      const amount = Math.abs(data.amount || 0);
      const price = data.price || 0;

      if (type === 'deduction') {
        totalCreditsCharged += amount;
      } else if (type === 'subscription') {
        subscriptionRevenue += price;
      } else if (type === 'purchase' || type === 'credit_purchase') {
        creditPurchaseRevenue += price;
      } else if (type === 'auto_topup') {
        autoTopupRevenue += price;
      }
    }

    // Also check Stripe payments for subscription revenue
    const paymentsSnapshot = await db.collection('stripe_payments')
      .where('created', '>=', startDate)
      .where('created', '<=', endDate)
      .where('status', '==', 'succeeded')
      .get();

    for (const doc of paymentsSnapshot.docs) {
      const data = doc.data();
      if (data.type === 'subscription') {
        subscriptionRevenue += (data.amount || 0) / 100; // Stripe amounts are in cents
      }
    }

    const totalRevenue = subscriptionRevenue + creditPurchaseRevenue + autoTopupRevenue;

    return {
      totalCreditsCharged,
      totalRevenue,
      subscriptionRevenue,
      creditPurchaseRevenue,
      autoTopupRevenue,
      transactionCount: snapshot.size,
    };
  } catch (error) {
    logger.error('Failed to fetch revenue data', { error });
    return {
      totalCreditsCharged: 0,
      totalRevenue: 0,
      subscriptionRevenue: 0,
      creditPurchaseRevenue: 0,
      autoTopupRevenue: 0,
      transactionCount: 0,
    };
  }
}

/**
 * Fetch usage statistics
 */
async function fetchUsageStats(startDate: Date, endDate: Date) {
  try {
    // Count scans in period
    const scansSnapshot = await db.collection('scans')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .count()
      .get();

    const totalScans = scansSnapshot.data().count;

    // Count total users
    const usersSnapshot = await db.collection('users').count().get();
    const totalUsers = usersSnapshot.data().count;

    // Count active users (users who ran a scan in the period)
    const activeUsersSnapshot = await db.collection('scans')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .select('userId')
      .get();

    const activeUserIds = new Set(activeUsersSnapshot.docs.map(d => d.data().userId));
    const activeUsers = activeUserIds.size;

    return {
      totalScans,
      totalUsers,
      activeUsers,
      avgScansPerUser: activeUsers > 0 ? totalScans / activeUsers : 0,
    };
  } catch (error) {
    logger.error('Failed to fetch usage stats', { error });
    return {
      totalScans: 0,
      totalUsers: 0,
      activeUsers: 0,
      avgScansPerUser: 0,
    };
  }
}

/**
 * Calculate profitability metrics
 */
function calculateProfitability(
  costs: number,
  revenue: RevenueData,
  totalScans: number
): ProfitabilityAnalysis {
  const grossProfit = revenue.totalRevenue - costs;
  const grossMargin = revenue.totalRevenue > 0
    ? (grossProfit / revenue.totalRevenue) * 100
    : 0;

  const costPerScan = totalScans > 0 ? costs / totalScans : 0;
  const revenuePerScan = totalScans > 0 ? revenue.totalRevenue / totalScans : 0;
  const profitPerScan = revenuePerScan - costPerScan;

  // Break-even: how many scans needed to cover fixed costs
  const breakEvenScans = profitPerScan > 0 ? Math.ceil(costs / profitPerScan) : Infinity;

  // Determine health status
  let status: 'healthy' | 'warning' | 'critical';
  let recommendation: string;

  if (grossMargin >= 30) {
    status = 'healthy';
    recommendation = 'Margins are healthy. Consider investing in growth or feature development.';
  } else if (grossMargin >= 10) {
    status = 'warning';
    recommendation = 'Margins are thin. Review pricing strategy or optimize infrastructure costs.';
  } else {
    status = 'critical';
    recommendation = 'Operating at a loss. Immediate action required: increase prices, reduce costs, or both.';
  }

  return {
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMargin: Math.round(grossMargin * 10) / 10,
    costPerScan: Math.round(costPerScan * 100) / 100,
    revenuePerScan: Math.round(revenuePerScan * 100) / 100,
    profitPerScan: Math.round(profitPerScan * 100) / 100,
    breakEvenScans,
    status,
    recommendation,
  };
}

/**
 * Calculate monthly budget from prepaid revenue
 * Each month starts fresh - unused budget from last month is profit, not carried forward
 */
async function calculateMonthlyBudget(
  year: number,
  month: number,
  gcpCosts: number,
  dailyCosts: Array<{ date: string; netCost: number }>
): Promise<MonthlyBudget> {
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0); // Last day of month
  const today = new Date();

  const daysInMonth = monthEnd.getDate();
  const daysElapsed = Math.min(
    Math.ceil((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)),
    daysInMonth
  );
  const daysRemaining = daysInMonth - daysElapsed;

  // Fetch all prepaid revenue for this specific month
  // This includes: subscriptions, credit purchases, auto top-ups
  let prepaidRevenue = 0;

  try {
    // Subscription payments
    const subscriptionsSnapshot = await db.collection('stripe_payments')
      .where('created', '>=', monthStart)
      .where('created', '<=', monthEnd)
      .where('status', '==', 'succeeded')
      .get();

    for (const doc of subscriptionsSnapshot.docs) {
      const data = doc.data();
      prepaidRevenue += (data.amount || 0) / 100; // Stripe amounts in cents
    }

    // Credit purchases and auto top-ups
    const creditsSnapshot = await db.collection('credit_transactions')
      .where('timestamp', '>=', monthStart)
      .where('timestamp', '<=', monthEnd)
      .where('type', 'in', ['purchase', 'credit_purchase', 'auto_topup'])
      .get();

    for (const doc of creditsSnapshot.docs) {
      const data = doc.data();
      prepaidRevenue += data.price || 0;
    }
  } catch (error) {
    logger.error('Failed to fetch monthly revenue', { error, month: monthStr });
  }

  // Calculate budget metrics
  const budgetRemaining = prepaidRevenue - gcpCosts;
  const budgetUtilization = prepaidRevenue > 0 ? (gcpCosts / prepaidRevenue) * 100 : 0;

  // Daily calculations
  const dailyBudget = prepaidRevenue / daysInMonth;
  const dailyActual = daysElapsed > 0 ? gcpCosts / daysElapsed : 0;

  // Project end of month
  const projectedEndOfMonth = dailyActual * daysInMonth;
  const projectedProfit = prepaidRevenue - projectedEndOfMonth;

  // Determine status
  let status: MonthlyBudget['status'];
  if (budgetUtilization > 100) {
    status = 'over_budget';
  } else if (projectedEndOfMonth > prepaidRevenue * 0.9) {
    status = 'at_risk';
  } else {
    status = 'on_track';
  }

  return {
    month: monthStr,
    prepaidRevenue: Math.round(prepaidRevenue * 100) / 100,
    costsIncurred: Math.round(gcpCosts * 100) / 100,
    budgetRemaining: Math.round(budgetRemaining * 100) / 100,
    budgetUtilization: Math.round(budgetUtilization * 10) / 10,
    daysElapsed,
    daysRemaining,
    projectedEndOfMonth: Math.round(projectedEndOfMonth * 100) / 100,
    projectedProfit: Math.round(projectedProfit * 100) / 100,
    status,
    dailyBudget: Math.round(dailyBudget * 100) / 100,
    dailyActual: Math.round(dailyActual * 100) / 100,
  };
}

/**
 * Get previous months' budget summaries (for historical comparison)
 */
async function getPreviousMonthsBudgets(count: number = 3): Promise<MonthlyBudget[]> {
  const budgets: MonthlyBudget[] = [];
  const today = new Date();

  for (let i = 1; i <= count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthEnd = new Date(year, month + 1, 0);

    // Fetch real GCP costs for this month
    const gcpSummary = await fetchGCPCosts(date, monthEnd);
    const gcpCosts = gcpSummary?.netCost || 0;

    const budget = await calculateMonthlyBudget(year, month, gcpCosts, []);
    budgets.push(budget);
  }

  return budgets;
}

/**
 * Generate alerts based on the data
 */
function generateAlerts(
  costs: ServiceCostBreakdown | null,
  profitability: ProfitabilityAnalysis,
  trend: CostTrend | null,
  budget: MonthlyBudget
): CostsResponse['alerts'] {
  const alerts: CostsResponse['alerts'] = [];

  // Budget status alerts (highest priority)
  if (budget.status === 'over_budget') {
    alerts.push({
      type: 'error',
      message: `OVER BUDGET: Costs ($${budget.costsIncurred.toFixed(2)}) exceed this month's prepaid revenue ($${budget.prepaidRevenue.toFixed(2)}). Immediate action required.`,
    });
  } else if (budget.status === 'at_risk') {
    alerts.push({
      type: 'warning',
      message: `AT RISK: Projected costs ($${budget.projectedEndOfMonth.toFixed(2)}) may exceed budget ($${budget.prepaidRevenue.toFixed(2)}) by month end.`,
    });
  }

  // Daily burn rate alerts
  if (budget.dailyActual > budget.dailyBudget * 1.2) {
    alerts.push({
      type: 'warning',
      message: `Daily spending ($${budget.dailyActual.toFixed(2)}) is ${((budget.dailyActual / budget.dailyBudget - 1) * 100).toFixed(0)}% over daily budget ($${budget.dailyBudget.toFixed(2)}).`,
    });
  }

  // Profitability alerts
  if (budget.projectedProfit < 0) {
    alerts.push({
      type: 'error',
      message: `Month projected to end with $${Math.abs(budget.projectedProfit).toFixed(2)} LOSS. Reduce costs or pause non-essential services.`,
    });
  } else if (budget.projectedProfit < budget.prepaidRevenue * 0.1) {
    alerts.push({
      type: 'warning',
      message: `Projected profit margin is only ${((budget.projectedProfit / budget.prepaidRevenue) * 100).toFixed(1)}%. Target is 30%+.`,
    });
  }

  // AI cost alerts (often the most expensive)
  if (costs && costs.ai > costs.total * 0.4) {
    alerts.push({
      type: 'info',
      message: `AI services account for ${((costs.ai / costs.total) * 100).toFixed(0)}% of costs. Consider optimizing AI usage or caching results.`,
    });
  }

  // Cost trend alerts
  if (trend && trend.percentChange > 20) {
    alerts.push({
      type: 'warning',
      message: `Costs increased ${trend.percentChange.toFixed(1)}% compared to last month.`,
    });
  }

  return alerts;
}

export async function GET(request: NextRequest) {
  // Verify superadmin access
  const auth = await verifySuperadmin(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch GCP costs
    const [gcpSummary, gcpTrend, gcpBreakdown] = await Promise.all([
      fetchGCPCosts(startDate, endDate),
      fetchGCPCostTrend(days),
      fetchServiceCostBreakdown(startDate, endDate),
    ]);

    // Fetch revenue and usage data
    const [revenue, usage] = await Promise.all([
      fetchRevenueData(startDate, endDate),
      fetchUsageStats(startDate, endDate),
    ]);

    // Calculate profitability
    const infrastructureCost = gcpSummary?.netCost || 0;
    const profitability = calculateProfitability(infrastructureCost, revenue, usage.totalScans);

    // Calculate current month's budget
    const now = new Date();
    const currentMonthBudget = await calculateMonthlyBudget(
      now.getFullYear(),
      now.getMonth(),
      infrastructureCost,
      gcpTrend?.daily || []
    );

    // Get previous months for comparison
    const previousMonths = await getPreviousMonthsBudgets(3);

    // Generate alerts (now including budget alerts)
    const alerts = generateAlerts(gcpBreakdown, profitability, gcpTrend, currentMonthBudget);

    const response: CostsResponse = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      currentMonthBudget,
      previousMonths,
      infrastructure: {
        summary: gcpSummary,
        trend: gcpTrend,
        breakdown: gcpBreakdown,
      },
      revenue,
      profitability,
      usage,
      alerts,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Failed to fetch costs data', { error });
    return NextResponse.json(
      { error: 'Failed to fetch costs data' },
      { status: 500 }
    );
  }
}
