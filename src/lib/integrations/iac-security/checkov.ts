// Checkov Integration - Infrastructure as Code Security Scanner
// License: Apache 2.0
// Website: https://www.checkov.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface CheckovResult {
  check_id: string;
  check_name: string;
  check_result: { result: 'passed' | 'failed' | 'skipped' };
  file_path: string;
  file_line_range: [number, number];
  resource: string;
  guideline: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface CheckovOutput {
  passed: number;
  failed: number;
  skipped: number;
  results: {
    failed_checks: CheckovResult[];
    passed_checks: CheckovResult[];
  };
}

export class CheckovIntegration implements ToolIntegration {
  name = 'Checkov';
  category = 'security' as const;
  description = 'Infrastructure as Code security scanner for Terraform, CloudFormation, Kubernetes, and more';
  website = 'https://www.checkov.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('checkov --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        framework: 'all', // terraform, cloudformation, kubernetes, etc.
        softFail: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const framework = (config?.options?.framework as string) || 'all';

      const result = execSync(
        `checkov -d "${targetDir}" --framework ${framework} --output json --soft-fail`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
      );

      const outputs: CheckovOutput[] = JSON.parse(result);

      for (const output of outputs) {
        if (output.results?.failed_checks) {
          for (const check of output.results.failed_checks) {
            findings.push(this.convertToFinding(check));
          }
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const outputs: CheckovOutput[] = JSON.parse((error as { stdout: string }).stdout);
          for (const output of outputs) {
            if (output.results?.failed_checks) {
              for (const check of output.results.failed_checks) {
                findings.push(this.convertToFinding(check));
              }
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

  private convertToFinding(check: CheckovResult): AuditFinding {
    const severityMap: Record<string, Severity> = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };

    const severity = severityMap[check.severity || 'MEDIUM'] || 'medium';

    return {
      id: `checkov-${check.check_id}-${check.file_path}-${check.file_line_range[0]}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `IaC Security: ${check.check_name}`,
      description: `${check.check_id}: ${check.check_name}`,
      explanation: `This Infrastructure as Code security check failed for resource "${check.resource}". ${check.guideline || 'This could expose your infrastructure to security risks.'}`,
      impact: 'Misconfigured infrastructure can lead to security breaches, data exposure, or compliance violations.',
      file: check.file_path,
      line: check.file_line_range[0],
      endLine: check.file_line_range[1],
      recommendation: check.guideline || `Review and fix the IaC configuration according to ${check.check_id} guidelines.`,
      documentationUrl: `https://www.checkov.io/5.Policy%20Index/${check.check_id}.html`,
      aiPrompt: {
        short: `Fix Checkov ${check.check_id} in ${check.file_path}`,
        detailed: `Fix the Infrastructure as Code security issue found by Checkov.

File: ${check.file_path}
Lines: ${check.file_line_range[0]}-${check.file_line_range[1]}
Resource: ${check.resource}
Check: ${check.check_id} - ${check.check_name}

Guideline: ${check.guideline || 'Follow IaC security best practices'}

Please fix this security misconfiguration while maintaining the infrastructure's functionality.`,
        steps: [
          `Open ${check.file_path} at line ${check.file_line_range[0]}`,
          `Review the ${check.check_id} security requirement`,
          'Update the resource configuration to comply',
          'Run Checkov again to verify the fix',
        ],
      },
      ruleId: check.check_id,
      tags: ['checkov', 'iac', 'security', 'infrastructure', check.check_id],
      effort: 'moderate',
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
