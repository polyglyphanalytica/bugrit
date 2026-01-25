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
 * Get GCP billing configuration from environment
 */
function getGCPBillingConfig() {
  return {
    billingAccountId: process.env.GCP_BILLING_ACCOUNT_ID,
    projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    datasetId: process.env.GCP_BILLING_DATASET_ID || 'billing_export',
    tableId: process.env.GCP_BILLING_TABLE_ID || 'gcp_billing_export_v1',
  };
}

/**
 * Initialize BigQuery client for billing data queries
 * GCP billing data is exported to BigQuery for analysis
 */
async function getBigQueryClient() {
  try {
    // Use require() instead of import() to avoid webpack bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { BigQuery } = require('@google-cloud/bigquery');
    return new BigQuery();
  } catch (error) {
    logger.warn('BigQuery client not available - using mock data', { error });
    return null;
  }
}

/**
 * Fetch cost summary for a given period using BigQuery
 * GCP billing data is typically exported to BigQuery for analysis
 */
export async function fetchGCPCosts(
  startDate: Date,
  endDate: Date
): Promise<GCPCostSummary | null> {
  const config = getGCPBillingConfig();

  if (!config.projectId) {
    logger.warn('GCP billing not configured: missing project ID');
    return null;
  }

  const bigquery = await getBigQueryClient();
  if (!bigquery) {
    return null;
  }

  try {
    const query = `
      SELECT
        service.description as service_name,
        sku.description as sku_description,
        SUM(cost) as total_cost,
        currency,
        SUM(usage.amount) as usage_amount,
        usage.unit as usage_unit,
        SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) as total_credits
      FROM \`${config.projectId}.${config.datasetId}.${config.tableId}\`
      WHERE
        DATE(usage_start_time) >= @startDate
        AND DATE(usage_end_time) <= @endDate
        AND project.id = @projectId
      GROUP BY
        service.description,
        sku.description,
        currency,
        usage.unit
      ORDER BY
        total_cost DESC
    `;

    const options = {
      query,
      params: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        projectId: config.projectId,
      },
    };

    const [rows] = await bigquery.query(options);

    const items: GCPCostItem[] = rows.map((row: Record<string, unknown>) => ({
      service: row.service_name as string,
      description: row.sku_description as string,
      cost: Number(row.total_cost) || 0,
      currency: row.currency as string || 'USD',
      usageAmount: Number(row.usage_amount) || 0,
      usageUnit: row.usage_unit as string || '',
      credits: Number(row.total_credits) || 0,
      netCost: (Number(row.total_cost) || 0) + (Number(row.total_credits) || 0),
    }));

    const byService: Record<string, number> = {};
    let totalCost = 0;
    let totalCredits = 0;

    for (const item of items) {
      totalCost += item.cost;
      totalCredits += item.credits;
      byService[item.service] = (byService[item.service] || 0) + item.netCost;
    }

    return {
      totalCost,
      totalCredits,
      netCost: totalCost + totalCredits, // credits are negative
      currency: items[0]?.currency || 'USD',
      period: { start: startDate, end: endDate },
      byService,
      items,
    };
  } catch (error) {
    logger.error('Failed to fetch GCP costs from BigQuery', { error });
    return null;
  }
}

/**
 * Fetch daily costs for trend analysis
 */
export async function fetchGCPCostTrend(days: number = 30): Promise<CostTrend | null> {
  const config = getGCPBillingConfig();

  if (!config.projectId) {
    return null;
  }

  const bigquery = await getBigQueryClient();
  if (!bigquery) {
    return null;
  }

  try {
    const query = `
      SELECT
        DATE(usage_start_time) as date,
        SUM(cost) as daily_cost,
        SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) as daily_credits
      FROM \`${config.projectId}.${config.datasetId}.${config.tableId}\`
      WHERE
        DATE(usage_start_time) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
        AND project.id = @projectId
      GROUP BY
        DATE(usage_start_time)
      ORDER BY
        date ASC
    `;

    const options = {
      query,
      params: {
        days,
        projectId: config.projectId,
      },
    };

    const [rows] = await bigquery.query(options);

    const daily: DailyCost[] = rows.map((row: Record<string, unknown>) => {
      const dateValue = row.date as { value?: string } | string | undefined;
      return {
        date: typeof dateValue === 'object' && dateValue?.value ? dateValue.value : String(dateValue || ''),
        cost: Number(row.daily_cost) || 0,
        credits: Number(row.daily_credits) || 0,
        netCost: (Number(row.daily_cost) || 0) + (Number(row.daily_credits) || 0),
      };
    });

    // Calculate averages and projections
    const recentDays = daily.slice(-7);
    const weeklyAverage = recentDays.reduce((sum, d) => sum + d.netCost, 0) / (recentDays.length || 1);
    const monthlyProjection = weeklyAverage * 30;

    // Get previous month total for comparison
    const previousMonthStart = new Date();
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    previousMonthStart.setDate(1);
    const previousMonthEnd = new Date();
    previousMonthEnd.setDate(0); // Last day of previous month

    const previousMonth = await fetchGCPCosts(previousMonthStart, previousMonthEnd);
    const previousMonthTotal = previousMonth?.netCost || 0;

    const currentMonthTotal = daily.reduce((sum, d) => sum + d.netCost, 0);
    const percentChange = previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : 0;

    return {
      daily,
      weeklyAverage,
      monthlyProjection,
      previousMonthTotal,
      percentChange,
    };
  } catch (error) {
    logger.error('Failed to fetch GCP cost trend', { error });
    return null;
  }
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
