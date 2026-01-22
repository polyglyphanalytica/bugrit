/**
 * Tool Runner
 *
 * Executes all 69 tools using a mix of npm packages and CLI execution.
 * CLI execution is used for tools with native bindings that can't be bundled.
 */

import { TOOL_REGISTRY, ToolDefinition } from './registry';
import { execSync } from 'child_process';
import { safeRequire } from '@/lib/utils/safe-require';

export interface ToolResult {
  toolId: string;
  toolName: string;
  category: string;
  success: boolean;
  duration: number;
  findings: Finding[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
  raw?: unknown;
  error?: string;
}

export interface Finding {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
}

export interface RunOptions {
  targetPath: string;
  tools?: string[];  // Specific tools to run, or all if not specified
  targetUrl?: string;  // For accessibility/performance tools
}

/**
 * Run all (or specified) tools against a codebase
 */
export async function runTools(options: RunOptions): Promise<ToolResult[]> {
  const { targetPath, tools: toolIds } = options;

  const toolsToRun = toolIds
    ? TOOL_REGISTRY.filter(t => toolIds.includes(t.id))
    : TOOL_REGISTRY;

  const results = await Promise.all(
    toolsToRun.map(tool => runSingleTool(tool, options))
  );

  return results;
}

/**
 * Run a single tool
 */
async function runSingleTool(
  tool: ToolDefinition,
  options: RunOptions
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    const runner = TOOL_RUNNERS[tool.id];
    if (!runner) {
      return createErrorResult(tool, startTime, `No runner implemented for ${tool.id}`);
    }

    const result = await runner(options);
    return {
      toolId: tool.id,
      toolName: tool.name,
      category: tool.category,
      success: true,
      duration: Date.now() - startTime,
      ...result,
    };
  } catch (error) {
    return createErrorResult(
      tool,
      startTime,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

function createErrorResult(
  tool: ToolDefinition,
  startTime: number,
  error: string
): ToolResult {
  return {
    toolId: tool.id,
    toolName: tool.name,
    category: tool.category,
    success: false,
    duration: Date.now() - startTime,
    findings: [],
    summary: { total: 0, errors: 0, warnings: 0, info: 0 },
    error,
  };
}

// Helper to safely execute CLI command
function runCli(cmd: string, cwd: string, timeout = 120000): string | null {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });
  } catch (error) {
    // Many tools return non-zero when they find issues
    if (error && typeof error === 'object' && 'stdout' in error) {
      return (error as { stdout: string }).stdout;
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Individual Tool Runners
// ═══════════════════════════════════════════════════════════════

type ToolRunner = (options: RunOptions) => Promise<{
  findings: Finding[];
  summary: { total: number; errors: number; warnings: number; info: number };
  raw?: unknown;
}>;

const TOOL_RUNNERS: Record<string, ToolRunner> = {
  // ─────────────────────────────────────────────────────────────
  // ESLint
  // ─────────────────────────────────────────────────────────────
  eslint: async ({ targetPath }) => {
    const { ESLint } = safeRequire<typeof import('eslint')>('eslint');
    const eslint = new ESLint({ cwd: targetPath });
    const results = await eslint.lintFiles(['**/*.{js,jsx,ts,tsx}']);

    const findings: Finding[] = [];
    for (const result of results) {
      for (const msg of result.messages) {
        findings.push({
          id: `eslint-${result.filePath}-${msg.line}-${msg.column}`,
          severity: msg.severity === 2 ? 'error' : 'warning',
          message: msg.message,
          file: result.filePath,
          line: msg.line,
          column: msg.column,
          rule: msg.ruleId || undefined,
          suggestion: msg.fix ? 'Auto-fixable' : undefined,
        });
      }
    }

    return {
      findings,
      summary: summarizeFindings(findings),
      raw: results,
    };
  },

  // ─────────────────────────────────────────────────────────────
  // Biome (via CLI - has native bindings)
  // ─────────────────────────────────────────────────────────────
  biome: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx biome lint --reporter=json .', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const diagnostic of data.diagnostics || []) {
          findings.push({
            id: `biome-${diagnostic.location?.path || 'unknown'}-${diagnostic.location?.span?.start || 0}`,
            severity: diagnostic.severity === 'error' ? 'error' : 'warning',
            message: diagnostic.description || diagnostic.message || 'Biome issue detected',
            file: diagnostic.location?.path,
            rule: diagnostic.category,
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Stylelint
  // ─────────────────────────────────────────────────────────────
  stylelint: async ({ targetPath }) => {
    const stylelint = safeRequire<typeof import('stylelint')>('stylelint');
    const result = await stylelint.default.lint({
      files: `${targetPath}/**/*.{css,scss,less}`,
      formatter: 'json',
    });

    const findings: Finding[] = [];
    for (const fileResult of result.results) {
      for (const warning of fileResult.warnings) {
        findings.push({
          id: `stylelint-${fileResult.source}-${warning.line}`,
          severity: warning.severity === 'error' ? 'error' : 'warning',
          message: warning.text,
          file: fileResult.source,
          line: warning.line,
          column: warning.column,
          rule: warning.rule,
        });
      }
    }

    return {
      findings,
      summary: summarizeFindings(findings),
      raw: result,
    };
  },

  // ─────────────────────────────────────────────────────────────
  // Prettier (check mode)
  // ─────────────────────────────────────────────────────────────
  prettier: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx prettier --check "**/*.{js,ts,jsx,tsx,css,json,md}" --ignore-path .gitignore 2>&1', targetPath);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes('would reformat'));
      for (const line of lines) {
        const file = line.replace('[warn]', '').trim();
        findings.push({
          id: `prettier-${file}`,
          severity: 'warning',
          message: 'File is not formatted according to Prettier rules',
          file,
          suggestion: 'Run prettier --write to fix',
        });
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // npm audit
  // ─────────────────────────────────────────────────────────────
  'npm-audit': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npm audit --json 2>/dev/null', targetPath);

    if (output) {
      try {
        const audit = JSON.parse(output);
        for (const [name, advisory] of Object.entries(audit.vulnerabilities || {})) {
          const adv = advisory as { severity: string; via: Array<{ title?: string; url?: string }> };
          findings.push({
            id: `audit-${name}`,
            severity: adv.severity === 'critical' || adv.severity === 'high' ? 'error' : 'warning',
            message: `Vulnerability in ${name}: ${adv.via[0]?.title || 'Security issue'}`,
            file: 'package.json',
            suggestion: adv.via[0]?.url || 'Run npm audit fix',
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Depcheck
  // ─────────────────────────────────────────────────────────────
  depcheck: async ({ targetPath }) => {
    const depcheck = safeRequire<typeof import('depcheck')>('depcheck');
    const result = await (depcheck as unknown as { default: typeof depcheck }).default(targetPath, {});

    const findings: Finding[] = [];

    for (const dep of result.dependencies) {
      findings.push({
        id: `depcheck-unused-${dep}`,
        severity: 'warning',
        message: `Unused dependency: ${dep}`,
        file: 'package.json',
        suggestion: `Remove with: npm uninstall ${dep}`,
      });
    }

    for (const dep of result.devDependencies) {
      findings.push({
        id: `depcheck-unused-dev-${dep}`,
        severity: 'info',
        message: `Unused devDependency: ${dep}`,
        file: 'package.json',
        suggestion: `Remove with: npm uninstall -D ${dep}`,
      });
    }

    for (const [dep, files] of Object.entries(result.missing)) {
      findings.push({
        id: `depcheck-missing-${dep}`,
        severity: 'error',
        message: `Missing dependency: ${dep} (used in ${(files as string[]).length} files)`,
        file: 'package.json',
        suggestion: `Install with: npm install ${dep}`,
      });
    }

    return {
      findings,
      summary: summarizeFindings(findings),
      raw: result,
    };
  },

  // ─────────────────────────────────────────────────────────────
  // License Checker
  // ─────────────────────────────────────────────────────────────
  'license-checker': async ({ targetPath }) => {
    const checker = safeRequire<typeof import('license-checker-rseidelsohn')>('license-checker-rseidelsohn');

    return new Promise((resolve) => {
      checker.init({ start: targetPath }, (err, packages) => {
        if (err) {
          resolve({
            findings: [],
            summary: { total: 0, errors: 0, warnings: 0, info: 0 },
          });
          return;
        }

        const findings: Finding[] = [];
        const problematicLicenses = ['GPL', 'AGPL', 'SSPL', 'UNKNOWN'];

        for (const [name, info] of Object.entries(packages || {})) {
          const license = (info as { licenses?: string }).licenses || 'UNKNOWN';
          const isProblematic = problematicLicenses.some(l =>
            license.toUpperCase().includes(l)
          );

          if (isProblematic) {
            findings.push({
              id: `license-${name}`,
              severity: license === 'UNKNOWN' ? 'warning' : 'error',
              message: `Package ${name} has license: ${license}`,
              file: 'package.json',
              suggestion: 'Review license compatibility with your project',
            });
          }
        }

        resolve({
          findings,
          summary: summarizeFindings(findings),
          raw: packages,
        });
      });
    });
  },

  // ─────────────────────────────────────────────────────────────
  // TypeScript
  // ─────────────────────────────────────────────────────────────
  typescript: async ({ targetPath }) => {
    const ts = safeRequire<typeof import('typescript')>('typescript');
    const path = await import('path');
    const fs = await import('fs');

    const configPath = ts.findConfigFile(targetPath, fs.existsSync);
    if (!configPath) {
      return {
        findings: [],
        summary: { total: 0, errors: 0, warnings: 0, info: 0 },
      };
    }

    const configFile = ts.readConfigFile(configPath, (p) => fs.readFileSync(p, 'utf-8'));
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );

    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    const findings: Finding[] = diagnostics.map((d, i) => ({
      id: `ts-${i}`,
      severity: d.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      file: d.file?.fileName,
      line: d.file && d.start
        ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
        : undefined,
      rule: `TS${d.code}`,
    }));

    return {
      findings,
      summary: summarizeFindings(findings),
    };
  },

  // ─────────────────────────────────────────────────────────────
  // Knip (via CLI - has native bindings)
  // ─────────────────────────────────────────────────────────────
  knip: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx knip --reporter json 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);

        for (const file of data.files || []) {
          findings.push({
            id: `knip-file-${file}`,
            severity: 'warning',
            message: `Unused file: ${file}`,
            file,
            suggestion: 'Consider removing this file if not needed',
          });
        }

        for (const [file, exports] of Object.entries(data.exports || {})) {
          for (const exp of exports as string[]) {
            findings.push({
              id: `knip-export-${file}-${exp}`,
              severity: 'warning',
              message: `Unused export: ${exp}`,
              file,
              suggestion: 'Remove or use this export',
            });
          }
        }

        for (const dep of data.dependencies || []) {
          findings.push({
            id: `knip-dep-${dep}`,
            severity: 'warning',
            message: `Unused dependency: ${dep}`,
            file: 'package.json',
            suggestion: `Remove with: npm uninstall ${dep}`,
          });
        }
      } catch {
        // JSON parse error or knip not available
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // cspell (spell check)
  // ─────────────────────────────────────────────────────────────
  cspell: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx cspell --no-progress --no-summary "**/*.{ts,tsx,js,jsx,md}" 2>&1', targetPath);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes(' - Unknown word'));
      for (const line of lines) {
        const match = line.match(/(.+?):(\d+):(\d+)\s*-\s*Unknown word\s*\((.+?)\)/);
        if (match) {
          findings.push({
            id: `cspell-${match[1]}-${match[4]}`,
            severity: 'info',
            message: `Unknown word: "${match[4]}"`,
            file: match[1],
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10),
          });
        }
      }
    }

    return { findings: findings.slice(0, 100), summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Markdownlint
  // ─────────────────────────────────────────────────────────────
  markdownlint: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx markdownlint "**/*.md" --ignore node_modules --json 2>&1', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const issue of data) {
          findings.push({
            id: `md-${issue.fileName}-${issue.lineNumber}`,
            severity: 'warning',
            message: issue.ruleDescription,
            file: issue.fileName,
            line: issue.lineNumber,
            rule: issue.ruleNames?.[0],
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Madge (via CLI - has native bindings)
  // ─────────────────────────────────────────────────────────────
  madge: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx madge --circular --json .', targetPath);

    if (output) {
      try {
        const cycles = JSON.parse(output);
        for (let i = 0; i < cycles.length; i++) {
          findings.push({
            id: `madge-circular-${i}`,
            severity: 'warning',
            message: `Circular dependency: ${cycles[i].join(' → ')}`,
            suggestion: 'Refactor to break the cycle',
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // jscpd (copy-paste detection via CLI)
  // ─────────────────────────────────────────────────────────────
  jscpd: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx jscpd --reporters json --ignore "**/node_modules/**,**/dist/**" .', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const dup of data.duplicates || []) {
          findings.push({
            id: `jscpd-${dup.firstFile?.name || 'unknown'}-${dup.firstFile?.start || 0}`,
            severity: 'warning',
            message: `Duplicated code block (${dup.lines} lines)`,
            file: dup.firstFile?.name,
            line: dup.firstFile?.start,
            suggestion: `Also found in ${dup.secondFile?.name}:${dup.secondFile?.start}. Consider extracting to shared function.`,
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // ESLint Security Plugin
  // ─────────────────────────────────────────────────────────────
  'eslint-security': async ({ targetPath }) => {
    const { ESLint } = safeRequire<typeof import('eslint')>('eslint');
    const eslint = new ESLint({
      cwd: targetPath,
      overrideConfig: {
        plugins: ['security'],
        rules: {
          'security/detect-eval-with-expression': 'error',
          'security/detect-non-literal-fs-filename': 'warn',
          'security/detect-non-literal-regexp': 'warn',
          'security/detect-non-literal-require': 'warn',
          'security/detect-object-injection': 'warn',
          'security/detect-possible-timing-attacks': 'warn',
          'security/detect-unsafe-regex': 'error',
        },
      } as unknown as import('eslint').Linter.Config,
    });

    try {
      const results = await eslint.lintFiles(['**/*.{js,jsx,ts,tsx}']);
      const findings: Finding[] = [];

      for (const result of results) {
        for (const msg of result.messages) {
          if (msg.ruleId?.startsWith('security/')) {
            findings.push({
              id: `security-${result.filePath}-${msg.line}-${msg.column}`,
              severity: msg.severity === 2 ? 'error' : 'warning',
              message: msg.message,
              file: result.filePath,
              line: msg.line,
              column: msg.column,
              rule: msg.ruleId,
            });
          }
        }
      }

      return { findings, summary: summarizeFindings(findings) };
    } catch {
      return { findings: [], summary: { total: 0, errors: 0, warnings: 0, info: 0 } };
    }
  },

  // ─────────────────────────────────────────────────────────────
  // Audit CI (npm audit wrapper)
  // ─────────────────────────────────────────────────────────────
  'audit-ci': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npm audit --json 2>/dev/null', targetPath);

    if (output) {
      try {
        const audit = JSON.parse(output);
        for (const [name, advisory] of Object.entries(audit.vulnerabilities || {})) {
          const adv = advisory as { severity: string; via: Array<{ title?: string; url?: string }> };
          findings.push({
            id: `audit-ci-${name}`,
            severity: adv.severity === 'critical' || adv.severity === 'high' ? 'error' : 'warning',
            message: `Vulnerability in ${name}: ${adv.via[0]?.title || 'Security issue'}`,
            file: 'package.json',
            suggestion: adv.via[0]?.url || 'Run npm audit fix',
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Secretlint (via CLI)
  // ─────────────────────────────────────────────────────────────
  'secretlint': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx secretlint "**/*" --format json 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const result of data) {
          for (const msg of result.messages || []) {
            findings.push({
              id: `secret-${result.filePath}-${msg.loc?.start?.line || 0}`,
              severity: 'error',
              message: msg.message,
              file: result.filePath,
              line: msg.loc?.start?.line,
              rule: msg.ruleId,
              suggestion: 'Remove hardcoded secret and use environment variables',
            });
          }
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Lockfile Lint
  // ─────────────────────────────────────────────────────────────
  'lockfile-lint': async ({ targetPath }) => {
    const path = await import('path');
    const fs = await import('fs/promises');
    const findings: Finding[] = [];

    try {
      const lockPath = path.join(targetPath, 'package-lock.json');
      const content = await fs.readFile(lockPath, 'utf-8');
      const lock = JSON.parse(content);

      // Check for http:// URLs (should be https://)
      const checkForHttp = (obj: Record<string, unknown>, pathStr = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && value.startsWith('http://')) {
            findings.push({
              id: `lockfile-http-${pathStr}-${key}`,
              severity: 'error',
              message: `Insecure HTTP URL found: ${value}`,
              file: 'package-lock.json',
              suggestion: 'Use HTTPS instead of HTTP',
            });
          } else if (typeof value === 'object' && value !== null) {
            checkForHttp(value as Record<string, unknown>, `${pathStr}.${key}`);
          }
        }
      };

      checkForHttp(lock);

      // Check for git:// URLs
      const gitUrls = JSON.stringify(lock).match(/git:\/\/[^"]+/g) || [];
      for (const url of gitUrls) {
        findings.push({
          id: `lockfile-git-${url}`,
          severity: 'warning',
          message: `Git protocol URL found: ${url}`,
          file: 'package-lock.json',
          suggestion: 'Consider using HTTPS git URLs for better security',
        });
      }
    } catch {
      // No package-lock.json or invalid format
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Dependency Cruiser (via CLI - has native bindings)
  // ─────────────────────────────────────────────────────────────
  'dependency-cruiser': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx depcruise --output-type json --exclude node_modules .', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const violation of data.summary?.violations || []) {
          findings.push({
            id: `depcruise-${violation.from}-${violation.to}`,
            severity: violation.rule?.severity === 'error' ? 'error' : 'warning',
            message: `${violation.rule?.name}: ${violation.from} → ${violation.to}`,
            file: violation.from,
            rule: violation.rule?.name,
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // axe-core (accessibility - requires URL, via CLI)
  // ─────────────────────────────────────────────────────────────
  'axe-core': async ({ targetUrl }) => {
    if (!targetUrl) {
      return {
        findings: [{
          id: 'axe-no-url',
          severity: 'info' as const,
          message: 'axe-core requires a target URL for accessibility testing',
        }],
        summary: { total: 1, errors: 0, warnings: 0, info: 1 },
      };
    }

    const findings: Finding[] = [];
    const output = runCli(`npx axe ${targetUrl} --reporter json 2>/dev/null`, process.cwd());

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const violation of data.violations || []) {
          findings.push({
            id: `axe-${violation.id}`,
            severity: violation.impact === 'critical' || violation.impact === 'serious' ? 'error' : 'warning',
            message: `${violation.description} (${violation.nodes?.length || 0} instances)`,
            rule: violation.id,
            suggestion: violation.help,
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Pa11y (accessibility - requires URL, via CLI)
  // ─────────────────────────────────────────────────────────────
  'pa11y': async ({ targetUrl }) => {
    if (!targetUrl) {
      return {
        findings: [{
          id: 'pa11y-no-url',
          severity: 'info' as const,
          message: 'Pa11y requires a target URL for accessibility testing',
        }],
        summary: { total: 1, errors: 0, warnings: 0, info: 1 },
      };
    }

    const findings: Finding[] = [];
    const output = runCli(`npx pa11y --reporter json ${targetUrl} 2>/dev/null`, process.cwd());

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const issue of data.issues || []) {
          findings.push({
            id: `pa11y-${issue.code}`,
            severity: issue.type === 'error' ? 'error' : 'warning',
            message: issue.message,
            rule: issue.code,
            suggestion: issue.context,
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // publint (npm package publishing via CLI)
  // ─────────────────────────────────────────────────────────────
  'publint': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx publint --format json 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const msg of data.messages || []) {
          findings.push({
            id: `publint-${msg.code}`,
            severity: msg.type === 'error' ? 'error' : 'warning',
            message: msg.message,
            file: 'package.json',
            suggestion: msg.path ? `Check: ${msg.path}` : undefined,
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // remark-lint (markdown via CLI)
  // ─────────────────────────────────────────────────────────────
  'remark-lint': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx remark --use remark-preset-lint-recommended --frail --quiet . 2>&1', targetPath);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes(':'));
      for (const line of lines) {
        const match = line.match(/(.+?):(\d+):(\d+):\s*(.+)/);
        if (match) {
          findings.push({
            id: `remark-${match[1]}-${match[2]}`,
            severity: 'warning',
            message: match[4],
            file: match[1],
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10),
          });
        }
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // alex (inclusive writing via CLI)
  // ─────────────────────────────────────────────────────────────
  'alex': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx alex . 2>&1', targetPath);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes(' - '));
      for (const line of lines) {
        const match = line.match(/(.+?):(\d+):(\d+)-\d+:\d+\s*(.+)/);
        if (match) {
          findings.push({
            id: `alex-${match[1]}-${match[2]}`,
            severity: 'warning',
            message: match[4],
            file: match[1],
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10),
            suggestion: 'Consider using more inclusive language',
          });
        }
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // commitlint (via CLI)
  // ─────────────────────────────────────────────────────────────
  'commitlint': async ({ targetPath }) => {
    const findings: Finding[] = [];

    // Get recent commits and lint them
    const commits = runCli('git log --format=%s -n 10', targetPath);
    if (commits) {
      for (const commit of commits.trim().split('\n')) {
        const output = runCli(`echo "${commit}" | npx commitlint 2>&1`, targetPath);
        if (output && output.includes('✖')) {
          findings.push({
            id: `commitlint-${commit.slice(0, 20)}`,
            severity: 'warning',
            message: `Commit "${commit.slice(0, 50)}..." does not follow conventional format`,
            suggestion: 'Follow conventional commit format: type(scope): description',
          });
        }
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Lighthouse (performance - requires URL, via CLI)
  // ─────────────────────────────────────────────────────────────
  'lighthouse': async ({ targetUrl }) => {
    if (!targetUrl) {
      return {
        findings: [{
          id: 'lighthouse-no-url',
          severity: 'info' as const,
          message: 'Lighthouse requires a target URL for performance testing',
        }],
        summary: { total: 1, errors: 0, warnings: 0, info: 1 },
      };
    }

    const findings: Finding[] = [];
    const output = runCli(
      `npx lighthouse ${targetUrl} --output=json --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo 2>/dev/null`,
      process.cwd(),
      180000 // 3 minute timeout for lighthouse
    );

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const [id, audit] of Object.entries(data.audits || {})) {
          const a = audit as { score?: number; title?: string; displayValue?: string; description?: string };
          if (a.score !== null && a.score !== undefined && a.score < 0.9) {
            findings.push({
              id: `lighthouse-${id}`,
              severity: a.score < 0.5 ? 'error' : 'warning',
              message: `${a.title}: ${a.displayValue || 'Needs improvement'}`,
              rule: id,
              suggestion: a.description,
            });
          }
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings: findings.slice(0, 50), summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Size Limit (bundle size via CLI)
  // ─────────────────────────────────────────────────────────────
  'size-limit': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx size-limit --json 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const item of data) {
          if (item.passed === false) {
            findings.push({
              id: `size-${item.name || 'bundle'}`,
              severity: 'error',
              message: `Bundle size exceeded: ${item.name || 'main'} is ${item.size} bytes (limit: ${item.sizeLimit})`,
              file: item.path,
              suggestion: 'Reduce bundle size by removing unused dependencies or code splitting',
            });
          }
        }
      } catch {
        findings.push({
          id: 'size-no-config',
          severity: 'info',
          message: 'No size-limit configuration found or tool not configured',
          file: 'package.json',
          suggestion: 'Add "size-limit" config to track bundle sizes',
        });
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },
};

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function summarizeFindings(findings: Finding[]) {
  return {
    total: findings.length,
    errors: findings.filter(f => f.severity === 'error').length,
    warnings: findings.filter(f => f.severity === 'warning').length,
    info: findings.filter(f => f.severity === 'info').length,
  };
}
