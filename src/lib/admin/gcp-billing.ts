/**
 * Google Cloud Platform Billing Integration
 *
 * Fetches cost data from GCP Cloud Billing API to track platform expenses.
 * Used by superadmins to monitor profitability.
 *
 * Required environment variables:
 * - GCP_BILLING_ACCOUNT_ID: The billing account ID (format: billingAccounts/XXXXXX-XXXXXX-XXXXXX)
 * - GCP_PROJECT_ID: The GCP project ID
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON (or use default credentials)
 */

import { logger } from '@/lib/logger';

export interface GCPCostItem {
  service: string;
  description: string;
  cost: number;
  currency: string;
  usageAmount: number;
  usageUnit: string;
  credits: number;
  netCost: number;
}

export interface GCPCostSummary {
  totalCost: number;
  totalCredits: number;
  netCost: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
  byService: Record<string, number>;
  items: GCPCostItem[];
}

export interface DailyCost {
  date: string;
  cost: number;
  credits: number;
  netCost: number;
}

export interface CostTrend {
  daily: DailyCost[];
  weeklyAverage: number;
  monthlyProjection: number;
  previousMonthTotal: number;
  percentChange: number;
}

/**
 * NOTE: BigQuery is not available in Firebase App Hosting.
 * All billing functions return mock data for demonstration purposes.
 *
 * For production billing integration, consider:
 * 1. Using a Cloud Function to query BigQuery
 * 2. Setting up a separate backend service
 * 3. Using the Cloud Billing API directly
 */

/**
 * Fetch cost summary for a given period
 * NOTE: In Firebase App Hosting, BigQuery is not available.
 * Returns mock data for demonstration purposes.
 */
export async function fetchGCPCosts(
  startDate: Date,
  endDate: Date
): Promise<GCPCostSummary | null> {
  // Use mock data in Firebase App Hosting environment
  const mockData = generateMockCostData(
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  return mockData.summary;
}

/**
 * Fetch daily costs for trend analysis
 * NOTE: In Firebase App Hosting, BigQuery is not available.
 * Returns mock data for demonstration purposes.
 */
export async function fetchGCPCostTrend(days: number = 30): Promise<CostTrend | null> {
  // Use mock data in Firebase App Hosting environment
  const mockData = generateMockCostData(days);
  return mockData.trend;
}

/**
 * Get cost breakdown by GCP service
 */
export async function fetchCostByService(
  startDate: Date,
  endDate: Date
): Promise<Record<string, number> | null> {
  const summary = await fetchGCPCosts(startDate, endDate);
  return summary?.byService || null;
}

/**
 * Estimate cost for specific GCP services commonly used by Bugrit
 */
export interface ServiceCostBreakdown {
  compute: number;      // Cloud Run, Cloud Functions, GCE
  storage: number;      // Cloud Storage, Firestore
  networking: number;   // Egress, Load Balancing
  ai: number;           // Vertex AI, Cloud Vision
  database: number;     // Firestore, Cloud SQL
  other: number;
  total: number;
}

export async function fetchServiceCostBreakdown(
  startDate: Date,
  endDate: Date
): Promise<ServiceCostBreakdown | null> {
  const summary = await fetchGCPCosts(startDate, endDate);
  if (!summary) return null;

  const breakdown: ServiceCostBreakdown = {
    compute: 0,
    storage: 0,
    networking: 0,
    ai: 0,
    database: 0,
    other: 0,
    total: summary.netCost,
  };

  for (const [service, cost] of Object.entries(summary.byService)) {
    const serviceLower = service.toLowerCase();

    if (serviceLower.includes('compute') || serviceLower.includes('cloud run') ||
        serviceLower.includes('functions') || serviceLower.includes('kubernetes')) {
      breakdown.compute += cost;
    } else if (serviceLower.includes('storage') && !serviceLower.includes('firestore')) {
      breakdown.storage += cost;
    } else if (serviceLower.includes('network') || serviceLower.includes('egress') ||
               serviceLower.includes('load balancing')) {
      breakdown.networking += cost;
    } else if (serviceLower.includes('vertex') || serviceLower.includes('vision') ||
               serviceLower.includes('natural language') || serviceLower.includes('ai platform')) {
      breakdown.ai += cost;
    } else if (serviceLower.includes('firestore') || serviceLower.includes('sql') ||
               serviceLower.includes('spanner') || serviceLower.includes('bigtable')) {
      breakdown.database += cost;
    } else {
      breakdown.other += cost;
    }
  }

  return breakdown;
}

/**
 * For development/demo: Generate mock cost data
 */
export function generateMockCostData(days: number = 30): {
  summary: GCPCostSummary;
  trend: CostTrend;
  breakdown: ServiceCostBreakdown;
} {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Generate daily costs with some variance
  const daily: DailyCost[] = [];
  const baseDaily = 45; // Base daily cost in USD

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Add variance: weekends are cheaper, random spikes
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const variance = (Math.random() - 0.5) * 20;
    const weekendDiscount = isWeekend ? 0.6 : 1;

    const cost = (baseDaily + variance) * weekendDiscount;
    const credits = cost * -0.05; // 5% credits

    daily.push({
      date: date.toISOString().split('T')[0],
      cost: Math.round(cost * 100) / 100,
      credits: Math.round(credits * 100) / 100,
      netCost: Math.round((cost + credits) * 100) / 100,
    });
  }

  const totalCost = daily.reduce((sum, d) => sum + d.cost, 0);
  const totalCredits = daily.reduce((sum, d) => sum + d.credits, 0);
  const netCost = totalCost + totalCredits;

  const recentDays = daily.slice(-7);
  const weeklyAverage = recentDays.reduce((sum, d) => sum + d.netCost, 0) / 7;

  const breakdown: ServiceCostBreakdown = {
    compute: netCost * 0.35,
    storage: netCost * 0.15,
    networking: netCost * 0.12,
    ai: netCost * 0.25,
    database: netCost * 0.10,
    other: netCost * 0.03,
    total: netCost,
  };

  return {
    summary: {
      totalCost: Math.round(totalCost * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      netCost: Math.round(netCost * 100) / 100,
      currency: 'USD',
      period: { start: startDate, end: now },
      byService: {
        'Cloud Run': breakdown.compute * 0.6,
        'Cloud Functions': breakdown.compute * 0.4,
        'Cloud Storage': breakdown.storage,
        'Networking': breakdown.networking,
        'Vertex AI': breakdown.ai * 0.7,
        'Cloud Vision API': breakdown.ai * 0.3,
        'Firestore': breakdown.database,
        'Other': breakdown.other,
      },
      items: [],
    },
    trend: {
      daily,
      weeklyAverage: Math.round(weeklyAverage * 100) / 100,
      monthlyProjection: Math.round(weeklyAverage * 30 * 100) / 100,
      previousMonthTotal: Math.round(netCost * 0.92 * 100) / 100, // Simulate 8% growth
      percentChange: 8.7,
    },
    breakdown,
  };
}
