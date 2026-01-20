// SQLFluff Integration - SQL Linter and Formatter
// License: MIT
// Website: https://sqlfluff.com

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface SQLFluffViolation {
  start_line_no: number;
  start_line_pos: number;
  end_line_no: number;
  end_line_pos: number;
  description: string;
  code: string;
  name: string;
}

interface SQLFluffFileResult {
  filepath: string;
  violations: SQLFluffViolation[];
}

export class SQLFluffIntegration implements ToolIntegration {
  name = 'SQLFluff';
  category = 'code-quality' as const;
  description = 'SQL linter and auto-formatter with dialect support';
  website = 'https://sqlfluff.com';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('sqlfluff version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        dialect: 'ansi', // ansi, postgres, mysql, bigquery, snowflake, etc.
        excludeRules: [],
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const dialect = (config?.options?.dialect as string) || 'ansi';

      const result = execSync(
        `sqlfluff lint "${targetDir}" --dialect ${dialect} --format json`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
      );

      const results: SQLFluffFileResult[] = JSON.parse(result);

      for (const fileResult of results) {
        for (const violation of fileResult.violations) {
          findings.push(this.convertToFinding(fileResult.filepath, violation));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const results: SQLFluffFileResult[] = JSON.parse((error as { stdout: string }).stdout);
          for (const fileResult of results) {
            for (const violation of fileResult.violations) {
              findings.push(this.convertToFinding(fileResult.filepath, violation));
            }
          }
          return this.createResult(findings, Date.now() - startTime);
        } catch {
          // Parse error
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

  private convertToFinding(filepath: string, violation: SQLFluffViolation): AuditFinding {
    // Determine severity based on rule category
    const severity: Severity = this.getSeverity(violation.code);

    return {
      id: `sqlfluff-${filepath}-${violation.start_line_no}-${violation.code}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `SQL: ${violation.code} - ${violation.name}`,
      description: violation.description,
      explanation: `SQLFluff detected a SQL code style or quality issue. Rule ${violation.code} (${violation.name}): ${violation.description}`,
      impact: this.getImpact(violation.code),
      file: filepath,
      line: violation.start_line_no,
      column: violation.start_line_pos,
      endLine: violation.end_line_no,
      endColumn: violation.end_line_pos,
      recommendation: `Fix the SQL according to ${violation.code} rule. Consider running 'sqlfluff fix' for automatic formatting.`,
      documentationUrl: `https://docs.sqlfluff.com/en/stable/rules.html#${violation.code.toLowerCase()}`,
      aiPrompt: {
        short: `Fix SQL issue ${violation.code} in ${filepath}`,
        detailed: `Fix the SQLFluff violation in ${filepath}.

Line: ${violation.start_line_no}
Rule: ${violation.code} - ${violation.name}
Description: ${violation.description}

SQLFluff can auto-fix many issues. Run: sqlfluff fix "${filepath}"

Otherwise, manually fix the SQL to comply with the rule.`,
        steps: [
          `Open ${filepath} at line ${violation.start_line_no}`,
          `Review the ${violation.code} rule requirement`,
          'Try running sqlfluff fix for automatic formatting',
          'Manually fix if auto-fix is not available',
          'Run sqlfluff lint to verify the fix',
        ],
      },
      ruleId: violation.code,
      tags: ['sqlfluff', 'sql', 'code-quality', violation.code],
      effort: 'trivial',
      autoFixable: true,
    };
  }

  private getSeverity(code: string): Severity {
    // Layout rules (L0xx) are low priority
    if (code.startsWith('L0')) return 'low';
    // Aliasing rules (AL0x) are medium
    if (code.startsWith('AL')) return 'medium';
    // Ambiguous rules (AM0x) are high (can cause bugs)
    if (code.startsWith('AM')) return 'high';
    // Convention rules (CV0x) are low
    if (code.startsWith('CV')) return 'low';
    // Reference rules (RF0x) are medium
    if (code.startsWith('RF')) return 'medium';
    // Structure rules (ST0x) are medium
    if (code.startsWith('ST')) return 'medium';
    return 'low';
  }

  private getImpact(code: string): string {
    if (code.startsWith('AM')) {
      return 'Ambiguous SQL can lead to unexpected query results or bugs that are hard to diagnose.';
    }
    if (code.startsWith('RF')) {
      return 'Reference issues can cause query failures or return incorrect data.';
    }
    return 'SQL style issues affect readability and maintainability of database code.';
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
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
        passed: 0,
        failed: findings.length,
      },
    };
  }
}
