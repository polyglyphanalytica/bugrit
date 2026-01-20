// ESLint Pure JS Runner
// Runs ESLint directly via npm package without spawning processes

import { AuditFinding, AuditResult, Severity } from '../types';

interface ESLintMessage {
  ruleId: string | null;
  severity: 1 | 2;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fix?: {
    range: [number, number];
    text: string;
  };
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
  errorCount: number;
  warningCount: number;
  source?: string;
}

export async function runESLint(
  targetDir: string,
  options: {
    extensions?: string[];
    configFile?: string;
    fix?: boolean;
  } = {}
): Promise<AuditResult> {
  const startTime = Date.now();
  const findings: AuditFinding[] = [];

  try {
    // Dynamic import to avoid bundling issues
    const { ESLint } = await import('eslint');

    const eslint = new ESLint({
      cwd: targetDir,
      extensions: options.extensions || ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
      overrideConfigFile: options.configFile,
      fix: options.fix || false,
      errorOnUnmatchedPattern: false,
    });

    const results: ESLintResult[] = await eslint.lintFiles([targetDir]);

    if (options.fix) {
      await ESLint.outputFixes(results);
    }

    for (const result of results) {
      for (const message of result.messages) {
        findings.push(convertToFinding(result.filePath, message, result.source));
      }
    }

    return createResult(findings, Date.now() - startTime);
  } catch (error) {
    return {
      tool: 'ESLint',
      category: 'code-quality',
      success: false,
      duration: Date.now() - startTime,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error: error instanceof Error ? error.message : 'Failed to run ESLint',
    };
  }
}

function convertToFinding(filePath: string, message: ESLintMessage, source?: string): AuditFinding {
  const severity: Severity = message.severity === 2 ? 'medium' : 'low';
  const ruleId = message.ruleId || 'unknown';

  // Extract code snippet if source is available
  let codeSnippet: string | undefined;
  if (source) {
    const lines = source.split('\n');
    const startLine = Math.max(0, message.line - 2);
    const endLine = Math.min(lines.length, (message.endLine || message.line) + 1);
    codeSnippet = lines.slice(startLine, endLine).join('\n');
  }

  return {
    id: `eslint-${filePath}-${message.line}-${ruleId}`,
    tool: 'ESLint',
    category: 'code-quality',
    severity,
    title: `ESLint: ${ruleId}`,
    description: message.message,
    explanation: `ESLint detected a code quality issue with rule "${ruleId}". This indicates a potential problem with code style, potential bugs, or maintainability concerns.`,
    impact: severity === 'medium'
      ? 'This error-level issue may cause bugs or indicates poor code quality that should be addressed.'
      : 'This warning indicates a code style or potential issue that should be reviewed.',
    file: filePath,
    line: message.line,
    column: message.column,
    endLine: message.endLine,
    endColumn: message.endColumn,
    codeSnippet,
    recommendation: message.fix
      ? 'This issue can be automatically fixed. Run ESLint with --fix flag.'
      : `Review the code at line ${message.line} and fix the issue according to the ESLint rule documentation.`,
    fixExample: message.fix?.text,
    documentationUrl: `https://eslint.org/docs/latest/rules/${ruleId}`,
    aiPrompt: {
      short: `Fix ESLint ${ruleId} error in ${filePath} at line ${message.line}`,
      detailed: `Fix the ESLint error in ${filePath}.

Rule: ${ruleId}
Line: ${message.line}, Column: ${message.column}
Message: ${message.message}

${codeSnippet ? `Code:\n\`\`\`\n${codeSnippet}\n\`\`\`` : ''}

Please fix this issue while maintaining the code's functionality.`,
      steps: [
        `Open ${filePath} and go to line ${message.line}`,
        `Understand the ESLint rule: ${ruleId}`,
        message.fix ? 'Apply the suggested auto-fix or manually fix the issue' : 'Manually fix the code to comply with the rule',
        'Verify the fix does not break functionality',
      ],
    },
    ruleId,
    tags: ['eslint', 'code-quality', ruleId],
    effort: message.fix ? 'trivial' : 'low',
    autoFixable: !!message.fix,
  };
}

function createResult(findings: AuditFinding[], duration: number): AuditResult {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => bySeverity[f.severity]++);

  return {
    tool: 'ESLint',
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
