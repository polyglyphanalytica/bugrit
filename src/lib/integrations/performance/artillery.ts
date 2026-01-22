// Artillery Integration (Self-hosted)
// License: MPL-2.0
// Website: https://artillery.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity, PerformanceMetrics } from '../types';

interface ArtilleryAggregate {
  counters: Record<string, number>;
  rates: Record<string, number>;
  firstCounterAt?: number;
  lastCounterAt?: number;
  firstHistogramAt?: number;
  lastHistogramAt?: number;
  summaries: Record<string, {
    min: number;
    max: number;
    count: number;
    mean: number;
    p50: number;
    median: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
  }>;
  histograms: Record<string, unknown>;
}

interface ArtilleryOutput {
  aggregate: ArtilleryAggregate;
  intermediate: ArtilleryAggregate[];
}

export class ArtilleryIntegration implements ToolIntegration {
  name = 'Artillery';
  category = 'performance' as const;
  description = 'Modern, powerful load testing toolkit for developers';
  website = 'https://artillery.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx artillery version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        duration: 60,
        arrivalRate: 10,
        rampTo: 50,
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
        error: 'Artillery test config or URL is required',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      let configPath = target.loadTestScript;
      let tempConfig = false;

      // Generate a simple config if only URL provided
      if (!configPath && target.url) {
        const duration = config?.options?.duration || 60;
        const arrivalRate = config?.options?.arrivalRate || 10;
        const rampTo = config?.options?.rampTo || 50;

        const artilleryConfig = {
          config: {
            target: target.url,
            phases: [
              { duration, arrivalRate, rampTo },
            ],
          },
          scenarios: [
            {
              flow: [
                { get: { url: '/' } },
              ],
            },
          ],
        };

        configPath = path.join(os.tmpdir(), `artillery-test-${Date.now()}.json`);
        fs.writeFileSync(configPath, JSON.stringify(artilleryConfig, null, 2));
        tempConfig = true;
      }

      const outputPath = path.join(os.tmpdir(), `artillery-output-${Date.now()}.json`);

      execSync(
        `npx artillery run "${configPath}" --output "${outputPath}"`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 600000 }
      );

      const result = fs.readFileSync(outputPath, 'utf-8');
      const artilleryOutput: ArtilleryOutput = JSON.parse(result);

      // Analyze results
      findings.push(...this.analyzeResults(artilleryOutput, target.url || target.loadTestScript!));

      // Cleanup temp files
      if (tempConfig && configPath) {
        fs.unlinkSync(configPath);
      }
      fs.unlinkSync(outputPath);

      const metrics = this.extractMetrics(artilleryOutput);

      return this.createResult(findings, Date.now() - startTime, artilleryOutput, metrics);
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

  private analyzeResults(output: ArtilleryOutput, target: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const agg = output.aggregate;

    // Analyze response times
    const httpResponseTime = agg.summaries['http.response_time'];
    if (httpResponseTime) {
      if (httpResponseTime.p95 > 1000) {
        findings.push(this.createFinding(
          'slow-p95',
          'critical',
          'Critical Response Time (P95 > 1s)',
          `The 95th percentile response time is ${Math.round(httpResponseTime.p95)}ms.`,
          target,
          httpResponseTime
        ));
      } else if (httpResponseTime.p95 > 500) {
        findings.push(this.createFinding(
          'slow-p95',
          'high',
          'Slow Response Time (P95 > 500ms)',
          `The 95th percentile response time is ${Math.round(httpResponseTime.p95)}ms.`,
          target,
          httpResponseTime
        ));
      }

      if (httpResponseTime.max > 5000) {
        findings.push(this.createFinding(
          'max-response-time',
          'high',
          'Extreme Max Response Time',
          `Maximum response time reached ${Math.round(httpResponseTime.max)}ms.`,
          target,
          { max: httpResponseTime.max }
        ));
      }
    }

    // Check for errors
    const errorCodes = Object.entries(agg.counters)
      .filter(([key]) => key.startsWith('http.codes.') && !key.startsWith('http.codes.2'))
      .filter(([, count]) => count > 0);

    const totalRequests = agg.counters['http.requests'] || 1;

    for (const [code, count] of errorCodes) {
      const errorRate = count / totalRequests;
      const statusCode = code.replace('http.codes.', '');
      const severity: Severity = errorRate > 0.1 ? 'critical' : errorRate > 0.01 ? 'high' : 'medium';

      findings.push(this.createFinding(
        `error-${statusCode}`,
        severity,
        `HTTP ${statusCode} Errors Under Load`,
        `${count} requests (${(errorRate * 100).toFixed(2)}%) returned HTTP ${statusCode}.`,
        target,
        { statusCode, count, errorRate }
      ));
    }

    // Check for timeouts
    const timeouts = agg.counters['errors.ETIMEDOUT'] || 0;
    if (timeouts > 0) {
      const timeoutRate = timeouts / totalRequests;
      findings.push(this.createFinding(
        'timeouts',
        timeoutRate > 0.05 ? 'critical' : 'high',
        'Request Timeouts Under Load',
        `${timeouts} requests (${(timeoutRate * 100).toFixed(2)}%) timed out.`,
        target,
        { timeouts, rate: timeoutRate }
      ));
    }

    // Check connection errors
    const connErrors = agg.counters['errors.ECONNREFUSED'] || 0;
    if (connErrors > 0) {
      findings.push(this.createFinding(
        'connection-refused',
        'critical',
        'Connection Refused Under Load',
        `${connErrors} connection refused errors. Server may be overwhelmed.`,
        target,
        { connErrors }
      ));
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
      id: `artillery-${id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Artillery: ${title}`,
      description,
      explanation: `Load test revealed: ${description}`,
      impact: this.getImpact(severity, title),
      url: target,
      recommendation: this.getRecommendation(id),
      documentationUrl: 'https://www.artillery.io/docs',
      aiPrompt: {
        short: `Fix Artillery performance issue: ${title}`,
        detailed: `
Fix the performance issue identified by Artillery load testing.

Target: ${target}
Issue: ${title}
Severity: ${severity}

${description}

Data:
${JSON.stringify(data, null, 2)}

Please investigate and fix this performance issue.
        `.trim(),
        steps: [
          'Review application performance under load',
          'Identify the bottleneck causing the issue',
          'Implement performance optimizations',
          'Add monitoring and alerting',
          'Re-run Artillery to verify fix',
        ],
      },
      ruleId: id,
      tags: ['artillery', 'performance', 'load-testing', severity],
      effort: 'hard',
    };
  }

  private getImpact(severity: Severity, title: string): string {
    if (severity === 'critical') {
      return `Critical: ${title}. Application is failing under load.`;
    }
    if (severity === 'high') {
      return `High impact: ${title}. User experience significantly degraded.`;
    }
    return `Performance concern: ${title}.`;
  }

  private getRecommendation(issueId: string): string {
    const recommendations: Record<string, string> = {
      'slow-p95': 'Optimize slow endpoints, add caching, scale horizontally.',
      'max-response-time': 'Investigate outlier requests, add timeouts, optimize worst-case scenarios.',
      'timeouts': 'Increase server capacity, add connection pooling, optimize long-running operations.',
      'connection-refused': 'Scale server capacity, implement load balancing, check resource limits.',
    };

    return recommendations[issueId] || 'Analyze performance data and optimize bottlenecks.';
  }

  private extractMetrics(output: ArtilleryOutput): PerformanceMetrics {
    const agg = output.aggregate;
    const responseTime = agg.summaries['http.response_time'];

    return {
      avgResponseTime: responseTime?.mean,
      throughput: agg.rates['http.request_rate'],
      errorRate: (agg.counters['errors'] || 0) / (agg.counters['http.requests'] || 1),
      p95ResponseTime: responseTime?.p95,
      p99ResponseTime: responseTime?.p99,
    };
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    output: ArtilleryOutput,
    metrics: PerformanceMetrics
  ): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    const agg = output.aggregate;

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
        totalRequests: agg.counters['http.requests'],
        scenarios: agg.counters['vusers.created'],
        successfulRequests: agg.counters['http.codes.200'] || 0,
      },
    };
  }
}
