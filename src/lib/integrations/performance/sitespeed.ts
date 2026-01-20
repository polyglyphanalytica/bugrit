// sitespeed.io Integration (Self-hosted)
// License: MIT
// Website: https://www.sitespeed.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity, PerformanceMetrics } from '../types';

interface SitespeedBrowsertime {
  statistics: {
    timings: {
      firstPaint: { median: number };
      fullyLoaded: { median: number };
      pageTimings: {
        domContentLoadedTime: { median: number };
        domInteractiveTime: { median: number };
        pageLoadTime: { median: number };
      };
      paintTiming: {
        'first-contentful-paint': { median: number };
      };
      largestContentfulPaint?: { median: number };
    };
    visualMetrics?: {
      FirstVisualChange: { median: number };
      SpeedIndex: { median: number };
      VisualComplete85: { median: number };
      LastVisualChange: { median: number };
      LargestContentfulPaint?: { median: number };
    };
    cpu?: {
      longTasks: { totalDuration: { median: number }; totalTasks: { median: number } };
    };
  };
}

interface SitespeedPageXray {
  contentTypes: Record<string, { requests: number; transferSize: number }>;
  requests: number;
  transferSize: number;
  contentSize: number;
}

interface SitespeedCoach {
  advice: {
    performance: { score: number; adviceList: Record<string, { score: number; advice: string; description: string; weight: number }> };
    accessibility: { score: number; adviceList: Record<string, { score: number; advice: string; description: string; weight: number }> };
    bestpractice: { score: number; adviceList: Record<string, { score: number; advice: string; description: string; weight: number }> };
  };
}

interface SitespeedOutput {
  browsertime?: SitespeedBrowsertime[];
  pagexray?: SitespeedPageXray[];
  coach?: SitespeedCoach[];
}

export class SitespeedIntegration implements ToolIntegration {
  name = 'sitespeed.io';
  category = 'performance' as const;
  description = 'Complete web performance testing tool with browser metrics, Lighthouse, and more';
  website = 'https://www.sitespeed.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('docker images sitespeedio/sitespeed.io --format "{{.Repository}}"', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        iterations: 3,
        browser: 'chrome',
        connectivity: 'cable',
        visualMetrics: true,
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
        error: 'URL is required for sitespeed.io',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const outputDir = path.join(os.tmpdir(), `sitespeed-${Date.now()}`);
      const iterations = config?.options?.iterations || 3;
      const browser = config?.options?.browser || 'chrome';

      fs.mkdirSync(outputDir, { recursive: true });

      execSync(
        `docker run --rm -v "${outputDir}:/sitespeed.io" sitespeedio/sitespeed.io:latest "${target.url}" -n ${iterations} -b ${browser} --outputFolder /sitespeed.io`,
        { encoding: 'utf-8', maxBuffer: 200 * 1024 * 1024, timeout: 600000 }
      );

      // Find and parse the JSON results
      const resultsDir = fs.readdirSync(outputDir).find(d => d.includes('pages'));
      if (resultsDir) {
        const domain = new URL(target.url).hostname;
        const dataPath = path.join(outputDir, resultsDir, domain);

        // Try to read browsertime data
        const btPath = path.join(dataPath, 'data', 'browsertime.pageSummary.json');
        if (fs.existsSync(btPath)) {
          const btData = JSON.parse(fs.readFileSync(btPath, 'utf-8'));
          findings.push(...this.analyzeBrowsertime(btData, target.url));
        }

        // Try to read coach data
        const coachPath = path.join(dataPath, 'data', 'coach.pageSummary.json');
        if (fs.existsSync(coachPath)) {
          const coachData = JSON.parse(fs.readFileSync(coachPath, 'utf-8'));
          findings.push(...this.analyzeCoach(coachData, target.url));
        }

        // Try to read pagexray data
        const pxPath = path.join(dataPath, 'data', 'pagexray.pageSummary.json');
        if (fs.existsSync(pxPath)) {
          const pxData = JSON.parse(fs.readFileSync(pxPath, 'utf-8'));
          findings.push(...this.analyzePageXray(pxData, target.url));
        }
      }

      // Cleanup
      fs.rmSync(outputDir, { recursive: true, force: true });

      return this.createResult(findings, Date.now() - startTime, target.url);
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

  private analyzeBrowsertime(data: SitespeedBrowsertime, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const stats = data.statistics;

    // First Contentful Paint
    const fcp = stats.timings?.paintTiming?.['first-contentful-paint']?.median;
    if (fcp && fcp > 3000) {
      findings.push(this.createFinding('slow-fcp', 'high', 'Slow First Contentful Paint',
        `FCP is ${Math.round(fcp)}ms (should be < 1800ms)`, url, { fcp }));
    } else if (fcp && fcp > 1800) {
      findings.push(this.createFinding('moderate-fcp', 'medium', 'Moderate First Contentful Paint',
        `FCP is ${Math.round(fcp)}ms`, url, { fcp }));
    }

    // Largest Contentful Paint
    const lcp = stats.timings?.largestContentfulPaint?.median || stats.visualMetrics?.LargestContentfulPaint?.median;
    if (lcp && lcp > 4000) {
      findings.push(this.createFinding('slow-lcp', 'high', 'Slow Largest Contentful Paint',
        `LCP is ${Math.round(lcp)}ms (should be < 2500ms)`, url, { lcp }));
    } else if (lcp && lcp > 2500) {
      findings.push(this.createFinding('moderate-lcp', 'medium', 'Moderate LCP',
        `LCP is ${Math.round(lcp)}ms`, url, { lcp }));
    }

    // Speed Index
    const si = stats.visualMetrics?.SpeedIndex?.median;
    if (si && si > 5800) {
      findings.push(this.createFinding('slow-si', 'high', 'Slow Speed Index',
        `Speed Index is ${Math.round(si)}ms (should be < 3400ms)`, url, { si }));
    } else if (si && si > 3400) {
      findings.push(this.createFinding('moderate-si', 'medium', 'Moderate Speed Index',
        `Speed Index is ${Math.round(si)}ms`, url, { si }));
    }

    // Long Tasks
    const longTasks = stats.cpu?.longTasks;
    if (longTasks?.totalDuration?.median && longTasks.totalDuration.median > 500) {
      findings.push(this.createFinding('long-tasks', 'medium', 'Excessive Long Tasks',
        `Total long task duration: ${Math.round(longTasks.totalDuration.median)}ms`, url,
        { duration: longTasks.totalDuration.median, count: longTasks.totalTasks?.median }));
    }

    return findings;
  }

  private analyzeCoach(data: SitespeedCoach, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const advice = data.advice;

    for (const [category, categoryData] of Object.entries(advice)) {
      if (categoryData.score < 80) {
        for (const [ruleId, rule] of Object.entries(categoryData.adviceList)) {
          if (rule.score < 80 && rule.weight > 0) {
            findings.push(this.createFinding(
              `coach-${category}-${ruleId}`,
              rule.score < 50 ? 'high' : 'medium',
              `${category}: ${ruleId}`,
              rule.advice,
              url,
              { score: rule.score, category, description: rule.description }
            ));
          }
        }
      }
    }

    return findings;
  }

  private analyzePageXray(data: SitespeedPageXray, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Total page size
    const totalMB = data.transferSize / (1024 * 1024);
    if (totalMB > 5) {
      findings.push(this.createFinding('large-page', 'high', 'Very Large Page Size',
        `Total transfer size is ${totalMB.toFixed(2)}MB`, url, { bytes: data.transferSize }));
    } else if (totalMB > 2) {
      findings.push(this.createFinding('moderate-page-size', 'medium', 'Large Page Size',
        `Total transfer size is ${totalMB.toFixed(2)}MB`, url, { bytes: data.transferSize }));
    }

    // Too many requests
    if (data.requests > 100) {
      findings.push(this.createFinding('many-requests', 'high', 'Too Many Requests',
        `Page makes ${data.requests} requests`, url, { requests: data.requests }));
    } else if (data.requests > 50) {
      findings.push(this.createFinding('moderate-requests', 'medium', 'Many Requests',
        `Page makes ${data.requests} requests`, url, { requests: data.requests }));
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
      id: `sitespeed-${id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `sitespeed.io: ${title}`,
      description,
      explanation: `Web performance issue: ${description}`,
      impact: this.getImpact(severity, title),
      url,
      recommendation: this.getRecommendation(id),
      documentationUrl: 'https://www.sitespeed.io/documentation/',
      aiPrompt: {
        short: `Fix sitespeed.io issue: ${title}`,
        detailed: `
Fix the web performance issue found by sitespeed.io.

URL: ${url}
Issue: ${title}
${description}

Data: ${JSON.stringify(data, null, 2)}

Optimize the page to improve the identified metrics.
        `.trim(),
        steps: [
          'Analyze the performance metric',
          'Identify root causes',
          'Implement optimizations',
          'Re-run sitespeed.io to verify',
        ],
      },
      ruleId: id,
      tags: ['sitespeed.io', 'performance', 'web-vitals', severity],
      effort: 'moderate',
    };
  }

  private getImpact(severity: Severity, title: string): string {
    if (severity === 'high') {
      return `Significant performance issue: ${title}. User experience is notably degraded.`;
    }
    return `Performance concern: ${title}. May affect user experience.`;
  }

  private getRecommendation(id: string): string {
    const recs: Record<string, string> = {
      'slow-fcp': 'Reduce server response time, eliminate render-blocking resources.',
      'slow-lcp': 'Optimize largest content element, use CDN, preload critical resources.',
      'slow-si': 'Optimize above-the-fold content, reduce JavaScript execution.',
      'long-tasks': 'Break up long JavaScript tasks, use web workers.',
      'large-page': 'Compress assets, use efficient formats, lazy load non-critical resources.',
      'many-requests': 'Bundle assets, use HTTP/2, implement resource hints.',
    };
    return recs[id] || 'Follow sitespeed.io recommendations.';
  }

  private createResult(findings: AuditFinding[], duration: number, url: string): AuditResult {
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
      metadata: { url },
    };
  }
}
