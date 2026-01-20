// BackstopJS Integration (Self-hosted)
// License: MIT
// Website: https://github.com/garris/BackstopJS

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface BackstopTest {
  pair: {
    label: string;
    reference: string;
    test: string;
    selector: string;
    fileName: string;
    referenceUrl: string;
    url: string;
    expect: number;
    viewportLabel: string;
    diff?: {
      isSameDimensions: boolean;
      dimensionDifference: { width: number; height: number };
      rawMisMatchPercentage: number;
      misMatchPercentage: string;
      analysisTime: number;
    };
    diffImage?: string;
  };
  status: 'pass' | 'fail';
}

interface BackstopReport {
  testSuite: string;
  tests: BackstopTest[];
}

export class BackstopIntegration implements ToolIntegration {
  name = 'BackstopJS';
  category = 'visual' as const;
  description = 'Visual regression testing with screenshot comparison';
  website = 'https://github.com/garris/BackstopJS';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx backstop --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        engine: 'puppeteer',
        asyncCaptureLimit: 5,
        asyncCompareLimit: 50,
        debug: false,
        debugWindow: false,
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

      const targetDir = target.directory || '.';
      const reportPath = path.join(targetDir, 'backstop_data', 'json_report', 'jsonReport.json');

      // Run BackstopJS test
      try {
        execSync('npx backstop test --config=backstop.json', {
          encoding: 'utf-8',
          maxBuffer: 100 * 1024 * 1024,
          timeout: 600000,
          cwd: targetDir
        });
      } catch {
        // BackstopJS exits with error if tests fail
      }

      if (fs.existsSync(reportPath)) {
        const result = fs.readFileSync(reportPath, 'utf-8');
        const report: BackstopReport = JSON.parse(result);
        findings.push(...this.analyzeReport(report, targetDir));
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

  private analyzeReport(report: BackstopReport, targetDir: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    for (const test of report.tests) {
      if (test.status === 'fail') {
        const diff = test.pair.diff;
        const mismatch = diff ? parseFloat(diff.misMatchPercentage) : 0;
        const severity: Severity = mismatch > 10 ? 'high' : mismatch > 5 ? 'medium' : 'low';

        findings.push({
          id: `backstop-${test.pair.label}-${test.pair.viewportLabel}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity,
          title: `BackstopJS: Visual Regression - ${test.pair.label}`,
          description: `Visual difference of ${diff?.misMatchPercentage || 'unknown'}% detected`,
          explanation: this.getExplanation(test),
          impact: 'Visual appearance has changed from the reference. This may be intentional or a regression.',
          url: test.pair.url,
          selector: test.pair.selector,
          recommendation: 'Review the visual diff. If the change is intentional, update the reference. Otherwise, fix the regression.',
          documentationUrl: 'https://github.com/garris/BackstopJS',
          aiPrompt: {
            short: `Fix visual regression: ${test.pair.label}`,
            detailed: `
Fix the visual regression detected by BackstopJS.

Test: ${test.pair.label}
Viewport: ${test.pair.viewportLabel}
URL: ${test.pair.url}
Selector: ${test.pair.selector}

${diff ? `
Mismatch: ${diff.misMatchPercentage}%
Same dimensions: ${diff.isSameDimensions}
${!diff.isSameDimensions ? `Dimension difference: ${diff.dimensionDifference.width}x${diff.dimensionDifference.height}` : ''}
` : ''}

If this is an intentional change, run 'backstop approve' to update references.
If this is a regression, investigate and fix the CSS/HTML changes.
            `.trim(),
            steps: [
              'Review the visual diff in the BackstopJS report',
              'Determine if change is intentional',
              'Fix the regression or approve the new reference',
              'Re-run BackstopJS to verify',
            ],
          },
          ruleId: 'visual-regression',
          tags: ['backstop', 'visual-regression', 'visual', test.pair.viewportLabel],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private getExplanation(test: BackstopTest): string {
    const diff = test.pair.diff;
    if (!diff) {
      return 'Visual comparison detected differences between reference and test screenshot.';
    }

    const parts: string[] = [];
    parts.push(`Mismatch: ${diff.misMatchPercentage}%.`);

    if (!diff.isSameDimensions) {
      parts.push(`Dimensions changed by ${diff.dimensionDifference.width}x${diff.dimensionDifference.height} pixels.`);
    }

    return parts.join(' ');
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
        failed: findings.length,
      },
      metadata: {},
    };
  }
}
