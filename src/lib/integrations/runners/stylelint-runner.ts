// Stylelint Pure JS Runner

import { AuditFinding, AuditResult, Severity } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface StylelintWarning {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  rule: string;
  severity: 'error' | 'warning';
  text: string;
}

interface StylelintFileResult {
  source: string;
  warnings: StylelintWarning[];
  errored: boolean;
}

export async function runStylelint(
  targetDir: string,
  options: {
    configFile?: string;
    fix?: boolean;
  } = {}
): Promise<AuditResult> {
  const startTime = Date.now();
  const findings: AuditFinding[] = [];

  try {
    const stylelint = safeRequire<typeof import('stylelint')>('stylelint');

    const result = await stylelint.default.lint({
      files: `${targetDir}/**/*.{css,scss,sass,less}`,
      fix: options.fix || false,
      configFile: options.configFile,
    });

    for (const fileResult of result.results as StylelintFileResult[]) {
      for (const warning of fileResult.warnings) {
        findings.push(convertToFinding(fileResult.source, warning));
      }
    }

    return createResult(findings, Date.now() - startTime);
  } catch (error) {
    return {
      tool: 'Stylelint',
      category: 'code-quality',
      success: false,
      duration: Date.now() - startTime,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error: error instanceof Error ? error.message : 'Failed to run Stylelint',
    };
  }
}

function convertToFinding(filePath: string, warning: StylelintWarning): AuditFinding {
  const severity: Severity = warning.severity === 'error' ? 'medium' : 'low';

  return {
    id: `stylelint-${filePath}-${warning.line}-${warning.rule}`,
    tool: 'Stylelint',
    category: 'code-quality',
    severity,
    title: `Stylelint: ${warning.rule}`,
    description: warning.text,
    explanation: `Stylelint detected a CSS code quality issue. The rule "${warning.rule}" helps maintain consistent and error-free stylesheets.`,
    impact: 'CSS issues can cause visual inconsistencies, browser compatibility problems, or maintainability concerns.',
    file: filePath,
    line: warning.line,
    column: warning.column,
    endLine: warning.endLine,
    endColumn: warning.endColumn,
    recommendation: `Fix the Stylelint issue at line ${warning.line} according to the rule documentation.`,
    documentationUrl: `https://stylelint.io/user-guide/rules/${warning.rule}`,
    aiPrompt: {
      short: `Fix Stylelint ${warning.rule} in ${filePath} at line ${warning.line}`,
      detailed: `Fix the Stylelint error.

File: ${filePath}
Line: ${warning.line}, Column: ${warning.column}
Rule: ${warning.rule}
Message: ${warning.text}

Please fix this CSS issue.`,
      steps: [
        `Open ${filePath} at line ${warning.line}`,
        `Review the Stylelint rule: ${warning.rule}`,
        'Fix the CSS according to the rule',
        'Run Stylelint again to verify',
      ],
    },
    ruleId: warning.rule,
    tags: ['stylelint', 'css', 'code-quality', warning.rule],
    effort: 'trivial',
  };
}

function createResult(findings: AuditFinding[], duration: number): AuditResult {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => bySeverity[f.severity]++);

  return {
    tool: 'Stylelint',
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
