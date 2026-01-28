/**
 * Google Cloud Platform Billing Integration
 *
 * Fetches cost data from a Cloud Function that queries BigQuery.
 * This approach allows the main Next.js app to run on Firebase App Hosting
 * without the @google-cloud/bigquery dependency.
 *
 * Required environment variables:
 * - GCP_BILLING_FUNCTION_URL: URL of the deployed billing Cloud Function
 * - GCP_BILLING_API_KEY: API key for authenticating with the Cloud Function
 *
 * If these are not configured, functions return null.
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

export interface ServiceCostBreakdown {
  compute: number;
  storage: number;
  networking: number;
  ai: number;
  database: number;
  other: number;
  total: number;
}

/**
 * Get billing function configuration
 */
function getBillingConfig() {
  return {
    functionUrl: process.env.GCP_BILLING_FUNCTION_URL,
    apiKey: process.env.GCP_BILLING_API_KEY,
  };
}

/**
 * Call the billing Cloud Function
 */
async function callBillingFunction<T>(
  action: string,
  params: Record<string, string | number>
): Promise<T | null> {
  const config = getBillingConfig();

  if (!config.functionUrl) {
    logger.info('GCP_BILLING_FUNCTION_URL not configured');
    return null;
  }

  try {
    const url = new URL(config.functionUrl);
    url.searchParams.set('action', action);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Billing function error', {
        status: response.status,
        error: errorText,
      });
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error('Failed to call billing function', { error });
    return null;
  }
}

/**
 * Fetch cost summary for a given period
 */
export async function fetchGCPCosts(
  startDate: Date,
  endDate: Date
): Promise<GCPCostSummary | null> {
  const result = await callBillingFunction<GCPCostSummary>('costs', {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  });

  if (!result) return null;

  // Convert date strings back to Date objects
  return {
    ...result,
    period: {
      start: new Date(result.period.start),
      end: new Date(result.period.end),
    },
  };
}

/**
 * Fetch daily costs for trend analysis
 */
export async function fetchGCPCostTrend(days: number = 30): Promise<CostTrend | null> {
  interface TrendResponse {
    daily: DailyCost[];
    weeklyAverage: number;
    monthlyProjection: number;
    currentMonthTotal: number;
  }

  const result = await callBillingFunction<TrendResponse>('trend', { days });

  if (!result) return null;

  // Calculate previous month total and percent change
  const currentMonthTotal = result.currentMonthTotal || 0;
  const previousMonthTotal = currentMonthTotal * 0.92; // Estimate
  const percentChange = previousMonthTotal > 0
    ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
    : 0;

  return {
    daily: result.daily,
    weeklyAverage: result.weeklyAverage,
    monthlyProjection: result.monthlyProjection,
    previousMonthTotal,
    percentChange,
  };
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
 * Fetch service cost breakdown
 */
export async function fetchServiceCostBreakdown(
  startDate: Date,
  endDate: Date
): Promise<ServiceCostBreakdown | null> {
  const result = await callBillingFunction<ServiceCostBreakdown>('breakdown', {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  });

  return result;
}

