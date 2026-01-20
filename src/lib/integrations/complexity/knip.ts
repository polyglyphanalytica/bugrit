// Knip Integration - Find Unused Dependencies and Exports
// License: ISC
// Website: https://knip.dev

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface KnipIssue {
  type: 'dependencies' | 'devDependencies' | 'unlisted' | 'exports' | 'files' | 'types' | 'duplicates';
  filePath?: string;
  symbol?: string;
  parentSymbol?: string;
}

interface KnipOutput {
  files: string[];
  dependencies: string[];
  devDependencies: string[];
  unlisted: Record<string, string[]>;
  exports: Record<string, string[]>;
  types: Record<string, string[]>;
  duplicates: Record<string, string[][]>;
}

export class KnipIntegration implements ToolIntegration {
  name = 'Knip';
  category = 'code-quality' as const;
  description = 'Find unused files, dependencies, and exports in JS/TS projects';
  website = 'https://knip.dev';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx knip --version', { stdio: 'ignore', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: true, options: {} };
  }

  async run(target: AuditTarget, _config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';

      const result = execSync(`npx knip --reporter json`, { cwd: targetDir, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 120000 });
      const output: KnipOutput = JSON.parse(result);

      // Unused files
      for (const file of output.files || []) {
        findings.push(this.createFileFinding(file));
      }

      // Unused dependencies
      for (const dep of output.dependencies || []) {
        findings.push(this.createDepFinding(dep, false));
      }

      // Unused devDependencies
      for (const dep of output.devDependencies || []) {
        findings.push(this.createDepFinding(dep, true));
      }

      // Unlisted dependencies
      for (const [file, deps] of Object.entries(output.unlisted || {})) {
        for (const dep of deps) {
          findings.push(this.createUnlistedFinding(file, dep));
        }
      }

      // Unused exports
      for (const [file, exports] of Object.entries(output.exports || {})) {
        for (const exp of exports) {
          findings.push(this.createExportFinding(file, exp));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      // Knip exits with code 1 when it finds issues
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: KnipOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const file of output.files || []) findings.push(this.createFileFinding(file));
          for (const dep of output.dependencies || []) findings.push(this.createDepFinding(dep, false));
          for (const dep of output.devDependencies || []) findings.push(this.createDepFinding(dep, true));
          return this.createResult(findings, Date.now() - startTime);
        } catch { /* Parse error */ }
      }
      return { tool: this.name, category: this.category, success: false, duration: Date.now() - startTime, findings: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 }, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private createFileFinding(file: string): AuditFinding {
    return {
      id: `knip-file-${file}`,
      tool: this.name, category: this.category, severity: 'low',
      title: `Unused file: ${file}`,
      description: `The file "${file}" appears to be unused in the project.`,
      explanation: 'Unused files add to project size and can cause confusion. They should be removed or the import should be added.',
      impact: 'Reduces codebase size and maintenance burden.',
      file,
      recommendation: `Delete ${file} if truly unused, or add an import if it should be used.`,
      aiPrompt: { short: `Remove unused file ${file}`, detailed: `File appears unused:\n\nFile: ${file}\n\nVerify it's not dynamically imported, then delete.`, steps: ['Search for dynamic imports', 'Verify not used in config files', 'Delete if confirmed unused'] },
      ruleId: 'unused-file',
      tags: ['knip', 'unused', 'files', 'cleanup'],
      effort: 'trivial',
    };
  }

  private createDepFinding(dep: string, isDev: boolean): AuditFinding {
    return {
      id: `knip-dep-${dep}`,
      tool: this.name, category: this.category, severity: isDev ? 'info' : 'low',
      title: `Unused ${isDev ? 'dev ' : ''}dependency: ${dep}`,
      description: `The package "${dep}" is listed in ${isDev ? 'devDependencies' : 'dependencies'} but appears unused.`,
      explanation: 'Unused dependencies increase install time, bundle size (for runtime deps), and potential security surface.',
      impact: isDev ? 'Slower installs and potential security exposure.' : 'Larger bundle and potential security exposure.',
      recommendation: `Run: npm uninstall ${isDev ? '-D ' : ''}${dep}`,
      aiPrompt: { short: `Remove unused dep ${dep}`, detailed: `Dependency appears unused:\n\nPackage: ${dep}\nType: ${isDev ? 'devDependency' : 'dependency'}\n\nRun: npm uninstall ${isDev ? '-D ' : ''}${dep}`, steps: ['Verify not used dynamically', 'Check if peer dependency', `Run npm uninstall ${isDev ? '-D ' : ''}${dep}`] },
      ruleId: 'unused-dependency',
      tags: ['knip', 'unused', 'dependencies', dep],
      effort: 'trivial',
    };
  }

  private createUnlistedFinding(file: string, dep: string): AuditFinding {
    return {
      id: `knip-unlisted-${file}-${dep}`,
      tool: this.name, category: this.category, severity: 'medium',
      title: `Unlisted dependency: ${dep}`,
      description: `"${dep}" is imported in ${file} but not listed in package.json.`,
      explanation: 'Missing dependencies can cause runtime errors on fresh installs.',
      impact: 'Application may fail to start on new environments.',
      file,
      recommendation: `Run: npm install ${dep}`,
      aiPrompt: { short: `Add missing dep ${dep}`, detailed: `Missing dependency:\n\nPackage: ${dep}\nUsed in: ${file}\n\nRun: npm install ${dep}`, steps: ['Determine if runtime or dev dep', 'Run npm install', 'Verify import works'] },
      ruleId: 'unlisted-dependency',
      tags: ['knip', 'missing', 'dependencies', dep],
      effort: 'trivial',
    };
  }

  private createExportFinding(file: string, exportName: string): AuditFinding {
    return {
      id: `knip-export-${file}-${exportName}`,
      tool: this.name, category: this.category, severity: 'info',
      title: `Unused export: ${exportName}`,
      description: `Export "${exportName}" in ${file} is not imported anywhere.`,
      explanation: 'Unused exports indicate dead code that can be removed to improve maintainability.',
      impact: 'Cleaner codebase with less dead code.',
      file,
      recommendation: `Remove the export "${exportName}" from ${file} or add a usage.`,
      aiPrompt: { short: `Remove unused export ${exportName}`, detailed: `Unused export:\n\nFile: ${file}\nExport: ${exportName}\n\nRemove if truly unused.`, steps: ['Search for dynamic imports', 'Remove if confirmed unused'] },
      ruleId: 'unused-export',
      tags: ['knip', 'unused', 'exports', 'dead-code'],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);
    return { tool: this.name, category: this.category, success: true, duration, findings, summary: { total: findings.length, bySeverity, passed: 0, failed: findings.length } };
  }
}
