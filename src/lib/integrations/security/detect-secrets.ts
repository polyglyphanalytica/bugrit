// detect-secrets Integration
// License: Apache 2.0
// Website: https://github.com/Yelp/detect-secrets

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding } from '../types';

interface DetectSecretsResult {
  [filePath: string]: Array<{
    type: string;
    line_number: number;
    hashed_secret: string;
    is_verified: boolean;
  }>;
}

interface DetectSecretsOutput {
  version: string;
  plugins_used: Array<{ name: string }>;
  results: DetectSecretsResult;
}

export class DetectSecretsIntegration implements ToolIntegration {
  name = 'detect-secrets';
  category = 'security' as const;
  description = 'An enterprise-friendly way of detecting secrets in code, preventing them from entering the codebase';
  website = 'https://github.com/Yelp/detect-secrets';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('detect-secrets --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        excludeFiles: ['.git', 'node_modules', '__pycache__', '.env.example'],
        allFiles: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const excludes = (config?.options?.excludeFiles as string[]) || ['.git', 'node_modules'];
      const excludeArgs = excludes.map(e => `--exclude-files "${e}"`).join(' ');

      const result = execSync(
        `detect-secrets scan "${targetDir}" ${excludeArgs} --all-files`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const output: DetectSecretsOutput = JSON.parse(result);

      for (const [filePath, secrets] of Object.entries(output.results)) {
        for (const secret of secrets) {
          findings.push(this.convertToFinding(filePath, secret));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: DetectSecretsOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const [filePath, secrets] of Object.entries(output.results)) {
            for (const secret of secrets) {
              findings.push(this.convertToFinding(filePath, secret));
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

  private convertToFinding(
    filePath: string,
    secret: { type: string; line_number: number; is_verified: boolean }
  ): AuditFinding {
    const secretTypeDescriptions: Record<string, string> = {
      'AWS Access Key': 'Amazon Web Services access key that provides programmatic access to AWS services',
      'AWS Secret Key': 'Amazon Web Services secret key that authenticates API requests',
      'Private Key': 'Private cryptographic key that should never be committed to version control',
      'Basic Auth Credentials': 'Basic authentication credentials encoded in the code',
      'Slack Token': 'Slack API token that provides access to Slack workspaces',
      'Stripe API Key': 'Stripe payment processing API key',
      'Twilio API Key': 'Twilio communications API key',
      'JSON Web Token': 'JWT token that may contain sensitive claims',
      'Generic Secret': 'A pattern that appears to be a secret or credential',
      'High Entropy String': 'A high-entropy string that could be a secret or API key',
    };

    const description = secretTypeDescriptions[secret.type] || `Potential ${secret.type} detected in code`;

    return {
      id: `detect-secrets-${filePath}-${secret.line_number}-${secret.type}`,
      tool: this.name,
      category: this.category,
      severity: 'critical',
      title: `Hardcoded Secret: ${secret.type}`,
      description: `${description} found at line ${secret.line_number}`,
      explanation: 'Hardcoded secrets in source code are a critical security vulnerability. If the code is exposed (through a public repo, leak, or compromise), the secrets can be extracted and used by attackers.',
      impact: 'Attackers could use exposed credentials to access your systems, services, or data. This could lead to data breaches, financial loss, or complete system compromise.',
      file: filePath,
      line: secret.line_number,
      recommendation: this.getRecommendation(secret.type),
      documentationUrl: 'https://github.com/Yelp/detect-secrets#about',
      aiPrompt: {
        short: `Remove hardcoded ${secret.type} from ${filePath} at line ${secret.line_number}`,
        detailed: `
CRITICAL: Remove hardcoded secret from the codebase.

File: ${filePath}
Line: ${secret.line_number}
Secret Type: ${secret.type}

This file contains a hardcoded secret that must be removed immediately.

Steps to fix:
1. Remove the hardcoded secret from the code
2. Move the secret to environment variables or a secrets manager
3. Update the code to read from the environment
4. If this secret was ever committed to git, consider it compromised:
   - Rotate the secret immediately
   - Check for unauthorized access using these credentials
   - Consider using git-filter-repo to remove from history

Example fix:
Before:
const apiKey = 'sk_live_abc123...';

After:
const apiKey = process.env.API_KEY;

DO NOT just delete the line - ensure the functionality still works with environment variables.
        `.trim(),
        steps: [
          'IMMEDIATELY: Rotate the exposed secret',
          'Remove the hardcoded value from the code',
          'Add the secret to environment variables or secrets manager',
          'Update code to read from environment',
          'Add the secret name to .env.example (without the value)',
          'Consider cleaning git history if the secret was committed',
        ],
      },
      ruleId: secret.type,
      tags: ['detect-secrets', 'secret', 'credential', 'critical', secret.type.toLowerCase().replace(/\s+/g, '-')],
      effort: 'easy',
    };
  }

  private getRecommendation(secretType: string): string {
    const recommendations: Record<string, string> = {
      'AWS Access Key': 'Use AWS IAM roles, instance profiles, or the AWS Secrets Manager instead of hardcoding credentials.',
      'Private Key': 'Store private keys in a secure secrets manager. Never commit them to version control.',
      'Slack Token': 'Store Slack tokens in environment variables. Use Slack app tokens with minimal scopes.',
      'Stripe API Key': 'Use Stripe environment variables (STRIPE_SECRET_KEY) and restrict API key permissions.',
      'Generic Secret': 'Move this secret to environment variables or a secrets management system.',
    };

    return recommendations[secretType] || 'Move this secret to environment variables or a dedicated secrets manager like HashiCorp Vault, AWS Secrets Manager, or similar.';
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: findings.length, high: 0, medium: 0, low: 0, info: 0 };

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
