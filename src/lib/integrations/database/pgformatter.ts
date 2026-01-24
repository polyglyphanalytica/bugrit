// pgFormatter Integration - PostgreSQL SQL Formatter
// License: PostgreSQL
// Website: https://github.com/darold/pgFormatter

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface FormatDifference {
  file: string;
  line: number;
  original: string;
  formatted: string;
  type: 'indent' | 'case' | 'spacing' | 'newline' | 'other';
}

export class PgFormatterIntegration implements ToolIntegration {
  name = 'pgformatter';
  category = 'database' as const;
  description = 'PostgreSQL SQL syntax beautifier and formatter for consistent code style';
  website = 'https://github.com/darold/pgFormatter';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('pg_format --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        spaces: 4,           // Number of spaces for indentation
        maxLength: 120,      // Maximum line length
        noComments: false,   // Don't remove comments
        functionCase: 'lowercase',  // lowercase, uppercase, capitalize
        keywordCase: 'uppercase',   // lowercase, uppercase, capitalize
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const glob = safeRequire<typeof import('glob')>('glob');
      const fs = await import('fs');
      const targetDir = target.directory || '.';

      // Find all SQL files
      const sqlFiles = await glob.glob('**/*.sql', {
        cwd: targetDir,
        ignore: ['**/node_modules/**', '**/migrations/**', '**/vendor/**'],
        absolute: true,
      });

      const spaces = (config?.options?.spaces as number) || 4;
      const maxLength = (config?.options?.maxLength as number) || 120;
      const functionCase = (config?.options?.functionCase as string) || 'lowercase';
      const keywordCase = (config?.options?.keywordCase as string) || 'uppercase';

      for (const file of sqlFiles) {
        try {
          const original = fs.readFileSync(file, 'utf-8');

          // Format the file
          const formatted = execSync(
            `pg_format -s ${spaces} -L -f 1 -u ${functionCase === 'uppercase' ? '1' : functionCase === 'capitalize' ? '2' : '0'} -U ${keywordCase === 'uppercase' ? '1' : keywordCase === 'capitalize' ? '2' : '0'}`,
            {
              input: original,
              encoding: 'utf-8',
              maxBuffer: 10 * 1024 * 1024,
            }
          );

          // Compare original with formatted
          const differences = this.findDifferences(original, formatted, file);

          for (const diff of differences) {
            findings.push(this.createFinding(diff, maxLength));
          }
        } catch (fileError) {
          // Add a finding for files that couldn't be parsed
          findings.push({
            id: `pgformatter-parse-error-${file}`,
            tool: this.name,
            category: this.category,
            severity: 'medium',
            title: `SQL Parse Error: ${file.split('/').pop()}`,
            description: `Could not parse SQL file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
            explanation: 'The SQL file contains syntax errors or unsupported constructs that pgFormatter cannot parse.',
            impact: 'Invalid SQL may cause runtime errors in your database.',
            file,
            recommendation: 'Review the SQL file for syntax errors.',
            aiPrompt: {
              short: `Fix SQL syntax in ${file}`,
              detailed: `SQL file could not be parsed:\n\nFile: ${file}\nError: ${fileError instanceof Error ? fileError.message : 'Unknown'}\n\nReview and fix any syntax errors.`,
              steps: ['Open the SQL file', 'Look for syntax errors', 'Fix the errors', 'Run pg_format again'],
            },
            ruleId: 'parse-error',
            tags: ['pgformatter', 'sql', 'syntax-error'],
            effort: 'moderate',
          });
        }
      }

      return this.createResult(findings, Date.now() - startTime, sqlFiles.length);
    } catch (error) {
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

  private findDifferences(original: string, formatted: string, file: string): FormatDifference[] {
    const differences: FormatDifference[] = [];
    const originalLines = original.split('\n');
    const formattedLines = formatted.split('\n');

    // Simple line-by-line comparison
    const maxLines = Math.max(originalLines.length, formattedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || '';
      const fmtLine = formattedLines[i] || '';

      if (origLine !== fmtLine) {
        const type = this.classifyDifference(origLine, fmtLine);
        differences.push({
          file,
          line: i + 1,
          original: origLine,
          formatted: fmtLine,
          type,
        });
      }
    }

    return differences;
  }

  private classifyDifference(original: string, formatted: string): FormatDifference['type'] {
    const origTrimmed = original.trim();
    const fmtTrimmed = formatted.trim();

    // Same content, different indentation
    if (origTrimmed === fmtTrimmed) {
      return 'indent';
    }

    // Case difference only
    if (origTrimmed.toLowerCase() === fmtTrimmed.toLowerCase()) {
      return 'case';
    }

    // Spacing difference (same words, different spacing)
    if (original.replace(/\s+/g, ' ').trim() === formatted.replace(/\s+/g, ' ').trim()) {
      return 'spacing';
    }

    // One is empty (newline difference)
    if (!origTrimmed || !fmtTrimmed) {
      return 'newline';
    }

    return 'other';
  }

  private createFinding(diff: FormatDifference, maxLength: number): AuditFinding {
    const typeDescriptions: Record<FormatDifference['type'], string> = {
      indent: 'Incorrect indentation',
      case: 'Inconsistent keyword/function case',
      spacing: 'Inconsistent spacing',
      newline: 'Missing or extra blank line',
      other: 'SQL formatting issue',
    };

    const title = `SQL Format: ${typeDescriptions[diff.type]}`;

    return {
      id: `pgformatter-${diff.file}-${diff.line}-${diff.type}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title,
      description: `Line ${diff.line}: ${typeDescriptions[diff.type]}`,
      explanation: 'Consistent SQL formatting improves readability and makes code reviews easier. pgFormatter ensures your SQL follows a consistent style.',
      impact: 'Inconsistent formatting reduces readability and can lead to merge conflicts.',
      file: diff.file,
      line: diff.line,
      codeSnippet: diff.original.length > maxLength
        ? diff.original.substring(0, maxLength) + '...'
        : diff.original,
      fixExample: diff.formatted.length > maxLength
        ? diff.formatted.substring(0, maxLength) + '...'
        : diff.formatted,
      recommendation: `Run pg_format on this file to auto-fix formatting issues.`,
      aiPrompt: {
        short: `Format SQL at line ${diff.line}`,
        detailed: `SQL formatting issue:

File: ${diff.file}
Line: ${diff.line}
Type: ${diff.type}

Current:
${diff.original}

Expected:
${diff.formatted}

Run pg_format to auto-fix this issue.`,
        steps: [
          `Run pg_format on ${diff.file}`,
          'Review the formatted output',
          'Commit the changes',
        ],
      },
      ruleId: `format-${diff.type}`,
      tags: ['pgformatter', 'sql', 'formatting', diff.type],
      effort: 'trivial',
      autoFixable: true,
    };
  }

  private createResult(findings: AuditFinding[], duration: number, filesChecked: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    // Group findings by file to avoid overwhelming results
    const filesWithIssues = new Set(findings.map(f => f.file));

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: filesChecked - filesWithIssues.size,
        failed: filesWithIssues.size,
      },
      metadata: { filesChecked, filesWithIssues: filesWithIssues.size },
    };
  }
}
