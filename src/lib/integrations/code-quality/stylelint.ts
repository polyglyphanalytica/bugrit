// Stylelint Integration
// License: MIT
// Website: https://stylelint.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface StylelintWarning {
  line: number;
  column: number;
  rule: string;
  severity: 'error' | 'warning';
  text: string;
}

interface StylelintResult {
  source: string;
  warnings: StylelintWarning[];
  deprecations: Array<{ text: string; reference: string }>;
  invalidOptionWarnings: Array<{ text: string }>;
}

export class StylelintIntegration implements ToolIntegration {
  name = 'Stylelint';
  category = 'code-quality' as const;
  description = 'A mighty CSS linter that helps you avoid errors and enforce conventions';
  website = 'https://stylelint.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx stylelint --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        extensions: ['.css', '.scss', '.sass', '.less'],
        fix: false,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';

      const result = execSync(
        `npx stylelint "${targetDir}/**/*.{css,scss,sass,less}" --formatter json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const stylelintResults: StylelintResult[] = JSON.parse(result);

      for (const fileResult of stylelintResults) {
        for (const warning of fileResult.warnings) {
          findings.push(this.convertToFinding(fileResult.source, warning));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const stylelintResults: StylelintResult[] = JSON.parse((error as { stdout: string }).stdout);
          for (const fileResult of stylelintResults) {
            for (const warning of fileResult.warnings) {
              findings.push(this.convertToFinding(fileResult.source, warning));
            }
          }
          return this.createResult(findings, Date.now() - startTime);
        } catch {
          // Parse error
        }
      }

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

  private convertToFinding(filePath: string, warning: StylelintWarning): AuditFinding {
    const severity: Severity = warning.severity === 'error' ? 'medium' : 'low';

    return {
      id: `stylelint-${filePath}-${warning.line}-${warning.rule}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Stylelint: ${warning.rule}`,
      description: warning.text,
      explanation: this.getExplanation(warning.rule),
      impact: 'CSS/styling issues can cause visual inconsistencies, browser compatibility problems, and maintenance difficulties.',
      file: filePath,
      line: warning.line,
      column: warning.column,
      recommendation: `Fix the ${warning.rule} violation. Run 'npx stylelint --fix' if the rule is auto-fixable.`,
      documentationUrl: `https://stylelint.io/user-guide/rules/${warning.rule}`,
      aiPrompt: {
        short: `Fix Stylelint ${warning.rule} error in ${filePath} at line ${warning.line}`,
        detailed: `
Fix the Stylelint CSS linting issue in my code.

File: ${filePath}
Line: ${warning.line}
Rule: ${warning.rule}
Message: ${warning.text}

Please fix this CSS issue while maintaining the visual appearance.
        `.trim(),
        steps: [
          `Open ${filePath} and go to line ${warning.line}`,
          `Review the ${warning.rule} rule documentation`,
          'Fix the CSS pattern that violates the rule',
          'Verify the styling still works correctly',
        ],
      },
      ruleId: warning.rule,
      tags: ['stylelint', 'css', 'code-quality', warning.rule],
      effort: 'easy',
    };
  }

  private getExplanation(rule: string): string {
    const explanations: Record<string, string> = {
      'color-no-invalid-hex': 'Invalid hex colors will not render correctly in browsers.',
      'declaration-block-no-duplicate-properties': 'Duplicate properties indicate copy-paste errors or confusion.',
      'no-descending-specificity': 'Specificity issues can cause styles to not apply as expected.',
      'selector-pseudo-class-no-unknown': 'Unknown pseudo-classes will not work and may indicate typos.',
    };
    return explanations[rule] || 'This Stylelint rule helps maintain CSS quality and consistency.';
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
    };
  }
}
