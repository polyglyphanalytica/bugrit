// HTMLHint Integration
// License: MIT
// Website: https://htmlhint.com

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface HTMLHintMessage {
  type: 'error' | 'warning' | 'info';
  line: number;
  col: number;
  message: string;
  raw: string;
  rule: {
    id: string;
    description: string;
    link: string;
  };
}

interface HTMLHintResult {
  file: string;
  messages: HTMLHintMessage[];
}

export class HTMLHintIntegration implements ToolIntegration {
  name = 'HTMLHint';
  category = 'code-quality' as const;
  description = 'Static code analysis tool for HTML';
  website = 'https://htmlhint.com';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx htmlhint --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        extensions: ['.html', '.htm'],
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
        `npx htmlhint "${targetDir}/**/*.html" --format json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const htmlhintResults: HTMLHintResult[] = JSON.parse(result);

      for (const fileResult of htmlhintResults) {
        for (const message of fileResult.messages) {
          findings.push(this.convertToFinding(fileResult.file, message));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const htmlhintResults: HTMLHintResult[] = JSON.parse((error as { stdout: string }).stdout);
          for (const fileResult of htmlhintResults) {
            for (const message of fileResult.messages) {
              findings.push(this.convertToFinding(fileResult.file, message));
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

  private convertToFinding(filePath: string, message: HTMLHintMessage): AuditFinding {
    const severityMap: Record<string, Severity> = {
      error: 'medium',
      warning: 'low',
      info: 'info',
    };

    const severity = severityMap[message.type] || 'low';

    return {
      id: `htmlhint-${filePath}-${message.line}-${message.rule.id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `HTMLHint: ${message.rule.id}`,
      description: message.message,
      explanation: message.rule.description,
      impact: 'HTML issues can cause rendering problems, accessibility issues, and SEO impacts.',
      file: filePath,
      line: message.line,
      column: message.col,
      codeSnippet: message.raw,
      recommendation: `Fix the HTML according to the ${message.rule.id} rule.`,
      documentationUrl: message.rule.link || 'https://htmlhint.com/docs/user-guide/list-rules',
      aiPrompt: {
        short: `Fix HTMLHint ${message.rule.id} error in ${filePath} at line ${message.line}`,
        detailed: `
Fix the HTML linting issue in my code.

File: ${filePath}
Line: ${message.line}
Rule: ${message.rule.id}
Message: ${message.message}

Raw HTML:
${message.raw}

Please fix this HTML issue to comply with best practices.
        `.trim(),
        steps: [
          `Open ${filePath} and go to line ${message.line}`,
          `Review the ${message.rule.id} rule`,
          'Fix the HTML structure or attributes',
          'Validate the HTML again',
        ],
      },
      ruleId: message.rule.id,
      tags: ['htmlhint', 'html', 'code-quality'],
      effort: 'easy',
    };
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
