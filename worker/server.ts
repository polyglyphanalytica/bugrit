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
// @ts-ignore - uuid types
import { v4 as uuidv4 } from 'uuid';
import { runTools, ToolResult } from '../src/lib/tools/runner';
import { ToolCategory } from '../src/lib/tools/registry';
import { CloudBuildRunner, createCloudBuildRunner, DockerToolId, DOCKER_TOOLS } from '../src/lib/deploy/cloud-build';
import { workerLogger } from './logger';

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://bugrit.com',
    'https://bugrit-prod.web.app',
    'https://bugrit-prod.firebaseapp.com',
    'http://localhost:3000',
  ],
  methods: ['POST', 'GET'],
}));
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  workerLogger.info(`${req.method} ${req.path}`, requestId);
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
    workerLogger.error('WORKER_SECRET not configured');
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

    workerLogger.info(`Starting scan ${scanRequest.scanId}`, requestId);
    workerLogger.info(`Source type: ${scanRequest.source.type}`, requestId);
    workerLogger.info(`Categories: ${scanRequest.config.categories.join(', ')}`, requestId);

    // Prepare source for scanning
    const targetPath = await prepareSource(scanRequest.source);

    // Run the tools
    const results = await runTools({
      targetPath,
      categories: scanRequest.config.categories,
      excludeTools: scanRequest.config.excludeTools,
      url: scanRequest.source.url,
      timeout: scanRequest.config.timeout || 300000,
    } as Parameters<typeof runTools>[0]);

    // Calculate metrics
    const metrics = calculateMetrics(results, startTime);

    const response: ScanResponse = {
      scanId: scanRequest.scanId,
      status: results.every(r => r.success) ? 'completed' : 'partial',
      results,
      metrics,
    };

    workerLogger.info(`Scan completed in ${metrics.duration}ms`, requestId);
    workerLogger.info(`Found ${metrics.totalIssues} issues`, requestId);

    // If callback URL provided, POST results there
    if (scanRequest.callbackUrl) {
      await sendCallback(scanRequest.callbackUrl, response);
    }

    // Cleanup temp files
    await cleanupSource(targetPath, scanRequest.source.type);

    res.json(response);
  } catch (error: unknown) {
    const err = error as Error;
    workerLogger.error('Scan failed', requestId, err);

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

    workerLogger.info(`Running Lighthouse for ${url}`, requestId);

    const lighthouse = await import('lighthouse');
    const puppeteer = await import('puppeteer');

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const result = await lighthouse.default(url, {
      port: parseInt(new URL(browser.wsEndpoint()).port, 10),
      output: 'json',
      logLevel: 'error',
    });
    const lhr = (result as unknown as { lhr: { categories: Record<string, { score?: number }>; audits: unknown } })?.lhr;

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
    workerLogger.error('Lighthouse failed', requestId, err);
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

    workerLogger.info(`Running accessibility scan for ${url}`, requestId);

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
    workerLogger.error('Accessibility scan failed', requestId, err);
    res.status(500).json({ error: err.message });
  }
});

// Pa11y accessibility scan endpoint
app.post('/pa11y', authenticateRequest, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const { url, scanId, standard = 'WCAG2AA' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    workerLogger.info(`Running Pa11y scan for ${url} (${standard})`, requestId);

    const puppeteer = await import('puppeteer');

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    const pageTitle = await page.title();

    // Run basic accessibility checks (simplified Pa11y-style)
    const issues = await page.evaluate(() => {
      const results: Array<{
        code: string;
        type: 'error' | 'warning' | 'notice';
        message: string;
        context: string;
        selector: string;
      }> = [];

      // Check images without alt
      document.querySelectorAll('img:not([alt])').forEach((img, i) => {
        results.push({
          code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37',
          type: 'error',
          message: 'Img element missing an alt attribute.',
          context: (img as HTMLElement).outerHTML.slice(0, 100),
          selector: `img:nth-of-type(${i + 1})`,
        });
      });

      // Check form inputs without labels
      document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])').forEach((input, i) => {
        const id = (input as HTMLInputElement).id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAria = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
        if (!hasLabel && !hasAria) {
          results.push({
            code: 'WCAG2AA.Principle1.Guideline1_3.1_3_1.H44',
            type: 'error',
            message: 'Form input element has no label.',
            context: (input as HTMLElement).outerHTML.slice(0, 100),
            selector: `input:nth-of-type(${i + 1})`,
          });
        }
      });

      // Check missing document title
      if (!document.title?.trim()) {
        results.push({
          code: 'WCAG2AA.Principle2.Guideline2_4.2_4_2.H25',
          type: 'error',
          message: 'Document has no title element.',
          context: '<head>...</head>',
          selector: 'head',
        });
      }

      // Check missing lang attribute
      if (!document.documentElement.lang) {
        results.push({
          code: 'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57',
          type: 'error',
          message: 'The html element should have a lang attribute.',
          context: '<html>',
          selector: 'html',
        });
      }

      // Check empty links
      document.querySelectorAll('a').forEach((link, i) => {
        const hasText = link.textContent?.trim();
        const hasAria = link.hasAttribute('aria-label');
        const hasImg = link.querySelector('img[alt]:not([alt=""])');
        if (!hasText && !hasAria && !hasImg) {
          results.push({
            code: 'WCAG2AA.Principle2.Guideline2_4.2_4_4.H77',
            type: 'error',
            message: 'Link has no text content.',
            context: link.outerHTML.slice(0, 100),
            selector: `a:nth-of-type(${i + 1})`,
          });
        }
      });

      // Check empty buttons
      document.querySelectorAll('button').forEach((btn, i) => {
        const hasText = btn.textContent?.trim();
        const hasAria = btn.hasAttribute('aria-label');
        if (!hasText && !hasAria) {
          results.push({
            code: 'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91',
            type: 'error',
            message: 'Button has no text content.',
            context: btn.outerHTML.slice(0, 100),
            selector: `button:nth-of-type(${i + 1})`,
          });
        }
      });

      return results;
    });

    await browser.close();

    res.json({
      scanId,
      url,
      pageTitle,
      issues,
    });
  } catch (error: unknown) {
    const err = error as Error;
    workerLogger.error('Pa11y scan failed', requestId, err);
    res.status(500).json({ error: err.message });
  }
});

// Initialize Cloud Build runner (lazy)
let cloudBuildRunner: CloudBuildRunner | null = null;

function getCloudBuildRunner(): CloudBuildRunner | null {
  if (!cloudBuildRunner) {
    cloudBuildRunner = createCloudBuildRunner();
  }
  return cloudBuildRunner;
}

// Docker-based scan request interface
interface DockerScanRequest {
  scanId: string;
  toolId: DockerToolId;
  target: string;         // URL for web tools, local path for source tools
  sourceType?: 'url' | 'source';  // Whether target is URL or needs upload
  timeout?: string;
  callbackUrl?: string;
}

interface DockerScanResponse {
  scanId: string;
  toolId: DockerToolId;
  status: 'completed' | 'failed' | 'timeout';
  buildId?: string;
  output?: unknown;
  duration?: number;
  error?: string;
}

// Docker-based tools endpoint (runs via Cloud Build)
app.post('/docker-scan', authenticateRequest, async (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string;
  const startTime = Date.now();

  try {
    const request: DockerScanRequest = req.body;

    // Validate request
    if (!request.scanId || !request.toolId || !request.target) {
      return res.status(400).json({
        error: 'Invalid request: missing scanId, toolId, or target',
      });
    }

    // Validate tool exists
    if (!(request.toolId in DOCKER_TOOLS)) {
      return res.status(400).json({
        error: `Unknown tool: ${request.toolId}. Available tools: ${Object.keys(DOCKER_TOOLS).join(', ')}`,
      });
    }

    workerLogger.info(`Starting Docker scan ${request.scanId}`, requestId);
    workerLogger.info(`Tool: ${request.toolId}`, requestId);
    workerLogger.info(`Target: ${request.target}`, requestId);

    // Get Cloud Build runner
    const runner = getCloudBuildRunner();
    if (!runner) {
      return res.status(503).json({
        error: 'Cloud Build not configured. Set GOOGLE_CLOUD_PROJECT environment variable.',
      });
    }

    // For source-based tools, upload source to GCS first
    let targetPath = request.target;
    if (request.sourceType === 'source') {
      workerLogger.info('Uploading source to Cloud Storage...', requestId);
      targetPath = await runner.uploadSource(request.target, request.scanId);
      workerLogger.info(`Source uploaded to: ${targetPath}`, requestId);
    }

    // Run the tool via Cloud Build
    workerLogger.info('Submitting Cloud Build job...', requestId);
    const { result, output } = await runner.runTool({
      toolId: request.toolId,
      target: targetPath,
      scanId: request.scanId,
      timeout: request.timeout,
    });

    const response: DockerScanResponse = {
      scanId: request.scanId,
      toolId: request.toolId,
      status: result.success ? 'completed' : (result.status === 'TIMEOUT' ? 'timeout' : 'failed'),
      buildId: result.jobId,
      output,
      duration: Date.now() - startTime,
      error: result.error,
    };

    workerLogger.info(`Docker scan completed in ${response.duration}ms`, requestId);
    workerLogger.info(`Status: ${response.status}`, requestId);

    // Send callback if provided
    if (request.callbackUrl) {
      await sendDockerCallback(request.callbackUrl, response);
    }

    // Cleanup uploaded source if applicable
    if (request.sourceType === 'source') {
      await runner.cleanup(request.scanId);
    }

    res.json(response);
  } catch (error: unknown) {
    const err = error as Error;
    workerLogger.error('Docker scan failed', requestId, err);

    const response: DockerScanResponse = {
      scanId: req.body?.scanId || 'unknown',
      toolId: req.body?.toolId || 'unknown',
      status: 'failed',
      duration: Date.now() - startTime,
      error: err.message,
    };

    res.status(500).json(response);
  }
});

// List available Docker tools
app.get('/docker-tools', authenticateRequest, (req: Request, res: Response) => {
  const tools = Object.entries(DOCKER_TOOLS).map(([id, config]) => ({
    id,
    image: config.image,
    timeout: config.timeout,
    memory: config.memory,
  }));

  res.json({ tools });
});

/**
 * Send Docker scan results to callback URL
 */
async function sendDockerCallback(url: string, response: DockerScanResponse): Promise<void> {
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
    workerLogger.error('Failed to send Docker scan callback', undefined, error);
  }
}

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
    const extResult = result as unknown as { issues?: Array<{ severity: string }>; metadata?: { linesOfCode?: number } };
    if (extResult.issues) {
      totalIssues += extResult.issues.length;
      criticalIssues += extResult.issues.filter(
        (i: { severity: string }) => i.severity === 'critical' || i.severity === 'error'
      ).length;
    }
    if (extResult.metadata?.linesOfCode) {
      linesOfCode = Math.max(linesOfCode, extResult.metadata.linesOfCode);
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
    workerLogger.error('Failed to send callback', undefined, error);
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
    workerLogger.error('Cleanup failed', undefined, error);
  }
}

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  workerLogger.error('Unhandled error', undefined, err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  workerLogger.info(`Bugrit Scan Worker running on port ${PORT}`);
  workerLogger.info(`Chromium: ${process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'}`);
  workerLogger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
