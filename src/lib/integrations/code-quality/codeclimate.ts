// CodeClimate Integration (Open Source Engine)
// License: MIT (engine)
// Website: https://codeclimate.com

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface CodeClimateIssue {
  type: string;
  check_name: string;
  description: string;
  content?: { body: string };
  categories: string[];
  location: {
    path: string;
    lines?: { begin: number; end: number };
    positions?: { begin: { line: number; column: number } };
  };
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
  fingerprint: string;
  remediation_points?: number;
}

export class CodeClimateIntegration implements ToolIntegration {
  name = 'CodeClimate';
  category = 'code-quality' as const;
  description = 'Automated code review for test coverage, maintainability and more';
  website = 'https://codeclimate.com';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('docker --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        engines: ['structure', 'duplication', 'fixme'],
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';

      // Run CodeClimate CLI via Docker
      const result = execSync(
        `docker run --rm -v "${targetDir}:/code" -v /var/run/docker.sock:/var/run/docker.sock codeclimate/codeclimate analyze -f json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const issues: CodeClimateIssue[] = JSON.parse(result);

      for (const issue of issues) {
        findings.push(this.convertToFinding(issue));
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const issues: CodeClimateIssue[] = JSON.parse((error as { stdout: string }).stdout);
          for (const issue of issues) {
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

  private convertToFinding(issue: CodeClimateIssue): AuditFinding {
    const severityMap: Record<string, Severity> = {
      blocker: 'critical',
      critical: 'high',
      major: 'medium',
      minor: 'low',
      info: 'info',
    };

    const severity = severityMap[issue.severity] || 'medium';
    const line = issue.location.lines?.begin || issue.location.positions?.begin?.line;

    return {
      id: `codeclimate-${issue.fingerprint}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `CodeClimate: ${issue.check_name}`,
      description: issue.description,
      explanation: issue.content?.body || this.getCategoryExplanation(issue.categories),
      impact: `This ${issue.categories.join('/')} issue affects code quality with ${issue.severity} severity.`,
      file: issue.location.path,
      line,
      recommendation: this.getRecommendation(issue),
      documentationUrl: 'https://docs.codeclimate.com/docs/issues',
      aiPrompt: {
        short: `Fix CodeClimate ${issue.check_name} in ${issue.location.path}${line ? ` at line ${line}` : ''}`,
        detailed: `
Fix the CodeClimate issue in my code.

File: ${issue.location.path}
Line: ${line || 'N/A'}
Check: ${issue.check_name}
Categories: ${issue.categories.join(', ')}
Severity: ${issue.severity}

Description: ${issue.description}

${issue.content?.body ? `Details:\n${issue.content.body}` : ''}

Please fix this issue while maintaining the code's functionality.
        `.trim(),
        steps: [
          `Open ${issue.location.path}${line ? ` and go to line ${line}` : ''}`,
          `Understand the ${issue.check_name} check`,
          'Refactor the code to address the issue',
          'Run CodeClimate analysis again to verify',
        ],
      },
      ruleId: issue.check_name,
      tags: ['codeclimate', ...issue.categories],
      effort: this.mapEffort(issue.remediation_points),
    };
  }

  private getCategoryExplanation(categories: string[]): string {
    const explanations: Record<string, string> = {
      'Bug Risk': 'This pattern is likely to cause bugs or unexpected behavior.',
      'Duplication': 'Duplicated code increases maintenance burden and bug risk.',
      'Complexity': 'High complexity makes code harder to understand and test.',
      'Style': 'Style issues reduce code readability and consistency.',
      'Security': 'Security issues could lead to vulnerabilities.',
    };

    for (const category of categories) {
      if (explanations[category]) return explanations[category];
    }
    return 'This issue was detected by CodeClimate analysis.';
  }

  private getRecommendation(issue: CodeClimateIssue): string {
    if (issue.categories.includes('Duplication')) {
      return 'Extract the duplicated code into a shared function or module.';
    }
    if (issue.categories.includes('Complexity')) {
      return 'Break down the complex code into smaller, more manageable functions.';
    }
    return `Address the ${issue.check_name} issue according to best practices.`;
  }

  private mapEffort(points?: number): AuditFinding['effort'] {
    if (!points) return 'moderate';
    if (points <= 50000) return 'trivial';
    if (points <= 200000) return 'easy';
    if (points <= 500000) return 'moderate';
    if (points <= 1000000) return 'hard';
    return 'complex';
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
