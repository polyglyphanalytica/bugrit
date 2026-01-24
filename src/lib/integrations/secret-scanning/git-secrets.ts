// git-secrets Integration - Secret Prevention for Git
// License: Apache 2.0
// Website: https://github.com/awslabs/git-secrets

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface SecretMatch {
  file: string;
  line: number;
  content: string;
  pattern: string;
  type: 'aws' | 'generic' | 'custom';
}

export class GitSecretsIntegration implements ToolIntegration {
  name = 'git-secrets';
  category = 'secret-scanning' as const;
  description = 'Prevents committing secrets and credentials into git repositories';
  website = 'https://github.com/awslabs/git-secrets';

  // Common secret patterns
  private readonly secretPatterns: Array<{ pattern: RegExp; type: string; severity: Severity }> = [
    // AWS
    { pattern: /AKIA[0-9A-Z]{16}/g, type: 'AWS Access Key ID', severity: 'critical' },
    { pattern: /[A-Za-z0-9/+=]{40}(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/g, type: 'AWS Secret Access Key', severity: 'critical' },
    // Generic API Keys
    { pattern: /api[_-]?key[_-]?[=:]["']?[A-Za-z0-9_\-]{20,}["']?/gi, type: 'API Key', severity: 'high' },
    { pattern: /secret[_-]?key[_-]?[=:]["']?[A-Za-z0-9_\-]{20,}["']?/gi, type: 'Secret Key', severity: 'high' },
    // Tokens
    { pattern: /bearer\s+[A-Za-z0-9_\-\.]+/gi, type: 'Bearer Token', severity: 'high' },
    { pattern: /token[_-]?[=:]["']?[A-Za-z0-9_\-\.]{20,}["']?/gi, type: 'Token', severity: 'high' },
    // Passwords in config
    { pattern: /password[_-]?[=:]["']?[^\s"']{8,}["']?/gi, type: 'Password', severity: 'critical' },
    // Private keys
    { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g, type: 'Private Key', severity: 'critical' },
    { pattern: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/g, type: 'SSH Private Key', severity: 'critical' },
    // Database connection strings
    { pattern: /mongodb(\+srv)?:\/\/[^\s]+/gi, type: 'MongoDB Connection String', severity: 'high' },
    { pattern: /postgres(ql)?:\/\/[^\s]+/gi, type: 'PostgreSQL Connection String', severity: 'high' },
    { pattern: /mysql:\/\/[^\s]+/gi, type: 'MySQL Connection String', severity: 'high' },
    // GitHub/GitLab tokens
    { pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g, type: 'GitHub Token', severity: 'critical' },
    { pattern: /glpat-[A-Za-z0-9_\-]{20,}/g, type: 'GitLab Token', severity: 'critical' },
    // Slack tokens
    { pattern: /xox[baprs]-[A-Za-z0-9-]+/g, type: 'Slack Token', severity: 'high' },
    // Stripe
    { pattern: /sk_live_[A-Za-z0-9]{24,}/g, type: 'Stripe Secret Key', severity: 'critical' },
    { pattern: /rk_live_[A-Za-z0-9]{24,}/g, type: 'Stripe Restricted Key', severity: 'critical' },
  ];

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('git secrets --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        scanHistory: false,     // Scan git history (slower)
        addAwsPatterns: true,   // Add AWS-specific patterns
        customPatterns: [],     // Additional patterns to check
        allowedPatterns: [],    // Patterns to ignore (false positives)
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const glob = safeRequire<typeof import('glob')>('glob');
      const fs = await import('fs');
      const targetDir = target.directory || '.';

      const scanHistory = config?.options?.scanHistory === true;
      const addAwsPatterns = config?.options?.addAwsPatterns !== false;
      const allowedPatterns = (config?.options?.allowedPatterns as string[]) || [];

      // First try using git-secrets if available and in a git repo
      const isGitRepo = this.isGitRepository(targetDir);
      let gitSecretsFindings: SecretMatch[] = [];

      if (isGitRepo) {
        try {
          // Register AWS patterns if enabled
          if (addAwsPatterns) {
            try {
              execSync('git secrets --register-aws', { cwd: targetDir, stdio: 'ignore' });
            } catch { /* May already be registered */ }
          }

          // Scan with git-secrets
          const command = scanHistory ? 'git secrets --scan-history' : 'git secrets --scan';
          execSync(command, { cwd: targetDir, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
        } catch (error) {
          // git-secrets exits with code 1 when it finds secrets
          if (error instanceof Error && 'stdout' in error) {
            const output = (error as { stdout: string }).stdout || (error as { stderr: string }).stderr || '';
            gitSecretsFindings = this.parseGitSecretsOutput(output);
          }
        }
      }

      // Also do our own scan for comprehensive coverage
      const codeFiles = await glob.glob('**/*.{js,ts,jsx,tsx,py,rb,go,java,php,env,json,yaml,yml,xml,conf,config,properties}', {
        cwd: targetDir,
        ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/build/**', '**/.git/**'],
        absolute: true,
      });

      let filesScanned = 0;
      for (const file of codeFiles) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          filesScanned++;

          // Skip binary files
          if (content.includes('\0')) continue;

          const lines = content.split('\n');

          for (const { pattern, type, severity } of this.secretPatterns) {
            // Reset pattern (for global patterns)
            pattern.lastIndex = 0;

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const matches = line.match(pattern);

              if (matches) {
                for (const match of matches) {
                  // Check if allowed
                  if (this.isAllowed(match, allowedPatterns)) continue;

                  // Check if likely a false positive
                  if (this.isLikelyFalsePositive(line, match)) continue;

                  findings.push(this.createFinding({
                    file: file.replace(targetDir + '/', ''),
                    line: i + 1,
                    content: this.redactSecret(match),
                    pattern: type,
                    type: type.includes('AWS') ? 'aws' : 'generic',
                  }, severity));
                }
              }
            }
          }
        } catch { /* Skip files that can't be read */ }
      }

      // Add git-secrets findings that weren't caught by our patterns
      for (const match of gitSecretsFindings) {
        const alreadyFound = findings.some(f =>
          f.file === match.file && f.line === match.line
        );
        if (!alreadyFound) {
          findings.push(this.createFinding(match, 'high'));
        }
      }

      return this.createResult(findings, Date.now() - startTime, filesScanned);
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

  private isGitRepository(dir: string): boolean {
    try {
      const { execSync } = require('child_process');
      execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private parseGitSecretsOutput(output: string): SecretMatch[] {
    const matches: SecretMatch[] = [];
    const lines = output.split('\n');

    // git-secrets output format: file:line:content
    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):(.+)$/);
      if (match) {
        matches.push({
          file: match[1],
          line: parseInt(match[2], 10),
          content: this.redactSecret(match[3]),
          pattern: 'git-secrets',
          type: 'generic',
        });
      }
    }

    return matches;
  }

  private isAllowed(match: string, allowedPatterns: string[]): boolean {
    return allowedPatterns.some(pattern => {
      try {
        return new RegExp(pattern).test(match);
      } catch {
        return match.includes(pattern);
      }
    });
  }

  private isLikelyFalsePositive(line: string, match: string): boolean {
    const lowerLine = line.toLowerCase();

    // Skip example/placeholder values
    const placeholders = ['example', 'placeholder', 'your_', 'xxx', 'test', 'dummy', 'sample', 'changeme', '***', 'redacted'];
    if (placeholders.some(p => match.toLowerCase().includes(p))) return true;

    // Skip comments that are explaining secrets
    if (lowerLine.trim().startsWith('//') && (lowerLine.includes('example') || lowerLine.includes('placeholder'))) return true;
    if (lowerLine.trim().startsWith('#') && (lowerLine.includes('example') || lowerLine.includes('placeholder'))) return true;

    // Skip env variable references (not actual values)
    if (/process\.env\.[A-Z_]+/i.test(line) && !line.includes('=')) return true;
    if (/\$\{[A-Z_]+\}/.test(match)) return true;
    if (/\$[A-Z_]+/.test(match) && match.length < 30) return true;

    return false;
  }

  private redactSecret(secret: string): string {
    // Show first 4 and last 4 characters, redact the rest
    if (secret.length <= 12) {
      return secret.substring(0, 2) + '*'.repeat(secret.length - 4) + secret.substring(secret.length - 2);
    }
    return secret.substring(0, 4) + '*'.repeat(Math.min(20, secret.length - 8)) + secret.substring(secret.length - 4);
  }

  private createFinding(match: SecretMatch, severity: Severity): AuditFinding {
    return {
      id: `git-secrets-${match.file}-${match.line}-${match.pattern.replace(/\s+/g, '-')}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Secret Detected: ${match.pattern}`,
      description: `Potential ${match.pattern} found in ${match.file} at line ${match.line}: ${match.content}`,
      explanation: 'Secrets committed to version control can be exposed to anyone with repository access, including in git history even after removal.',
      impact: severity === 'critical'
        ? 'Critical credential exposure. Immediate rotation required.'
        : 'Potential credential exposure. Review and rotate if real.',
      file: match.file,
      line: match.line,
      recommendation: `1. Rotate the secret immediately if it's real
2. Remove from git history using git filter-branch or BFG
3. Add to .gitignore or use environment variables
4. Consider using a secrets manager`,
      documentationUrl: 'https://github.com/awslabs/git-secrets',
      aiPrompt: {
        short: `Remove secret from ${match.file}`,
        detailed: `Secret detected in repository:

File: ${match.file}
Line: ${match.line}
Type: ${match.pattern}
Value (redacted): ${match.content}

Steps to remediate:
1. Rotate the credential immediately
2. Remove from file and use environment variable
3. Clean git history if committed
4. Update .gitignore to prevent re-commit`,
        steps: [
          'Rotate/revoke the exposed credential',
          'Replace with environment variable reference',
          'Remove from git history (use BFG Repo-Cleaner)',
          'Update .gitignore',
          'Verify no copies remain',
        ],
      },
      ruleId: `secret-${match.type}`,
      tags: ['git-secrets', 'secrets', match.type, match.pattern.toLowerCase().replace(/\s+/g, '-')],
      effort: 'moderate',
    };
  }

  private createResult(findings: AuditFinding[], duration: number, filesScanned: number): AuditResult {
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
        passed: filesScanned - new Set(findings.map(f => f.file)).size,
        failed: new Set(findings.map(f => f.file)).size,
      },
      metadata: { filesScanned },
    };
  }
}
