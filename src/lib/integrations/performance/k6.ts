// k6 Integration (Self-hosted)
// License: AGPL-3.0
// Website: https://k6.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity, PerformanceMetrics } from '../types';

interface K6Metric {
  type: string;
  contains: string;
  values: {
    avg?: number;
    min?: number;
    med?: number;
    max?: number;
    'p(90)'?: number;
    'p(95)'?: number;
    'p(99)'?: number;
    count?: number;
    rate?: number;
    passes?: number;
    fails?: number;
  };
  thresholds?: Record<string, { ok: boolean }>;
}

interface K6Output {
  metrics: Record<string, K6Metric>;
  root_group: {
    name: string;
    path: string;
    id: string;
    groups: unknown[];
    checks: Array<{
      name: string;
      path: string;
      id: string;
      passes: number;
      fails: number;
    }>;
  };
}

export class K6Integration implements ToolIntegration {
  name = 'k6';
  category = 'performance' as const;
  description = 'Modern load testing tool for developers and testers with scripting in JavaScript';
  website = 'https://k6.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('k6 version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        vus: 10,
        duration: '30s',
        thresholds: {
          http_req_duration: ['p(95)<500'],
          http_req_failed: ['rate<0.01'],
        },
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.loadTestScript && !target.url) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'Load test script or URL is required for k6',
      };
    }

    try {
      const { execSync, writeFileSync, unlinkSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      let scriptPath = target.loadTestScript;
      let tempScript = false;

      // Generate a simple script if only URL provided
      if (!scriptPath && target.url) {
        const vus = config?.options?.vus || 10;
        const duration = config?.options?.duration || '30s';
        const script = `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: ${vus},
  duration: '${duration}',
  thresholds: ${JSON.stringify(config?.options?.thresholds || { http_req_duration: ['p(95)<500'] })},
};

export default function() {
  const res = http.get('${target.url}');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
`;
        scriptPath = path.join(os.tmpdir(), `k6-test-${Date.now()}.js`);
        fs.writeFileSync(scriptPath, script);
        tempScript = true;
      }

      const outputPath = path.join(os.tmpdir(), `k6-output-${Date.now()}.json`);

      try {
        execSync(
          `k6 run --out json=${outputPath} --summary-export=${outputPath}.summary.json "${scriptPath}"`,
          { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 300000 }
        );
      } catch {
        // k6 may exit with non-zero if thresholds fail
      }

      const summaryResult = fs.readFileSync(`${outputPath}.summary.json`, 'utf-8');
      const k6Output: K6Output = JSON.parse(summaryResult);

      // Analyze metrics and thresholds
      findings.push(...this.analyzeMetrics(k6Output, target.url || target.loadTestScript!));
      findings.push(...this.analyzeChecks(k6Output, target.url || target.loadTestScript!));

      // Cleanup temp files
      if (tempScript && scriptPath) {
        fs.unlinkSync(scriptPath);
      }
      fs.unlinkSync(`${outputPath}.summary.json`);
      try { fs.unlinkSync(outputPath); } catch {}

      const metrics = this.extractMetrics(k6Output);

      return this.createResult(findings, Date.now() - startTime, k6Output, metrics);
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

  private analyzeMetrics(output: K6Output, target: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const metrics = output.metrics;

    // Check HTTP request duration
    const httpReqDuration = metrics['http_req_duration'];
    if (httpReqDuration) {
      const p95 = httpReqDuration.values['p(95)'] || 0;
      const p99 = httpReqDuration.values['p(99)'] || 0;
      const avg = httpReqDuration.values.avg || 0;

      if (p95 > 1000) {
        findings.push(this.createFinding(
          'slow-response-p95',
          'critical',
          'Critical Response Time (P95 > 1s)',
          `The 95th percentile response time is ${Math.round(p95)}ms, exceeding 1 second.`,
          target,
          { p95, p99, avg }
        ));
      } else if (p95 > 500) {
        findings.push(this.createFinding(
          'slow-response-p95',
          'high',
          'Slow Response Time (P95 > 500ms)',
          `The 95th percentile response time is ${Math.round(p95)}ms.`,
          target,
          { p95, p99, avg }
        ));
      } else if (p95 > 200) {
        findings.push(this.createFinding(
          'moderate-response-p95',
          'medium',
          'Moderate Response Time (P95 > 200ms)',
          `The 95th percentile response time is ${Math.round(p95)}ms.`,
          target,
          { p95, p99, avg }
        ));
      }
    }

    // Check HTTP request failures
    const httpReqFailed = metrics['http_req_failed'];
    if (httpReqFailed) {
      const failRate = httpReqFailed.values.rate || 0;
      if (failRate > 0.1) {
        findings.push(this.createFinding(
          'high-failure-rate',
          'critical',
          'High Request Failure Rate',
          `${(failRate * 100).toFixed(2)}% of requests are failing under load.`,
          target,
          { failRate }
        ));
      } else if (failRate > 0.01) {
        findings.push(this.createFinding(
          'elevated-failure-rate',
          'high',
          'Elevated Request Failure Rate',
          `${(failRate * 100).toFixed(2)}% of requests are failing under load.`,
          target,
          { failRate }
        ));
      }
    }

    // Check threshold violations
    for (const [metricName, metric] of Object.entries(metrics)) {
      if (metric.thresholds) {
        for (const [thresholdName, result] of Object.entries(metric.thresholds)) {
          if (!result.ok) {
            findings.push(this.createFinding(
              `threshold-${metricName}`,
              'high',
              `Threshold Violation: ${metricName}`,
              `The threshold "${thresholdName}" for metric "${metricName}" was not met.`,
              target,
              { metricName, threshold: thresholdName, values: metric.values }
            ));
          }
        }
      }
    }

    return findings;
  }

  private analyzeChecks(output: K6Output, target: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    if (output.root_group?.checks) {
      for (const check of output.root_group.checks) {
        const total = check.passes + check.fails;
        if (check.fails > 0) {
          const failRate = check.fails / total;
          const severity: Severity = failRate > 0.5 ? 'critical' : failRate > 0.1 ? 'high' : 'medium';

          findings.push(this.createFinding(
            `check-${check.id}`,
            severity,
            `Check Failed: ${check.name}`,
            `${check.fails} out of ${total} iterations failed the check "${check.name}".`,
            target,
            { passes: check.passes, fails: check.fails, total }
          ));
        }
      }
    }

    return findings;
  }

  private createFinding(
    id: string,
    severity: Severity,
    title: string,
    description: string,
    target: string,
    data: Record<string, unknown>
  ): AuditFinding {
    return {
      id: `k6-${id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `k6: ${title}`,
      description,
      explanation: `Load test revealed: ${description}. This indicates potential scalability or performance issues.`,
      impact: this.getImpact(severity, title),
      url: target,
      recommendation: this.getRecommendation(id),
      documentationUrl: 'https://k6.io/docs/',
      aiPrompt: {
        short: `Fix k6 performance issue: ${title}`,
        detailed: `
Fix the performance issue identified by k6 load testing.

Target: ${target}
Issue: ${title}
Severity: ${severity}

${description}

Data:
${JSON.stringify(data, null, 2)}

Please investigate and fix this performance issue to ensure the application can handle the expected load.
        `.trim(),
        steps: [
          'Analyze the application under load',
          'Identify bottlenecks (database, network, CPU)',
          'Implement caching, connection pooling, or code optimizations',
          'Increase resources if needed',
          'Re-run the load test to verify improvements',
        ],
      },
      ruleId: id,
      tags: ['k6', 'performance', 'load-testing', severity],
      effort: 'hard',
    };
  }

  private getImpact(severity: Severity, title: string): string {
    if (severity === 'critical') {
      return `Critical performance issue: ${title}. Users will experience severe degradation under load.`;
    }
    if (severity === 'high') {
      return `Significant performance issue: ${title}. User experience will be notably affected.`;
    }
    return `Performance concern: ${title}. May affect user experience under peak load.`;
  }

  private getRecommendation(issueId: string): string {
    const recommendations: Record<string, string> = {
      'slow-response-p95': 'Optimize database queries, add caching, use CDN for static assets, or scale infrastructure.',
      'moderate-response-p95': 'Consider adding caching layers and optimizing slow endpoints.',
      'high-failure-rate': 'Investigate error logs, check for resource exhaustion, and implement circuit breakers.',
      'elevated-failure-rate': 'Review error logs and implement retry logic with backoff.',
    };

    return recommendations[issueId] || 'Analyze the performance data and optimize the identified bottlenecks.';
  }

  private extractMetrics(output: K6Output): PerformanceMetrics {
    const metrics = output.metrics;
    return {
      responseTime: metrics['http_req_duration']?.values.avg,
      throughput: metrics['http_reqs']?.values.rate,
      errorRate: metrics['http_req_failed']?.values.rate,
      p95ResponseTime: metrics['http_req_duration']?.values['p(95)'],
      p99ResponseTime: metrics['http_req_duration']?.values['p(99)'],
    };
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    output: K6Output,
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
        vus: output.metrics['vus']?.values.max,
        iterations: output.metrics['iterations']?.values.count,
        dataReceived: output.metrics['data_received']?.values.count,
        dataSent: output.metrics['data_sent']?.values.count,
      },
    };
  }
}
