// write-good Integration - Prose Linter
// License: MIT
// Website: https://github.com/btford/write-good

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface WriteGoodSuggestion {
  index: number;
  offset: number;
  reason: string;
}

export class WriteGoodIntegration implements ToolIntegration {
  name = 'write-good';
  category = 'documentation' as const;
  description = 'Naive linter for English prose that catches common writing issues';
  website = 'https://github.com/btford/write-good';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx write-good --version', { stdio: 'ignore', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        // Checks to enable/disable
        passive: true,       // Check for passive voice
        illusion: true,      // Check for lexical illusions (repeated words)
        so: true,            // Check for sentences starting with "So"
        thereIs: true,       // Check for "There is/are"
        weasel: true,        // Check for weasel words
        adverb: true,        // Check for adverbs
        tooWordy: true,      // Check for wordy phrases
        cliches: true,       // Check for cliches
        glob: ['**/*.md', '**/*.txt', '**/README*', '**/*.mdx'],
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

      // Find documentation files
      const patterns = (config?.options?.glob as string[]) || ['**/*.md', '**/*.txt'];
      const files: string[] = [];

      for (const pattern of patterns) {
        const matches = await glob.glob(pattern, {
          cwd: targetDir,
          ignore: ['**/node_modules/**', '**/vendor/**', '**/dist/**', '**/build/**', '**/CHANGELOG*'],
          absolute: true,
        });
        files.push(...matches);
      }

      const uniqueFiles = [...new Set(files)];

      // Build flags based on config
      const flags: string[] = [];
      if (config?.options?.passive === false) flags.push('--no-passive');
      if (config?.options?.illusion === false) flags.push('--no-illusion');
      if (config?.options?.so === false) flags.push('--no-so');
      if (config?.options?.thereIs === false) flags.push('--no-thereIs');
      if (config?.options?.weasel === false) flags.push('--no-weasel');
      if (config?.options?.adverb === false) flags.push('--no-adverb');
      if (config?.options?.tooWordy === false) flags.push('--no-tooWordy');
      if (config?.options?.cliches === false) flags.push('--no-cliches');

      for (const file of uniqueFiles) {
        try {
          const content = fs.readFileSync(file, 'utf-8');
          const lines = content.split('\n');

          // write-good outputs one suggestion per line
          const result = execSync(
            `npx write-good "${file}" ${flags.join(' ')} 2>&1`,
            { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
          );

          const suggestions = this.parseOutput(result, file, lines);
          for (const suggestion of suggestions) {
            findings.push(suggestion);
          }
        } catch (error) {
          // write-good exits with code 1 when it finds issues
          if (error instanceof Error && 'stdout' in error) {
            const stdout = (error as { stdout: string }).stdout || '';
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');
            const suggestions = this.parseOutput(stdout, file, lines);
            for (const suggestion of suggestions) {
              findings.push(suggestion);
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

  private parseOutput(output: string, file: string, lines: string[]): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const outputLines = output.split('\n').filter(Boolean);

    // write-good output format:
    // In file.md
    // -------------
    // "word" is wordy on line 5 at column 10
    // "very" is a weasel word on line 10 at column 25

    const suggestionRegex = /"([^"]+)"\s+(.+?)\s+on\s+line\s+(\d+)\s+at\s+column\s+(\d+)/i;
    const lineWithPositionRegex = /line\s+(\d+)/i;

    for (const line of outputLines) {
      // Skip header lines
      if (line.startsWith('In ') || line.startsWith('---') || !line.trim()) continue;

      const match = line.match(suggestionRegex);
      if (match) {
        const problematicText = match[1];
        const reason = match[2];
        const lineNum = parseInt(match[3], 10);
        const column = parseInt(match[4], 10);

        findings.push(this.createFinding(file, {
          text: problematicText,
          reason,
          line: lineNum,
          column,
          context: lines[lineNum - 1] || '',
        }));
      } else {
        // Try simpler pattern for other output formats
        const simpleMatch = line.match(/^(.+?)\s+on\s+line\s+(\d+)/i);
        if (simpleMatch) {
          const lineNum = parseInt(simpleMatch[2], 10);
          findings.push(this.createFinding(file, {
            text: '',
            reason: simpleMatch[1],
            line: lineNum,
            column: 1,
            context: lines[lineNum - 1] || '',
          }));
        }
      }
    }

    return findings;
  }

  private createFinding(file: string, suggestion: {
    text: string;
    reason: string;
    line: number;
    column: number;
    context: string;
  }): AuditFinding {
    const issueType = this.classifyIssue(suggestion.reason);

    return {
      id: `write-good-${file}-${suggestion.line}-${suggestion.column}-${issueType}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `Prose: ${this.formatReason(suggestion.reason)}`,
      description: suggestion.text
        ? `"${suggestion.text}" ${suggestion.reason}`
        : suggestion.reason,
      explanation: this.getExplanation(issueType),
      impact: 'Writing clarity affects reader comprehension and engagement.',
      file,
      line: suggestion.line,
      column: suggestion.column,
      codeSnippet: suggestion.context,
      recommendation: this.getRecommendation(issueType, suggestion.text),
      documentationUrl: 'https://github.com/btford/write-good',
      aiPrompt: {
        short: `Improve writing: "${suggestion.text || 'sentence'}"`,
        detailed: `Writing improvement suggestion:

File: ${file}
Line: ${suggestion.line}
Issue: ${suggestion.reason}
${suggestion.text ? `Text: "${suggestion.text}"` : ''}
Context: "${suggestion.context}"

Please rewrite to improve clarity while preserving the meaning.`,
        steps: [
          `Open ${file} at line ${suggestion.line}`,
          'Review the flagged text in context',
          'Rewrite for clarity',
          'Run write-good again to verify',
        ],
      },
      ruleId: issueType,
      tags: ['write-good', 'prose', 'writing', issueType],
      effort: 'trivial',
    };
  }

  private classifyIssue(reason: string): string {
    const lower = reason.toLowerCase();
    if (lower.includes('passive')) return 'passive-voice';
    if (lower.includes('weasel')) return 'weasel-word';
    if (lower.includes('wordy')) return 'wordy';
    if (lower.includes('adverb')) return 'adverb';
    if (lower.includes('cliche') || lower.includes('cliché')) return 'cliche';
    if (lower.includes('illusion') || lower.includes('repeated')) return 'lexical-illusion';
    if (lower.includes('there is') || lower.includes('there are')) return 'there-is';
    if (lower.includes('starts with "so"')) return 'starts-with-so';
    return 'style';
  }

  private formatReason(reason: string): string {
    // Capitalize first letter and clean up
    return reason.charAt(0).toUpperCase() + reason.slice(1);
  }

  private getExplanation(issueType: string): string {
    const explanations: Record<string, string> = {
      'passive-voice': 'Passive voice can make writing unclear and wordy. Active voice is usually more direct and engaging.',
      'weasel-word': 'Weasel words (like "very", "really", "quite") weaken your statements and reduce precision.',
      'wordy': 'Wordy phrases can be replaced with simpler alternatives for clearer communication.',
      'adverb': 'Overusing adverbs can weaken writing. Consider using stronger verbs instead.',
      'cliche': 'Clichés are overused phrases that have lost their impact. Consider more original expressions.',
      'lexical-illusion': 'Repeated words in succession are often typos or can confuse readers.',
      'there-is': '"There is/are" constructions can often be rewritten more directly.',
      'starts-with-so': 'Starting sentences with "So" can sound informal or condescending.',
      'style': 'This phrase could be improved for clarity or style.',
    };
    return explanations[issueType] || 'Consider revising this phrase for clearer writing.';
  }

  private getRecommendation(issueType: string, text: string): string {
    const recommendations: Record<string, string> = {
      'passive-voice': 'Rewrite in active voice: identify the actor and make them the subject.',
      'weasel-word': `Remove or replace "${text}" with more specific language.`,
      'wordy': 'Simplify this phrase to be more concise.',
      'adverb': 'Consider using a stronger verb instead of an adverb.',
      'cliche': 'Replace this cliché with a more original expression.',
      'lexical-illusion': `Remove the repeated word "${text}".`,
      'there-is': 'Restructure the sentence to eliminate "there is/are".',
      'starts-with-so': 'Remove "So" or restructure the sentence.',
      'style': 'Consider revising for clarity.',
    };
    return recommendations[issueType] || 'Consider revising this phrase.';
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
