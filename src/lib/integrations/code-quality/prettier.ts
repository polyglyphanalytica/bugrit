// Prettier Integration
// License: MIT
// Website: https://prettier.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding } from '../types';

export class PrettierIntegration implements ToolIntegration {
  name = 'Prettier';
  category = 'code-quality' as const;
  description = 'An opinionated code formatter that enforces consistent style';
  website = 'https://prettier.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx prettier --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        extensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'css', 'scss', 'md', 'yaml', 'yml'],
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';

      // Check which files need formatting
      const result = execSync(
        `npx prettier --check "${targetDir}/**/*.{js,jsx,ts,tsx,json,css,scss,md,yaml,yml}" --list-different 2>&1`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      // If no output, all files are formatted
      if (!result.trim()) {
        return this.createResult([], Date.now() - startTime);
      }

      const unformattedFiles = result.trim().split('\n').filter(Boolean);

      for (const file of unformattedFiles) {
        findings.push(this.createFinding(file));
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      // Prettier returns non-zero when files need formatting
      if (error instanceof Error && 'stdout' in error) {
        const stdout = (error as { stdout: string }).stdout;
        const unformattedFiles = stdout.trim().split('\n').filter(f => f && !f.includes('Checking'));

        for (const file of unformattedFiles) {
          if (file && !file.startsWith('[')) {
            findings.push(this.createFinding(file));
          }
        }
        return this.createResult(findings, Date.now() - startTime);
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

  private createFinding(filePath: string): AuditFinding {
    return {
      id: `prettier-${filePath}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: 'File needs formatting',
      description: `${filePath} is not formatted according to Prettier rules`,
      explanation: 'Consistent code formatting improves readability and reduces merge conflicts. Prettier enforces a consistent style across your codebase.',
      impact: 'Inconsistent formatting makes code harder to read and can cause unnecessary diff noise in pull requests.',
      file: filePath,
      recommendation: `Run 'npx prettier --write "${filePath}"' to auto-format this file.`,
      documentationUrl: 'https://prettier.io/docs/en/index.html',
      aiPrompt: {
        short: `Format ${filePath} with Prettier`,
        detailed: `
The file ${filePath} needs to be formatted with Prettier.

This is an automated fix - simply run:
npx prettier --write "${filePath}"

Or format all files:
npx prettier --write .
        `.trim(),
        steps: [
          `Run: npx prettier --write "${filePath}"`,
          'Review the formatting changes',
          'Commit the formatted file',
        ],
      },
      tags: ['prettier', 'formatting', 'code-quality'],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: findings.length };

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
