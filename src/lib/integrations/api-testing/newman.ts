// Newman (Postman CLI) Integration (Self-hosted)
// License: Apache 2.0
// Website: https://github.com/postmanlabs/newman

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface NewmanAssertion {
  assertion: string;
  skipped: boolean;
  error?: {
    name: string;
    index: number;
    test: string;
    message: string;
    stack: string;
  };
}

interface NewmanExecution {
  id: string;
  cursor: { position: number; iteration: number; length: number; cycles: number; ref: string };
  item: { id: string; name: string };
  request: {
    url: { protocol: string; host: string[]; path: string[]; query: unknown[] };
    method: string;
  };
  response: {
    code: number;
    status: string;
    responseTime: number;
    responseSize: number;
  };
  assertions?: NewmanAssertion[];
}

interface NewmanRun {
  stats: {
    iterations: { total: number; pending: number; failed: number };
    items: { total: number; pending: number; failed: number };
    scripts: { total: number; pending: number; failed: number };
    prerequests: { total: number; pending: number; failed: number };
    requests: { total: number; pending: number; failed: number };
    tests: { total: number; pending: number; failed: number };
    assertions: { total: number; pending: number; failed: number };
    testScripts: { total: number; pending: number; failed: number };
    prerequestScripts: { total: number; pending: number; failed: number };
  };
  timings: {
    responseAverage: number;
    responseMin: number;
    responseMax: number;
    responseSd: number;
    dnsAverage: number;
    firstByteAverage: number;
    started: number;
    completed: number;
  };
  executions: NewmanExecution[];
  failures: Array<{
    error: { name: string; message: string; test: string };
    at: string;
    source: { id: string; name: string };
    parent: { id: string; name: string };
    cursor: { position: number; iteration: number };
  }>;
}

interface NewmanOutput {
  collection: { info: { name: string; description?: string } };
  run: NewmanRun;
}

export class NewmanIntegration implements ToolIntegration {
  name = 'Newman';
  category = 'api-testing' as const;
  description = 'Command-line collection runner for Postman API tests';
  website = 'https://www.postman.com/newman/';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx newman --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        iterations: 1,
        timeout: 30000,
        delayRequest: 0,
        bail: false,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.apiCollection) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'Postman collection file is required for Newman',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const outputPath = path.join(os.tmpdir(), `newman-output-${Date.now()}.json`);
      const iterations = config?.options?.iterations || 1;
      const timeout = config?.options?.timeout || 30000;

      const envOption = target.apiEnvironment ? `--environment "${target.apiEnvironment}"` : '';

      try {
        execSync(
          `npx newman run "${target.apiCollection}" ${envOption} --reporters json --reporter-json-export "${outputPath}" -n ${iterations} --timeout ${timeout}`,
          { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 300000 }
        );
      } catch {
        // Newman exits with error if tests fail
      }

      const result = fs.readFileSync(outputPath, 'utf-8');
      const newmanOutput: NewmanOutput = JSON.parse(result);

      // Analyze failures
      findings.push(...this.analyzeFailures(newmanOutput));
      findings.push(...this.analyzePerformance(newmanOutput));

      fs.unlinkSync(outputPath);

      return this.createResult(findings, Date.now() - startTime, newmanOutput);
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

  private analyzeFailures(output: NewmanOutput): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const run = output.run;

    // Assertion failures
    for (const failure of run.failures) {
      findings.push({
        id: `newman-${failure.source.id}-${failure.cursor.position}`,
        tool: this.name,
        category: this.category,
        severity: 'high',
        title: `Newman: Test Failed - ${failure.source.name}`,
        description: failure.error.message,
        explanation: `Test "${failure.error.test}" in "${failure.source.name}" failed: ${failure.error.message}`,
        impact: 'API test failure indicates the endpoint is not behaving as expected.',
        recommendation: `Fix the issue in ${failure.source.name} to make the test pass.`,
        documentationUrl: 'https://learning.postman.com/docs/writing-scripts/test-scripts/',
        aiPrompt: {
          short: `Fix Newman test failure: ${failure.source.name}`,
          detailed: `
Fix the failing API test in Postman collection.

Request: ${failure.source.name}
Test: ${failure.error.test}
Error: ${failure.error.message}

This test is failing which indicates the API endpoint is not returning expected results.
Please investigate and fix the API or update the test if requirements have changed.
          `.trim(),
          steps: [
            `Review the failing test: ${failure.error.test}`,
            'Check the API response',
            'Fix the API or update the test',
            'Re-run Newman to verify',
          ],
        },
        ruleId: failure.error.name,
        tags: ['newman', 'postman', 'api-testing', 'test-failure'],
        effort: 'moderate',
      });
    }

    // Check for HTTP errors in executions
    for (const exec of run.executions) {
      if (exec.response && exec.response.code >= 400) {
        const severity: Severity = exec.response.code >= 500 ? 'high' : 'medium';
        findings.push({
          id: `newman-http-${exec.id}`,
          tool: this.name,
          category: this.category,
          severity,
          title: `Newman: HTTP ${exec.response.code} - ${exec.item.name}`,
          description: `Request "${exec.item.name}" returned HTTP ${exec.response.code} ${exec.response.status}`,
          explanation: `The API endpoint returned an error response code.`,
          impact: exec.response.code >= 500
            ? 'Server error indicates a problem with the API implementation.'
            : 'Client error indicates invalid request or authentication issue.',
          url: `${exec.request.url.protocol}://${exec.request.url.host.join('.')}/${exec.request.url.path.join('/')}`,
          recommendation: 'Investigate and fix the API endpoint.',
          documentationUrl: 'https://learning.postman.com/docs/sending-requests/responses/',
          aiPrompt: {
            short: `Fix HTTP ${exec.response.code} error in ${exec.item.name}`,
            detailed: `
Fix the HTTP error in API endpoint.

Request: ${exec.request.method} ${exec.item.name}
Response: ${exec.response.code} ${exec.response.status}

Investigate why the endpoint is returning an error.
            `.trim(),
            steps: [
              'Review the request parameters',
              'Check server logs',
              'Fix the issue',
              'Re-test',
            ],
          },
          ruleId: `http-${exec.response.code}`,
          tags: ['newman', 'api-testing', `http-${exec.response.code}`],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private analyzePerformance(output: NewmanOutput): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const timings = output.run.timings;

    if (timings.responseAverage > 2000) {
      findings.push({
        id: 'newman-slow-avg',
        tool: this.name,
        category: this.category,
        severity: 'medium',
        title: 'Newman: Slow Average Response Time',
        description: `Average API response time is ${Math.round(timings.responseAverage)}ms`,
        explanation: 'API responses are taking longer than recommended.',
        impact: 'Slow APIs affect user experience and application performance.',
        recommendation: 'Optimize API endpoints for faster response times.',
        documentationUrl: 'https://learning.postman.com/docs/writing-scripts/test-scripts/',
        aiPrompt: {
          short: 'Optimize slow API responses',
          detailed: `
API response times are slow.

Average: ${Math.round(timings.responseAverage)}ms
Min: ${Math.round(timings.responseMin)}ms
Max: ${Math.round(timings.responseMax)}ms

Optimize the slow endpoints to improve response times.
          `.trim(),
          steps: [
            'Identify slowest endpoints',
            'Profile the code',
            'Add caching',
            'Optimize queries',
            'Re-test',
          ],
        },
        ruleId: 'slow-response',
        tags: ['newman', 'performance', 'api-testing'],
        effort: 'moderate',
      });
    }

    // Check for slow individual requests
    for (const exec of output.run.executions) {
      if (exec.response && exec.response.responseTime > 3000) {
        findings.push({
          id: `newman-slow-${exec.id}`,
          tool: this.name,
          category: this.category,
          severity: 'low',
          title: `Newman: Slow Request - ${exec.item.name}`,
          description: `Request took ${exec.response.responseTime}ms`,
          explanation: `The request "${exec.item.name}" is responding slowly.`,
          impact: 'Slow endpoint affects user experience.',
          recommendation: 'Optimize this specific endpoint.',
          documentationUrl: 'https://learning.postman.com/docs/sending-requests/responses/',
          aiPrompt: {
            short: `Optimize slow endpoint: ${exec.item.name}`,
            detailed: `Optimize the slow API endpoint: ${exec.item.name} (${exec.response.responseTime}ms)`,
            steps: ['Profile', 'Optimize', 'Re-test'],
          },
          ruleId: 'slow-endpoint',
          tags: ['newman', 'performance'],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private createResult(findings: AuditFinding[], duration: number, output: NewmanOutput): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    const stats = output.run.stats;

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: stats.assertions.total - stats.assertions.failed,
        failed: stats.assertions.failed,
      },
      metadata: {
        collection: output.collection.info.name,
        totalRequests: stats.requests.total,
        failedRequests: stats.requests.failed,
        totalAssertions: stats.assertions.total,
        failedAssertions: stats.assertions.failed,
        avgResponseTime: output.run.timings.responseAverage,
      },
    };
  }
}
