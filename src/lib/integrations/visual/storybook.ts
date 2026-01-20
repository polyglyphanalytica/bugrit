// Storybook Integration (Self-hosted)
// License: MIT
// Website: https://storybook.js.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface StorybookTestResult {
  numFailedTestSuites: number;
  numPassedTestSuites: number;
  numPendingTestSuites: number;
  numTotalTestSuites: number;
  numFailedTests: number;
  numPassedTests: number;
  numPendingTests: number;
  numTotalTests: number;
  success: boolean;
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed' | 'pending';
    assertionResults: Array<{
      ancestorTitles: string[];
      fullName: string;
      status: 'passed' | 'failed' | 'pending';
      title: string;
      failureMessages?: string[];
    }>;
  }>;
}

export class StorybookIntegration implements ToolIntegration {
  name = 'Storybook';
  category = 'visual' as const;
  description = 'UI component development and testing with visual regression testing support';
  website = 'https://storybook.js.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx storybook --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        testRunner: true,
        chromatic: false,
        ci: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      const targetDir = target.directory || '.';
      const outputPath = path.join(os.tmpdir(), `storybook-output-${Date.now()}.json`);

      // Run Storybook test runner
      try {
        execSync(
          `npx test-storybook --ci --json --outputFile="${outputPath}"`,
          { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 600000, cwd: targetDir }
        );
      } catch {
        // Test runner exits with error if tests fail
      }

      if (fs.existsSync(outputPath)) {
        const result = fs.readFileSync(outputPath, 'utf-8');
        const testResult: StorybookTestResult = JSON.parse(result);
        findings.push(...this.analyzeTestResults(testResult, targetDir));
        fs.unlinkSync(outputPath);
      }

      // Run accessibility checks
      findings.push(...await this.runAccessibilityChecks(targetDir));

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

  private analyzeTestResults(result: StorybookTestResult, targetDir: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    for (const suite of result.testResults) {
      for (const assertion of suite.assertionResults) {
        if (assertion.status === 'failed') {
          findings.push({
            id: `storybook-${assertion.fullName}`.replace(/[^a-z0-9-]/gi, '-').substring(0, 100),
            tool: this.name,
            category: this.category,
            severity: 'high',
            title: `Storybook: Test Failed - ${assertion.title}`,
            description: assertion.failureMessages?.join('\n') || 'Test failed',
            explanation: `The story test "${assertion.fullName}" failed.`,
            impact: 'UI component is not rendering correctly or has interaction issues.',
            file: suite.name,
            recommendation: 'Fix the component or update the story test.',
            documentationUrl: 'https://storybook.js.org/docs/react/writing-tests/interaction-testing',
            aiPrompt: {
              short: `Fix Storybook test: ${assertion.title}`,
              detailed: `
Fix the failing Storybook test.

Story: ${assertion.fullName}
Component: ${assertion.ancestorTitles.join(' > ')}

Failure:
${assertion.failureMessages?.join('\n') || 'Test failed'}

Fix the component or update the test to make it pass.
              `.trim(),
              steps: [
                'Review the failing story',
                'Check the component implementation',
                'Fix the issue',
                'Re-run Storybook tests',
              ],
            },
            ruleId: 'story-test-failure',
            tags: ['storybook', 'visual', 'component-testing'],
            effort: 'moderate',
          });
        }
      }
    }

    return findings;
  }

  private async runAccessibilityChecks(targetDir: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = require('child_process');

      // Check for accessibility addon configuration
      const result = execSync(
        'npx storybook info',
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, cwd: targetDir }
      );

      if (!result.includes('@storybook/addon-a11y')) {
        findings.push({
          id: 'storybook-no-a11y-addon',
          tool: this.name,
          category: this.category,
          severity: 'medium',
          title: 'Storybook: Accessibility Addon Not Configured',
          description: '@storybook/addon-a11y is not installed.',
          explanation: 'Without the accessibility addon, accessibility issues in components may go unnoticed.',
          impact: 'Components may have accessibility issues that are not detected during development.',
          recommendation: 'Install and configure @storybook/addon-a11y.',
          documentationUrl: 'https://storybook.js.org/addons/@storybook/addon-a11y',
          aiPrompt: {
            short: 'Add Storybook accessibility addon',
            detailed: `
Install and configure the Storybook accessibility addon.

Run: npm install @storybook/addon-a11y --save-dev

Then add to .storybook/main.js:
module.exports = {
  addons: ['@storybook/addon-a11y'],
};
            `.trim(),
            steps: [
              'Install @storybook/addon-a11y',
              'Add to Storybook config',
              'Review accessibility panel in stories',
            ],
          },
          ruleId: 'missing-a11y-addon',
          tags: ['storybook', 'accessibility', 'configuration'],
          effort: 'easy',
        });
      }
    } catch {
      // Could not check Storybook info
    }

    return findings;
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
