/**
 * Tool Runner
 *
 * Executes tools using a mix of npm packages, CLI commands, and git operations.
 * CLI execution is used for tools with native bindings that can't be bundled.
 * Binary tools (hadolint, gitleaks, dockle, syft) are pre-installed in Docker.
 *
 * Browser-based tools (Lighthouse, axe-core, Pa11y) are delegated to the
 * Cloud Run worker service when configured, since serverless environments
 * don't have Chromium installed.
 *
 * Performance optimization: Tools run in parallel with controlled concurrency
 * to balance speed vs resource usage.
 */

import { TOOL_REGISTRY, ToolDefinition } from './registry';
import { execSync } from 'child_process';

// Concurrency control: Run up to 5 tools simultaneously
// This balances speed with memory/CPU constraints
const MAX_CONCURRENT_TOOLS = parseInt(process.env.MAX_CONCURRENT_TOOLS || '5', 10);
import { safeRequire } from '@/lib/utils/safe-require';
import {
  isWorkerConfigured,
  runLighthouseScan,
  runAccessibilityScan,
  runPa11yScan,
} from '@/lib/scanning/worker-client';

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
  dockerImage?: string;  // For container image scanning (e.g. 'nginx:latest')
}

/**
 * Run tools with controlled concurrency
 * Uses a semaphore pattern to limit simultaneous executions
 */
async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item).then((result) => {
      results.push(result);
    });
    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        // Check if promise is settled by trying to race it
        const settled = await Promise.race([
          executing[i].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) {
          executing.splice(i, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Run all (or specified) tools against a codebase
 * Tools execute in parallel with controlled concurrency for optimal performance
 */
export async function runTools(options: RunOptions): Promise<ToolResult[]> {
  const { targetPath, tools: toolIds } = options;

  const toolsToRun = toolIds
    ? TOOL_REGISTRY.filter(t => toolIds.includes(t.id))
    : TOOL_REGISTRY;

  // Run tools with controlled parallelism (default: 5 concurrent)
  const results = await runWithConcurrency(
    toolsToRun,
    (tool) => runSingleTool(tool, options),
    MAX_CONCURRENT_TOOLS
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
  // Oxlint (ultra-fast JS/TS linter via CLI - Rust binary)
  // ─────────────────────────────────────────────────────────────
  oxlint: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx oxlint --format json . 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const diagnostic of data.diagnostics || data || []) {
          findings.push({
            id: `oxlint-${diagnostic.filename || 'unknown'}-${diagnostic.line || 0}-${diagnostic.column || 0}`,
            severity: diagnostic.severity === 'error' ? 'error' : 'warning',
            message: diagnostic.message || 'Oxlint issue detected',
            file: diagnostic.filename,
            line: diagnostic.line,
            column: diagnostic.column,
            rule: diagnostic.rule_id || diagnostic.rule,
            suggestion: diagnostic.help || diagnostic.fix?.message,
          });
        }
      } catch {
        // Fallback: parse line-by-line output if JSON fails
        const lines = output.split('\n').filter(l => l.includes('error') || l.includes('warning'));
        for (const line of lines) {
          const match = line.match(/(.+?):(\d+):(\d+):\s*(error|warning)\s*(.+)/);
          if (match) {
            findings.push({
              id: `oxlint-${match[1]}-${match[2]}`,
              severity: match[4] as 'error' | 'warning',
              message: match[5],
              file: match[1],
              line: parseInt(match[2], 10),
              column: parseInt(match[3], 10),
            });
          }
        }
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // html-validate (HTML validation)
  // ─────────────────────────────────────────────────────────────
  'html-validate': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx html-validate --formatter json "**/*.html" 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const result of data.results || data || []) {
          for (const message of result.messages || []) {
            findings.push({
              id: `html-validate-${result.filePath}-${message.line || 0}-${message.column || 0}`,
              severity: message.severity === 2 ? 'error' : 'warning',
              message: message.message || 'HTML validation issue',
              file: result.filePath,
              line: message.line,
              column: message.column,
              rule: message.ruleId,
            });
          }
        }
      } catch {
        // JSON parse error - tool may have returned non-JSON output
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // textlint (natural language linter)
  // ─────────────────────────────────────────────────────────────
  textlint: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx textlint --format json "**/*.md" "**/*.txt" 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const result of data || []) {
          for (const message of result.messages || []) {
            findings.push({
              id: `textlint-${result.filePath}-${message.line || 0}-${message.column || 0}`,
              severity: message.severity === 2 ? 'error' : 'warning',
              message: message.message || 'Text lint issue',
              file: result.filePath,
              line: message.line,
              column: message.column,
              rule: message.ruleId,
              suggestion: message.fix?.text,
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
  // npm-check-updates (find outdated dependencies)
  // ─────────────────────────────────────────────────────────────
  'npm-check-updates': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx npm-check-updates --jsonUpgraded 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const [pkg, version] of Object.entries(data || {})) {
          findings.push({
            id: `ncu-${pkg}`,
            severity: 'info',
            message: `${pkg} can be updated to ${version}`,
            file: 'package.json',
            suggestion: `Run: npm install ${pkg}@${version}`,
          });
        }
      } catch {
        // JSON parse error
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
  // Trivy (container image + filesystem vulnerability scanning)
  // ─────────────────────────────────────────────────────────────
  trivy: async ({ targetPath, dockerImage }) => {
    const findings: Finding[] = [];

    // Determine scan mode: image scan if dockerImage provided, otherwise filesystem scan
    const command = dockerImage
      ? `trivy image --format json --severity CRITICAL,HIGH,MEDIUM ${dockerImage}`
      : `trivy fs --format json --severity CRITICAL,HIGH,MEDIUM "${targetPath}"`;

    const output = runCli(command, targetPath, 300000); // 5 min timeout for image pulls

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const result of data.Results || []) {
          for (const vuln of result.Vulnerabilities || []) {
            const severity = vuln.Severity === 'CRITICAL' || vuln.Severity === 'HIGH'
              ? 'error'
              : vuln.Severity === 'MEDIUM'
                ? 'warning'
                : 'info';

            findings.push({
              id: `trivy-${vuln.VulnerabilityID}-${vuln.PkgName}`,
              severity,
              message: `${vuln.VulnerabilityID}: ${vuln.Title || vuln.Description || 'Vulnerability'} in ${vuln.PkgName} (${vuln.InstalledVersion})`,
              file: result.Target,
              rule: vuln.VulnerabilityID,
              suggestion: vuln.FixedVersion
                ? `Update ${vuln.PkgName} to ${vuln.FixedVersion}`
                : 'No fix available yet. Monitor for updates.',
            });
          }
        }
      } catch {
        // JSON parse error — Trivy may have returned non-JSON on stderr
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Dredd (API contract testing against documentation)
  // ─────────────────────────────────────────────────────────────
  dredd: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Find API spec files (OpenAPI/Swagger)
    const specFiles = ['openapi.yaml', 'openapi.yml', 'openapi.json', 'swagger.yaml', 'swagger.yml', 'swagger.json', 'api.yaml', 'api.yml', 'api.json'];
    let specFile: string | null = null;

    for (const name of specFiles) {
      try {
        await fs.access(path.join(targetPath, name));
        specFile = name;
        break;
      } catch {
        // File doesn't exist, try next
      }
    }

    // Also check docs/ and api/ subdirectories
    if (!specFile) {
      for (const dir of ['docs', 'api', 'spec']) {
        for (const name of specFiles) {
          try {
            await fs.access(path.join(targetPath, dir, name));
            specFile = path.join(dir, name);
            break;
          } catch {
            // File doesn't exist
          }
        }
        if (specFile) break;
      }
    }

    if (!specFile) {
      findings.push({
        id: 'dredd-no-spec',
        severity: 'info',
        message: 'No OpenAPI/Swagger specification file found. Dredd requires an API spec to validate.',
        suggestion: 'Add an openapi.yaml or swagger.json file to enable API contract testing.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Validate the API spec structure (dry-run, no live server needed)
    const output = runCli(`npx dredd "${specFile}" http://localhost:3000 --dry-run --reporter json 2>/dev/null`, targetPath, 60000);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const test of data.tests || []) {
          if (test.status === 'fail') {
            findings.push({
              id: `dredd-${test.title?.slice(0, 50) || 'unknown'}`,
              severity: 'error',
              message: `API contract violation: ${test.title}`,
              file: specFile,
              suggestion: test.message || 'Fix the API implementation to match the spec.',
            });
          }
        }

        // Check for spec validation warnings
        for (const warning of data.warnings || []) {
          findings.push({
            id: `dredd-warn-${warning.component || 'unknown'}`,
            severity: 'warning',
            message: `API spec issue: ${warning.message}`,
            file: specFile,
            suggestion: 'Update the API specification to resolve this issue.',
          });
        }
      } catch {
        // Dredd may output non-JSON; try parsing line output
        const lines = output.split('\n').filter(l => l.includes('fail') || l.includes('error'));
        for (const line of lines) {
          findings.push({
            id: `dredd-${findings.length}`,
            severity: 'warning',
            message: line.trim(),
            file: specFile,
          });
        }
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // SBOM Generator (CycloneDX Software Bill of Materials)
  // ─────────────────────────────────────────────────────────────
  'sbom-generator': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx @cyclonedx/cdxgen -o /dev/stdout --format json 2>/dev/null', targetPath, 120000);

    if (output) {
      try {
        const sbom = JSON.parse(output);
        const components = sbom.components || [];

        // Analyze components for issues
        let missingLicense = 0;
        let missingVersion = 0;
        let deprecatedPkgs = 0;

        for (const component of components) {
          if (!component.licenses || component.licenses.length === 0) {
            missingLicense++;
            if (missingLicense <= 20) { // Cap at 20 findings
              findings.push({
                id: `sbom-no-license-${component.name}`,
                severity: 'warning',
                message: `Component ${component.name}@${component.version || 'unknown'} has no license information`,
                file: 'package.json',
                suggestion: 'Ensure all dependencies have proper license declarations.',
              });
            }
          }

          if (!component.version) {
            missingVersion++;
            findings.push({
              id: `sbom-no-version-${component.name}`,
              severity: 'warning',
              message: `Component ${component.name} has no version pinned`,
              suggestion: 'Pin dependency versions for reproducible builds.',
            });
          }

          // Check for known problematic licenses
          const licenses = (component.licenses || [])
            .map((l: { license?: { id?: string }; expression?: string }) => l.license?.id || l.expression || '')
            .join(',');
          if (licenses.match(/GPL|AGPL|SSPL/i)) {
            findings.push({
              id: `sbom-copyleft-${component.name}`,
              severity: 'error',
              message: `Component ${component.name} uses copyleft license: ${licenses}`,
              file: 'package.json',
              suggestion: 'Review copyleft license compatibility with your project license.',
            });
          }
        }

        // Summary findings
        if (missingLicense > 20) {
          findings.push({
            id: 'sbom-license-summary',
            severity: 'warning',
            message: `${missingLicense} components total are missing license information (showing first 20)`,
          });
        }

        findings.push({
          id: 'sbom-summary',
          severity: 'info',
          message: `SBOM generated: ${components.length} components, ${missingLicense} missing licenses, ${missingVersion} missing versions`,
        });
      } catch {
        // JSON parse error
      }
    } else {
      findings.push({
        id: 'sbom-no-output',
        severity: 'info',
        message: 'Could not generate SBOM. Ensure the project has a supported manifest file (package.json, requirements.txt, go.mod, etc.)',
      });
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Release Risk Analyzer (git-based change risk analysis)
  // ─────────────────────────────────────────────────────────────
  'release-risk-analyzer': async ({ targetPath }) => {
    const findings: Finding[] = [];

    // Get recent changes (last 50 commits or since last tag)
    const lastTag = runCli('git describe --tags --abbrev=0 2>/dev/null', targetPath);
    const diffRange = lastTag?.trim() ? `${lastTag.trim()}..HEAD` : 'HEAD~50..HEAD';

    const diffStat = runCli(`git diff --stat ${diffRange} 2>/dev/null`, targetPath);
    const diffFiles = runCli(`git diff --name-only ${diffRange} 2>/dev/null`, targetPath);
    const commitCount = runCli(`git rev-list --count ${diffRange} 2>/dev/null`, targetPath);

    if (!diffFiles) {
      findings.push({
        id: 'risk-no-git',
        severity: 'info',
        message: 'No git history available for risk analysis.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    const files = diffFiles.trim().split('\n').filter(Boolean);
    const numCommits = parseInt(commitCount?.trim() || '0', 10);

    // High-risk pattern detection
    const authFiles = files.filter(f => /auth|login|session|token|oauth|jwt|password|credential/i.test(f));
    const infraFiles = files.filter(f => /dockerfile|docker-compose|\.env|terraform|k8s|kubernetes|helm|\.github\/workflows/i.test(f));
    const testFiles = files.filter(f => /\.test\.|\.spec\.|__tests__|__mocks__/i.test(f));
    const deletedTests = runCli(`git diff --diff-filter=D --name-only ${diffRange} 2>/dev/null`, targetPath);
    const removedTests = deletedTests?.trim().split('\n').filter(f => /\.test\.|\.spec\./i.test(f)) || [];
    const migrationFiles = files.filter(f => /migrat|schema|\.sql/i.test(f));
    const securityFiles = files.filter(f => /security|crypt|cipher|hash|secret|key/i.test(f));

    // Auth changes
    if (authFiles.length > 0) {
      findings.push({
        id: 'risk-auth-changes',
        severity: 'error',
        message: `${authFiles.length} authentication/authorization file(s) modified: ${authFiles.slice(0, 5).join(', ')}`,
        suggestion: 'Auth changes require thorough security review before release.',
      });
    }

    // Deleted tests
    if (removedTests.length > 0) {
      findings.push({
        id: 'risk-deleted-tests',
        severity: 'error',
        message: `${removedTests.length} test file(s) were deleted: ${removedTests.slice(0, 5).join(', ')}`,
        suggestion: 'Deleted tests reduce coverage. Ensure equivalent tests exist or deletion is intentional.',
      });
    }

    // Infrastructure changes
    if (infraFiles.length > 0) {
      findings.push({
        id: 'risk-infra-changes',
        severity: 'warning',
        message: `${infraFiles.length} infrastructure file(s) modified: ${infraFiles.slice(0, 5).join(', ')}`,
        suggestion: 'Infrastructure changes should be reviewed for security and availability impact.',
      });
    }

    // Database migrations
    if (migrationFiles.length > 0) {
      findings.push({
        id: 'risk-migrations',
        severity: 'warning',
        message: `${migrationFiles.length} database migration/schema file(s) modified: ${migrationFiles.slice(0, 5).join(', ')}`,
        suggestion: 'Database changes should be tested with rollback plans.',
      });
    }

    // Security-related file changes
    if (securityFiles.length > 0) {
      findings.push({
        id: 'risk-security-changes',
        severity: 'warning',
        message: `${securityFiles.length} security-related file(s) modified: ${securityFiles.slice(0, 5).join(', ')}`,
        suggestion: 'Security-sensitive code changes require dedicated security review.',
      });
    }

    // Large diff (>500 files or >50 commits)
    if (files.length > 500) {
      findings.push({
        id: 'risk-large-diff',
        severity: 'warning',
        message: `Large release: ${files.length} files changed across ${numCommits} commits`,
        suggestion: 'Consider breaking this into smaller, incremental releases to reduce risk.',
      });
    } else if (files.length > 100) {
      findings.push({
        id: 'risk-medium-diff',
        severity: 'info',
        message: `Medium release: ${files.length} files changed across ${numCommits} commits`,
      });
    }

    // Test coverage ratio
    const codeFiles = files.filter(f => !(/\.test\.|\.spec\.|__tests__|__mocks__/.test(f)));
    if (codeFiles.length > 10 && testFiles.length === 0) {
      findings.push({
        id: 'risk-no-tests',
        severity: 'warning',
        message: `${codeFiles.length} source files changed but no test files were modified`,
        suggestion: 'Changes without corresponding test updates increase regression risk.',
      });
    }

    // Summary
    const riskScore = (authFiles.length * 3) + (removedTests.length * 3) + (infraFiles.length * 2) + (migrationFiles.length * 2) + (securityFiles.length * 2) + Math.floor(files.length / 100);
    const riskLevel = riskScore >= 8 ? 'high' : riskScore >= 4 ? 'medium' : 'low';

    findings.push({
      id: 'risk-summary',
      severity: riskLevel === 'high' ? 'error' : riskLevel === 'medium' ? 'warning' : 'info',
      message: `Release risk: ${riskLevel} (score: ${riskScore}). ${files.length} files, ${numCommits} commits, ${authFiles.length} auth, ${infraFiles.length} infra, ${migrationFiles.length} migration, ${removedTests.length} deleted tests.`,
    });

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
  // axe-core (accessibility - requires URL, uses worker if configured)
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

    // Use worker service if configured (required for serverless environments)
    if (isWorkerConfigured()) {
      try {
        const scanId = `axe-${Date.now()}`;
        const result = await runAccessibilityScan({ scanId, url: targetUrl });

        for (const violation of result.violations || []) {
          findings.push({
            id: `axe-${violation.id}`,
            severity: violation.impact === 'critical' || violation.impact === 'serious' ? 'error' : 'warning',
            message: `${violation.description} (${violation.nodes?.length || 0} instances)`,
            rule: violation.id,
            suggestion: violation.help,
          });
        }

        return { findings, summary: summarizeFindings(findings) };
      } catch (error) {
        return {
          findings: [{
            id: 'axe-worker-error',
            severity: 'warning' as const,
            message: `Worker scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          summary: { total: 1, errors: 0, warnings: 1, info: 0 },
        };
      }
    }

    // Fallback to local CLI (only works if Chromium is installed)
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
  // Pa11y (accessibility - requires URL, uses worker if configured)
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

    // Use worker service if configured (required for serverless environments)
    if (isWorkerConfigured()) {
      try {
        const scanId = `pa11y-${Date.now()}`;
        const result = await runPa11yScan({ scanId, url: targetUrl });

        for (const issue of result.issues || []) {
          findings.push({
            id: `pa11y-${issue.code}`,
            severity: issue.type === 'error' ? 'error' : 'warning',
            message: issue.message,
            rule: issue.code,
            suggestion: issue.context,
          });
        }

        return { findings, summary: summarizeFindings(findings) };
      } catch (error) {
        return {
          findings: [{
            id: 'pa11y-worker-error',
            severity: 'warning' as const,
            message: `Worker scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          summary: { total: 1, errors: 0, warnings: 1, info: 0 },
        };
      }
    }

    // Fallback to local CLI (only works if Chromium is installed)
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
  // Lighthouse (performance - requires URL, uses worker if configured)
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

    // Use worker service if configured (required for serverless environments)
    if (isWorkerConfigured()) {
      try {
        const scanId = `lighthouse-${Date.now()}`;
        const result = await runLighthouseScan({ scanId, url: targetUrl });

        // Process audits from worker response
        for (const [id, audit] of Object.entries(result.audits || {})) {
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

        return { findings: findings.slice(0, 50), summary: summarizeFindings(findings) };
      } catch (error) {
        return {
          findings: [{
            id: 'lighthouse-worker-error',
            severity: 'warning' as const,
            message: `Worker scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          summary: { total: 1, errors: 0, warnings: 1, info: 0 },
        };
      }
    }

    // Fallback to local CLI (only works if Chromium is installed)
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

  // ─────────────────────────────────────────────────────────────
  // webhint (web best practices linter)
  // ─────────────────────────────────────────────────────────────
  'webhint': async ({ targetUrl }) => {
    if (!targetUrl) {
      return {
        findings: [{
          id: 'webhint-no-url',
          severity: 'info' as const,
          message: 'webhint requires a target URL for web best practices analysis',
        }],
        summary: { total: 1, errors: 0, warnings: 0, info: 1 },
      };
    }

    const findings: Finding[] = [];
    const output = runCli(`npx hint ${targetUrl} --formatters json 2>/dev/null`, process.cwd(), 120000);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const problem of data.problems || []) {
          findings.push({
            id: `webhint-${problem.hintId || 'unknown'}`,
            severity: problem.severity === 2 ? 'error' : problem.severity === 1 ? 'warning' : 'info',
            message: problem.message,
            rule: problem.hintId,
            suggestion: problem.documentation?.url,
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // accessibility-checker (IBM Equal Access)
  // ─────────────────────────────────────────────────────────────
  'accessibility-checker': async ({ targetUrl }) => {
    if (!targetUrl) {
      return {
        findings: [{
          id: 'a11y-no-url',
          severity: 'info' as const,
          message: 'accessibility-checker requires a target URL for accessibility testing',
        }],
        summary: { total: 1, errors: 0, warnings: 0, info: 1 },
      };
    }

    const findings: Finding[] = [];
    const output = runCli(`npx achecker ${targetUrl} --outputFormat json 2>/dev/null`, process.cwd(), 60000);

    if (output) {
      try {
        const data = JSON.parse(output);
        const results = data.results || data.report?.results || [];
        for (const result of results) {
          if (result.level === 'violation' || result.level === 'potentialviolation') {
            findings.push({
              id: `a11y-${result.ruleId || 'unknown'}`,
              severity: result.level === 'violation' ? 'error' : 'warning',
              message: result.message || result.reasonId,
              rule: result.ruleId,
              suggestion: result.help || result.snippet,
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
  // pyright (Python type checker - Microsoft)
  // ─────────────────────────────────────────────────────────────
  'pyright': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx pyright --outputjson 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const diag of data.generalDiagnostics || []) {
          findings.push({
            id: `pyright-${diag.rule || 'error'}`,
            severity: diag.severity === 'error' ? 'error' : 'warning',
            message: diag.message,
            file: diag.file,
            line: diag.range?.start?.line,
            rule: diag.rule,
          });
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // nbqa (Jupyter notebook quality)
  // ─────────────────────────────────────────────────────────────
  'nbqa': async ({ targetPath }) => {
    const findings: Finding[] = [];
    // Run ruff on notebooks via nbqa
    const output = runCli('npx nbqa ruff . --output-format=json 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const issue of data) {
          findings.push({
            id: `nbqa-${issue.code || 'unknown'}`,
            severity: issue.code?.startsWith('E') ? 'error' : 'warning',
            message: issue.message,
            file: issue.filename,
            line: issue.location?.row,
            rule: issue.code,
          });
        }
      } catch {
        // JSON parse error or no issues
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // eslint-plugin-vue (Vue.js linting rules)
  // ─────────────────────────────────────────────────────────────
  'eslint-plugin-vue': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx eslint --ext .vue --format json . 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const file of data) {
          for (const msg of file.messages || []) {
            if (msg.ruleId?.startsWith('vue/')) {
              findings.push({
                id: `vue-${msg.ruleId}`,
                severity: msg.severity === 2 ? 'error' : 'warning',
                message: msg.message,
                file: file.filePath,
                line: msg.line,
                rule: msg.ruleId,
              });
            }
          }
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // eslint-plugin-react (React linting rules)
  // ─────────────────────────────────────────────────────────────
  'eslint-plugin-react': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx eslint --ext .jsx,.tsx --format json . 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const file of data) {
          for (const msg of file.messages || []) {
            if (msg.ruleId?.startsWith('react/') || msg.ruleId?.startsWith('react-hooks/')) {
              findings.push({
                id: `react-${msg.ruleId}`,
                severity: msg.severity === 2 ? 'error' : 'warning',
                message: msg.message,
                file: file.filePath,
                line: msg.line,
                rule: msg.ruleId,
              });
            }
          }
        }
      } catch {
        // JSON parse error
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // OpenAPI Diff (API breaking change detection)
  // ─────────────────────────────────────────────────────────────
  'openapi-diff': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Look for OpenAPI spec files to compare against a base
    const specFiles = ['openapi.yaml', 'openapi.yml', 'openapi.json', 'swagger.yaml', 'swagger.yml', 'swagger.json'];
    let specFile: string | null = null;

    for (const name of specFiles) {
      try {
        await fs.access(path.join(targetPath, name));
        specFile = name;
        break;
      } catch { /* not found */ }
    }

    if (!specFile) {
      findings.push({
        id: 'openapi-diff-no-spec',
        severity: 'info',
        message: 'No OpenAPI/Swagger spec found. Add openapi.yaml to enable API diff checking.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Validate the spec structure
    const output = runCli(`npx @openapitools/openapi-diff "${specFile}" "${specFile}" --json 2>/dev/null`, targetPath, 60000);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const change of data.breakingDifferences || []) {
          findings.push({
            id: `openapi-diff-${change.id || findings.length}`,
            severity: 'error',
            message: `Breaking API change: ${change.action} ${change.path}`,
            file: specFile,
            suggestion: change.description || 'Review API compatibility before deploying.',
          });
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // GraphQL Inspector (schema validation)
  // ─────────────────────────────────────────────────────────────
  'graphql-inspector': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Search for GraphQL schema files
    const schemaFiles = ['schema.graphql', 'schema.gql', 'src/schema.graphql', 'graphql/schema.graphql'];
    let schemaFile: string | null = null;

    for (const name of schemaFiles) {
      try {
        await fs.access(path.join(targetPath, name));
        schemaFile = name;
        break;
      } catch { /* not found */ }
    }

    if (!schemaFile) {
      findings.push({
        id: 'graphql-no-schema',
        severity: 'info',
        message: 'No GraphQL schema found. Add schema.graphql to enable GraphQL inspection.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    const output = runCli(`npx @graphql-inspector/cli validate "${schemaFile}" "**/*.{ts,tsx,js,jsx,graphql}" 2>/dev/null`, targetPath, 60000);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes('error') || l.includes('warning') || l.includes('deprecated'));
      for (const line of lines) {
        const isError = line.toLowerCase().includes('error');
        findings.push({
          id: `gql-inspect-${findings.length}`,
          severity: isError ? 'error' : 'warning',
          message: line.trim(),
          file: schemaFile,
        });
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Newman (Postman collection runner)
  // ─────────────────────────────────────────────────────────────
  newman: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Look for Postman collection files
    const collectionPatterns = ['postman_collection.json', 'collection.json'];
    let collectionFile: string | null = null;

    for (const name of collectionPatterns) {
      try {
        const files = await fs.readdir(targetPath);
        const match = files.find(f => f.includes('postman') || f === name);
        if (match) { collectionFile = match; break; }
      } catch { /* error */ }
    }

    if (!collectionFile) {
      findings.push({
        id: 'newman-no-collection',
        severity: 'info',
        message: 'No Postman collection found. Add a *postman_collection.json file to enable API testing.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    const output = runCli(`npx newman run "${collectionFile}" --reporters json --reporter-json-export /dev/stdout 2>/dev/null`, targetPath, 120000);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const failure of data.run?.failures || []) {
          findings.push({
            id: `newman-${failure.error?.name || findings.length}`,
            severity: 'error',
            message: `API test failed: ${failure.source?.name || 'unknown'} - ${failure.error?.message || 'assertion failed'}`,
            file: collectionFile,
            suggestion: failure.error?.test || 'Fix the failing API test assertion.',
          });
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Pact (consumer-driven contract testing)
  // ─────────────────────────────────────────────────────────────
  pact: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Look for pact files
    let pactDir: string | null = null;
    for (const dir of ['pacts', 'pact/pacts', 'test/pacts']) {
      try {
        await fs.access(path.join(targetPath, dir));
        pactDir = dir;
        break;
      } catch { /* not found */ }
    }

    if (!pactDir) {
      findings.push({
        id: 'pact-no-dir',
        severity: 'info',
        message: 'No pact directory found. Add a pacts/ directory with contract files to enable contract verification.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Verify pact files are valid JSON
    try {
      const files = await fs.readdir(path.join(targetPath, pactDir));
      const pactFiles = files.filter(f => f.endsWith('.json'));

      for (const file of pactFiles) {
        try {
          const content = await fs.readFile(path.join(targetPath, pactDir, file), 'utf-8');
          const pact = JSON.parse(content);
          if (!pact.consumer || !pact.provider || !pact.interactions) {
            findings.push({
              id: `pact-invalid-${file}`,
              severity: 'error',
              message: `Invalid pact file: ${file} - missing consumer, provider, or interactions`,
              file: path.join(pactDir, file),
              suggestion: 'Ensure pact files have consumer, provider, and interactions fields.',
            });
          }
        } catch {
          findings.push({
            id: `pact-parse-${file}`,
            severity: 'error',
            message: `Cannot parse pact file: ${file}`,
            file: path.join(pactDir, file),
          });
        }
      }

      if (pactFiles.length === 0) {
        findings.push({
          id: 'pact-empty',
          severity: 'warning',
          message: `Pact directory ${pactDir} exists but contains no contract files`,
        });
      }
    } catch { /* read error */ }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // SonarQube (code quality via sonar-scanner CLI)
  // ─────────────────────────────────────────────────────────────
  sonarqube: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx sonarqube-scanner --help 2>/dev/null && npx sonar-scanner -Dsonar.projectBaseDir=. -Dsonar.sources=. 2>/dev/null', targetPath, 300000);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes('ERROR') || l.includes('WARN') || l.includes('BUG') || l.includes('VULNERABILITY'));
      for (const line of lines) {
        const isError = line.includes('ERROR') || line.includes('BUG') || line.includes('VULNERABILITY');
        findings.push({
          id: `sonarqube-${findings.length}`,
          severity: isError ? 'error' : 'warning',
          message: line.trim(),
          suggestion: 'Review SonarQube analysis for code quality improvements.',
        });
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // HTMLHint (HTML linter)
  // ─────────────────────────────────────────────────────────────
  htmlhint: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx htmlhint --format json "**/*.html" 2>/dev/null', targetPath);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const file of data) {
          for (const msg of file.messages || []) {
            findings.push({
              id: `htmlhint-${file.file}-${msg.line || 0}`,
              severity: msg.type === 'error' ? 'error' : 'warning',
              message: msg.message || msg.rule?.description || 'HTMLHint issue',
              file: file.file,
              line: msg.line,
              column: msg.col,
              rule: msg.rule?.id,
            });
          }
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Lizard (cyclomatic complexity analyzer)
  // ─────────────────────────────────────────────────────────────
  lizard: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('lizard --xml . 2>/dev/null || npx lizard --xml . 2>/dev/null', targetPath, 120000);

    if (output) {
      // Parse XML output for complexity issues
      const functionMatches = output.matchAll(/<item\s[^>]*name="([^"]*)"[^>]*>[\s\S]*?<cyclomatic_complexity>(\d+)<\/cyclomatic_complexity>[\s\S]*?<filename>([^<]*)<\/filename>/g);
      for (const match of functionMatches) {
        const complexity = parseInt(match[2], 10);
        if (complexity > 15) {
          findings.push({
            id: `lizard-${match[3]}-${match[1]}`,
            severity: complexity > 30 ? 'error' : 'warning',
            message: `Function ${match[1]} has cyclomatic complexity of ${complexity}`,
            file: match[3],
            suggestion: `Refactor to reduce complexity below 15. Current: ${complexity}.`,
          });
        }
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // ts-prune (find unused TypeScript exports)
  // ─────────────────────────────────────────────────────────────
  'ts-prune': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx ts-prune 2>/dev/null', targetPath, 120000);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes(' - '));
      for (const line of lines) {
        const match = line.match(/(.+?):(\d+)\s*-\s*(.+)/);
        if (match) {
          findings.push({
            id: `ts-prune-${match[1]}-${match[2]}`,
            severity: 'warning',
            message: `Unused export: ${match[3].trim()}`,
            file: match[1],
            line: parseInt(match[2], 10),
            suggestion: 'Remove unused export or mark as intentionally exported.',
          });
        }
      }
    }

    return { findings: findings.slice(0, 100), summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Bundle Analyzer (webpack/build bundle size analysis)
  // ─────────────────────────────────────────────────────────────
  'bundle-analyzer': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check for webpack stats or Next.js build output
    const statsFiles = ['.next/build-manifest.json', 'dist/stats.json', 'build/asset-manifest.json', 'stats.json'];
    let statsFile: string | null = null;

    for (const name of statsFiles) {
      try {
        await fs.access(path.join(targetPath, name));
        statsFile = name;
        break;
      } catch { /* not found */ }
    }

    if (statsFile) {
      try {
        const content = await fs.readFile(path.join(targetPath, statsFile), 'utf-8');
        const stats = JSON.parse(content);

        // Analyze assets for large files
        const assets = stats.assets || Object.entries(stats.pages || stats.files || {}).map(([name, info]) => ({
          name,
          size: typeof info === 'string' ? info.length : (info as { size?: number }).size || 0,
        }));

        for (const asset of assets) {
          const size = asset.size || 0;
          if (size > 500000) { // 500KB
            findings.push({
              id: `bundle-large-${asset.name}`,
              severity: size > 1000000 ? 'error' : 'warning',
              message: `Large bundle: ${asset.name} (${Math.round(size / 1024)}KB)`,
              file: statsFile,
              suggestion: 'Consider code splitting, lazy loading, or removing unused dependencies.',
            });
          }
        }
      } catch { /* parse error */ }
    }

    // Also check package.json for known heavy dependencies
    try {
      const pkgContent = await fs.readFile(path.join(targetPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgContent);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const heavyPackages: Record<string, string> = {
        'moment': 'Use date-fns or dayjs instead (moment is 300KB+)',
        'lodash': 'Import specific functions: lodash/get instead of lodash',
        'jquery': 'Consider native DOM APIs or a lightweight alternative',
      };

      for (const [dep, suggestion] of Object.entries(heavyPackages)) {
        if (allDeps[dep]) {
          findings.push({
            id: `bundle-heavy-${dep}`,
            severity: 'warning',
            message: `Heavy dependency detected: ${dep}`,
            file: 'package.json',
            suggestion,
          });
        }
      }
    } catch { /* no package.json */ }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Istanbul / nyc (code coverage analysis)
  // ─────────────────────────────────────────────────────────────
  istanbul: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check for existing coverage reports
    const coveragePaths = ['coverage/coverage-summary.json', 'coverage/coverage-final.json', '.nyc_output/coverage-summary.json'];
    let coverageFile: string | null = null;

    for (const name of coveragePaths) {
      try {
        await fs.access(path.join(targetPath, name));
        coverageFile = name;
        break;
      } catch { /* not found */ }
    }

    if (coverageFile) {
      try {
        const content = await fs.readFile(path.join(targetPath, coverageFile), 'utf-8');
        const coverage = JSON.parse(content);

        // Check total coverage
        const total = coverage.total || {};
        const metrics = ['lines', 'statements', 'functions', 'branches'];

        for (const metric of metrics) {
          const pct = total[metric]?.pct ?? -1;
          if (pct >= 0 && pct < 80) {
            findings.push({
              id: `istanbul-low-${metric}`,
              severity: pct < 50 ? 'error' : 'warning',
              message: `Low ${metric} coverage: ${pct}%`,
              file: coverageFile,
              suggestion: `Increase ${metric} coverage to at least 80%.`,
            });
          }
        }

        // Check per-file coverage for critically low files
        for (const [file, data] of Object.entries(coverage)) {
          if (file === 'total') continue;
          const fileData = data as { lines?: { pct: number }; statements?: { pct: number } };
          const linePct = fileData.lines?.pct ?? fileData.statements?.pct ?? -1;
          if (linePct >= 0 && linePct < 30) {
            findings.push({
              id: `istanbul-uncovered-${file}`,
              severity: 'warning',
              message: `Very low coverage (${linePct}%) in ${file}`,
              file,
              suggestion: 'Add tests for this file to improve coverage.',
            });
          }
        }
      } catch { /* parse error */ }
    } else {
      // Try to generate coverage report
      const output = runCli('npx nyc report --reporter json-summary 2>/dev/null', targetPath, 60000);
      if (!output) {
        findings.push({
          id: 'istanbul-no-coverage',
          severity: 'info',
          message: 'No coverage data found. Run tests with coverage enabled first.',
          suggestion: 'Run: npx nyc npm test, or configure jest with --coverage.',
        });
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Stryker (mutation testing)
  // ─────────────────────────────────────────────────────────────
  stryker: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check for existing Stryker report
    let reportFile: string | null = null;
    for (const name of ['reports/mutation/mutation.json', 'stryker-report.json']) {
      try {
        await fs.access(path.join(targetPath, name));
        reportFile = name;
        break;
      } catch { /* not found */ }
    }

    if (reportFile) {
      try {
        const content = await fs.readFile(path.join(targetPath, reportFile), 'utf-8');
        const report = JSON.parse(content);

        const mutationScore = report.schemaVersion
          ? report.files && Object.values(report.files).reduce((acc: number, f: unknown) => {
              const file = f as { mutants?: Array<{ status: string }> };
              const killed = file.mutants?.filter(m => m.status === 'Killed').length || 0;
              const total = file.mutants?.length || 0;
              return acc + (total > 0 ? (killed / total) * 100 : 0);
            }, 0) / Object.keys(report.files || {}).length
          : null;

        if (mutationScore !== null && mutationScore < 80) {
          findings.push({
            id: 'stryker-low-score',
            severity: mutationScore < 50 ? 'error' : 'warning',
            message: `Low mutation score: ${Math.round(mutationScore)}%`,
            suggestion: 'Improve test quality to catch more mutations. Target: 80%+.',
          });
        }
      } catch { /* parse error */ }
    } else {
      // Check for stryker config
      const hasConfig = await fs.access(path.join(targetPath, 'stryker.conf.js')).then(() => true).catch(() => false) ||
        await fs.access(path.join(targetPath, 'stryker.conf.mjs')).then(() => true).catch(() => false);

      if (hasConfig) {
        findings.push({
          id: 'stryker-no-report',
          severity: 'info',
          message: 'Stryker is configured but no mutation report found. Run stryker to generate a report.',
          suggestion: 'Run: npx stryker run',
        });
      } else {
        findings.push({
          id: 'stryker-not-configured',
          severity: 'info',
          message: 'Stryker mutation testing is not configured for this project.',
          suggestion: 'Run: npx stryker init',
        });
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // BackstopJS (visual regression testing)
  // ─────────────────────────────────────────────────────────────
  backstop: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check for BackstopJS config and reports
    let hasConfig = false;
    for (const name of ['backstop.json', 'backstop.config.js']) {
      try {
        await fs.access(path.join(targetPath, name));
        hasConfig = true;
        break;
      } catch { /* not found */ }
    }

    if (!hasConfig) {
      findings.push({
        id: 'backstop-no-config',
        severity: 'info',
        message: 'BackstopJS is not configured. Add backstop.json to enable visual regression testing.',
        suggestion: 'Run: npx backstop init',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Check for existing test report
    try {
      const reportPath = path.join(targetPath, 'backstop_data/json_report/jsonReport.json');
      const content = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(content);

      for (const test of report.tests || []) {
        if (test.status === 'fail') {
          findings.push({
            id: `backstop-fail-${test.pair?.label || findings.length}`,
            severity: 'error',
            message: `Visual regression: ${test.pair?.label || 'unknown'} (${test.pair?.viewportLabel || 'default'})`,
            file: test.pair?.reference,
            suggestion: 'Review visual diff and update reference if change is intentional.',
          });
        }
      }
    } catch {
      findings.push({
        id: 'backstop-no-report',
        severity: 'info',
        message: 'No BackstopJS report found. Run backstop test to generate visual comparisons.',
        suggestion: 'Run: npx backstop test',
      });
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Puppeteer (browser automation checks)
  // ─────────────────────────────────────────────────────────────
  puppeteer: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check for Puppeteer test files and configs
    const hasTests = await fs.readdir(targetPath).then(files =>
      files.some(f => f.includes('puppeteer') || f.includes('.e2e.'))
    ).catch(() => false);

    if (!hasTests) {
      findings.push({
        id: 'puppeteer-no-tests',
        severity: 'info',
        message: 'No Puppeteer test files found. Add *.e2e.ts or *puppeteer* files for browser automation.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Check for Puppeteer-related test results
    try {
      const reportPath = path.join(targetPath, 'test-results/e2e-results.json');
      const content = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(content);

      for (const suite of report.testResults || []) {
        for (const test of suite.testResults || []) {
          if (test.status === 'failed') {
            findings.push({
              id: `puppeteer-fail-${test.title || findings.length}`,
              severity: 'error',
              message: `E2E test failed: ${test.ancestorTitles?.join(' > ') || ''} > ${test.title}`,
              file: suite.testFilePath,
              suggestion: test.failureMessages?.[0]?.slice(0, 200) || 'Fix the failing E2E test.',
            });
          }
        }
      }
    } catch {
      // No report — just flag the presence of tests
      findings.push({
        id: 'puppeteer-tests-found',
        severity: 'info',
        message: 'Puppeteer test files detected. Run E2E tests to generate results.',
      });
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Storybook (component documentation and testing)
  // ─────────────────────────────────────────────────────────────
  storybook: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check for Storybook config
    let hasStorybook = false;
    for (const dir of ['.storybook', 'storybook']) {
      try {
        await fs.access(path.join(targetPath, dir));
        hasStorybook = true;
        break;
      } catch { /* not found */ }
    }

    if (!hasStorybook) {
      findings.push({
        id: 'storybook-not-configured',
        severity: 'info',
        message: 'Storybook is not configured. Add .storybook/ directory for component documentation.',
        suggestion: 'Run: npx storybook@latest init',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Check for story files
    const output = runCli('find . -name "*.stories.*" -not -path "*/node_modules/*" | head -100 2>/dev/null', targetPath);
    const storyFiles = output?.trim().split('\n').filter(Boolean) || [];

    // Check for components without stories
    const componentOutput = runCli('find . -name "*.tsx" -not -name "*.stories.*" -not -name "*.test.*" -not -path "*/node_modules/*" -path "*/components/*" | head -100 2>/dev/null', targetPath);
    const componentFiles = componentOutput?.trim().split('\n').filter(Boolean) || [];

    if (componentFiles.length > 0 && storyFiles.length === 0) {
      findings.push({
        id: 'storybook-no-stories',
        severity: 'warning',
        message: `Found ${componentFiles.length} component files but no stories`,
        suggestion: 'Add .stories.tsx files for your components.',
      });
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // git-secrets (AWS credentials in git)
  // ─────────────────────────────────────────────────────────────
  'git-secrets': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('git secrets --scan 2>&1', targetPath, 60000);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes(':'));
      for (const line of lines) {
        const match = line.match(/(.+?):(\d+):\s*(.*)/);
        if (match) {
          findings.push({
            id: `git-secrets-${match[1]}-${match[2]}`,
            severity: 'error',
            message: `Potential secret found: ${match[3].slice(0, 100)}`,
            file: match[1],
            line: parseInt(match[2], 10),
            suggestion: 'Remove the secret and rotate credentials immediately.',
          });
        }
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // detect-secrets (Yelp secret detection)
  // ─────────────────────────────────────────────────────────────
  'detect-secrets': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('detect-secrets scan --all-files 2>/dev/null', targetPath, 120000);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const [file, secrets] of Object.entries(data.results || {})) {
          for (const secret of secrets as Array<{ type: string; line_number: number; hashed_secret: string }>) {
            findings.push({
              id: `detect-secrets-${file}-${secret.line_number}`,
              severity: 'error',
              message: `Potential ${secret.type} found in ${file}:${secret.line_number}`,
              file,
              line: secret.line_number,
              suggestion: 'Remove hardcoded secret and use environment variables or a secrets manager.',
            });
          }
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // retire.js (known JS vulnerability scanner)
  // ─────────────────────────────────────────────────────────────
  retirejs: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx retire --outputformat json --path . 2>/dev/null', targetPath, 120000);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const result of data.data || data || []) {
          for (const vuln of result.results || []) {
            for (const vulnerability of vuln.vulnerabilities || []) {
              findings.push({
                id: `retire-${vuln.component}-${vulnerability.identifiers?.CVE?.[0] || findings.length}`,
                severity: vulnerability.severity === 'critical' || vulnerability.severity === 'high' ? 'error' : 'warning',
                message: `${vuln.component}@${vuln.version}: ${vulnerability.info || vulnerability.identifiers?.summary || 'Known vulnerability'}`,
                file: result.file,
                suggestion: `Update ${vuln.component} to a non-vulnerable version.`,
              });
            }
          }
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // write-good (English prose linter)
  // ─────────────────────────────────────────────────────────────
  'write-good': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('npx write-good **/*.md 2>/dev/null', targetPath, 60000);

    if (output) {
      const lines = output.split('\n').filter(l => l.includes(':'));
      for (const line of lines) {
        const match = line.match(/(.+?):(\d+):(\d+):\s*(.*)/);
        if (match) {
          findings.push({
            id: `write-good-${match[1]}-${match[2]}`,
            severity: 'info',
            message: match[4].trim(),
            file: match[1],
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10),
            suggestion: 'Consider rewording for clarity.',
          });
        }
      }
    }

    return { findings: findings.slice(0, 50), summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // ScanCode (license and copyright scanning)
  // ─────────────────────────────────────────────────────────────
  scancode: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('scancode --json-pp - --license --copyright --only-findings . 2>/dev/null', targetPath, 300000);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const file of data.files || []) {
          for (const license of file.licenses || []) {
            if (license.category === 'Copyleft' || license.spdx_license_key === 'LicenseRef-scancode-unknown') {
              findings.push({
                id: `scancode-${file.path}-${license.spdx_license_key}`,
                severity: license.category === 'Copyleft' ? 'error' : 'warning',
                message: `${license.category || 'Unknown'} license: ${license.spdx_license_key} in ${file.path}`,
                file: file.path,
                suggestion: 'Review license compatibility with your project.',
              });
            }
          }
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Artillery (load testing)
  // ─────────────────────────────────────────────────────────────
  artillery: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Look for Artillery config
    const configFiles = ['artillery.yml', 'artillery.yaml', 'artillery.json', 'load-test.yml'];
    let configFile: string | null = null;

    for (const name of configFiles) {
      try {
        await fs.access(path.join(targetPath, name));
        configFile = name;
        break;
      } catch { /* not found */ }
    }

    if (!configFile) {
      findings.push({
        id: 'artillery-no-config',
        severity: 'info',
        message: 'No Artillery load test configuration found.',
        suggestion: 'Add artillery.yml to define load test scenarios.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Validate the config
    const output = runCli(`npx artillery validate "${configFile}" 2>&1`, targetPath, 30000);
    if (output && output.toLowerCase().includes('error')) {
      findings.push({
        id: 'artillery-invalid-config',
        severity: 'error',
        message: `Artillery config validation failed: ${output.trim().slice(0, 200)}`,
        file: configFile,
        suggestion: 'Fix the Artillery configuration file.',
      });
    }

    // Check for existing report
    try {
      const reportPath = path.join(targetPath, 'artillery-report.json');
      const content = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(content);
      const aggregate = report.aggregate || {};

      if (aggregate.latency?.p99 > 2000) {
        findings.push({
          id: 'artillery-high-p99',
          severity: 'error',
          message: `High p99 latency: ${aggregate.latency.p99}ms`,
          suggestion: 'Optimize slow endpoints to reduce p99 latency below 2000ms.',
        });
      }

      if (aggregate.counters?.['http.codes.500'] > 0) {
        findings.push({
          id: 'artillery-server-errors',
          severity: 'error',
          message: `${aggregate.counters['http.codes.500']} server errors during load test`,
          suggestion: 'Investigate and fix 500 errors under load.',
        });
      }
    } catch { /* no report */ }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // JMeter (load testing via CLI)
  // ─────────────────────────────────────────────────────────────
  jmeter: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Look for JMeter test plans
    const files = await fs.readdir(targetPath).catch(() => [] as string[]);
    const jmxFiles = files.filter(f => f.endsWith('.jmx'));

    if (jmxFiles.length === 0) {
      findings.push({
        id: 'jmeter-no-plans',
        severity: 'info',
        message: 'No JMeter test plans (.jmx) found.',
        suggestion: 'Add .jmx test plan files for load testing.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Check for JMeter results
    const resultFiles = files.filter(f => f.endsWith('.jtl') || f.endsWith('.csv'));
    if (resultFiles.length > 0) {
      try {
        const content = await fs.readFile(path.join(targetPath, resultFiles[0]), 'utf-8');
        const lines = content.split('\n').slice(1); // Skip header
        let errorCount = 0;
        let totalCount = 0;

        for (const line of lines) {
          if (!line.trim()) continue;
          totalCount++;
          const fields = line.split(',');
          if (fields[7] === 'false' || fields[3] === 'false') {
            errorCount++;
          }
        }

        if (errorCount > 0) {
          findings.push({
            id: 'jmeter-errors',
            severity: 'error',
            message: `${errorCount}/${totalCount} requests failed in load test`,
            file: resultFiles[0],
            suggestion: 'Investigate failed requests and improve error handling.',
          });
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // k6 (load testing)
  // ─────────────────────────────────────────────────────────────
  k6: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Look for k6 test scripts
    const files = await fs.readdir(targetPath).catch(() => [] as string[]);
    const k6Files = files.filter(f => f.includes('k6') || f.includes('load-test'));

    if (k6Files.length === 0) {
      findings.push({
        id: 'k6-no-scripts',
        severity: 'info',
        message: 'No k6 test scripts found.',
        suggestion: 'Add k6 test scripts for load testing (e.g., k6-test.js).',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Check for k6 summary output
    try {
      const summaryPath = path.join(targetPath, 'k6-summary.json');
      const content = await fs.readFile(summaryPath, 'utf-8');
      const summary = JSON.parse(content);

      const httpReqDuration = summary.metrics?.http_req_duration;
      if (httpReqDuration?.values?.['p(95)'] > 2000) {
        findings.push({
          id: 'k6-high-p95',
          severity: 'error',
          message: `High p95 response time: ${Math.round(httpReqDuration.values['p(95)'])}ms`,
          suggestion: 'Optimize API performance to reduce p95 below 2000ms.',
        });
      }

      const httpReqFailed = summary.metrics?.http_req_failed;
      if (httpReqFailed?.values?.rate > 0.01) {
        findings.push({
          id: 'k6-high-failure-rate',
          severity: 'error',
          message: `High failure rate: ${(httpReqFailed.values.rate * 100).toFixed(2)}%`,
          suggestion: 'Investigate request failures under load.',
        });
      }
    } catch { /* no summary */ }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Locust (Python load testing)
  // ─────────────────────────────────────────────────────────────
  locust: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Look for locust files
    const files = await fs.readdir(targetPath).catch(() => [] as string[]);
    const locustFiles = files.filter(f => f.includes('locust') && f.endsWith('.py'));

    if (locustFiles.length === 0) {
      findings.push({
        id: 'locust-no-files',
        severity: 'info',
        message: 'No Locust test files found.',
        suggestion: 'Add locustfile.py for Python-based load testing.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Check for locust report
    try {
      const reportPath = path.join(targetPath, 'locust_report.json');
      const content = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(content);

      for (const stat of report.stats || []) {
        if (stat.avg_response_time > 2000) {
          findings.push({
            id: `locust-slow-${stat.name}`,
            severity: 'error',
            message: `Slow endpoint: ${stat.method} ${stat.name} (avg: ${Math.round(stat.avg_response_time)}ms)`,
            suggestion: 'Optimize endpoint performance.',
          });
        }
        if (stat.num_failures > 0) {
          findings.push({
            id: `locust-failures-${stat.name}`,
            severity: 'error',
            message: `${stat.num_failures} failures for ${stat.method} ${stat.name}`,
            suggestion: 'Investigate and fix failures under load.',
          });
        }
      }
    } catch { /* no report */ }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // WebPageTest (web performance analysis)
  // ─────────────────────────────────────────────────────────────
  webpagetest: async ({ targetUrl }) => {
    const findings: Finding[] = [];

    if (!targetUrl) {
      findings.push({
        id: 'wpt-no-url',
        severity: 'info',
        message: 'WebPageTest requires a target URL for performance analysis.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    const output = runCli(`npx webpagetest test ${targetUrl} --json 2>/dev/null`, process.cwd(), 300000);

    if (output) {
      try {
        const data = JSON.parse(output);
        const firstView = data.data?.median?.firstView || {};

        if (firstView.TTFB > 600) {
          findings.push({
            id: 'wpt-slow-ttfb',
            severity: firstView.TTFB > 1000 ? 'error' : 'warning',
            message: `Slow TTFB: ${firstView.TTFB}ms`,
            suggestion: 'Optimize server response time (target: <600ms).',
          });
        }

        if (firstView.SpeedIndex > 3000) {
          findings.push({
            id: 'wpt-slow-speed-index',
            severity: 'warning',
            message: `Speed Index: ${firstView.SpeedIndex}`,
            suggestion: 'Improve page load speed (target: <3000).',
          });
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // kube-bench (Kubernetes CIS benchmark)
  // ─────────────────────────────────────────────────────────────
  kubebench: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('kube-bench --json 2>/dev/null', targetPath, 120000);

    if (output) {
      try {
        const data = JSON.parse(output);
        for (const control of data.Controls || []) {
          for (const test of control.tests || []) {
            for (const result of test.results || []) {
              if (result.status === 'FAIL') {
                findings.push({
                  id: `kubebench-${result.test_number}`,
                  severity: 'error',
                  message: `[${result.test_number}] ${result.test_desc}`,
                  suggestion: result.remediation || 'Review CIS Kubernetes Benchmark documentation.',
                });
              } else if (result.status === 'WARN') {
                findings.push({
                  id: `kubebench-${result.test_number}`,
                  severity: 'warning',
                  message: `[${result.test_number}] ${result.test_desc}`,
                  suggestion: result.remediation,
                });
              }
            }
          }
        }
      } catch { /* parse error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Litmus (chaos engineering)
  // ─────────────────────────────────────────────────────────────
  litmus: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Look for Litmus chaos experiment files
    const files = await fs.readdir(targetPath).catch(() => [] as string[]);
    const chaosFiles = files.filter(f => f.includes('chaos') || f.includes('litmus'));

    if (chaosFiles.length === 0) {
      findings.push({
        id: 'litmus-no-experiments',
        severity: 'info',
        message: 'No Litmus chaos experiment files found.',
        suggestion: 'Add chaos experiment YAML files for resilience testing.',
      });
      return { findings, summary: summarizeFindings(findings) };
    }

    // Validate experiment YAML structure
    for (const file of chaosFiles) {
      try {
        const content = await fs.readFile(path.join(targetPath, file), 'utf-8');
        if (content.includes('kind: ChaosEngine') || content.includes('kind: ChaosExperiment')) {
          if (!content.includes('appinfo') && !content.includes('appLabel')) {
            findings.push({
              id: `litmus-no-target-${file}`,
              severity: 'warning',
              message: `Chaos experiment ${file} has no target application defined`,
              file,
              suggestion: 'Add appinfo or appLabel to target the experiment.',
            });
          }
        }
      } catch { /* read error */ }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // SchemaSpy (database schema documentation/analysis)
  // ─────────────────────────────────────────────────────────────
  schemaspy: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check for database connection config or existing SchemaSpy output
    const hasDbConfig = await fs.access(path.join(targetPath, 'schemaspy.properties')).then(() => true).catch(() => false);

    if (!hasDbConfig) {
      // Check for common ORM/migration files that indicate database usage
      const files = await fs.readdir(targetPath).catch(() => [] as string[]);
      const hasDb = files.some(f => f.includes('migration') || f.includes('schema') || f.includes('prisma'));

      if (hasDb) {
        findings.push({
          id: 'schemaspy-no-config',
          severity: 'info',
          message: 'Database detected but SchemaSpy is not configured.',
          suggestion: 'Add schemaspy.properties to enable database schema analysis.',
        });
      } else {
        findings.push({
          id: 'schemaspy-no-db',
          severity: 'info',
          message: 'No database schema files detected.',
        });
      }
      return { findings, summary: summarizeFindings(findings) };
    }

    // Run SchemaSpy
    const output = runCli('java -jar schemaspy.jar -configFile schemaspy.properties -o schemaspy-output 2>&1', targetPath, 120000);
    if (output && output.includes('ERROR')) {
      findings.push({
        id: 'schemaspy-error',
        severity: 'error',
        message: `SchemaSpy analysis failed: ${output.split('\n').find(l => l.includes('ERROR'))?.trim() || 'Unknown error'}`,
        suggestion: 'Check database connection settings in schemaspy.properties.',
      });
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // OpenTelemetry (observability configuration analysis)
  // ─────────────────────────────────────────────────────────────
  opentelemetry: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check package.json for OTEL dependencies
    try {
      const pkgContent = await fs.readFile(path.join(targetPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgContent);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      const otelPackages = Object.keys(allDeps).filter(d => d.includes('opentelemetry'));
      if (otelPackages.length === 0) {
        findings.push({
          id: 'otel-not-installed',
          severity: 'info',
          message: 'OpenTelemetry SDK is not installed.',
          suggestion: 'Install @opentelemetry/sdk-node for observability.',
        });
        return { findings, summary: summarizeFindings(findings) };
      }

      // Check for required OTEL components
      const hasTracing = otelPackages.some(p => p.includes('trace'));
      const hasMetrics = otelPackages.some(p => p.includes('metrics'));
      const hasExporter = otelPackages.some(p => p.includes('exporter'));

      if (!hasTracing) {
        findings.push({
          id: 'otel-no-tracing',
          severity: 'warning',
          message: 'OpenTelemetry installed but no tracing package found.',
          suggestion: 'Install @opentelemetry/sdk-trace-node for distributed tracing.',
        });
      }

      if (!hasMetrics) {
        findings.push({
          id: 'otel-no-metrics',
          severity: 'info',
          message: 'No OpenTelemetry metrics package found.',
          suggestion: 'Install @opentelemetry/sdk-metrics for application metrics.',
        });
      }

      if (!hasExporter) {
        findings.push({
          id: 'otel-no-exporter',
          severity: 'warning',
          message: 'No OpenTelemetry exporter configured.',
          suggestion: 'Install an exporter (e.g., @opentelemetry/exporter-trace-otlp-http).',
        });
      }
    } catch {
      findings.push({
        id: 'otel-no-package',
        severity: 'info',
        message: 'No package.json found to analyze OpenTelemetry configuration.',
      });
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Sentry (error tracking configuration analysis)
  // ─────────────────────────────────────────────────────────────
  sentry: async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Check for Sentry SDK installation
    try {
      const pkgContent = await fs.readFile(path.join(targetPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgContent);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      const sentryPkgs = Object.keys(allDeps).filter(d => d.includes('@sentry'));
      if (sentryPkgs.length === 0) {
        findings.push({
          id: 'sentry-not-installed',
          severity: 'info',
          message: 'Sentry SDK is not installed.',
          suggestion: 'Install @sentry/node or @sentry/nextjs for error tracking.',
        });
        return { findings, summary: summarizeFindings(findings) };
      }

      // Check for Sentry config files
      const configFiles = ['sentry.client.config.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts', '.sentryclirc', 'sentry.properties'];
      for (const config of configFiles) {
        try {
          await fs.access(path.join(targetPath, config));
        } catch {
          // Check if this config is needed based on installed packages
          if (config.includes('client') && sentryPkgs.some(p => p.includes('nextjs') || p.includes('browser'))) {
            findings.push({
              id: `sentry-missing-${config}`,
              severity: 'warning',
              message: `Missing Sentry config: ${config}`,
              suggestion: `Create ${config} to properly initialize Sentry.`,
            });
          }
        }
      }

      // Check for source map upload configuration
      if (!allDeps['@sentry/webpack-plugin'] && !allDeps['@sentry/nextjs']) {
        findings.push({
          id: 'sentry-no-sourcemaps',
          severity: 'info',
          message: 'Sentry source map upload is not configured.',
          suggestion: 'Add @sentry/webpack-plugin for readable stack traces in production.',
        });
      }
    } catch {
      findings.push({
        id: 'sentry-no-package',
        severity: 'info',
        message: 'No package.json found to analyze Sentry configuration.',
      });
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Environment Profiles (AI-based environment analysis)
  // ─────────────────────────────────────────────────────────────
  'environment-profiles': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Analyze environment configuration files
    const envFiles: string[] = [];
    const files = await fs.readdir(targetPath).catch(() => [] as string[]);

    for (const file of files) {
      if (file.startsWith('.env') || file.includes('env.') || file === 'docker-compose.yml') {
        envFiles.push(file);
      }
    }

    // Check for common environment issues
    const hasEnvExample = envFiles.some(f => f.includes('example') || f.includes('sample'));
    const hasEnvLocal = envFiles.some(f => f.includes('local'));
    const hasEnvProduction = envFiles.some(f => f.includes('production') || f.includes('prod'));

    if (!hasEnvExample) {
      findings.push({
        id: 'envprofile-no-example',
        severity: 'warning',
        message: 'No .env.example file found.',
        suggestion: 'Add .env.example so developers know which environment variables are needed.',
      });
    }

    // Check .gitignore for .env
    try {
      const gitignore = await fs.readFile(path.join(targetPath, '.gitignore'), 'utf-8');
      if (!gitignore.includes('.env')) {
        findings.push({
          id: 'envprofile-not-ignored',
          severity: 'error',
          message: '.env files are not in .gitignore',
          suggestion: 'Add .env* to .gitignore to prevent secrets from being committed.',
        });
      }
    } catch { /* no gitignore */ }

    // Check for environment variable usage consistency
    try {
      const envExample = await fs.readFile(path.join(targetPath, '.env.example'), 'utf-8').catch(() => '');
      const exampleVars = envExample.split('\n').filter(l => l.includes('=')).map(l => l.split('=')[0].trim());

      if (exampleVars.length > 0) {
        findings.push({
          id: 'envprofile-summary',
          severity: 'info',
          message: `Environment profile: ${exampleVars.length} variables defined, ${envFiles.length} env files, ${hasEnvProduction ? 'production config exists' : 'no production config'}`,
        });
      }
    } catch { /* no example file */ }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Finding Intelligence (cross-tool finding analysis)
  // ─────────────────────────────────────────────────────────────
  'finding-intelligence': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Analyze package.json for security posture signals
    try {
      const pkgContent = await fs.readFile(path.join(targetPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgContent);
      const allDeps = { ...pkg.dependencies };
      const devDeps = { ...pkg.devDependencies };

      // Check for security-related tooling
      const hasTestFramework = Object.keys(devDeps).some(d => ['jest', 'vitest', 'mocha', 'ava'].includes(d));
      const hasLinter = Object.keys(devDeps).some(d => ['eslint', 'biome', 'oxlint'].includes(d));
      const hasTypeChecking = !!devDeps['typescript'];
      const hasSecurityDep = Object.keys(allDeps).some(d => d.includes('helmet') || d.includes('csurf') || d.includes('rate-limit'));

      let securityScore = 0;
      if (hasTestFramework) securityScore += 25;
      if (hasLinter) securityScore += 20;
      if (hasTypeChecking) securityScore += 25;
      if (hasSecurityDep) securityScore += 30;

      findings.push({
        id: 'intel-security-posture',
        severity: securityScore < 50 ? 'warning' : 'info',
        message: `Security posture score: ${securityScore}/100 (tests: ${hasTestFramework ? 'yes' : 'no'}, lint: ${hasLinter ? 'yes' : 'no'}, types: ${hasTypeChecking ? 'yes' : 'no'}, security deps: ${hasSecurityDep ? 'yes' : 'no'})`,
        suggestion: securityScore < 50 ? 'Improve security posture by adding testing, linting, and security dependencies.' : undefined,
      });

      // Check dependency count (risk signal)
      const depCount = Object.keys(allDeps).length;
      if (depCount > 100) {
        findings.push({
          id: 'intel-high-dep-count',
          severity: 'warning',
          message: `High dependency count: ${depCount} production dependencies`,
          suggestion: 'Review dependencies and remove unnecessary packages to reduce attack surface.',
        });
      }
    } catch { /* no package.json */ }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Report Generator (scan summary and recommendations)
  // ─────────────────────────────────────────────────────────────
  'report-generator': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    // Analyze project structure for report generation
    const projectFiles = await fs.readdir(targetPath).catch(() => [] as string[]);

    // Detect project type
    const hasPackageJson = projectFiles.includes('package.json');
    const hasDockerfile = projectFiles.includes('Dockerfile');
    const hasCI = projectFiles.includes('.github') || projectFiles.includes('.gitlab-ci.yml') || projectFiles.includes('Jenkinsfile');
    const hasTsConfig = projectFiles.includes('tsconfig.json');

    const technologies: string[] = [];
    if (hasPackageJson) technologies.push('Node.js');
    if (hasTsConfig) technologies.push('TypeScript');
    if (hasDockerfile) technologies.push('Docker');
    if (hasCI) technologies.push('CI/CD');

    // Check for README and documentation
    const hasReadme = projectFiles.some(f => f.toLowerCase().startsWith('readme'));
    const hasDocs = projectFiles.includes('docs') || projectFiles.includes('documentation');
    const hasChangelog = projectFiles.some(f => f.toLowerCase().includes('changelog'));
    const hasLicense = projectFiles.some(f => f.toLowerCase().includes('license'));

    if (!hasReadme) {
      findings.push({
        id: 'report-no-readme',
        severity: 'warning',
        message: 'No README file found.',
        suggestion: 'Add a README.md with project description, setup instructions, and usage.',
      });
    }

    if (!hasChangelog) {
      findings.push({
        id: 'report-no-changelog',
        severity: 'info',
        message: 'No CHANGELOG found.',
        suggestion: 'Add a CHANGELOG.md to track version history.',
      });
    }

    if (!hasLicense) {
      findings.push({
        id: 'report-no-license',
        severity: 'warning',
        message: 'No LICENSE file found.',
        suggestion: 'Add a LICENSE file to define usage rights.',
      });
    }

    findings.push({
      id: 'report-project-summary',
      severity: 'info',
      message: `Project: ${technologies.join(', ') || 'unknown'} | ${projectFiles.length} root files | Docs: ${hasReadme ? 'README' : 'none'}${hasDocs ? ', docs/' : ''}${hasChangelog ? ', CHANGELOG' : ''} | CI: ${hasCI ? 'yes' : 'no'}`,
    });

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Hadolint (Dockerfile linter - binary pre-installed in Docker)
  // ─────────────────────────────────────────────────────────────
  'hadolint': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const path = await import('path');
    const { glob } = safeRequire<typeof import('glob')>('glob');

    // Find all Dockerfiles
    const dockerfiles = await glob('**/Dockerfile*', {
      cwd: targetPath,
      ignore: ['**/node_modules/**'],
    });

    for (const dockerfile of dockerfiles) {
      const fullPath = path.join(targetPath, dockerfile);
      const output = runCli(`hadolint --format json "${fullPath}" 2>/dev/null`, targetPath);

      if (output) {
        try {
          const issues = JSON.parse(output);
          for (const issue of issues) {
            findings.push({
              id: `hadolint-${dockerfile}-${issue.line}`,
              severity: issue.level === 'error' ? 'error' : issue.level === 'warning' ? 'warning' : 'info',
              message: `${issue.code}: ${issue.message}`,
              file: dockerfile,
              line: issue.line,
              rule: issue.code,
              suggestion: issue.message,
            });
          }
        } catch {
          // JSON parse error - try text output
        }
      }
    }

    if (dockerfiles.length === 0) {
      findings.push({
        id: 'hadolint-no-dockerfile',
        severity: 'info',
        message: 'No Dockerfile found in the repository',
      });
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Gitleaks (secret detection - binary pre-installed in Docker)
  // ─────────────────────────────────────────────────────────────
  'gitleaks': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli('gitleaks detect --source . --report-format json --report-path /dev/stdout --no-git 2>/dev/null', targetPath);

    if (output) {
      try {
        const leaks = JSON.parse(output);
        for (const leak of leaks) {
          findings.push({
            id: `gitleaks-${leak.File}-${leak.StartLine}`,
            severity: 'error',
            message: `Potential secret detected: ${leak.Description || leak.RuleID}`,
            file: leak.File,
            line: leak.StartLine,
            rule: leak.RuleID,
            suggestion: 'Remove hardcoded secret and use environment variables or a secret manager',
          });
        }
      } catch {
        // JSON parse error or no leaks found (empty output)
      }
    }

    return { findings, summary: summarizeFindings(findings) };
  },

  // ─────────────────────────────────────────────────────────────
  // Dockle (container image linter - binary pre-installed in Docker)
  // ─────────────────────────────────────────────────────────────
  'dockle': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const path = await import('path');
    const fs = await import('fs/promises');

    // Check if there's a Dockerfile to analyze
    const dockerfilePath = path.join(targetPath, 'Dockerfile');
    try {
      await fs.access(dockerfilePath);
    } catch {
      return {
        findings: [{
          id: 'dockle-no-dockerfile',
          severity: 'info' as const,
          message: 'Dockle requires a built Docker image. No Dockerfile found to provide context.',
          suggestion: 'Build a Docker image and provide the image name for analysis',
        }],
        summary: { total: 1, errors: 0, warnings: 0, info: 1 },
      };
    }

    // Dockle analyzes built images, not Dockerfiles directly
    // For now, we'll provide guidance since we can't build images during scan
    return {
      findings: [{
        id: 'dockle-image-required',
        severity: 'info' as const,
        message: 'Dockle analyzes built Docker images for security best practices',
        suggestion: 'Run: dockle <image-name> after building your Docker image',
      }],
      summary: { total: 1, errors: 0, warnings: 0, info: 1 },
    };
  },

  // ─────────────────────────────────────────────────────────────
  // Syft (SBOM generator - binary pre-installed in Docker)
  // ─────────────────────────────────────────────────────────────
  'syft': async ({ targetPath }) => {
    const findings: Finding[] = [];
    const output = runCli(`syft dir:${targetPath} -o json 2>/dev/null`, targetPath, 180000);

    if (output) {
      try {
        const sbom = JSON.parse(output);
        const artifacts = sbom.artifacts || [];

        // Analyze SBOM for potential issues
        let unknownLicenses = 0;

        for (const artifact of artifacts) {
          // Check for unknown/missing licenses
          if (!artifact.licenses || artifact.licenses.length === 0) {
            unknownLicenses++;
          }

          // Check for packages without versions (potential issues)
          if (!artifact.version || artifact.version === '') {
            findings.push({
              id: `syft-no-version-${artifact.name}`,
              severity: 'warning',
              message: `Package ${artifact.name} has no version specified`,
              suggestion: 'Ensure all dependencies have pinned versions for reproducible builds',
            });
          }
        }

        // Summary finding for license issues
        if (unknownLicenses > 0) {
          findings.push({
            id: 'syft-unknown-licenses',
            severity: 'warning',
            message: `${unknownLicenses} packages have unknown or missing licenses`,
            suggestion: 'Review packages without licenses for compliance requirements',
          });
        }

        // Add informational SBOM summary
        findings.push({
          id: 'syft-sbom-generated',
          severity: 'info',
          message: `SBOM generated: ${artifacts.length} packages cataloged`,
          suggestion: 'Full SBOM available for supply chain security analysis',
        });

      } catch {
        findings.push({
          id: 'syft-error',
          severity: 'warning',
          message: 'Could not generate SBOM',
          suggestion: 'Ensure syft is properly installed and has access to the codebase',
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
