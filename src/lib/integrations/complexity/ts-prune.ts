// ts-prune Integration - Find Unused TypeScript Exports
// License: MIT
// Website: https://github.com/nadeesha/ts-prune

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding } from '../types';

interface TsPruneResult {
  file: string;
  line: number;
  symbol: string;
  usedInModule: boolean;
}

export class TsPruneIntegration implements ToolIntegration {
  name = 'ts-prune';
  category = 'complexity' as const;
  description = 'Finds unused exports in TypeScript projects to identify dead code';
  website = 'https://github.com/nadeesha/ts-prune';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx ts-prune --version', { stdio: 'ignore', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        ignorePatterns: ['*.test.ts', '*.spec.ts', '*.d.ts'],
        project: 'tsconfig.json',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const project = (config?.options?.project as string) || 'tsconfig.json';

      // ts-prune outputs one result per line in format: file:line - symbol
      const result = execSync(
        `npx ts-prune -p "${project}"`,
        { cwd: targetDir, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 120000 }
      );

      const results = this.parseOutput(result);
      const ignorePatterns = (config?.options?.ignorePatterns as string[]) || ['*.test.ts', '*.spec.ts', '*.d.ts'];

      for (const item of results) {
        // Skip if matches ignore patterns
        if (this.shouldIgnore(item.file, ignorePatterns)) continue;

        // Skip if marked as used in module only
        if (item.usedInModule) continue;

        findings.push(this.createFinding(item));
      }

      return this.createResult(findings, Date.now() - startTime, results.length);
    } catch (error) {
      // ts-prune exits with code 1 when it finds unused exports
      if (error instanceof Error && 'stdout' in error) {
        const stdout = (error as { stdout: string }).stdout;
        if (stdout) {
          const results = this.parseOutput(stdout);
          const ignorePatterns = (config?.options?.ignorePatterns as string[]) || ['*.test.ts', '*.spec.ts', '*.d.ts'];

          for (const item of results) {
            if (this.shouldIgnore(item.file, ignorePatterns)) continue;
            if (item.usedInModule) continue;
            findings.push(this.createFinding(item));
          }

          return this.createResult(findings, Date.now() - startTime, results.length);
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

  private parseOutput(output: string): TsPruneResult[] {
    const results: TsPruneResult[] = [];
    const lines = output.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      // Format: file:line - symbol (or file:line - symbol (used in module))
      const match = line.match(/^(.+):(\d+)\s+-\s+(.+?)(\s+\(used in module\))?$/);
      if (match) {
        results.push({
          file: match[1],
          line: parseInt(match[2], 10),
          symbol: match[3].trim(),
          usedInModule: !!match[4],
        });
      }
    }

    return results;
  }

  private shouldIgnore(file: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Simple glob matching
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
      );
      if (regex.test(file) || file.includes(pattern.replace(/\*/g, ''))) {
        return true;
      }
    }
    return false;
  }

  private createFinding(item: TsPruneResult): AuditFinding {
    const isDefaultExport = item.symbol === 'default';

    return {
      id: `ts-prune-${item.file}-${item.line}-${item.symbol}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `Unused export: ${item.symbol}`,
      description: isDefaultExport
        ? `The default export in ${item.file} is not imported anywhere.`
        : `The export "${item.symbol}" in ${item.file} is not imported anywhere.`,
      explanation: 'Unused exports indicate dead code that can be safely removed. This reduces bundle size and improves code maintainability.',
      impact: 'Dead code increases bundle size, confusion, and maintenance burden.',
      file: item.file,
      line: item.line,
      recommendation: isDefaultExport
        ? `Remove the default export from ${item.file} or add an import if it should be used.`
        : `Remove the export "${item.symbol}" from ${item.file} or add an import if it should be used.`,
      aiPrompt: {
        short: `Remove unused export ${item.symbol}`,
        detailed: `Unused TypeScript export detected:

File: ${item.file}
Line: ${item.line}
Export: ${item.symbol}

This export is not imported anywhere in the codebase. Either:
1. Remove the export keyword if the symbol is used locally
2. Delete the symbol entirely if it's unused
3. Add an import somewhere if it should be used`,
        steps: [
          `Open ${item.file} at line ${item.line}`,
          'Verify the export is truly unused (check for dynamic imports)',
          'Remove the export keyword or delete the symbol',
          'Run TypeScript compiler to verify no errors',
        ],
      },
      ruleId: 'unused-export',
      tags: ['ts-prune', 'unused', 'exports', 'dead-code', 'typescript'],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number, totalExportsChecked: number): AuditResult {
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
        passed: totalExportsChecked - findings.length,
        failed: findings.length,
      },
      metadata: { totalExportsChecked },
    };
  }
}
