// Apache JMeter Integration (Self-hosted)
// License: Apache 2.0
// Website: https://jmeter.apache.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity, PerformanceMetrics } from '../types';

interface JMeterSample {
  t: number;  // elapsed time
  it: number; // idle time
  lt: number; // latency
  ct: number; // connect time
  ts: number; // timestamp
  s: boolean; // success
  lb: string; // label
  rc: string; // response code
  rm: string; // response message
  tn: string; // thread name
  dt: string; // data type
  ec: number; // error count
  hn: string; // hostname
  by: number; // bytes
  sby: number; // sent bytes
  ng: number; // number of active threads in group
  na: number; // number of all active threads
}

interface JMeterResults {
  version: string;
  testResults: JMeterSample[];
}

export class JMeterIntegration implements ToolIntegration {
  name = 'JMeter';
  category = 'performance' as const;
  description = 'Apache JMeter for load testing and performance measurement';
  website = 'https://jmeter.apache.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('jmeter --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        threads: 10,
        rampUp: 10,
        loops: 100,
        duration: 60,
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
        error: 'JMeter test plan (.jmx) or URL is required',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      let testPlan = target.loadTestScript;
      let tempPlan = false;

      // Generate a simple test plan if only URL provided
      if (!testPlan && target.url) {
        const threads = config?.options?.threads || 10;
        const rampUp = config?.options?.rampUp || 10;
        const loops = config?.options?.loops || 100;

        const jmx = this.generateSimpleTestPlan(target.url, threads, rampUp, loops);
        testPlan = path.join(os.tmpdir(), `jmeter-test-${Date.now()}.jmx`);
        fs.writeFileSync(testPlan, jmx);
        tempPlan = true;
      }

      const outputPath = path.join(os.tmpdir(), `jmeter-output-${Date.now()}.jtl`);
      const logPath = path.join(os.tmpdir(), `jmeter-log-${Date.now()}.log`);

      execSync(
        `jmeter -n -t "${testPlan}" -l "${outputPath}" -j "${logPath}"`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 600000 }
      );

      const results = this.parseJTLFile(fs.readFileSync(outputPath, 'utf-8'));
      findings.push(...this.analyzeResults(results, target.url || target.loadTestScript!));

      // Cleanup
      if (tempPlan && testPlan) {
        fs.unlinkSync(testPlan);
      }
      fs.unlinkSync(outputPath);
      fs.unlinkSync(logPath);

      const metrics = this.calculateMetrics(results);

      return this.createResult(findings, Date.now() - startTime, results, metrics);
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

  private generateSimpleTestPlan(url: string, threads: number, rampUp: number, loops: number): string {
    const urlObj = new URL(url);
    return `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Generated Test Plan">
      <stringProp name="TestPlan.comments"></stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Thread Group">
        <stringProp name="ThreadGroup.num_threads">${threads}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${rampUp}</stringProp>
        <boolProp name="ThreadGroup.scheduler">false</boolProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">${loops}</stringProp>
        </elementProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="HTTP Request">
          <stringProp name="HTTPSampler.domain">${urlObj.hostname}</stringProp>
          <stringProp name="HTTPSampler.port">${urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80')}</stringProp>
          <stringProp name="HTTPSampler.protocol">${urlObj.protocol.replace(':', '')}</stringProp>
          <stringProp name="HTTPSampler.path">${urlObj.pathname}</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
        </HTTPSamplerProxy>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>`;
  }

  private parseJTLFile(content: string): JMeterSample[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const samples: JMeterSample[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const sample: Record<string, unknown> = {};

      headers.forEach((header, idx) => {
        const value = values[idx];
        if (['t', 'it', 'lt', 'ct', 'ts', 'ec', 'by', 'sby', 'ng', 'na'].includes(header)) {
          sample[header] = parseInt(value, 10) || 0;
        } else if (header === 's') {
          sample[header] = value === 'true';
        } else {
          sample[header] = value || '';
        }
      });

      samples.push(sample as JMeterSample);
    }

    return samples;
  }

  private analyzeResults(samples: JMeterSample[], target: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    if (samples.length === 0) return findings;

    const times = samples.map(s => s.t);
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    // Response time analysis
    if (p95 > 1000) {
      findings.push(this.createFinding(
        'slow-p95',
        'critical',
        'Critical Response Time',
        `P95 response time is ${p95}ms (avg: ${Math.round(avg)}ms, max: ${max}ms)`,
        target,
        { p95, p99, avg, max }
      ));
    } else if (p95 > 500) {
      findings.push(this.createFinding(
        'slow-p95',
        'high',
        'Slow Response Time',
        `P95 response time is ${p95}ms`,
        target,
        { p95, p99, avg }
      ));
    }

    // Error analysis
    const failed = samples.filter(s => !s.s);
    const errorRate = failed.length / samples.length;

    if (errorRate > 0.1) {
      findings.push(this.createFinding(
        'high-error-rate',
        'critical',
        'High Error Rate',
        `${(errorRate * 100).toFixed(2)}% of requests failed (${failed.length}/${samples.length})`,
        target,
        { errorRate, failed: failed.length, total: samples.length }
      ));
    } else if (errorRate > 0.01) {
      findings.push(this.createFinding(
        'elevated-error-rate',
        'high',
        'Elevated Error Rate',
        `${(errorRate * 100).toFixed(2)}% of requests failed`,
        target,
        { errorRate, failed: failed.length }
      ));
    }

    // Error code breakdown
    const errorCodes = new Map<string, number>();
    failed.forEach(s => {
      const count = errorCodes.get(s.rc) || 0;
      errorCodes.set(s.rc, count + 1);
    });

    errorCodes.forEach((count, code) => {
      if (code !== '200') {
        findings.push(this.createFinding(
          `error-${code}`,
          'medium',
          `HTTP ${code} Errors`,
          `${count} requests returned HTTP ${code}`,
          target,
          { code, count }
        ));
      }
    });

    return findings;
  }

  private calculateMetrics(samples: JMeterSample[]): PerformanceMetrics {
    if (samples.length === 0) {
      return {};
    }

    const times = samples.map(s => s.t);
    const sorted = [...times].sort((a, b) => a - b);

    return {
      avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
      p95ResponseTime: sorted[Math.floor(sorted.length * 0.95)],
      p99ResponseTime: sorted[Math.floor(sorted.length * 0.99)],
      errorRate: samples.filter(s => !s.s).length / samples.length,
      throughput: samples.length / ((Math.max(...samples.map(s => s.ts)) - Math.min(...samples.map(s => s.ts))) / 1000),
    };
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
      id: `jmeter-${id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `JMeter: ${title}`,
      description,
      explanation: `Load test finding: ${description}`,
      impact: severity === 'critical'
        ? `Critical performance issue under load. Users will experience failures.`
        : `Performance concern that may affect user experience under load.`,
      url: target,
      recommendation: this.getRecommendation(id),
      documentationUrl: 'https://jmeter.apache.org/usermanual/index.html',
      aiPrompt: {
        short: `Fix JMeter performance issue: ${title}`,
        detailed: `
Fix the performance issue found by Apache JMeter.

Target: ${target}
Issue: ${title}

${description}

Data: ${JSON.stringify(data, null, 2)}

Investigate and optimize the application to handle the load.
        `.trim(),
        steps: [
          'Analyze JMeter results to identify bottlenecks',
          'Profile application under load',
          'Optimize identified bottlenecks',
          'Scale resources if needed',
          'Re-run JMeter to verify improvements',
        ],
      },
      ruleId: id,
      tags: ['jmeter', 'performance', 'load-testing'],
      effort: 'hard',
    };
  }

  private getRecommendation(id: string): string {
    const recs: Record<string, string> = {
      'slow-p95': 'Optimize database queries, add caching, consider horizontal scaling.',
      'high-error-rate': 'Check error logs, increase resources, implement circuit breakers.',
      'elevated-error-rate': 'Review error patterns and implement fixes.',
    };
    return recs[id] || 'Analyze results and optimize accordingly.';
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    samples: JMeterSample[],
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
        totalSamples: samples.length,
        successfulSamples: samples.filter(s => s.s).length,
        failedSamples: samples.filter(s => !s.s).length,
      },
    };
  }
}
