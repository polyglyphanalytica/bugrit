/**
 * Bugrit Scan Worker Service
 *
 * Standalone Express server for running scans with Chromium/Puppeteer.
 * Deployed to Cloud Run as part of the hybrid architecture.
 *
 * Architecture:
 * - Firebase App Hosting: Web UI, auth, billing
 * - Cloud Run (this worker): Scan execution with browser automation
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { runTools, ToolResult } from '../src/lib/tools/runner';
import { ToolCategory } from '../src/lib/tools/registry';

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://bugrit.dev'],
  methods: ['POST', 'GET'],
}));
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  console.log(`[${requestId}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (required by Cloud Run)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    chromium: process.env.PUPPETEER_EXECUTABLE_PATH || 'not configured',
    uptime: process.uptime(),
  });
});

// Readiness check
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Verify Chromium is available
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    await browser.close();

    res.json({ ready: true });
  } catch (error: unknown) {
    const err = error as Error;
    res.status(503).json({
      ready: false,
      error: err.message,
    });
  }
});

// Authentication middleware for scan requests
function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const workerSecret = process.env.WORKER_SECRET;

  if (!workerSecret) {
    console.error('WORKER_SECRET not configured');
    return res.status(500).json({ error: 'Worker not properly configured' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.substring(7);
  if (token !== workerSecret) {
    return res.status(403).json({ error: 'Invalid worker secret' });
  }

  next();
}

// Scan request interface
interface ScanRequest {
  scanId: string;
  userId: string;
  source: {
    type: 'upload' | 'github' | 'gitlab' | 'npm' | 'url';
    path?: string;        // For upload: temp file path
    repoUrl?: string;     // For github/gitlab
    branch?: string;
    packageName?: string; // For npm
    url?: string;         // For url-based scans (Lighthouse)
  };
  config: {
    categories: ToolCategory[];
    excludeTools?: string[];
    aiFeatures?: string[];
    timeout?: number;
  };
  callbackUrl?: string;   // URL to POST results when complete
}

interface ScanResponse {
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

// Main scan endpoint
app.post('/scan', authenticateRequest, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  const startTime = Date.now();

  try {
    const scanRequest: ScanRequest = req.body;

    // Validate request
    if (!scanRequest.scanId || !scanRequest.source || !scanRequest.config) {
      return res.status(400).json({
        error: 'Invalid scan request: missing scanId, source, or config',
      });
    }

    console.log(`[${requestId}] Starting scan ${scanRequest.scanId}`);
    console.log(`[${requestId}] Source type: ${scanRequest.source.type}`);
    console.log(`[${requestId}] Categories: ${scanRequest.config.categories.join(', ')}`);

    // Prepare source for scanning
    const targetPath = await prepareSource(scanRequest.source);

    // Run the tools
    const results = await runTools({
      targetPath,
      categories: scanRequest.config.categories,
      excludeTools: scanRequest.config.excludeTools,
      url: scanRequest.source.url,
      timeout: scanRequest.config.timeout || 300000,
    });

    // Calculate metrics
    const metrics = calculateMetrics(results, startTime);

    const response: ScanResponse = {
      scanId: scanRequest.scanId,
      status: results.every(r => r.success) ? 'completed' : 'partial',
      results,
      metrics,
    };

    console.log(`[${requestId}] Scan completed in ${metrics.duration}ms`);
    console.log(`[${requestId}] Found ${metrics.totalIssues} issues`);

    // If callback URL provided, POST results there
    if (scanRequest.callbackUrl) {
      await sendCallback(scanRequest.callbackUrl, response);
    }

    // Cleanup temp files
    await cleanupSource(targetPath, scanRequest.source.type);

    res.json(response);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[${requestId}] Scan failed:`, err);

    const response: ScanResponse = {
      scanId: req.body?.scanId || 'unknown',
      status: 'failed',
      results: [],
      metrics: {
        totalIssues: 0,
        criticalIssues: 0,
        linesOfCode: 0,
        duration: Date.now() - startTime,
      },
      error: err.message,
    };

    res.status(500).json(response);
  }
});

// Lighthouse-specific endpoint (for URL-based performance scans)
app.post('/lighthouse', authenticateRequest, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const { url, scanId } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[${requestId}] Running Lighthouse for ${url}`);

    const lighthouse = await import('lighthouse');
    const puppeteer = await import('puppeteer');

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const { lhr } = await lighthouse.default(url, {
      port: new URL(browser.wsEndpoint()).port,
      output: 'json',
      logLevel: 'error',
    });

    await browser.close();

    res.json({
      scanId,
      url,
      scores: {
        performance: lhr.categories.performance?.score,
        accessibility: lhr.categories.accessibility?.score,
        bestPractices: lhr.categories['best-practices']?.score,
        seo: lhr.categories.seo?.score,
      },
      audits: lhr.audits,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[${requestId}] Lighthouse failed:`, err);
    res.status(500).json({ error: err.message });
  }
});

// Accessibility scan endpoint (axe-core)
app.post('/accessibility', authenticateRequest, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const { url, scanId } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[${requestId}] Running accessibility scan for ${url}`);

    const puppeteer = await import('puppeteer');
    const { AxePuppeteer } = await import('@axe-core/puppeteer');

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const results = await new AxePuppeteer(page).analyze();

    await browser.close();

    res.json({
      scanId,
      url,
      violations: results.violations,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`[${requestId}] Accessibility scan failed:`, err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Prepare source code for scanning
 */
async function prepareSource(source: ScanRequest['source']): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bugrit-scan-'));

  switch (source.type) {
    case 'upload':
      // Source is already extracted, just return path
      if (!source.path) throw new Error('Upload path not provided');
      return source.path;

    case 'github':
    case 'gitlab':
      // Clone repository
      if (!source.repoUrl) throw new Error('Repository URL not provided');
      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit();
      await git.clone(source.repoUrl, tempDir, {
        '--depth': '1',
        '--branch': source.branch || 'main',
      });
      return tempDir;

    case 'npm':
      // Download and extract npm package
      if (!source.packageName) throw new Error('Package name not provided');
      const { execSync } = await import('child_process');
      execSync(`npm pack ${source.packageName} --pack-destination ${tempDir}`, {
        cwd: tempDir,
      });
      // Extract the tarball
      const files = await fs.readdir(tempDir);
      const tarball = files.find(f => f.endsWith('.tgz'));
      if (tarball) {
        execSync(`tar -xzf ${tarball}`, { cwd: tempDir });
      }
      return path.join(tempDir, 'package');

    case 'url':
      // URL-based scans don't need local files
      return tempDir;

    default:
      throw new Error(`Unsupported source type: ${source.type}`);
  }
}

/**
 * Calculate scan metrics
 */
function calculateMetrics(
  results: ToolResult[],
  startTime: number
): ScanResponse['metrics'] {
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
    totalIssues,
    criticalIssues,
    linesOfCode,
    duration: Date.now() - startTime,
  };
}

/**
 * Send results to callback URL
 */
async function sendCallback(url: string, response: ScanResponse): Promise<void> {
  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CALLBACK_SECRET || ''}`,
      },
      body: JSON.stringify(response),
    });
  } catch (error) {
    console.error('Failed to send callback:', error);
  }
}

/**
 * Cleanup temporary source files
 */
async function cleanupSource(path: string, sourceType: string): Promise<void> {
  if (sourceType === 'upload') {
    // Don't cleanup uploaded files - they're managed by the main app
    return;
  }

  try {
    const fs = await import('fs/promises');
    await fs.rm(path, { recursive: true, force: true });
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔧 Bugrit Scan Worker running on port ${PORT}`);
  console.log(`   Chromium: ${process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
