// WebPageTest Integration (Self-hosted)
// License: Apache 2.0
// Website: https://www.webpagetest.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity, PerformanceMetrics } from '../types';

interface WPTRun {
  firstView: {
    TTFB: number;
    firstPaint: number;
    firstContentfulPaint: number;
    firstMeaningfulPaint?: number;
    SpeedIndex: number;
    domInteractive: number;
    domContentLoadedEventStart: number;
    domContentLoadedEventEnd: number;
    loadTime: number;
    fullyLoaded: number;
    visualComplete: number;
    bytesIn: number;
    bytesOut: number;
    requests: number;
    connections: number;
    'lighthouse.Performance'?: number;
    'lighthouse.Accessibility'?: number;
    'lighthouse.BestPractices'?: number;
    'lighthouse.SEO'?: number;
    'chromeUserTiming.LargestContentfulPaint'?: number;
    'chromeUserTiming.CumulativeLayoutShift'?: number;
    TotalBlockingTime?: number;
  };
  repeatView?: WPTRun['firstView'];
}

interface WPTResult {
  statusCode: number;
  statusText: string;
  data: {
    testId: string;
    url: string;
    summary: string;
    location: string;
    from: string;
    connectivity: string;
    runs: Record<string, WPTRun>;
    median: WPTRun;
    average: WPTRun;
    standardDeviation: WPTRun;
  };
}

export class WebPageTestIntegration implements ToolIntegration {
  name = 'WebPageTest';
  category = 'performance' as const;
  description = 'Web performance testing with real browsers and network conditions';
  website = 'https://www.webpagetest.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('docker images webpagetest/server --format "{{.Repository}}"', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        runs: 3,
        location: 'Dulles:Chrome',
        connectivity: 'Cable',
        firstViewOnly: false,
        lighthouse: true,
        serverUrl: process.env.WPT_SERVER || 'http://localhost:4000',
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
        error: 'URL is required for WebPageTest',
      };
    }

    try {
      const serverUrl = config?.options?.serverUrl || 'http://localhost:4000';
      const runs = config?.options?.runs || 3;
      const location = config?.options?.location || 'Dulles:Chrome';
      const lighthouse = config?.options?.lighthouse !== false;

      // Submit test
      const submitUrl = `${serverUrl}/runtest.php?url=${encodeURIComponent(target.url)}&runs=${runs}&location=${location}&lighthouse=${lighthouse ? 1 : 0}&f=json`;

      const submitResponse = await fetch(submitUrl);
      const submitResult = await submitResponse.json() as { data: { testId: string } };
      const testId = submitResult.data?.testId;

      if (!testId) {
        throw new Error('Failed to start WebPageTest');
      }

      // Poll for results
      let result: WPTResult | null = null;
      const maxWait = 600000; // 10 minutes
      const pollInterval = 10000; // 10 seconds
      const startPoll = Date.now();

      while (Date.now() - startPoll < maxWait) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const statusResponse = await fetch(`${serverUrl}/jsonResult.php?test=${testId}`);
        const statusResult = await statusResponse.json() as WPTResult;

        if (statusResult.statusCode === 200) {
          result = statusResult;
          break;
        } else if (statusResult.statusCode >= 400) {
          throw new Error(statusResult.statusText || 'Test failed');
        }
      }

      if (!result) {
        throw new Error('Test timed out');
      }

      // Analyze results
      findings.push(...this.analyzeResults(result, target.url));
      const metrics = this.extractMetrics(result);

      return this.createResult(findings, Date.now() - startTime, result, metrics);
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

  private analyzeResults(result: WPTResult, url: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = result.data.median?.firstView;

    if (!data) return findings;

    // TTFB
    if (data.TTFB > 800) {
      findings.push(this.createFinding('slow-ttfb', 'high', 'Slow Time to First Byte',
        `TTFB is ${data.TTFB}ms (should be < 800ms)`, url, { ttfb: data.TTFB }));
    } else if (data.TTFB > 400) {
      findings.push(this.createFinding('moderate-ttfb', 'medium', 'Moderate TTFB',
        `TTFB is ${data.TTFB}ms`, url, { ttfb: data.TTFB }));
    }

    // First Contentful Paint
    if (data.firstContentfulPaint > 3000) {
      findings.push(this.createFinding('slow-fcp', 'high', 'Slow First Contentful Paint',
        `FCP is ${data.firstContentfulPaint}ms`, url, { fcp: data.firstContentfulPaint }));
    } else if (data.firstContentfulPaint > 1800) {
      findings.push(this.createFinding('moderate-fcp', 'medium', 'Moderate FCP',
        `FCP is ${data.firstContentfulPaint}ms`, url, { fcp: data.firstContentfulPaint }));
    }

    // Speed Index
    if (data.SpeedIndex > 5800) {
      findings.push(this.createFinding('slow-si', 'high', 'Slow Speed Index',
        `Speed Index is ${data.SpeedIndex}ms`, url, { si: data.SpeedIndex }));
    } else if (data.SpeedIndex > 3400) {
      findings.push(this.createFinding('moderate-si', 'medium', 'Moderate Speed Index',
        `Speed Index is ${data.SpeedIndex}ms`, url, { si: data.SpeedIndex }));
    }

    // LCP
    const lcp = data['chromeUserTiming.LargestContentfulPaint'];
    if (lcp && lcp > 4000) {
      findings.push(this.createFinding('slow-lcp', 'high', 'Slow LCP',
        `LCP is ${lcp}ms (should be < 2500ms)`, url, { lcp }));
    } else if (lcp && lcp > 2500) {
      findings.push(this.createFinding('moderate-lcp', 'medium', 'Moderate LCP',
        `LCP is ${lcp}ms`, url, { lcp }));
    }

    // CLS
    const cls = data['chromeUserTiming.CumulativeLayoutShift'];
    if (cls && cls > 0.25) {
      findings.push(this.createFinding('poor-cls', 'high', 'Poor Layout Stability',
        `CLS is ${cls.toFixed(3)} (should be < 0.1)`, url, { cls }));
    } else if (cls && cls > 0.1) {
      findings.push(this.createFinding('moderate-cls', 'medium', 'Moderate CLS',
        `CLS is ${cls.toFixed(3)}`, url, { cls }));
    }

    // TBT
    const tbt = data.TotalBlockingTime;
    if (tbt && tbt > 600) {
      findings.push(this.createFinding('high-tbt', 'high', 'High Total Blocking Time',
        `TBT is ${tbt}ms (should be < 300ms)`, url, { tbt }));
    } else if (tbt && tbt > 300) {
      findings.push(this.createFinding('moderate-tbt', 'medium', 'Moderate TBT',
        `TBT is ${tbt}ms`, url, { tbt }));
    }

    // Page weight
    const sizeMB = data.bytesIn / (1024 * 1024);
    if (sizeMB > 5) {
      findings.push(this.createFinding('heavy-page', 'high', 'Heavy Page',
        `Page size is ${sizeMB.toFixed(2)}MB`, url, { bytes: data.bytesIn }));
    } else if (sizeMB > 2) {
      findings.push(this.createFinding('moderate-page-size', 'medium', 'Moderate Page Size',
        `Page size is ${sizeMB.toFixed(2)}MB`, url, { bytes: data.bytesIn }));
    }

    // Requests
    if (data.requests > 100) {
      findings.push(this.createFinding('many-requests', 'medium', 'Too Many Requests',
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
      id: `wpt-${id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `WebPageTest: ${title}`,
      description,
      explanation: `Real browser test result: ${description}`,
      impact: this.getImpact(severity, title),
      url,
      recommendation: this.getRecommendation(id),
      documentationUrl: 'https://docs.webpagetest.org/',
      aiPrompt: {
        short: `Fix WebPageTest issue: ${title}`,
        detailed: `
Fix the performance issue found by WebPageTest.

URL: ${url}
Issue: ${title}
${description}

Data: ${JSON.stringify(data, null, 2)}
        `.trim(),
        steps: [
          'Review WebPageTest waterfall',
          'Identify bottlenecks',
          'Implement optimizations',
          'Re-test to verify',
        ],
      },
      ruleId: id,
      tags: ['webpagetest', 'performance', 'web-vitals', severity],
      effort: 'moderate',
    };
  }

  private getImpact(severity: Severity, title: string): string {
    if (severity === 'high') {
      return `Major performance issue: ${title}. Users will have poor experience.`;
    }
    return `Performance concern: ${title}.`;
  }

  private getRecommendation(id: string): string {
    const recs: Record<string, string> = {
      'slow-ttfb': 'Optimize server response time, use CDN, enable caching.',
      'slow-fcp': 'Eliminate render-blocking resources, inline critical CSS.',
      'slow-lcp': 'Optimize largest element, preload critical resources.',
      'poor-cls': 'Add dimensions to images/videos, avoid inserting content above existing.',
      'high-tbt': 'Break up long tasks, defer non-critical JavaScript.',
      'heavy-page': 'Compress assets, lazy load, use efficient formats.',
      'many-requests': 'Bundle resources, use HTTP/2, implement caching.',
    };
    return recs[id] || 'Follow WebPageTest recommendations.';
  }

  private extractMetrics(result: WPTResult): PerformanceMetrics {
    const data = result.data.median?.firstView;
    if (!data) return {};

    return {
      ttfb: data.TTFB,
      fcp: data.firstContentfulPaint,
      lcp: data['chromeUserTiming.LargestContentfulPaint'],
      cls: data['chromeUserTiming.CumulativeLayoutShift'],
      tbt: data.TotalBlockingTime,
      si: data.SpeedIndex,
      tti: data.domInteractive,
    };
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    result: WPTResult,
    metrics: PerformanceMetrics
  ): AuditResult {
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
        metrics,
        testId: result.data.testId,
        url: result.data.url,
        location: result.data.location,
        connectivity: result.data.connectivity,
      },
    };
  }
}
