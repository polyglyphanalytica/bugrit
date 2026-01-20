// Vale Integration - Prose Linter
// License: MIT
// Website: https://vale.sh

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface ValeAlert {
  Action: { Name: string; Params: string[] };
  Check: string;
  Description: string;
  Line: number;
  Link: string;
  Message: string;
  Severity: 'suggestion' | 'warning' | 'error';
  Span: [number, number];
  Match: string;
}

interface ValeOutput {
  [filepath: string]: ValeAlert[];
}

export class ValeIntegration implements ToolIntegration {
  name = 'Vale';
  category = 'code-quality' as const;
  description = 'Syntax-aware linter for prose with support for custom style guides';
  website = 'https://vale.sh';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('vale --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        configFile: '.vale.ini',
        minAlertLevel: 'suggestion',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const minLevel = (config?.options?.minAlertLevel as string) || 'suggestion';

      const result = execSync(
        `vale --output=JSON --minAlertLevel=${minLevel} "${targetDir}"`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
      );

      const output: ValeOutput = JSON.parse(result);

      for (const [filepath, alerts] of Object.entries(output)) {
        for (const alert of alerts) {
          findings.push(this.convertToFinding(filepath, alert));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: ValeOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const [filepath, alerts] of Object.entries(output)) {
            for (const alert of alerts) {
              findings.push(this.convertToFinding(filepath, alert));
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

  private convertToFinding(filepath: string, alert: ValeAlert): AuditFinding {
    const severityMap: Record<string, Severity> = {
      error: 'medium',
      warning: 'low',
      suggestion: 'info',
    };

    const severity = severityMap[alert.Severity] || 'info';

    return {
      id: `vale-${filepath}-${alert.Line}-${alert.Check}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Prose: ${alert.Check}`,
      description: alert.Message,
      explanation: `Vale detected a prose style issue: ${alert.Description || alert.Message}. Good documentation improves user experience and reduces support burden.`,
      impact: 'Documentation quality affects user comprehension, product adoption, and developer productivity.',
      file: filepath,
      line: alert.Line,
      column: alert.Span[0],
      endColumn: alert.Span[1],
      codeSnippet: alert.Match,
      recommendation: alert.Action?.Name
        ? `${alert.Action.Name}: ${alert.Action.Params.join(', ')}`
        : 'Review and improve the text according to your style guide.',
      documentationUrl: alert.Link || 'https://vale.sh/docs/',
      aiPrompt: {
        short: `Fix prose issue: ${alert.Check}`,
        detailed: `Fix the prose issue detected by Vale.

File: ${filepath}
Line: ${alert.Line}
Check: ${alert.Check}
Message: ${alert.Message}

Problematic text: "${alert.Match}"

${alert.Action?.Name ? `Suggested action: ${alert.Action.Name} - ${alert.Action.Params.join(', ')}` : ''}

Please improve the text while maintaining its meaning.`,
        steps: [
          `Open ${filepath} at line ${alert.Line}`,
          `Find the text: "${alert.Match}"`,
          'Apply the suggested improvement',
          'Run Vale again to verify',
        ],
      },
      ruleId: alert.Check,
      tags: ['vale', 'prose', 'documentation', 'writing', alert.Check],
      effort: 'trivial',
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
