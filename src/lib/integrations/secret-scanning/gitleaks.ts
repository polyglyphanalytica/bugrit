// Gitleaks Integration - Git Secret Scanner
// License: MIT
// Website: https://gitleaks.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface GitleaksResult {
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Match: string;
  Secret: string;
  File: string;
  Commit: string;
  Entropy: number;
  Author: string;
  Email: string;
  Date: string;
  Message: string;
  Tags: string[];
  RuleID: string;
  Fingerprint: string;
}

export class GitleaksIntegration implements ToolIntegration {
  name = 'Gitleaks';
  category = 'security' as const;
  description = 'Scans git repositories for secrets and sensitive information';
  website = 'https://gitleaks.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('gitleaks version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        scanHistory: false,
        verbose: false,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const scanHistory = config?.options?.scanHistory ? '' : '--no-git';

      const result = execSync(
        `gitleaks detect --source "${targetDir}" ${scanHistory} --report-format json --report-path /dev/stdout --exit-code 0`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
      );

      if (result.trim()) {
        const results: GitleaksResult[] = JSON.parse(result);
        for (const finding of results) {
          findings.push(this.convertToFinding(finding));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
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

  private convertToFinding(result: GitleaksResult): AuditFinding {
    const severity: Severity = result.Entropy > 4 ? 'critical' : 'high';
    const maskedSecret = result.Secret.substring(0, 4) + '****' + result.Secret.substring(result.Secret.length - 4);

    return {
      id: `gitleaks-${result.Fingerprint}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Secret Detected: ${result.Description}`,
      description: `Found potential secret matching rule "${result.RuleID}" in ${result.File}`,
      explanation: `Gitleaks detected what appears to be a ${result.Description}. Secrets in source code can be extracted by attackers and used to compromise systems, access sensitive data, or impersonate users.`,
      impact: 'Exposed secrets can lead to unauthorized access, data breaches, and security incidents. If this secret is valid and in use, it should be rotated immediately.',
      file: result.File,
      line: result.StartLine,
      endLine: result.EndLine,
      column: result.StartColumn,
      endColumn: result.EndColumn,
      codeSnippet: `${maskedSecret} (masked for security)`,
      recommendation: `1. Remove the secret from source code
2. Rotate the secret/credential immediately
3. Use environment variables or a secrets manager
4. Add the file pattern to .gitignore if appropriate
5. Consider using git-filter-repo to remove from history`,
      aiPrompt: {
        short: `Remove exposed secret from ${result.File}`,
        detailed: `A secret was detected in the source code that needs to be removed.

File: ${result.File}
Line: ${result.StartLine}
Type: ${result.Description}
Rule: ${result.RuleID}

Steps to remediate:
1. Remove or replace the hardcoded secret with an environment variable
2. Rotate the compromised credential
3. Use a secrets manager (Vault, AWS Secrets Manager, etc.)

Do NOT include the actual secret value in any response.`,
        steps: [
          'Remove the hardcoded secret from the source file',
          'Add the secret to environment variables or secrets manager',
          'Update the code to read from secure storage',
          'Rotate the compromised credential immediately',
          'Consider removing from git history if committed',
        ],
      },
      ruleId: result.RuleID,
      tags: ['gitleaks', 'secrets', 'credentials', 'security', result.RuleID],
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
