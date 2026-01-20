// Puppeteer Integration (Self-hosted)
// License: Apache 2.0
// Website: https://pptr.dev

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface PuppeteerMetrics {
  Timestamp: number;
  Documents: number;
  Frames: number;
  JSEventListeners: number;
  Nodes: number;
  LayoutCount: number;
  RecalcStyleCount: number;
  LayoutDuration: number;
  RecalcStyleDuration: number;
  ScriptDuration: number;
  TaskDuration: number;
  JSHeapUsedSize: number;
  JSHeapTotalSize: number;
}

interface PuppeteerAnalysis {
  url: string;
  metrics: PuppeteerMetrics;
  consoleMessages: Array<{ type: string; text: string }>;
  networkRequests: Array<{
    url: string;
    method: string;
    status: number;
    resourceType: string;
    timing?: { receiveHeadersEnd: number };
  }>;
  pageErrors: Array<{ message: string; stack?: string }>;
  coverage: {
    js: { totalBytes: number; usedBytes: number };
    css: { totalBytes: number; usedBytes: number };
  };
}

export class PuppeteerIntegration implements ToolIntegration {
  name = 'Puppeteer';
  category = 'visual' as const;
  description = 'Headless browser testing and automation for visual testing and screenshots';
  website = 'https://pptr.dev';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('node -e "require(\'puppeteer\')"', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        headless: true,
        timeout: 30000,
        viewport: { width: 1920, height: 1080 },
        collectMetrics: true,
        collectCoverage: true,
        checkConsoleErrors: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.url) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'URL is required for Puppeteer analysis',
      };
    }

    try {
      // Run Puppeteer analysis script
      const analysis = await this.analyzePage(target.url, config);

      findings.push(...this.analyzeMetrics(analysis, target.url));
      findings.push(...this.analyzeConsole(analysis, target.url));
      findings.push(...this.analyzeNetwork(analysis, target.url));
      findings.push(...this.analyzeCoverage(analysis, target.url));
      findings.push(...this.analyzeErrors(analysis, target.url));

      return this.createResult(findings, Date.now() - startTime, analysis);
    } catch (error) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async analyzePage(url: string, config?: ToolConfig): Promise<PuppeteerAnalysis> {
    const { execSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    const scriptPath = path.join(os.tmpdir(), `puppeteer-script-${Date.now()}.js`);
    const outputPath = path.join(os.tmpdir(), `puppeteer-output-${Date.now()}.json`);

    const viewport = config?.options?.viewport || { width: 1920, height: 1080 };
    const timeout = config?.options?.timeout || 30000;

    const script = `
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport(${JSON.stringify(viewport)});

  const consoleMessages = [];
  const pageErrors = [];
  const networkRequests = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', err => {
    pageErrors.push({ message: err.message, stack: err.stack });
  });

  page.on('requestfinished', request => {
    const response = request.response();
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      status: response ? response.status() : 0,
      resourceType: request.resourceType(),
      timing: request.timing()
    });
  });

  await page.coverage.startJSCoverage();
  await page.coverage.startCSSCoverage();

  try {
    await page.goto('${url}', { waitUntil: 'networkidle0', timeout: ${timeout} });
  } catch (e) {
    // Continue even if timeout
  }

  const metrics = await page.metrics();

  const jsCoverage = await page.coverage.stopJSCoverage();
  const cssCoverage = await page.coverage.stopCSSCoverage();

  const jsStats = jsCoverage.reduce((acc, entry) => {
    acc.totalBytes += entry.text.length;
    acc.usedBytes += entry.ranges.reduce((sum, range) => sum + range.end - range.start, 0);
    return acc;
  }, { totalBytes: 0, usedBytes: 0 });

  const cssStats = cssCoverage.reduce((acc, entry) => {
    acc.totalBytes += entry.text.length;
    acc.usedBytes += entry.ranges.reduce((sum, range) => sum + range.end - range.start, 0);
    return acc;
  }, { totalBytes: 0, usedBytes: 0 });

  const result = {
    url: '${url}',
    metrics,
    consoleMessages,
    networkRequests,
    pageErrors,
    coverage: { js: jsStats, css: cssStats }
  };

  require('fs').writeFileSync('${outputPath}', JSON.stringify(result, null, 2));

  await browser.close();
})();
`;

    fs.writeFileSync(scriptPath, script);

    try {
      execSync(`node "${scriptPath}"`, {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 120000
      });

      const result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      fs.unlinkSync(scriptPath);
      fs.unlinkSync(outputPath);
      return result;
    } catch (error) {
      fs.unlinkSync(scriptPath);
      throw error;
    }
  }

  private analyzeMetrics(analysis: PuppeteerAnalysis, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const metrics = analysis.metrics;

    // DOM size
    if (metrics.Nodes > 3000) {
      findings.push(this.createFinding(
        'large-dom',
        metrics.Nodes > 5000 ? 'high' : 'medium',
        'Large DOM Size',
        `Page has ${metrics.Nodes} DOM nodes (recommended < 1500)`,
        url,
        { nodes: metrics.Nodes }
      ));
    }

    // JS heap
    const heapMB = metrics.JSHeapUsedSize / (1024 * 1024);
    if (heapMB > 100) {
      findings.push(this.createFinding(
        'high-heap',
        heapMB > 200 ? 'high' : 'medium',
        'High JavaScript Heap Usage',
        `JS heap is using ${heapMB.toFixed(2)}MB`,
        url,
        { heapMB, total: metrics.JSHeapTotalSize / (1024 * 1024) }
      ));
    }

    // Script duration
    if (metrics.ScriptDuration > 2) {
      findings.push(this.createFinding(
        'long-script',
        metrics.ScriptDuration > 5 ? 'high' : 'medium',
        'Long Script Execution',
        `Scripts executed for ${metrics.ScriptDuration.toFixed(2)} seconds`,
        url,
        { duration: metrics.ScriptDuration }
      ));
    }

    // Layout thrashing
    if (metrics.LayoutCount > 50) {
      findings.push(this.createFinding(
        'layout-thrash',
        'medium',
        'Excessive Layout Operations',
        `${metrics.LayoutCount} layout operations detected`,
        url,
        { count: metrics.LayoutCount, duration: metrics.LayoutDuration }
      ));
    }

    return findings;
  }

  private analyzeConsole(analysis: PuppeteerAnalysis, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    const errors = analysis.consoleMessages.filter(m => m.type === 'error');
    const warnings = analysis.consoleMessages.filter(m => m.type === 'warning');

    if (errors.length > 0) {
      findings.push(this.createFinding(
        'console-errors',
        'high',
        'Console Errors',
        `${errors.length} console error(s) detected`,
        url,
        { errors: errors.slice(0, 10) }
      ));
    }

    if (warnings.length > 5) {
      findings.push(this.createFinding(
        'console-warnings',
        'low',
        'Console Warnings',
        `${warnings.length} console warning(s) detected`,
        url,
        { count: warnings.length }
      ));
    }

    return findings;
  }

  private analyzeNetwork(analysis: PuppeteerAnalysis, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Failed requests
    const failedRequests = analysis.networkRequests.filter(r => r.status >= 400);
    if (failedRequests.length > 0) {
      findings.push(this.createFinding(
        'failed-requests',
        failedRequests.some(r => r.status >= 500) ? 'high' : 'medium',
        'Failed Network Requests',
        `${failedRequests.length} request(s) failed`,
        url,
        { failed: failedRequests.slice(0, 10) }
      ));
    }

    // Too many requests
    if (analysis.networkRequests.length > 100) {
      findings.push(this.createFinding(
        'many-requests',
        'medium',
        'High Number of Network Requests',
        `Page made ${analysis.networkRequests.length} requests`,
        url,
        { count: analysis.networkRequests.length }
      ));
    }

    return findings;
  }

  private analyzeCoverage(analysis: PuppeteerAnalysis, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    const jsUnused = analysis.coverage.js.totalBytes - analysis.coverage.js.usedBytes;
    const jsUnusedPct = (jsUnused / analysis.coverage.js.totalBytes) * 100;

    if (jsUnusedPct > 50 && analysis.coverage.js.totalBytes > 100000) {
      findings.push(this.createFinding(
        'unused-js',
        jsUnusedPct > 70 ? 'high' : 'medium',
        'Unused JavaScript',
        `${jsUnusedPct.toFixed(1)}% of JavaScript is unused (${(jsUnused / 1024).toFixed(0)}KB)`,
        url,
        { unused: jsUnused, total: analysis.coverage.js.totalBytes, percent: jsUnusedPct }
      ));
    }

    const cssUnused = analysis.coverage.css.totalBytes - analysis.coverage.css.usedBytes;
    const cssUnusedPct = analysis.coverage.css.totalBytes > 0
      ? (cssUnused / analysis.coverage.css.totalBytes) * 100
      : 0;

    if (cssUnusedPct > 50 && analysis.coverage.css.totalBytes > 50000) {
      findings.push(this.createFinding(
        'unused-css',
        'medium',
        'Unused CSS',
        `${cssUnusedPct.toFixed(1)}% of CSS is unused (${(cssUnused / 1024).toFixed(0)}KB)`,
        url,
        { unused: cssUnused, total: analysis.coverage.css.totalBytes }
      ));
    }

    return findings;
  }

  private analyzeErrors(analysis: PuppeteerAnalysis, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    for (const error of analysis.pageErrors) {
      findings.push(this.createFinding(
        `page-error-${error.message.substring(0, 30)}`.replace(/[^a-z0-9-]/gi, '-'),
        'high',
        'JavaScript Error',
        error.message,
        url,
        { message: error.message, stack: error.stack }
      ));
    }

    return findings;
  }

  private createFinding(
    id: string,
    severity: Severity,
    title: string,
    description: string,
    url: string,
    data: Record<string, unknown>
  ): AuditFinding {
    return {
      id: `puppeteer-${id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Puppeteer: ${title}`,
      description,
      explanation: `Browser analysis found: ${description}`,
      impact: this.getImpact(id),
      url,
      recommendation: this.getRecommendation(id),
      documentationUrl: 'https://pptr.dev/',
      aiPrompt: {
        short: `Fix browser issue: ${title}`,
        detailed: `
Fix the browser issue found by Puppeteer.

URL: ${url}
Issue: ${title}
${description}

Data: ${JSON.stringify(data, null, 2)}
        `.trim(),
        steps: [
          'Review the issue',
          'Identify root cause',
          'Implement fix',
          'Re-test with Puppeteer',
        ],
      },
      ruleId: id,
      tags: ['puppeteer', 'browser', 'visual', severity],
      effort: 'moderate',
    };
  }

  private getImpact(id: string): string {
    const impacts: Record<string, string> = {
      'large-dom': 'Large DOM slows down rendering and interactions.',
      'high-heap': 'High memory usage can cause crashes on low-memory devices.',
      'long-script': 'Long script execution blocks the main thread.',
      'console-errors': 'JavaScript errors indicate bugs in the application.',
      'failed-requests': 'Failed requests may cause missing functionality.',
      'unused-js': 'Unused JavaScript increases load time.',
      'unused-css': 'Unused CSS increases stylesheet size.',
    };
    return impacts[id] || 'May affect page performance or functionality.';
  }

  private getRecommendation(id: string): string {
    const recs: Record<string, string> = {
      'large-dom': 'Reduce DOM nodes, use virtualization for long lists.',
      'high-heap': 'Fix memory leaks, optimize data structures.',
      'long-script': 'Split code, use web workers, defer non-critical scripts.',
      'console-errors': 'Fix the JavaScript errors in the code.',
      'failed-requests': 'Fix failing API endpoints or resource URLs.',
      'unused-js': 'Use code splitting and tree shaking.',
      'unused-css': 'Remove unused CSS rules, use CSS modules.',
    };
    return recs[id] || 'Investigate and fix the issue.';
  }

  private createResult(findings: AuditFinding[], duration: number, analysis: PuppeteerAnalysis): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: findings.length === 0 ? 1 : 0,
        failed: findings.length,
      },
      metadata: {
        url: analysis.url,
        domNodes: analysis.metrics.Nodes,
        heapUsed: analysis.metrics.JSHeapUsedSize,
        requests: analysis.networkRequests.length,
      },
    };
  }
}
