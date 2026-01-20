// Biome Integration (formerly Rome)
// License: MIT
// Website: https://biomejs.dev

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface BiomeDiagnostic {
  category: string;
  severity: 'error' | 'warning' | 'information' | 'hint';
  description: string;
  message: Array<{ content: string }>;
  location: {
    path: { file: string };
    span?: [number, number];
    sourceCode?: string;
  };
  tags: string[];
  advices: { advices: Array<{ log: Array<{ content: string }> }> };
}

export class BiomeIntegration implements ToolIntegration {
  name = 'Biome';
  category = 'code-quality' as const;
  description = 'Fast formatter and linter for JavaScript, TypeScript, JSX, and JSON';
  website = 'https://biomejs.dev';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx @biomejs/biome --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        linter: true,
        formatter: true,
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
        `npx @biomejs/biome check "${targetDir}" --reporter=json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const diagnostics: BiomeDiagnostic[] = JSON.parse(result).diagnostics || [];

      for (const diagnostic of diagnostics) {
        findings.push(this.convertToFinding(diagnostic));
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const diagnostics: BiomeDiagnostic[] = JSON.parse((error as { stdout: string }).stdout).diagnostics || [];
          for (const diagnostic of diagnostics) {
            findings.push(this.convertToFinding(diagnostic));
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

  private convertToFinding(diagnostic: BiomeDiagnostic): AuditFinding {
    const severityMap: Record<string, Severity> = {
      error: 'high',
      warning: 'medium',
      information: 'low',
      hint: 'info',
    };

    const severity = severityMap[diagnostic.severity] || 'low';
    const filePath = diagnostic.location?.path?.file || 'unknown';
    const message = diagnostic.message.map(m => m.content).join('');

    return {
      id: `biome-${filePath}-${diagnostic.category}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Biome: ${diagnostic.category}`,
      description: message || diagnostic.description,
      explanation: 'Biome is a fast linter that catches common JavaScript/TypeScript issues and enforces consistent formatting.',
      impact: 'Code quality issues can lead to bugs, inconsistent formatting, and reduced maintainability.',
      file: filePath,
      codeSnippet: diagnostic.location?.sourceCode,
      recommendation: diagnostic.advices?.advices?.[0]?.log?.map(l => l.content).join('') || 'Fix the reported issue following Biome documentation.',
      documentationUrl: 'https://biomejs.dev/linter/rules/',
      aiPrompt: {
        short: `Fix Biome ${diagnostic.category} issue in ${filePath}: ${message}`,
        detailed: `
Fix the Biome linter/formatter issue in my code.

File: ${filePath}
Category: ${diagnostic.category}
Message: ${message}

Please fix this issue while maintaining the code's functionality.
        `.trim(),
        steps: [
          `Open ${filePath}`,
          `Find the code causing the ${diagnostic.category} issue`,
          'Apply the suggested fix or manually correct the code',
          'Run biome check again to verify',
        ],
      },
      ruleId: diagnostic.category,
      tags: ['biome', 'code-quality', ...diagnostic.tags],
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
