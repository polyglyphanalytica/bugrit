// Pa11y Integration (Self-hosted)
// License: LGPL
// Website: https://pa11y.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface Pa11yIssue {
  code: string;
  type: 'error' | 'warning' | 'notice';
  typeCode: 1 | 2 | 3;
  message: string;
  context: string;
  selector: string;
  runner: string;
  runnerExtras: Record<string, unknown>;
}

interface Pa11yResult {
  documentTitle: string;
  pageUrl: string;
  issues: Pa11yIssue[];
}

export class Pa11yIntegration implements ToolIntegration {
  name = 'Pa11y';
  category = 'accessibility' as const;
  description = 'Automated accessibility testing pal that runs accessibility tests on web pages';
  website = 'https://pa11y.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx pa11y --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        standard: 'WCAG2AA',
        includeNotices: false,
        includeWarnings: true,
        timeout: 30000,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.url) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'URL target is required for Pa11y',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const standard = (config?.options?.standard as string) || 'WCAG2AA';
      const includeNotices = config?.options?.includeNotices ? '--include-notices' : '';
      const includeWarnings = config?.options?.includeWarnings !== false ? '--include-warnings' : '';
      const timeout = (config?.options?.timeout as number) || 30000;

      const result = execSync(
        `npx pa11y "${target.url}" --standard ${standard} ${includeNotices} ${includeWarnings} --timeout ${timeout} --reporter json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const pa11yResult: Pa11yResult = JSON.parse(result);

      for (const issue of pa11yResult.issues) {
        findings.push(this.convertToFinding(issue, target.url, pa11yResult.documentTitle));
      }

      return this.createResult(findings, Date.now() - startTime, pa11yResult);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const pa11yResult: Pa11yResult = JSON.parse((error as { stdout: string }).stdout);
          for (const issue of pa11yResult.issues) {
            findings.push(this.convertToFinding(issue, target.url, pa11yResult.documentTitle));
          }
          return this.createResult(findings, Date.now() - startTime, pa11yResult);
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

  private convertToFinding(issue: Pa11yIssue, url: string, pageTitle: string): AuditFinding {
    const typeToSeverity: Record<string, Severity> = {
      error: 'high',
      warning: 'medium',
      notice: 'info',
    };

    const severity = typeToSeverity[issue.type] || 'medium';
    const wcagCode = this.parseWCAGCode(issue.code);

    return {
      id: `pa11y-${issue.code}-${issue.selector}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Pa11y: ${this.formatCode(issue.code)}`,
      description: issue.message,
      explanation: `${issue.type.toUpperCase()} on page "${pageTitle}". ${wcagCode ? `WCAG: ${wcagCode}` : ''}`,
      impact: this.getImpact(issue.type, issue.message),
      url,
      selector: issue.selector,
      codeSnippet: issue.context,
      recommendation: this.getRecommendation(issue),
      documentationUrl: this.getDocUrl(issue.code),
      aiPrompt: {
        short: `Fix Pa11y ${issue.type}: ${this.formatCode(issue.code)}`,
        detailed: `
Fix the accessibility ${issue.type} found by Pa11y.

Page: ${pageTitle}
URL: ${url}
Code: ${issue.code}
Type: ${issue.type}

Message:
${issue.message}

Affected Element:
- Selector: ${issue.selector}
- HTML Context: ${issue.context}

Please fix this accessibility issue to improve the page's accessibility.
        `.trim(),
        steps: [
          `Locate the element: ${issue.selector}`,
          'Review the accessibility guideline',
          'Fix the HTML/ARIA issue',
          'Test with assistive technology if possible',
          'Re-run Pa11y to verify',
        ],
      },
      ruleId: issue.code,
      tags: ['pa11y', 'accessibility', issue.type, wcagCode || ''].filter(Boolean),
      effort: issue.type === 'error' ? 'moderate' : 'easy',
    };
  }

  private parseWCAGCode(code: string): string | null {
    const match = code.match(/WCAG2[A-Z]{1,3}\.[0-9]+\.[0-9]+\.[0-9]+/);
    return match ? match[0] : null;
  }

  private formatCode(code: string): string {
    // Extract meaningful part from code like "WCAG2AA.Principle1.Guideline1_3.1_3_1.H49.AlignAttr"
    const parts = code.split('.');
    return parts[parts.length - 1] || code;
  }

  private getImpact(type: string, message: string): string {
    if (type === 'error') {
      return `Accessibility error: ${message.substring(0, 100)}... Users with disabilities will be unable to access this content.`;
    }
    if (type === 'warning') {
      return `Accessibility warning that should be reviewed. May cause difficulties for some users.`;
    }
    return `Informational notice for potential accessibility improvement.`;
  }

  private getRecommendation(issue: Pa11yIssue): string {
    // Extract recommendation from message if it contains "should" or "must"
    const message = issue.message;
    if (message.includes('should')) {
      return message;
    }
    return `Fix the ${issue.type}: ${message.substring(0, 200)}`;
  }

  private getDocUrl(code: string): string {
    const wcagMatch = code.match(/WCAG2([A-Z]+)/);
    if (wcagMatch) {
      return `https://www.w3.org/WAI/WCAG21/Understanding/`;
    }
    return 'https://pa11y.org/';
  }

  private createResult(findings: AuditFinding[], duration: number, pa11yResult: Pa11yResult): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    const errors = findings.filter(f => f.severity === 'high').length;
    const warnings = findings.filter(f => f.severity === 'medium').length;

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
      metadata: {
        pageTitle: pa11yResult.documentTitle,
        url: pa11yResult.pageUrl,
        errors,
        warnings,
        notices: findings.filter(f => f.severity === 'info').length,
      },
    };
  }
}
