// Dredd Integration (Self-hosted)
// License: MIT
// Website: https://dredd.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface DreddResult {
  version: string;
  configuration: {
    server: string;
    path: string[];
  };
  stats: {
    tests: number;
    failures: number;
    errors: number;
    passes: number;
    skipped: number;
    start: string;
    end: string;
    duration: number;
  };
  tests: Array<{
    title: string;
    fullTitle: string;
    duration: number;
    status: 'pass' | 'fail' | 'skip';
    message?: string;
    request?: {
      method: string;
      uri: string;
      headers: Record<string, string>;
      body?: string;
    };
    expected?: {
      statusCode: string;
      headers: Record<string, string>;
      body?: string;
    };
    actual?: {
      statusCode: string;
      headers: Record<string, string>;
      body?: string;
    };
  }>;
}

export class DreddIntegration implements ToolIntegration {
  name = 'Dredd';
  category = 'api-testing' as const;
  description = 'HTTP API Testing Framework for testing API documentation (OpenAPI/Swagger, API Blueprint)';
  website = 'https://dredd.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx dredd --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        method: 'order',
        color: false,
        loglevel: 'warning',
        sorted: true,
        names: false,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.apiSpec || !target.url) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'API specification file and server URL are required for Dredd',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const outputPath = path.join(os.tmpdir(), `dredd-output-${Date.now()}.json`);

      try {
        execSync(
          `npx dredd "${target.apiSpec}" "${target.url}" --reporter json --output "${outputPath}"`,
          { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 300000 }
        );
      } catch {
        // Dredd exits with error if tests fail
      }

      if (fs.existsSync(outputPath)) {
        const result = fs.readFileSync(outputPath, 'utf-8');
        const dreddResult: DreddResult = JSON.parse(result);
        findings.push(...this.analyzeResults(dreddResult, target.url));
        fs.unlinkSync(outputPath);
      }

      return this.createResult(findings, Date.now() - startTime);
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

  private analyzeResults(result: DreddResult, serverUrl: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    for (const test of result.tests) {
      if (test.status === 'fail') {
        const statusMismatch = test.expected?.statusCode !== test.actual?.statusCode;
        const bodyMismatch = test.message?.includes('body');
        const headerMismatch = test.message?.includes('header');

        const severity: Severity = statusMismatch ? 'high' : 'medium';

        findings.push({
          id: `dredd-${test.title}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity,
          title: `Dredd: API Mismatch - ${test.title}`,
          description: test.message || 'API does not match documentation',
          explanation: this.getExplanation(test),
          impact: 'API implementation differs from documentation. Clients relying on the spec will encounter unexpected behavior.',
          url: test.request?.uri,
          recommendation: this.getRecommendation(statusMismatch, bodyMismatch, headerMismatch),
          documentationUrl: 'https://dredd.org/en/latest/',
          aiPrompt: {
            short: `Fix Dredd API mismatch: ${test.title}`,
            detailed: `
Fix the API implementation to match the documentation.

Endpoint: ${test.request?.method} ${test.request?.uri}
Test: ${test.fullTitle}

Expected Status: ${test.expected?.statusCode}
Actual Status: ${test.actual?.statusCode}

${test.message || ''}

${test.expected?.body ? `Expected Body:\n${test.expected.body}\n` : ''}
${test.actual?.body ? `Actual Body:\n${test.actual.body}` : ''}

Either fix the API implementation or update the API documentation.
            `.trim(),
            steps: [
              'Compare expected vs actual response',
              'Determine if API or docs need updating',
              'Make the necessary changes',
              'Re-run Dredd to verify',
            ],
          },
          ruleId: statusMismatch ? 'status-mismatch' : bodyMismatch ? 'body-mismatch' : 'api-mismatch',
          tags: ['dredd', 'api-testing', 'openapi', 'documentation'],
          effort: 'moderate',
        });
      }

      if (test.status === 'skip') {
        findings.push({
          id: `dredd-skip-${test.title}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity: 'info',
          title: `Dredd: Skipped Test - ${test.title}`,
          description: 'This API endpoint test was skipped.',
          explanation: 'The test was skipped, possibly due to missing hooks or configuration.',
          impact: 'No validation was performed for this endpoint.',
          recommendation: 'Review why the test was skipped and enable it if appropriate.',
          documentationUrl: 'https://dredd.org/en/latest/',
          aiPrompt: {
            short: `Review skipped Dredd test: ${test.title}`,
            detailed: `Review why this Dredd test was skipped: ${test.title}`,
            steps: ['Check hooks', 'Enable test if appropriate'],
          },
          ruleId: 'skipped-test',
          tags: ['dredd', 'api-testing', 'skipped'],
          effort: 'easy',
        });
      }
    }

    return findings;
  }

  private getExplanation(test: DreddResult['tests'][0]): string {
    const parts: string[] = [];

    if (test.expected?.statusCode !== test.actual?.statusCode) {
      parts.push(`Expected status ${test.expected?.statusCode}, got ${test.actual?.statusCode}.`);
    }

    if (test.message) {
      parts.push(test.message);
    }

    return parts.join(' ') || 'API response does not match specification.';
  }

  private getRecommendation(statusMismatch: boolean, bodyMismatch: boolean, headerMismatch: boolean): string {
    if (statusMismatch) {
      return 'Fix the API to return the correct HTTP status code, or update the documentation if the status code is intentionally different.';
    }
    if (bodyMismatch) {
      return 'Ensure the response body structure matches the API specification. Check for missing or extra fields.';
    }
    if (headerMismatch) {
      return 'Ensure the response headers match the API specification.';
    }
    return 'Compare the API implementation with the documentation and resolve discrepancies.';
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
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
        passed: 0,
        failed: findings.filter(f => f.severity !== 'info').length,
      },
      metadata: {},
    };
  }
}
