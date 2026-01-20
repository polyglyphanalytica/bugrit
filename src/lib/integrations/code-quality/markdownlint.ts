// Markdownlint Integration
// License: MIT
// Website: https://github.com/DavidAnson/markdownlint

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding } from '../types';

interface MarkdownlintResult {
  fileName: string;
  lineNumber: number;
  ruleNames: string[];
  ruleDescription: string;
  ruleInformation: string;
  errorDetail: string | null;
  errorContext: string | null;
  errorRange: [number, number] | null;
}

export class MarkdownlintIntegration implements ToolIntegration {
  name = 'markdownlint';
  category = 'code-quality' as const;
  description = 'A Node.js style checker and lint tool for Markdown files';
  website = 'https://github.com/DavidAnson/markdownlint';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx markdownlint-cli --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        extensions: ['.md', '.markdown'],
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
        `npx markdownlint-cli "${targetDir}/**/*.md" --json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const markdownlintResults: MarkdownlintResult[] = JSON.parse(result);

      for (const issue of markdownlintResults) {
        findings.push(this.convertToFinding(issue));
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const markdownlintResults: MarkdownlintResult[] = JSON.parse((error as { stdout: string }).stdout);
          for (const issue of markdownlintResults) {
            findings.push(this.convertToFinding(issue));
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

  private convertToFinding(issue: MarkdownlintResult): AuditFinding {
    const ruleId = issue.ruleNames[0] || 'unknown';

    return {
      id: `markdownlint-${issue.fileName}-${issue.lineNumber}-${ruleId}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `Markdownlint: ${ruleId}`,
      description: issue.ruleDescription + (issue.errorDetail ? `: ${issue.errorDetail}` : ''),
      explanation: 'Consistent Markdown formatting improves readability of documentation and reduces rendering issues across different platforms.',
      impact: 'Inconsistent Markdown can cause rendering problems and make documentation harder to maintain.',
      file: issue.fileName,
      line: issue.lineNumber,
      codeSnippet: issue.errorContext || undefined,
      recommendation: `Fix the Markdown according to rule ${ruleId}. Run 'npx markdownlint-cli --fix' for auto-fixable issues.`,
      documentationUrl: issue.ruleInformation || `https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md#${ruleId.toLowerCase()}`,
      aiPrompt: {
        short: `Fix markdownlint ${ruleId} in ${issue.fileName} at line ${issue.lineNumber}`,
        detailed: `
Fix the Markdown linting issue in my documentation.

File: ${issue.fileName}
Line: ${issue.lineNumber}
Rule: ${ruleId} - ${issue.ruleDescription}
${issue.errorDetail ? `Detail: ${issue.errorDetail}` : ''}
${issue.errorContext ? `Context: ${issue.errorContext}` : ''}

Please fix this Markdown issue while preserving the content.
        `.trim(),
        steps: [
          `Open ${issue.fileName} and go to line ${issue.lineNumber}`,
          `Review the ${ruleId} rule: ${issue.ruleDescription}`,
          'Fix the Markdown formatting',
          'Preview the Markdown to verify rendering',
        ],
      },
      ruleId,
      tags: ['markdownlint', 'markdown', 'documentation', 'code-quality'],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: findings.length };

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
