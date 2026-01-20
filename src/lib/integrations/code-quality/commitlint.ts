// Commitlint Integration
// License: MIT
// Website: https://commitlint.js.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface CommitlintResult {
  valid: boolean;
  input: string;
  errors: Array<{
    level: 0 | 1 | 2;
    valid: boolean;
    name: string;
    message: string;
  }>;
  warnings: Array<{
    level: 0 | 1 | 2;
    valid: boolean;
    name: string;
    message: string;
  }>;
}

export class CommitlintIntegration implements ToolIntegration {
  name = 'commitlint';
  category = 'code-quality' as const;
  description = 'Lint commit messages to ensure they follow conventional commit format';
  website = 'https://commitlint.js.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx commitlint --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        from: 'HEAD~10',
        to: 'HEAD',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const from = (config?.options?.from as string) || 'HEAD~10';
      const to = (config?.options?.to as string) || 'HEAD';

      // Get commit messages in range
      const commits = execSync(
        `git log ${from}..${to} --pretty=format:"%H|||%s"`,
        { encoding: 'utf-8' }
      ).trim().split('\n').filter(Boolean);

      for (const commitLine of commits) {
        const [hash, message] = commitLine.split('|||');
        if (!message) continue;

        try {
          const result = execSync(
            `echo "${message.replace(/"/g, '\\"')}" | npx commitlint --config commitlint.config.js 2>&1`,
            { encoding: 'utf-8' }
          );
          // If no error, commit is valid
        } catch (error) {
          if (error instanceof Error && 'stdout' in error) {
            const output = (error as { stdout: string }).stdout;
            findings.push(this.createFinding(hash, message, output));
          }
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

  private createFinding(commitHash: string, message: string, output: string): AuditFinding {
    return {
      id: `commitlint-${commitHash}`,
      tool: this.name,
      category: this.category,
      severity: 'low',
      title: 'Commit message does not follow conventions',
      description: `Commit "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}" does not follow conventional commit format`,
      explanation: 'Conventional commits make it easier to generate changelogs, understand project history, and automate versioning.',
      impact: 'Non-standard commit messages make it harder to understand project history and automate release processes.',
      recommendation: 'Use the conventional commit format: type(scope): description. Types include feat, fix, docs, style, refactor, test, chore.',
      documentationUrl: 'https://www.conventionalcommits.org/',
      aiPrompt: {
        short: `Reword commit message to follow conventional commits: "${message}"`,
        detailed: `
The following commit message does not follow the conventional commit format:

Commit: ${commitHash}
Message: "${message}"

Commitlint output:
${output}

Please suggest a properly formatted commit message following the conventional commits specification:
- Format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert
- Scope: optional, describes the affected area
- Description: short, imperative mood description

Example: feat(auth): add password reset functionality
        `.trim(),
        steps: [
          'Understand what the commit actually changed',
          'Choose the appropriate type (feat, fix, docs, etc.)',
          'Optionally add a scope in parentheses',
          'Write a short imperative description',
          'Use git commit --amend to fix (if not pushed) or note for future commits',
        ],
      },
      tags: ['commitlint', 'git', 'conventional-commits', 'code-quality'],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: findings.length, info: 0 };

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
