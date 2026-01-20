// Semgrep Integration
// License: LGPL
// Website: https://semgrep.dev

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface SemgrepResult {
  check_id: string;
  path: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
  extra: {
    message: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    metadata: {
      cwe?: string[];
      owasp?: string[];
      category?: string;
      confidence?: string;
      impact?: string;
      likelihood?: string;
      references?: string[];
    };
    lines: string;
    fix?: string;
  };
}

interface SemgrepOutput {
  results: SemgrepResult[];
  errors: Array<{ message: string }>;
}

export class SemgrepIntegration implements ToolIntegration {
  name = 'Semgrep';
  category = 'security' as const;
  description = 'Fast, open-source static analysis tool for finding bugs and enforcing code standards';
  website = 'https://semgrep.dev';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('semgrep --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        config: 'auto', // or 'p/security-audit', 'p/owasp-top-ten', etc.
        severity: ['ERROR', 'WARNING'],
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const semgrepConfig = (config?.options?.config as string) || 'auto';

      const result = execSync(
        `semgrep scan --config ${semgrepConfig} --json "${targetDir}"`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
      );

      const output: SemgrepOutput = JSON.parse(result);

      for (const finding of output.results) {
        findings.push(this.convertToFinding(finding));
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: SemgrepOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const finding of output.results) {
            findings.push(this.convertToFinding(finding));
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

  private convertToFinding(result: SemgrepResult): AuditFinding {
    const severityMap: Record<string, Severity> = {
      ERROR: 'high',
      WARNING: 'medium',
      INFO: 'low',
    };

    const severity = severityMap[result.extra.severity] || 'medium';
    const metadata = result.extra.metadata;

    return {
      id: `semgrep-${result.path}-${result.start.line}-${result.check_id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Semgrep: ${result.check_id}`,
      description: result.extra.message,
      explanation: this.buildExplanation(metadata),
      impact: metadata.impact || 'This security issue could potentially be exploited by attackers.',
      file: result.path,
      line: result.start.line,
      column: result.start.col,
      codeSnippet: result.extra.lines,
      recommendation: result.extra.fix || 'Review and fix this security issue according to the rule documentation.',
      fixExample: result.extra.fix,
      documentationUrl: metadata.references?.[0] || `https://semgrep.dev/r/${result.check_id}`,
      aiPrompt: {
        short: `Fix Semgrep security issue ${result.check_id} in ${result.path} at line ${result.start.line}`,
        detailed: `
Fix the security vulnerability found by Semgrep.

File: ${result.path}
Line: ${result.start.line}
Rule: ${result.check_id}
Severity: ${result.extra.severity}

Message: ${result.extra.message}

Vulnerable code:
\`\`\`
${result.extra.lines}
\`\`\`

${metadata.cwe?.length ? `CWE: ${metadata.cwe.join(', ')}` : ''}
${metadata.owasp?.length ? `OWASP: ${metadata.owasp.join(', ')}` : ''}

${result.extra.fix ? `Suggested fix pattern:\n${result.extra.fix}` : ''}

Please fix this security vulnerability while maintaining the code's functionality.
        `.trim(),
        steps: [
          `Open ${result.path} and go to line ${result.start.line}`,
          `Understand the security issue: ${result.check_id}`,
          result.extra.fix ? 'Apply the suggested fix pattern' : 'Rewrite the code to avoid the vulnerability',
          'Test that the functionality still works',
          'Run Semgrep again to verify the fix',
        ],
      },
      ruleId: result.check_id,
      tags: ['semgrep', 'security', ...(metadata.cwe || []), ...(metadata.owasp || [])],
      effort: 'moderate',
    };
  }

  private buildExplanation(metadata: SemgrepResult['extra']['metadata']): string {
    const parts: string[] = [];

    if (metadata.category) {
      parts.push(`Category: ${metadata.category}`);
    }
    if (metadata.confidence) {
      parts.push(`Confidence: ${metadata.confidence}`);
    }
    if (metadata.likelihood) {
      parts.push(`Likelihood: ${metadata.likelihood}`);
    }
    if (metadata.cwe?.length) {
      parts.push(`CWE: ${metadata.cwe.join(', ')}`);
    }
    if (metadata.owasp?.length) {
      parts.push(`OWASP: ${metadata.owasp.join(', ')}`);
    }

    return parts.length > 0
      ? parts.join('. ') + '.'
      : 'This is a security issue detected by Semgrep static analysis.';
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
