// Finding Formatter
// Formats findings for display in the dashboard

import { CodeQAReport, Finding, Recommendation } from './types';

export class FindingFormatter {
  /**
   * Format a finding as plain English text for display
   */
  static formatFinding(finding: Finding): string {
    return `
## ${this.getSeverityEmoji(finding.severity)} ${finding.title}

**Severity:** ${finding.severity.toUpperCase()} | **Category:** ${finding.category}
**Location:** ${finding.file}${finding.line ? `:${finding.line}` : ''}

### What we found
${finding.description}

### Why this matters
${finding.explanation}

### Potential impact
${finding.impact}

### How to fix it
${finding.recommendation}

${finding.codeSnippet ? `### Code context\n\`\`\`\n${finding.codeSnippet}\n\`\`\`` : ''}
`.trim();
  }

  /**
   * Format the AI prompt for a coding assistant
   */
  static formatAIPrompt(finding: Finding): string {
    return `
# AI Assistant Prompt

Copy this prompt to your coding assistant (Claude, GitHub Copilot, etc.) to get help fixing this issue.

---

${finding.aiPrompt.detailedPrompt}

---

## Quick version (for inline suggestions):
${finding.aiPrompt.shortPrompt}

## Steps to follow:
${finding.aiPrompt.steps?.map((step, i) => `${i + 1}. ${step}`).join('\n') || 'Follow the detailed prompt above.'}

## Expected result:
${finding.aiPrompt.expectedOutcome}
`.trim();
  }

  /**
   * Format a recommendation as plain text
   */
  static formatRecommendation(recommendation: Recommendation): string {
    const priorityEmoji = {
      immediate: '🔴',
      'short-term': '🟡',
      'long-term': '🟢',
    };

    const effortText = {
      low: 'Quick fix',
      medium: 'Moderate effort',
      high: 'Significant effort',
    };

    return `
### ${priorityEmoji[recommendation.priority]} ${recommendation.title}

**Priority:** ${recommendation.priority} | **Effort:** ${effortText[recommendation.effort]}

${recommendation.description}

Related findings: ${recommendation.relatedFindings.length} issue(s)
`.trim();
  }

  /**
   * Format the full report summary
   */
  static formatReportSummary(report: CodeQAReport): string {
    const healthEmoji = report.healthScore >= 80 ? '💚' : report.healthScore >= 60 ? '💛' : '❤️';

    return `
# Code QA Report: ${report.repositoryName}

**Branch:** ${report.branch}
**Commit:** ${report.commitSha.substring(0, 7)}
**Analyzed:** ${report.analyzedAt.toLocaleString()}
**Health Score:** ${healthEmoji} ${report.healthScore}/100

---

## Summary

${report.summary.overview}

${report.summary.keyConcerns.length > 0 ? `### ⚠️ Key Concerns\n${report.summary.keyConcerns.map(c => `- ${c}`).join('\n')}` : ''}

${report.summary.positives.length > 0 ? `### ✅ Positives\n${report.summary.positives.map(p => `- ${p}`).join('\n')}` : ''}

${report.summary.quickWins.length > 0 ? `### 🎯 Quick Wins\n${report.summary.quickWins.map(w => `- ${w}`).join('\n')}` : ''}

---

## Statistics

| Metric | Count |
|--------|-------|
| Files Analyzed | ${report.stats.filesAnalyzed} |
| Lines of Code | ${report.stats.linesOfCode.toLocaleString()} |
| Total Findings | ${report.stats.totalFindings} |
| Critical | ${report.stats.bySeverity.critical} |
| High | ${report.stats.bySeverity.high} |
| Medium | ${report.stats.bySeverity.medium} |
| Low | ${report.stats.bySeverity.low} |

**Analysis Time:** ${(report.stats.analysisTime / 1000).toFixed(2)}s
`.trim();
  }

  /**
   * Format findings grouped by file
   */
  static formatByFile(findings: Finding[]): string {
    const byFile = new Map<string, Finding[]>();

    for (const finding of findings) {
      const existing = byFile.get(finding.file) || [];
      existing.push(finding);
      byFile.set(finding.file, existing);
    }

    let output = '';
    for (const [file, fileFindings] of byFile) {
      output += `\n## 📄 ${file}\n\n`;
      for (const finding of fileFindings) {
        output += `- ${this.getSeverityEmoji(finding.severity)} **${finding.title}** (line ${finding.line || '?'})\n`;
        output += `  ${finding.description}\n\n`;
      }
    }

    return output;
  }

  /**
   * Format findings grouped by severity
   */
  static formatBySeverity(findings: Finding[]): string {
    const severityOrder: Finding['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];
    let output = '';

    for (const severity of severityOrder) {
      const severityFindings = findings.filter(f => f.severity === severity);
      if (severityFindings.length === 0) continue;

      output += `\n## ${this.getSeverityEmoji(severity)} ${severity.toUpperCase()} (${severityFindings.length})\n\n`;
      for (const finding of severityFindings) {
        output += `### ${finding.title}\n`;
        output += `📍 ${finding.file}:${finding.line || '?'}\n\n`;
        output += `${finding.description}\n\n`;
        output += `**Fix:** ${finding.recommendation}\n\n`;
        output += `---\n`;
      }
    }

    return output;
  }

  /**
   * Format findings grouped by category
   */
  static formatByCategory(findings: Finding[]): string {
    const categories = [...new Set(findings.map(f => f.category))];
    let output = '';

    for (const category of categories) {
      const categoryFindings = findings.filter(f => f.category === category);
      const emoji = this.getCategoryEmoji(category);

      output += `\n## ${emoji} ${this.formatCategoryName(category)} (${categoryFindings.length})\n\n`;
      for (const finding of categoryFindings) {
        output += `- ${this.getSeverityEmoji(finding.severity)} **${finding.title}** - ${finding.file}:${finding.line || '?'}\n`;
      }
    }

    return output;
  }

  /**
   * Format a batch of AI prompts for bulk fixing
   */
  static formatBulkAIPrompts(findings: Finding[]): string {
    return `
# Bulk Fix Instructions

The following issues were found in the codebase. Address them in order of severity.

${findings.map((f, i) => `
---

## Issue ${i + 1}: ${f.title}
**Severity:** ${f.severity} | **File:** ${f.file}:${f.line || '?'}

${f.aiPrompt.shortPrompt}
`).join('\n')}
`.trim();
  }

  private static getSeverityEmoji(severity: Finding['severity']): string {
    const emojis: Record<Finding['severity'], string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
      info: 'ℹ️',
    };
    return emojis[severity];
  }

  private static getCategoryEmoji(category: Finding['category']): string {
    const emojis: Record<Finding['category'], string> = {
      security: '🔒',
      performance: '⚡',
      quality: '✨',
      build: '🔧',
      error: '❌',
      accessibility: '♿',
      maintainability: '🧹',
      'best-practice': '📚',
    };
    return emojis[category];
  }

  private static formatCategoryName(category: Finding['category']): string {
    const names: Record<Finding['category'], string> = {
      security: 'Security',
      performance: 'Performance',
      quality: 'Code Quality',
      build: 'Build Issues',
      error: 'Error Handling',
      accessibility: 'Accessibility',
      maintainability: 'Maintainability',
      'best-practice': 'Best Practices',
    };
    return names[category];
  }
}
