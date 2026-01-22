// Dockle Integration - Container Image Linter
// License: Apache 2.0
// Website: https://github.com/goodwithtech/dockle

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface DockleDetail {
  code: string;
  title: string;
  level: 'FATAL' | 'WARN' | 'INFO' | 'SKIP' | 'PASS';
  alerts: string[];
}

interface DockleOutput {
  summary: { fatal: number; warn: number; info: number; skip: number; pass: number };
  details: DockleDetail[];
}

export class DockleIntegration implements ToolIntegration {
  name = 'Dockle';
  category = 'security' as const;
  description = 'Container image linter for security best practices';
  website = 'https://github.com/goodwithtech/dockle';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('dockle --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: true, options: { exitCode: 0 } };
  }

  async run(target: AuditTarget, _config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const image = target.image || target.directory;

      if (!image) {
        return { tool: this.name, category: this.category, success: false, duration: 0, findings: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 }, error: 'Image target required' };
      }

      const result = execSync(`dockle -f json --exit-code 0 ${image}`, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
      const output: DockleOutput = JSON.parse(result);

      for (const detail of output.details) {
        if (detail.level !== 'PASS' && detail.level !== 'SKIP') {
          findings.push(this.convertToFinding(detail, image));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      return { tool: this.name, category: this.category, success: false, duration: Date.now() - startTime, findings: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 }, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private convertToFinding(detail: DockleDetail, image: string): AuditFinding {
    const severityMap: Record<string, Severity> = { FATAL: 'high', WARN: 'medium', INFO: 'low' };
    const severity = severityMap[detail.level] || 'low';

    return {
      id: `dockle-${detail.code}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Dockle: ${detail.title}`,
      description: detail.alerts.join('. ') || detail.title,
      explanation: `Container best practice violation: ${detail.title}`,
      impact: 'Following container best practices improves security and reduces attack surface.',
      file: image,
      recommendation: `Fix ${detail.code}: ${detail.title}`,
      documentationUrl: `https://github.com/goodwithtech/dockle#${detail.code.toLowerCase()}`,
      aiPrompt: { short: `Fix Dockle ${detail.code}`, detailed: `Fix container issue:\n\nCode: ${detail.code}\nTitle: ${detail.title}\nAlerts: ${detail.alerts.join(', ')}`, steps: ['Review Dockerfile', 'Apply best practice fix', 'Rebuild and rescan'] },
      ruleId: detail.code,
      tags: ['dockle', 'container', 'docker', 'best-practices', detail.code],
      effort: 'easy',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);
    return { tool: this.name, category: this.category, success: true, duration, findings, summary: { total: findings.length, bySeverity, passed: 0, failed: findings.length } };
  }
}
