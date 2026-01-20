// Pact Integration (Self-hosted)
// License: MIT
// Website: https://pact.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface PactVerificationResult {
  summary: {
    testCount: number;
    failureCount: number;
    pendingCount: number;
  };
  tests: Array<{
    fullDescription: string;
    status: 'passed' | 'failed' | 'pending';
    interactionDescription: string;
    providerState?: string;
    err?: {
      message: string;
      expected: string;
      actual: string;
    };
  }>;
  consumer: { name: string };
  provider: { name: string };
}

export class PactIntegration implements ToolIntegration {
  name = 'Pact';
  category = 'api-testing' as const;
  description = 'Contract testing tool for microservices integration testing';
  website = 'https://pact.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx pact-broker help', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        pactBrokerUrl: process.env.PACT_BROKER_URL,
        providerBaseUrl: process.env.PROVIDER_BASE_URL,
        publishResults: false,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.directory && !config?.options?.pactFiles) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'Pact files directory or pact broker URL required',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const providerBaseUrl = config?.options?.providerBaseUrl || 'http://localhost:3000';
      const pactDir = target.directory || config?.options?.pactFiles;
      const outputPath = path.join(os.tmpdir(), `pact-output-${Date.now()}.json`);

      try {
        execSync(
          `npx pact-provider-verifier --provider-base-url="${providerBaseUrl}" --pact-urls="${pactDir}" --format json > "${outputPath}"`,
          { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 300000, stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch {
        // Pact exits with error if verification fails
      }

      if (fs.existsSync(outputPath)) {
        const result = fs.readFileSync(outputPath, 'utf-8');
        try {
          const pactResult: PactVerificationResult = JSON.parse(result);
          findings.push(...this.analyzeResults(pactResult));
        } catch {
          // Try to parse as multiple results
          const lines = result.trim().split('\n');
          for (const line of lines) {
            try {
              const pactResult: PactVerificationResult = JSON.parse(line);
              findings.push(...this.analyzeResults(pactResult));
            } catch {
              // Skip unparseable lines
            }
          }
        }
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

  private analyzeResults(result: PactVerificationResult): AuditFinding[] {
    const findings: AuditFinding[] = [];

    for (const test of result.tests) {
      if (test.status === 'failed') {
        findings.push({
          id: `pact-${result.consumer.name}-${result.provider.name}-${test.interactionDescription}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity: 'high',
          title: `Pact: Contract Violation - ${test.interactionDescription}`,
          description: test.err?.message || 'Contract verification failed',
          explanation: `The provider "${result.provider.name}" does not satisfy the contract expected by consumer "${result.consumer.name}".`,
          impact: 'Contract violations break integration between services. The consumer will fail when calling this provider.',
          recommendation: this.getRecommendation(test),
          documentationUrl: 'https://docs.pact.io/',
          aiPrompt: {
            short: `Fix Pact contract violation: ${test.interactionDescription}`,
            detailed: `
Fix the contract violation between consumer and provider.

Consumer: ${result.consumer.name}
Provider: ${result.provider.name}
Interaction: ${test.interactionDescription}
${test.providerState ? `Provider State: ${test.providerState}` : ''}

Error: ${test.err?.message || 'Verification failed'}
${test.err?.expected ? `Expected: ${test.err.expected}` : ''}
${test.err?.actual ? `Actual: ${test.err.actual}` : ''}

Either update the provider to match the contract or update the consumer contract if requirements changed.
            `.trim(),
            steps: [
              'Review the contract expectation',
              'Compare expected vs actual response',
              'Fix provider or update consumer contract',
              'Re-run Pact verification',
            ],
          },
          ruleId: 'contract-violation',
          tags: ['pact', 'contract-testing', 'api-testing', result.consumer.name, result.provider.name],
          effort: 'moderate',
        });
      }

      if (test.status === 'pending') {
        findings.push({
          id: `pact-pending-${test.interactionDescription}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity: 'info',
          title: `Pact: Pending Contract - ${test.interactionDescription}`,
          description: 'This contract interaction is marked as pending.',
          explanation: 'Pending pacts are not yet implemented on the provider side.',
          impact: 'No immediate impact but should be implemented.',
          recommendation: 'Implement the provider endpoint to satisfy this contract.',
          documentationUrl: 'https://docs.pact.io/',
          aiPrompt: {
            short: `Implement pending Pact contract: ${test.interactionDescription}`,
            detailed: `Implement the provider endpoint for: ${test.interactionDescription}`,
            steps: ['Implement endpoint', 'Verify contract'],
          },
          ruleId: 'pending-contract',
          tags: ['pact', 'contract-testing', 'pending'],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private getRecommendation(test: PactVerificationResult['tests'][0]): string {
    if (test.err?.message.includes('status')) {
      return 'The HTTP status code does not match. Update the provider to return the expected status.';
    }
    if (test.err?.message.includes('body')) {
      return 'The response body does not match the contract. Ensure the provider returns the expected structure.';
    }
    if (test.err?.message.includes('header')) {
      return 'The response headers do not match. Update the provider to return the expected headers.';
    }
    return 'Review and fix the contract violation between consumer and provider.';
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
