// Hadolint Integration - Dockerfile Linter
// License: GPL-3.0
// Website: https://github.com/hadolint/hadolint

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface HadolintResult {
  line: number;
  code: string;
  message: string;
  column: number;
  file: string;
  level: 'error' | 'warning' | 'info' | 'style';
}

export class HadolintIntegration implements ToolIntegration {
  name = 'Hadolint';
  category = 'code-quality' as const;
  description = 'Dockerfile linter with best practice rules';
  website = 'https://github.com/hadolint/hadolint';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('hadolint --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: true, options: {} };
  }

  async run(target: AuditTarget, _config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const glob = await import('glob');
      const targetDir = target.directory || '.';

      const dockerfiles = await glob.glob('**/Dockerfile*', { cwd: targetDir, ignore: ['**/node_modules/**'], absolute: true });

      for (const dockerfile of dockerfiles) {
        try {
          const result = execSync(`hadolint -f json "${dockerfile}"`, { encoding: 'utf-8' });
          const results: HadolintResult[] = JSON.parse(result);
          for (const r of results) {
            findings.push(this.convertToFinding(r, dockerfile));
          }
        } catch (error) {
          if (error instanceof Error && 'stdout' in error) {
            try {
              const results: HadolintResult[] = JSON.parse((error as { stdout: string }).stdout);
              for (const r of results) {
                findings.push(this.convertToFinding(r, dockerfile));
              }
            } catch { /* Parse error */ }
          }
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      return { tool: this.name, category: this.category, success: false, duration: Date.now() - startTime, findings: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 }, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private convertToFinding(result: HadolintResult, file: string): AuditFinding {
    const severityMap: Record<string, Severity> = { error: 'high', warning: 'medium', info: 'low', style: 'info' };
    const severity = severityMap[result.level] || 'low';

    return {
      id: `hadolint-${file}-${result.line}-${result.code}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Hadolint: ${result.code}`,
      description: result.message,
      explanation: `Dockerfile best practice: ${result.message}`,
      impact: 'Following Dockerfile best practices improves build reliability, security, and image size.',
      file: file,
      line: result.line,
      column: result.column,
      recommendation: `Fix according to ${result.code} rule`,
      documentationUrl: `https://github.com/hadolint/hadolint/wiki/${result.code}`,
      aiPrompt: { short: `Fix Hadolint ${result.code}`, detailed: `Fix Dockerfile issue:\n\nFile: ${file}\nLine: ${result.line}\nRule: ${result.code}\nMessage: ${result.message}`, steps: [`Open ${file} at line ${result.line}`, 'Apply the recommended fix', 'Run hadolint again'] },
      ruleId: result.code,
      tags: ['hadolint', 'dockerfile', 'docker', result.code],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);
    return { tool: this.name, category: this.category, success: true, duration, findings, summary: { total: findings.length, bySeverity, passed: 0, failed: findings.length } };
  }
}
