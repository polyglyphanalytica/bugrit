// tfsec Integration - Terraform Security Scanner
// License: MIT
// Website: https://github.com/aquasecurity/tfsec

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface TfsecResult {
  rule_id: string;
  long_id: string;
  rule_description: string;
  rule_provider: string;
  rule_service: string;
  impact: string;
  resolution: string;
  links: string[];
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  warning: boolean;
  status: number;
  resource: string;
  location: {
    filename: string;
    start_line: number;
    end_line: number;
  };
}

interface TfsecOutput {
  results: TfsecResult[];
}

export class TfsecIntegration implements ToolIntegration {
  name = 'tfsec';
  category = 'iac-security' as const;
  description = 'Static analysis security scanner for Terraform code';
  website = 'https://github.com/aquasecurity/tfsec';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('tfsec --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        excludePassed: true,
        minSeverity: 'LOW',
        format: 'json',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const minSeverity = (config?.options?.minSeverity as string) || 'LOW';

      // Run tfsec
      const result = execSync(
        `tfsec "${targetDir}" --format json --minimum-severity ${minSeverity} --soft-fail`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 300000 }
      );

      if (result.trim()) {
        const output: TfsecOutput = JSON.parse(result);

        for (const issue of output.results || []) {
          findings.push(this.createFinding(issue));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      // tfsec exits with non-zero when it finds issues
      if (error instanceof Error && 'stdout' in error) {
        const stdout = (error as { stdout: string }).stdout;
        if (stdout) {
          try {
            const output: TfsecOutput = JSON.parse(stdout);
            for (const issue of output.results || []) {
              findings.push(this.createFinding(issue));
            }
            return this.createResult(findings, Date.now() - startTime);
          } catch { /* Parse error */ }
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

  private createFinding(issue: TfsecResult): AuditFinding {
    const severityMap: Record<string, Severity> = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };

    const severity = severityMap[issue.severity] || 'medium';

    return {
      id: `tfsec-${issue.rule_id}-${issue.location.filename}-${issue.location.start_line}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Terraform: ${issue.rule_description}`,
      description: issue.description,
      explanation: `tfsec detected a security issue in Terraform code. Provider: ${issue.rule_provider}, Service: ${issue.rule_service}. ${issue.impact}`,
      impact: issue.impact,
      file: issue.location.filename,
      line: issue.location.start_line,
      endLine: issue.location.end_line,
      recommendation: issue.resolution,
      documentationUrl: issue.links?.[0] || `https://aquasecurity.github.io/tfsec/latest/checks/${issue.rule_provider}/${issue.rule_service}/${issue.rule_id}/`,
      aiPrompt: {
        short: `Fix tfsec ${issue.rule_id}`,
        detailed: `Terraform security issue detected by tfsec:

File: ${issue.location.filename}
Lines: ${issue.location.start_line}-${issue.location.end_line}
Resource: ${issue.resource}
Rule: ${issue.rule_id} (${issue.long_id})

Description: ${issue.description}

Impact: ${issue.impact}

Resolution: ${issue.resolution}

${issue.links?.length ? `Reference: ${issue.links[0]}` : ''}`,
        steps: [
          `Open ${issue.location.filename} at line ${issue.location.start_line}`,
          `Review the ${issue.resource} resource`,
          'Apply the resolution',
          'Run terraform validate',
          'Re-scan with tfsec',
        ],
      },
      ruleId: issue.rule_id,
      tags: ['tfsec', 'terraform', 'iac', issue.rule_provider, issue.rule_service, issue.rule_id],
      effort: this.estimateEffort(issue),
    };
  }

  private estimateEffort(issue: TfsecResult): AuditFinding['effort'] {
    // Estimate based on issue type and severity
    if (issue.severity === 'CRITICAL') return 'moderate';
    if (issue.rule_id.includes('encryption') || issue.rule_id.includes('kms')) return 'moderate';
    if (issue.rule_id.includes('policy') || issue.rule_id.includes('iam')) return 'moderate';
    return 'easy';
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    const filesWithIssues = new Set(findings.map(f => f.file)).size;

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
      metadata: { filesWithIssues },
    };
  }
}
