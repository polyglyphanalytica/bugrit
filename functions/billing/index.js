/**
 * GCP Billing Cloud Function
 *
 * Queries BigQuery for billing data and returns it to the main app.
 * Deploy this function separately from the main Next.js app.
 *
 * Environment variables required:
 * - GCP_PROJECT_ID: The GCP project ID
 * - GCP_BILLING_DATASET_ID: BigQuery dataset ID (default: billing_export)
 * - GCP_BILLING_TABLE_ID: BigQuery table ID (default: gcp_billing_export_v1)
 * - BILLING_API_KEY: Secret key for authenticating requests from the main app
 */

const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('@google-cloud/functions-framework');

const bigquery = new BigQuery();

// Environment-aware logger for Cloud Functions
const isProduction = process.env.NODE_ENV === 'production';
const fnLogger = {
  error: (msg, error) => {
    if (isProduction) {
      process.stderr.write(JSON.stringify({
        severity: 'ERROR', message: msg, error: error?.message || error, timestamp: new Date().toISOString(),
      }) + '\n');
    } else {
      console.error(msg, error);
    }
  },
};

// Configuration
const config = {
  projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
  datasetId: process.env.GCP_BILLING_DATASET_ID || 'billing_export',
  tableId: process.env.GCP_BILLING_TABLE_ID || 'gcp_billing_export_v1',
  apiKey: process.env.BILLING_API_KEY,
};

/**
 * Validate API key from request
 */
function validateApiKey(req) {
  if (!config.apiKey) {
    // No API key configured, allow all requests (dev mode)
    return true;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === config.apiKey;
}

/**
 * Main HTTP function handler
 */
functions.http('gcpBilling', async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Validate API key
  if (!validateApiKey(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!config.projectId) {
    res.status(500).json({ error: 'GCP_PROJECT_ID not configured' });
    return;
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'costs':
        await handleCosts(req, res);
        break;
      case 'trend':
        await handleTrend(req, res);
        break;
      case 'breakdown':
        await handleBreakdown(req, res);
        break;
      default:
        res.status(400).json({ error: 'Invalid action. Use: costs, trend, or breakdown' });
    }
  } catch (error) {
    fnLogger.error('Error handling request', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Fetch cost summary for a period
 */
async function handleCosts(req, res) {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate required' });
    return;
  }

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
      startDate,
      endDate,
      projectId: config.projectId,
    },
  };

  const [rows] = await bigquery.query(options);

  const items = rows.map(row => ({
    service: row.service_name,
    description: row.sku_description,
    cost: Number(row.total_cost) || 0,
    currency: row.currency || 'USD',
    usageAmount: Number(row.usage_amount) || 0,
    usageUnit: row.usage_unit || '',
    credits: Number(row.total_credits) || 0,
    netCost: (Number(row.total_cost) || 0) + (Number(row.total_credits) || 0),
  }));

  const byService = {};
  let totalCost = 0;
  let totalCredits = 0;

  for (const item of items) {
    totalCost += item.cost;
    totalCredits += item.credits;
    byService[item.service] = (byService[item.service] || 0) + item.netCost;
  }

  res.json({
    totalCost,
    totalCredits,
    netCost: totalCost + totalCredits,
    currency: items[0]?.currency || 'USD',
    period: { start: startDate, end: endDate },
    byService,
    items,
  });
}

/**
 * Fetch daily cost trend
 */
async function handleTrend(req, res) {
  const days = parseInt(req.query.days) || 30;

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

  const daily = rows.map(row => {
    const dateValue = row.date;
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
  const currentMonthTotal = daily.reduce((sum, d) => sum + d.netCost, 0);

  res.json({
    daily,
    weeklyAverage: Math.round(weeklyAverage * 100) / 100,
    monthlyProjection: Math.round(monthlyProjection * 100) / 100,
    currentMonthTotal: Math.round(currentMonthTotal * 100) / 100,
  });
}

/**
 * Fetch cost breakdown by service category
 */
async function handleBreakdown(req, res) {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ error: 'startDate and endDate required' });
    return;
  }

  const query = `
    SELECT
      service.description as service_name,
      SUM(cost) as total_cost,
      SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) as total_credits
    FROM \`${config.projectId}.${config.datasetId}.${config.tableId}\`
    WHERE
      DATE(usage_start_time) >= @startDate
      AND DATE(usage_end_time) <= @endDate
      AND project.id = @projectId
    GROUP BY
      service.description
    ORDER BY
      total_cost DESC
  `;

  const options = {
    query,
    params: {
      startDate,
      endDate,
      projectId: config.projectId,
    },
  };

  const [rows] = await bigquery.query(options);

  const breakdown = {
    compute: 0,
    storage: 0,
    networking: 0,
    ai: 0,
    database: 0,
    other: 0,
    total: 0,
  };

  for (const row of rows) {
    const service = (row.service_name || '').toLowerCase();
    const cost = (Number(row.total_cost) || 0) + (Number(row.total_credits) || 0);

    breakdown.total += cost;

    if (service.includes('compute') || service.includes('cloud run') ||
        service.includes('functions') || service.includes('kubernetes')) {
      breakdown.compute += cost;
    } else if (service.includes('storage') && !service.includes('firestore')) {
      breakdown.storage += cost;
    } else if (service.includes('network') || service.includes('egress') ||
               service.includes('load balancing')) {
      breakdown.networking += cost;
    } else if (service.includes('vertex') || service.includes('vision') ||
               service.includes('natural language') || service.includes('ai platform')) {
      breakdown.ai += cost;
    } else if (service.includes('firestore') || service.includes('sql') ||
               service.includes('spanner') || service.includes('bigtable')) {
      breakdown.database += cost;
    } else {
      breakdown.other += cost;
    }
  }

  // Round all values
  for (const key of Object.keys(breakdown)) {
    breakdown[key] = Math.round(breakdown[key] * 100) / 100;
  }

  res.json(breakdown);
}
