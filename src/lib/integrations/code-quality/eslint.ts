// ESLint Integration
// License: MIT
// Website: https://eslint.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
  nodeType: string;
  fix?: {
    range: [number, number];
    text: string;
  };
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
  fixableErrorCount: number;
  fixableWarningCount: number;
}

export class ESLintIntegration implements ToolIntegration {
  name = 'ESLint';
  category = 'code-quality' as const;
  description = 'Pluggable JavaScript/TypeScript linter for identifying and reporting code patterns';
  website = 'https://eslint.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx eslint --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        fix: false,
        cache: true,
        maxWarnings: -1,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const extensions = (config?.options?.extensions as string[]) || ['.js', '.jsx', '.ts', '.tsx'];

      const result = execSync(
        `npx eslint "${targetDir}" --ext ${extensions.join(',')} --format json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const eslintResults: ESLintResult[] = JSON.parse(result);

      for (const fileResult of eslintResults) {
        for (const message of fileResult.messages) {
          findings.push(this.convertToFinding(fileResult.filePath, message));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      // ESLint returns non-zero exit code when there are errors
      if (error instanceof Error && 'stdout' in error) {
        try {
          const eslintResults: ESLintResult[] = JSON.parse((error as { stdout: string }).stdout);
          for (const fileResult of eslintResults) {
            for (const message of fileResult.messages) {
              findings.push(this.convertToFinding(fileResult.filePath, message));
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

  private convertToFinding(filePath: string, message: ESLintMessage): AuditFinding {
    const severity: Severity = message.severity === 2 ? 'medium' : 'low';
    const ruleId = message.ruleId || 'unknown';

    return {
      id: `eslint-${filePath}-${message.line}-${ruleId}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `ESLint: ${ruleId}`,
      description: message.message,
      explanation: this.getExplanation(ruleId),
      impact: 'Code quality and consistency issues can lead to bugs and make the codebase harder to maintain.',
      file: filePath,
      line: message.line,
      column: message.column,
      recommendation: this.getRecommendation(ruleId, message),
      documentationUrl: ruleId ? `https://eslint.org/docs/rules/${ruleId}` : undefined,
      aiPrompt: {
        short: `Fix ESLint ${ruleId} error in ${filePath} at line ${message.line}: ${message.message}`,
        detailed: `
Fix the ESLint violation in my code.

File: ${filePath}
Line: ${message.line}
Rule: ${ruleId}
Message: ${message.message}

Please fix this issue while maintaining the code's functionality.
${message.fix ? 'This issue is auto-fixable - apply the suggested fix.' : 'This requires manual intervention.'}
        `.trim(),
        steps: [
          `Open ${filePath} and go to line ${message.line}`,
          `Understand the ESLint rule: ${ruleId}`,
          message.fix ? 'Apply the auto-fix or manually correct the code' : 'Manually correct the code pattern',
          'Verify the fix resolves the issue',
        ],
      },
      ruleId,
      tags: ['eslint', 'code-quality', ruleId],
      effort: message.fix ? 'trivial' : 'easy',
    };
  }

  private getExplanation(ruleId: string): string {
    const explanations: Record<string, string> = {
      'no-unused-vars': 'Unused variables take up memory and can confuse developers reading the code.',
      'no-console': 'Console statements should be removed in production code as they can expose sensitive information.',
      'eqeqeq': 'Using strict equality (===) prevents type coercion bugs.',
      'no-var': 'Using let/const instead of var provides better scoping and prevents hoisting issues.',
      'prefer-const': 'Using const for variables that are never reassigned makes code more predictable.',
    };
    return explanations[ruleId] || 'This ESLint rule helps maintain code quality and consistency.';
  }

  private getRecommendation(ruleId: string, message: ESLintMessage): string {
    if (message.fix) {
      return `This can be auto-fixed. Run 'npx eslint --fix' to automatically resolve this issue.`;
    }
    return `Review the code at line ${message.line} and fix the ${ruleId} violation. See ESLint documentation for guidance.`;
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
