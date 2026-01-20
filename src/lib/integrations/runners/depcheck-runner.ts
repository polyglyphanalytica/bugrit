// Depcheck Pure JS Runner
// Finds unused dependencies

import { AuditFinding, AuditResult } from '../types';

interface DepcheckResults {
  dependencies: string[];
  devDependencies: string[];
  missing: Record<string, string[]>;
  invalidFiles: Record<string, unknown>;
  invalidDirs: Record<string, unknown>;
}

export async function runDepcheck(
  targetDir: string,
  options: {
    ignoreDirs?: string[];
    ignorePatterns?: string[];
  } = {}
): Promise<AuditResult> {
  const startTime = Date.now();
  const findings: AuditFinding[] = [];

  try {
    const depcheck = await import('depcheck');

    const depcheckOptions = {
      ignoreDirs: options.ignoreDirs || ['node_modules', 'dist', 'build', '.next'],
      ignorePatterns: options.ignorePatterns || ['*.test.*', '*.spec.*'],
      skipMissing: false,
    };

    const results: DepcheckResults = await new Promise((resolve, reject) => {
      depcheck.default(targetDir, depcheckOptions, (result: DepcheckResults) => {
        if (result) resolve(result);
        else reject(new Error('Depcheck failed'));
      });
    });

    // Unused dependencies
    for (const dep of results.dependencies) {
      findings.push({
        id: `depcheck-unused-${dep}`,
        tool: 'Depcheck',
        category: 'code-quality',
        severity: 'low',
        title: `Unused dependency: ${dep}`,
        description: `The package "${dep}" is listed in dependencies but appears to be unused.`,
        explanation: 'Unused dependencies increase bundle size, slow down installations, and can introduce security vulnerabilities without any benefit.',
        impact: 'Removing unused dependencies reduces attack surface and improves build/install times.',
        recommendation: `Remove "${dep}" from package.json if it's truly unused: npm uninstall ${dep}`,
        aiPrompt: {
          short: `Remove unused dependency ${dep}`,
          detailed: `The dependency "${dep}" appears to be unused in the project.

Before removing, verify:
1. It's not used dynamically (require with variable)
2. It's not a peer dependency of another package
3. It's not used in build scripts or config files

If confirmed unused, run: npm uninstall ${dep}`,
          steps: [
            `Search codebase for any usage of "${dep}"`,
            'Check if it\'s a peer dependency',
            'Check build/config files',
            `If unused, run: npm uninstall ${dep}`,
          ],
        },
        ruleId: 'unused-dependency',
        tags: ['depcheck', 'unused', 'dependencies', 'cleanup'],
        effort: 'trivial',
      });
    }

    // Unused devDependencies
    for (const dep of results.devDependencies) {
      findings.push({
        id: `depcheck-unused-dev-${dep}`,
        tool: 'Depcheck',
        category: 'code-quality',
        severity: 'info',
        title: `Unused devDependency: ${dep}`,
        description: `The package "${dep}" is listed in devDependencies but appears to be unused.`,
        explanation: 'Unused dev dependencies slow down installations and clutter the project.',
        impact: 'Minor impact on development workflow and CI/CD times.',
        recommendation: `Remove "${dep}" from package.json: npm uninstall -D ${dep}`,
        aiPrompt: {
          short: `Remove unused devDependency ${dep}`,
          detailed: `The devDependency "${dep}" appears to be unused.

Run: npm uninstall -D ${dep}`,
          steps: [
            'Verify the package is not used in scripts',
            `Run: npm uninstall -D ${dep}`,
          ],
        },
        ruleId: 'unused-dev-dependency',
        tags: ['depcheck', 'unused', 'devDependencies', 'cleanup'],
        effort: 'trivial',
      });
    }

    // Missing dependencies
    for (const [dep, files] of Object.entries(results.missing)) {
      findings.push({
        id: `depcheck-missing-${dep}`,
        tool: 'Depcheck',
        category: 'code-quality',
        severity: 'high',
        title: `Missing dependency: ${dep}`,
        description: `The package "${dep}" is imported but not listed in package.json.`,
        explanation: `Found imports of "${dep}" in: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ` and ${files.length - 3} more files` : ''}. This dependency should be explicitly declared.`,
        impact: 'Missing dependencies can cause runtime errors in production or on other machines.',
        file: files[0],
        recommendation: `Add "${dep}" to package.json: npm install ${dep}`,
        aiPrompt: {
          short: `Add missing dependency ${dep}`,
          detailed: `The package "${dep}" is used but not declared in package.json.

Files using it: ${files.join(', ')}

Run: npm install ${dep}

Or if it's a dev dependency: npm install -D ${dep}`,
          steps: [
            'Determine if it\'s a runtime or dev dependency',
            `Run: npm install ${dep} (or npm install -D ${dep})`,
            'Verify imports work correctly',
          ],
        },
        ruleId: 'missing-dependency',
        tags: ['depcheck', 'missing', 'dependencies', 'error'],
        effort: 'trivial',
      });
    }

    return createResult(findings, Date.now() - startTime);
  } catch (error) {
    return {
      tool: 'Depcheck',
      category: 'code-quality',
      success: false,
      duration: Date.now() - startTime,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error: error instanceof Error ? error.message : 'Failed to run Depcheck',
    };
  }
}

function createResult(findings: AuditFinding[], duration: number): AuditResult {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => bySeverity[f.severity]++);

  return {
    tool: 'Depcheck',
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
