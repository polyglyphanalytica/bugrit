/**
 * Cloud Run Scan Worker Client
 *
 * Client for the main App Hosting application to communicate with
 * the Cloud Run scan worker for Chromium/Docker-based scans.
 *
 * Hybrid Architecture:
 * - Firebase App Hosting: Web UI, auth, billing, lightweight scans
 * - Cloud Run Worker: Heavy scans (Puppeteer, Docker tools)
 */

import { ToolCategory } from '../tools/registry';
import { ToolResult } from '../tools/runner';

// Environment configuration
const WORKER_URL = process.env.SCAN_WORKER_URL || 'https://bugrit-scan-worker-xxxxx.run.app';
const WORKER_SECRET = process.env.WORKER_SECRET || '';
const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/internal/scan-callback`
  : undefined;

export interface WorkerScanRequest {
  scanId: string;
  userId: string;
  source: {
    type: 'upload' | 'github' | 'gitlab' | 'npm' | 'url';
    path?: string;
    repoUrl?: string;
    branch?: string;
    packageName?: string;
    url?: string;
  };
  config: {
    categories: ToolCategory[];
    excludeTools?: string[];
    aiFeatures?: string[];
    timeout?: number;
  };
}

export interface WorkerScanResponse {
  scanId: string;
  status: 'completed' | 'failed' | 'partial';
  results: ToolResult[];
  metrics: {
    totalIssues: number;
    criticalIssues: number;
    linesOfCode: number;
    duration: number;
  };
  error?: string;
}

export interface LighthouseRequest {
  scanId: string;
  url: string;
}

export interface LighthouseResponse {
  scanId: string;
  url: string;
  scores: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
  };
  audits: Record<string, unknown>;
}

export interface AccessibilityRequest {
  scanId: string;
  url: string;
}

export interface AccessibilityResponse {
  scanId: string;
  url: string;
  violations: Array<{
    id: string;
    impact: string;
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{
      html: string;
      target: string[];
    }>;
  }>;
  passes: number;
  incomplete: number;
  inapplicable: number;
}

/**
 * Check if the worker service is available
 */
export async function isWorkerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if the worker is ready (Chromium available)
 */
export async function isWorkerReady(): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/ready`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.ready === true;
  } catch {
    return false;
  }
}

/**
 * Run a full scan on the worker
 */
export async function runWorkerScan(
  request: WorkerScanRequest
): Promise<WorkerScanResponse> {
  if (!WORKER_SECRET) {
    throw new Error('WORKER_SECRET not configured');
  }

  const response = await fetch(`${WORKER_URL}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WORKER_SECRET}`,
    },
    body: JSON.stringify({
      ...request,
      callbackUrl: CALLBACK_URL,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Worker returned ${response.status}`);
  }

  return response.json();
}

/**
 * Run Lighthouse performance scan on the worker
 */
export async function runLighthouseScan(
  request: LighthouseRequest
): Promise<LighthouseResponse> {
  if (!WORKER_SECRET) {
    throw new Error('WORKER_SECRET not configured');
  }

  const response = await fetch(`${WORKER_URL}/lighthouse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WORKER_SECRET}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Lighthouse scan failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Run accessibility scan on the worker
 */
export async function runAccessibilityScan(
  request: AccessibilityRequest
): Promise<AccessibilityResponse> {
  if (!WORKER_SECRET) {
    throw new Error('WORKER_SECRET not configured');
  }

  const response = await fetch(`${WORKER_URL}/accessibility`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WORKER_SECRET}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Accessibility scan failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Determine if a scan should be routed to the worker
 * Based on which tool categories require Chromium/Docker
 */
export function shouldUseWorker(categories: ToolCategory[]): boolean {
  const workerRequiredCategories: ToolCategory[] = [
    'accessibility',
    'performance',
  ];

  return categories.some(cat => workerRequiredCategories.includes(cat));
}

/**
 * Determine if a specific tool requires the worker
 */
export function toolRequiresWorker(toolId: string): boolean {
  const workerTools = [
    // Browser-based tools
    'lighthouse',
    'axe-core',
    'pa11y',
    'sitespeed',
    // Docker-based tools
    'owasp-zap',
    'dependency-check',
    'codeclimate',
    'hadolint',
    'dockle',
    'grype',
    'trivy',
  ];

  return workerTools.includes(toolId);
}

/**
 * Split scan configuration into local and worker portions
 */
export function splitScanConfig(config: {
  categories: ToolCategory[];
  excludeTools?: string[];
}): {
  local: { categories: ToolCategory[]; excludeTools?: string[] };
  worker: { categories: ToolCategory[]; excludeTools?: string[] };
} {
  const workerCategories: ToolCategory[] = ['accessibility', 'performance'];

  const localCategories = config.categories.filter(
    cat => !workerCategories.includes(cat)
  );
  const remoteCategories = config.categories.filter(
    cat => workerCategories.includes(cat)
  );

  return {
    local: {
      categories: localCategories,
      excludeTools: config.excludeTools,
    },
    worker: {
      categories: remoteCategories,
      excludeTools: config.excludeTools,
    },
  };
}

/**
 * Run a hybrid scan - local for lightweight tools, worker for heavy tools
 */
export async function runHybridScan(
  scanId: string,
  userId: string,
  source: WorkerScanRequest['source'],
  config: WorkerScanRequest['config'],
  localRunner: (config: { categories: ToolCategory[] }) => Promise<ToolResult[]>
): Promise<WorkerScanResponse> {
  const { local, worker } = splitScanConfig(config);
  const results: ToolResult[] = [];
  let totalDuration = 0;

  // Run local scans if any
  if (local.categories.length > 0) {
    const startTime = Date.now();
    const localResults = await localRunner(local);
    results.push(...localResults);
    totalDuration += Date.now() - startTime;
  }

  // Run worker scans if any
  if (worker.categories.length > 0 && await isWorkerAvailable()) {
    try {
      const workerResponse = await runWorkerScan({
        scanId,
        userId,
        source,
        config: {
          ...config,
          categories: worker.categories,
        },
      });
      results.push(...workerResponse.results);
      totalDuration += workerResponse.metrics.duration;
    } catch (error) {
      console.error('Worker scan failed, skipping browser-based tools:', error);
      // Add placeholder results for skipped tools
      for (const category of worker.categories) {
        results.push({
          tool: category,
          success: false,
          issues: [],
          error: 'Worker unavailable - browser-based tools skipped',
          metadata: {},
        });
      }
    }
  } else if (worker.categories.length > 0) {
    console.warn('Worker not available, skipping browser-based tools');
    for (const category of worker.categories) {
      results.push({
        tool: category,
        success: false,
        issues: [],
        error: 'Worker not configured - browser-based tools unavailable',
        metadata: {},
      });
    }
  }

  // Calculate combined metrics
  let totalIssues = 0;
  let criticalIssues = 0;
  let linesOfCode = 0;

  for (const result of results) {
    if (result.issues) {
      totalIssues += result.issues.length;
      criticalIssues += result.issues.filter(
        i => i.severity === 'critical' || i.severity === 'error'
      ).length;
    }
    if (result.metadata?.linesOfCode) {
      linesOfCode = Math.max(linesOfCode, result.metadata.linesOfCode);
    }
  }

  return {
    scanId,
    status: results.every(r => r.success) ? 'completed' : 'partial',
    results,
    metrics: {
      totalIssues,
      criticalIssues,
      linesOfCode,
      duration: totalDuration,
    },
  };
}

/**
 * Get worker service configuration for deployment
 */
export function getWorkerConfig() {
  return {
    url: WORKER_URL,
    configured: !!WORKER_SECRET,
    callbackUrl: CALLBACK_URL,
  };
}
