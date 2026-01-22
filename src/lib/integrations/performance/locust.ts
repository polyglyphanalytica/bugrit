// Locust Integration (Self-hosted)
// License: MIT
// Website: https://locust.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity, PerformanceMetrics } from '../types';

interface LocustStats {
  name: string;
  method: string;
  num_requests: number;
  num_none_requests: number;
  num_failures: number;
  total_response_time: number;
  max_response_time: number;
  min_response_time: number;
  total_content_length: number;
  response_times: Record<string, number>;
  num_reqs_per_sec: Record<string, number>;
  num_fail_per_sec: Record<string, number>;
}

interface LocustOutput {
  stats: LocustStats[];
  stats_total: LocustStats;
  errors: Array<{
    name: string;
    method: string;
    error: string;
    occurrences: number;
  }>;
  num_requests: number;
  num_none_requests: number;
  num_failures: number;
  total_response_time: number;
  max_response_time: number;
  min_response_time: number;
}

export class LocustIntegration implements ToolIntegration {
  name = 'Locust';
  category = 'performance' as const;
  description = 'Scalable user load testing tool written in Python';
  website = 'https://locust.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('locust --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        users: 10,
        spawnRate: 1,
        runTime: '60s',
        headless: true,
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
        error: 'Locust file or URL is required',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      let locustFile = target.loadTestScript;
      let tempFile = false;

      // Generate a simple locustfile if only URL provided
      if (!locustFile && target.url) {
        const script = `
from locust import HttpUser, task, between

class LoadTestUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def load_test(self):
        self.client.get("/")
`;
        locustFile = path.join(os.tmpdir(), `locustfile-${Date.now()}.py`);
        fs.writeFileSync(locustFile, script);
        tempFile = true;
      }

      const users = config?.options?.users || 10;
      const spawnRate = config?.options?.spawnRate || 1;
      const runTime = config?.options?.runTime || '60s';
      const outputPath = path.join(os.tmpdir(), `locust-output-${Date.now()}`);

      execSync(
        `locust -f "${locustFile}" --host="${target.url}" --users ${users} --spawn-rate ${spawnRate} --run-time ${runTime} --headless --csv="${outputPath}"`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 600000 }
      );

      // Parse CSV output
      const statsContent = fs.readFileSync(`${outputPath}_stats.csv`, 'utf-8');
      const stats = this.parseCSV(statsContent);

      findings.push(...this.analyzeStats(stats, target.url!));

      // Parse failures if any
      try {
        const failuresContent = fs.readFileSync(`${outputPath}_failures.csv`, 'utf-8');
        findings.push(...this.parseFailures(failuresContent, target.url!));
      } catch {
        // No failures file
      }

      // Cleanup
      if (tempFile && locustFile) {
        fs.unlinkSync(locustFile);
      }
      try { fs.unlinkSync(`${outputPath}_stats.csv`); } catch {}
      try { fs.unlinkSync(`${outputPath}_failures.csv`); } catch {}
      try { fs.unlinkSync(`${outputPath}_stats_history.csv`); } catch {}

      const metrics = this.extractMetrics(stats);

      return this.createResult(findings, Date.now() - startTime, stats, metrics);
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

  private parseCSV(content: string): Record<string, unknown>[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        const val = values[idx];
        row[h] = isNaN(Number(val)) ? val : Number(val);
      });
      rows.push(row);
    }

    return rows;
  }

  private analyzeStats(stats: Record<string, unknown>[], target: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Find the aggregated row
    const total = stats.find(s => s['Name'] === 'Aggregated');
    if (!total) return findings;

    const avgResponse = total['Average Response Time'] as number || 0;
    const p95 = total['95%'] as number || 0;
    const p99 = total['99%'] as number || 0;
    const failureCount = total['Failure Count'] as number || 0;
    const requestCount = total['Request Count'] as number || 1;
    const errorRate = failureCount / requestCount;

    // Response time analysis
    if (p95 > 1000) {
      findings.push(this.createFinding(
        'slow-p95',
        'critical',
        'Critical Response Time',
        `P95 response time is ${p95}ms (avg: ${Math.round(avgResponse)}ms)`,
        target,
        { p95, p99, avgResponse }
      ));
    } else if (p95 > 500) {
      findings.push(this.createFinding(
        'slow-p95',
        'high',
        'Slow Response Time',
        `P95 response time is ${p95}ms`,
        target,
        { p95, avgResponse }
      ));
    }

    // Error rate analysis
    if (errorRate > 0.1) {
      findings.push(this.createFinding(
        'high-error-rate',
        'critical',
        'High Error Rate',
        `${(errorRate * 100).toFixed(2)}% of requests failed`,
        target,
        { errorRate, failureCount, requestCount }
      ));
    } else if (errorRate > 0.01) {
      findings.push(this.createFinding(
        'elevated-error-rate',
        'high',
        'Elevated Error Rate',
        `${(errorRate * 100).toFixed(2)}% of requests failed`,
        target,
        { errorRate, failureCount }
      ));
    }

    return findings;
  }

  private parseFailures(content: string, target: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const failures = this.parseCSV(content);

    for (const failure of failures) {
      const method = failure['Method'] as string;
      const name = failure['Name'] as string;
      const error = failure['Error'] as string;
      const occurrences = failure['Occurrences'] as number;

      if (occurrences > 0) {
        findings.push(this.createFinding(
          `failure-${method}-${name}`.replace(/[^a-z0-9-]/gi, '-'),
          occurrences > 10 ? 'high' : 'medium',
          `${method} ${name} Failures`,
          `${occurrences} failures: ${error}`,
          target,
          { method, name, error, occurrences }
        ));
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
      id: `locust-${id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Locust: ${title}`,
      description,
      explanation: `Load test revealed: ${description}`,
      impact: severity === 'critical'
        ? 'Critical performance issue. Application cannot handle expected load.'
        : 'Performance concern that may affect users during peak traffic.',
      url: target,
      recommendation: this.getRecommendation(id),
      documentationUrl: 'https://docs.locust.io/',
      aiPrompt: {
        short: `Fix Locust performance issue: ${title}`,
        detailed: `
Fix the performance issue found by Locust load testing.

Target: ${target}
Issue: ${title}
${description}

Data: ${JSON.stringify(data, null, 2)}

Investigate and fix the performance bottleneck.
        `.trim(),
        steps: [
          'Analyze Locust results',
          'Profile application under load',
          'Identify and fix bottlenecks',
          'Scale if necessary',
          'Re-run Locust to verify',
        ],
      },
      ruleId: id,
      tags: ['locust', 'performance', 'load-testing', severity],
      effort: 'hard',
    };
  }

  private getRecommendation(id: string): string {
    const recs: Record<string, string> = {
      'slow-p95': 'Optimize slow endpoints, add caching, scale infrastructure.',
      'high-error-rate': 'Check error logs, increase capacity, add circuit breakers.',
      'elevated-error-rate': 'Review and fix error patterns.',
    };
    return recs[id] || 'Analyze and optimize based on results.';
  }

  private extractMetrics(stats: Record<string, unknown>[]): PerformanceMetrics {
    const total = stats.find(s => s['Name'] === 'Aggregated');
    if (!total) return {};

    return {
      avgResponseTime: total['Average Response Time'] as number,
      p95ResponseTime: total['95%'] as number,
      p99ResponseTime: total['99%'] as number,
      throughput: total['Requests/s'] as number,
      errorRate: (total['Failure Count'] as number) / (total['Request Count'] as number || 1),
    };
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    stats: Record<string, unknown>[],
    metrics: PerformanceMetrics
  ): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    const total = stats.find(s => s['Name'] === 'Aggregated');

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
        totalRequests: total?.['Request Count'],
        rps: total?.['Requests/s'],
        medianResponseTime: total?.['Median Response Time'],
      },
    };
  }
}
