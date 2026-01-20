// Prettier Pure JS Runner
// Runs Prettier directly via npm package

import { AuditFinding, AuditResult } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';

export async function runPrettier(
  targetDir: string,
  options: {
    extensions?: string[];
    configFile?: string;
    check?: boolean;
  } = {}
): Promise<AuditResult> {
  const startTime = Date.now();
  const findings: AuditFinding[] = [];

  try {
    const prettier = await import('prettier');
    const glob = await import('glob');

    const extensions = options.extensions || ['js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'json', 'md', 'html'];
    const pattern = `**/*.{${extensions.join(',')}}`;

    const files = await glob.glob(pattern, {
      cwd: targetDir,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
      absolute: true,
    });

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const prettierConfig = await prettier.resolveConfig(filePath);

        const formatted = await prettier.format(content, {
          ...prettierConfig,
          filepath: filePath,
        });

        if (content !== formatted) {
          findings.push({
            id: `prettier-${filePath}`,
            tool: 'Prettier',
            category: 'code-quality',
            severity: 'low',
            title: 'Prettier: Formatting issue',
            description: `File ${path.relative(targetDir, filePath)} is not formatted according to Prettier rules.`,
            explanation: 'Prettier is an opinionated code formatter that enforces a consistent code style. This file has formatting inconsistencies that Prettier can automatically fix.',
            impact: 'Inconsistent formatting can make code harder to read and review. While not a functional issue, it affects code maintainability.',
            file: filePath,
            recommendation: 'Run Prettier to automatically format this file.',
            aiPrompt: {
              short: `Format ${path.basename(filePath)} with Prettier`,
              detailed: `The file ${filePath} needs to be formatted with Prettier.

Run: npx prettier --write "${filePath}"

Or configure your editor to format on save.`,
              steps: [
                'Run Prettier with --write flag to auto-fix',
                'Or configure editor to format on save',
                'Commit the formatted file',
              ],
            },
            ruleId: 'formatting',
            tags: ['prettier', 'formatting', 'code-style'],
            effort: 'trivial',
            autoFixable: true,
          });
        }
      } catch {
        // Skip files that can't be parsed
      }
    }

    return createResult(findings, Date.now() - startTime);
  } catch (error) {
    return {
      tool: 'Prettier',
      category: 'code-quality',
      success: false,
      duration: Date.now() - startTime,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error: error instanceof Error ? error.message : 'Failed to run Prettier',
    };
  }
}

function createResult(findings: AuditFinding[], duration: number): AuditResult {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => bySeverity[f.severity]++);

  return {
    tool: 'Prettier',
    category: 'code-quality',
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
