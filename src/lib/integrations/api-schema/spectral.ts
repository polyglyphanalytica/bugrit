// Spectral Integration - OpenAPI/AsyncAPI Linter
// License: Apache 2.0
// Website: https://stoplight.io/open-source/spectral

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface SpectralResult {
  code: string;
  path: string[];
  message: string;
  severity: 0 | 1 | 2 | 3; // 0=error, 1=warn, 2=info, 3=hint
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  source: string;
}

export class SpectralIntegration implements ToolIntegration {
  name = 'Spectral';
  category = 'api-testing' as const;
  description = 'OpenAPI and AsyncAPI linter with custom rulesets';
  website = 'https://stoplight.io/open-source/spectral';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx @stoplight/spectral-cli --version', { stdio: 'ignore', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: true, options: { ruleset: 'spectral:oas' } };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const glob = safeRequire<typeof import('glob')>('glob');
      const targetDir = target.directory || '.';

      const apiFiles = await glob.glob('**/{openapi,swagger,asyncapi}*.{json,yaml,yml}', { cwd: targetDir, ignore: ['**/node_modules/**'], absolute: true });

      for (const file of apiFiles) {
        try {
          const ruleset = (config?.options?.ruleset as string) || 'spectral:oas';
          const result = execSync(`npx @stoplight/spectral-cli lint "${file}" --ruleset ${ruleset} -f json`, { encoding: 'utf-8', timeout: 60000 });
          const results: SpectralResult[] = JSON.parse(result);
          for (const r of results) {
            findings.push(this.convertToFinding(r, file));
          }
        } catch (error) {
          if (error instanceof Error && 'stdout' in error) {
            try {
              const results: SpectralResult[] = JSON.parse((error as { stdout: string }).stdout);
              for (const r of results) findings.push(this.convertToFinding(r, file));
            } catch { /* Parse error */ }
          }
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      return { tool: this.name, category: this.category, success: false, duration: Date.now() - startTime, findings: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 }, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private convertToFinding(result: SpectralResult, file: string): AuditFinding {
    const severityMap: Record<number, Severity> = { 0: 'high', 1: 'medium', 2: 'low', 3: 'info' };
    const severity = severityMap[result.severity] || 'low';

    return {
      id: `spectral-${file}-${result.range.start.line}-${result.code}`,
      tool: this.name, category: this.category, severity,
      title: `API: ${result.code}`,
      description: result.message,
      explanation: `OpenAPI/AsyncAPI specification issue at path: ${result.path.join('.')}`,
      impact: 'API specification issues can lead to incorrect client code generation and documentation.',
      file,
      line: result.range.start.line + 1,
      column: result.range.start.character,
      recommendation: `Fix the API specification according to ${result.code} rule.`,
      documentationUrl: `https://meta.stoplight.io/docs/spectral/docs/reference/${result.code}.md`,
      aiPrompt: { short: `Fix Spectral ${result.code}`, detailed: `API spec issue:\n\nFile: ${file}\nPath: ${result.path.join('.')}\nRule: ${result.code}\nMessage: ${result.message}`, steps: ['Open the API spec file', 'Navigate to the path', 'Apply the fix'] },
      ruleId: result.code,
      tags: ['spectral', 'openapi', 'api', result.code],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);
    return { tool: this.name, category: this.category, success: true, duration, findings, summary: { total: findings.length, bySeverity, passed: 0, failed: findings.length } };
  }
}
