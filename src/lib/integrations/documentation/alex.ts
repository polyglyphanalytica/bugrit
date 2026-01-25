// Alex Integration - Inclusive Writing Linter
// License: MIT
// Website: https://alexjs.com

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface AlexMessage {
  message: string;
  name: string;
  reason: string;
  line: number;
  column: number;
  location: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
  source: string;
  ruleId: string;
  fatal: boolean;
  severity: 1 | 2;  // 1 = warning, 2 = error
  actual: string;
  expected: string[];
  url?: string;
  note?: string;
}

export class AlexIntegration implements ToolIntegration {
  name = 'alex';
  category = 'documentation' as const;
  description = 'Catches insensitive and inconsiderate writing in documentation and text';
  website = 'https://alexjs.com/';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx alex --version', { stdio: 'ignore', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        profanity: true,    // Check for profanity
        noBinary: false,    // Disable he-she warnings
        glob: ['**/*.md', '**/*.txt', '**/README*', '**/CONTRIBUTING*'],
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const glob = safeRequire<typeof import('glob')>('glob');
      const targetDir = target.directory || '.';

      // Find documentation files
      const patterns = (config?.options?.glob as string[]) || ['**/*.md', '**/*.txt', '**/README*'];
      const files: string[] = [];

      for (const pattern of patterns) {
        const matches = await glob.glob(pattern, {
          cwd: targetDir,
          ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/build/**'],
          absolute: true,
        });
        files.push(...matches);
      }

      // Deduplicate
      const uniqueFiles = [...new Set(files)];

      for (const file of uniqueFiles) {
        try {
          // Alex outputs text format by default, parse it
          const flags = config?.options?.noBinary ? '--no-binary' : '';
          const result = execSync(
            `npx alex "${file}" ${flags} 2>&1`,
            { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
          );

          // Parse text output
          const messages = this.parseTextOutput(result, file);
          for (const msg of messages) {
            findings.push(this.createFinding(file, msg));
          }
        } catch (error) {
          // Alex exits with code 1 when it finds issues
          if (error instanceof Error && 'stdout' in error) {
            const execError = error as unknown as { stdout?: string; stderr?: string };
            const stdout = execError.stdout || '';
            const stderr = execError.stderr || '';
            const output = stdout + stderr;
            if (output) {
              const messages = this.parseTextOutput(output, file);
              for (const msg of messages) {
                findings.push(this.createFinding(file, msg));
              }
            }
          }
        }
      }

      return this.createResult(findings, Date.now() - startTime, uniqueFiles.length);
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

  private parseTextOutput(output: string, defaultFile: string): AlexMessage[] {
    const messages: AlexMessage[] = [];
    const lines = output.split('\n');

    // Alex output format:
    // file.md
    //   1:5-1:10  warning  `foo` may be insensitive  rule-name
    const issueRegex = /^\s*(\d+):(\d+)-(\d+):(\d+)\s+(warning|error)\s+(.+?)\s+(\S+)\s*$/;

    let currentFile = defaultFile;

    for (const line of lines) {
      // Check if this is a file path line
      if (line.trim() && !line.startsWith(' ') && !issueRegex.test(line) && !line.includes('warning') && !line.includes('error')) {
        currentFile = line.trim();
        continue;
      }

      const match = line.match(issueRegex);
      if (match) {
        const startLine = parseInt(match[1], 10);
        const startCol = parseInt(match[2], 10);
        const endLine = parseInt(match[3], 10);
        const endCol = parseInt(match[4], 10);
        const severity = match[5] === 'error' ? 2 : 1;
        const message = match[6];
        const ruleId = match[7];

        // Extract the actual word from the message (usually in backticks)
        const actualMatch = message.match(/`([^`]+)`/);
        const actual = actualMatch ? actualMatch[1] : '';

        // Extract expected alternatives if mentioned
        const expectedMatch = message.match(/use\s+`([^`]+)`/gi);
        const expected = expectedMatch
          ? expectedMatch.map(m => m.replace(/use\s+`/i, '').replace('`', ''))
          : [];

        messages.push({
          message,
          name: ruleId,
          reason: message,
          line: startLine,
          column: startCol,
          location: {
            start: { line: startLine, column: startCol, offset: 0 },
            end: { line: endLine, column: endCol, offset: 0 },
          },
          source: actual,
          ruleId,
          fatal: false,
          severity: severity as 1 | 2,
          actual,
          expected,
        });
      }
    }

    return messages;
  }

  private createFinding(file: string, msg: AlexMessage): AuditFinding {
    const severity: Severity = msg.severity === 2 ? 'medium' : 'low';
    const suggestions = msg.expected?.length > 0
      ? `Consider using: ${msg.expected.join(', ')}`
      : 'Consider rephrasing';

    return {
      id: `alex-${file}-${msg.line}-${msg.column}-${msg.ruleId || msg.name}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Inclusive Language: ${msg.name || 'Issue'}`,
      description: msg.message || msg.reason,
      explanation: `Alex detected potentially insensitive or inconsiderate language. Using inclusive language makes your documentation welcoming to all readers.`,
      impact: 'Non-inclusive language can alienate or offend readers, reducing the effectiveness of your documentation.',
      file,
      line: msg.line || msg.location?.start?.line,
      column: msg.column || msg.location?.start?.column,
      endLine: msg.location?.end?.line,
      endColumn: msg.location?.end?.column,
      codeSnippet: msg.actual || msg.source,
      recommendation: suggestions,
      documentationUrl: msg.url || 'https://alexjs.com/',
      aiPrompt: {
        short: `Fix inclusive language: "${msg.actual || 'issue'}"`,
        detailed: `Inclusive language issue detected:

File: ${file}
Line: ${msg.line}
Issue: ${msg.message || msg.reason}
Problematic text: "${msg.actual || msg.source}"
${msg.expected?.length ? `Suggestions: ${msg.expected.join(', ')}` : ''}

Please rewrite to use more inclusive language while preserving the meaning.`,
        steps: [
          `Open ${file} at line ${msg.line}`,
          `Find: "${msg.actual || msg.source}"`,
          `Replace with inclusive alternative`,
          'Review context to ensure meaning is preserved',
        ],
      },
      ruleId: msg.ruleId || msg.name,
      tags: ['alex', 'inclusive-language', 'documentation', msg.name?.toLowerCase() || 'language'].filter(Boolean),
      effort: 'trivial',
      autoFixable: msg.expected?.length > 0,
    };
  }

  private createResult(findings: AuditFinding[], duration: number, filesChecked: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    const filesWithIssues = new Set(findings.map(f => f.file)).size;

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: filesChecked - filesWithIssues,
        failed: filesWithIssues,
      },
      metadata: { filesChecked, filesWithIssues },
    };
  }
}
