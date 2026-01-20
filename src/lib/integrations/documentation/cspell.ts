// CSpell Integration - Code Spell Checker
// License: MIT
// Website: https://cspell.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding } from '../types';

interface CSpellIssue {
  text: string;
  offset: number;
  line: { offset: number; text: string; row: number; col: number };
  row: number;
  col: number;
  uri: string;
  message: string;
  suggestions: string[];
}

export class CspellIntegration implements ToolIntegration {
  name = 'cspell';
  category = 'code-quality' as const;
  description = 'Spell checker for code and documentation';
  website = 'https://cspell.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx cspell --version', { stdio: 'ignore', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: true, options: { gitignore: true } };
  }

  async run(target: AuditTarget, _config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';

      // CSpell exits with 1 if it finds issues, so we handle both
      let result = '';
      try {
        result = execSync(`npx cspell lint "${targetDir}/**" --no-progress --no-summary -u --reporter json`,
          { cwd: targetDir, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
      } catch (error) {
        if (error instanceof Error && 'stdout' in error) {
          result = (error as { stdout: string }).stdout;
        }
      }

      if (result.trim()) {
        const lines = result.trim().split('\n');
        for (const line of lines) {
          try {
            const issue: CSpellIssue = JSON.parse(line);
            findings.push(this.convertToFinding(issue));
          } catch { /* Skip invalid lines */ }
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      return { tool: this.name, category: this.category, success: false, duration: Date.now() - startTime, findings: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 }, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private convertToFinding(issue: CSpellIssue): AuditFinding {
    const suggestions = issue.suggestions?.slice(0, 3) || [];

    return {
      id: `cspell-${issue.uri}-${issue.row}-${issue.text}`,
      tool: this.name, category: this.category, severity: 'info',
      title: `Spelling: "${issue.text}"`,
      description: `Unknown word "${issue.text}" found.${suggestions.length ? ` Did you mean: ${suggestions.join(', ')}?` : ''}`,
      explanation: 'Spelling errors in code can indicate typos in variable names, comments, or strings that might confuse readers.',
      impact: 'Improves code readability and professionalism.',
      file: issue.uri.replace('file://', ''),
      line: issue.row,
      column: issue.col,
      codeSnippet: issue.line?.text,
      recommendation: suggestions.length ? `Consider: ${suggestions.join(', ')}` : 'Add to dictionary or fix the spelling.',
      documentationUrl: 'https://cspell.org',
      aiPrompt: {
        short: `Fix spelling: "${issue.text}"`,
        detailed: `Spelling issue:\n\nFile: ${issue.uri}\nLine: ${issue.row}\nWord: ${issue.text}\nSuggestions: ${suggestions.join(', ') || 'none'}\n\nContext: ${issue.line?.text || ''}`,
        steps: ['Fix the spelling', 'Or add to cspell dictionary if intentional']
      },
      ruleId: 'unknown-word',
      tags: ['cspell', 'spelling', 'documentation'],
      effort: 'trivial',
      autoFixable: suggestions.length > 0,
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);
    return { tool: this.name, category: this.category, success: true, duration, findings, summary: { total: findings.length, bySeverity, passed: 0, failed: findings.length } };
  }
}
