// AI-Powered Human-Readable Report Generator
// Transforms raw findings into actionable, digestible reports

import { AuditFinding, Severity, ToolCategory } from '../types';
import { IntelligenceReport, CorrelationGroup, SmartRecommendation } from './finding-intelligence';

export interface ExecutiveSummary {
  headline: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'healthy';
  riskScore: number; // 0-100
  keyMetrics: {
    totalIssues: number;
    criticalCount: number;
    securityRisk: string;
    complianceStatus: string;
    technicalDebt: string;
  };
  topConcerns: string[];
  positiveNotes: string[];
  immediateActions: string[];
  estimatedFixTime: string;
}

export interface DeveloperReport {
  summary: string;
  fileHealth: FileHealthScore[];
  actionItems: ActionItem[];
  codePatterns: CodePattern[];
  learningResources: LearningResource[];
}

export interface FileHealthScore {
  file: string;
  score: number; // 0-100
  issueCount: number;
  topIssues: string[];
  trend: 'improving' | 'declining' | 'stable' | 'new';
}

export interface ActionItem {
  id: string;
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  file?: string;
  line?: number;
  effort: string;
  impact: string;
  tags: string[];
  autoFixAvailable: boolean;
  aiPrompt: string;
}

export interface CodePattern {
  pattern: string;
  occurrences: number;
  severity: Severity;
  description: string;
  suggestedFix: string;
  affectedFiles: string[];
}

export interface LearningResource {
  topic: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'video' | 'tool';
  relevance: string;
}

export interface ComplianceMapping {
  framework: string;
  version: string;
  coverage: number;
  passed: string[];
  failed: string[];
  notApplicable: string[];
}

export interface DigestReport {
  subject: string;
  preheader: string;
  sections: DigestSection[];
  footer: string;
}

export interface DigestSection {
  title: string;
  emoji: string;
  content: string;
  items?: string[];
  cta?: { text: string; url: string };
}

export class ReportGenerator {
  private report: IntelligenceReport;
  private findings: AuditFinding[];

  constructor(report: IntelligenceReport, findings: AuditFinding[]) {
    this.report = report;
    this.findings = findings;
  }

  /**
   * Generate an executive summary for leadership/stakeholders
   */
  generateExecutiveSummary(): ExecutiveSummary {
    const riskScore = this.calculateRiskScore();
    const riskLevel = this.getRiskLevel(riskScore);

    const criticalCount = this.findings.filter(f => f.severity === 'critical').length;
    const highCount = this.findings.filter(f => f.severity === 'high').length;
    const securityCount = this.findings.filter(f => f.category === 'security').length;

    return {
      headline: this.generateHeadline(riskLevel, criticalCount, securityCount),
      riskLevel,
      riskScore,
      keyMetrics: {
        totalIssues: this.report.totalGroupedFindings,
        criticalCount,
        securityRisk: this.getSecurityRiskAssessment(),
        complianceStatus: this.getComplianceStatus(),
        technicalDebt: this.getTechnicalDebtAssessment(),
      },
      topConcerns: this.getTopConcerns(),
      positiveNotes: this.getPositiveNotes(),
      immediateActions: this.getImmediateActions(),
      estimatedFixTime: this.estimateTotalFixTime(),
    };
  }

  /**
   * Generate a developer-focused report with actionable items
   */
  generateDeveloperReport(): DeveloperReport {
    return {
      summary: this.generateDeveloperSummary(),
      fileHealth: this.calculateFileHealthScores(),
      actionItems: this.generateActionItems(),
      codePatterns: this.identifyCodePatterns(),
      learningResources: this.suggestLearningResources(),
    };
  }

  /**
   * Generate a digest suitable for Slack/Email
   */
  generateDigest(): DigestReport {
    const exec = this.generateExecutiveSummary();
    const riskEmoji = this.getRiskEmoji(exec.riskLevel);

    return {
      subject: `${riskEmoji} Code Audit: ${exec.headline}`,
      preheader: `Risk Score: ${exec.riskScore}/100 | ${exec.keyMetrics.totalIssues} issues found`,
      sections: [
        {
          title: 'Risk Overview',
          emoji: riskEmoji,
          content: `**Risk Score: ${exec.riskScore}/100** (${exec.riskLevel.toUpperCase()})`,
          items: [
            `${exec.keyMetrics.criticalCount} critical issues`,
            `Security: ${exec.keyMetrics.securityRisk}`,
            `Compliance: ${exec.keyMetrics.complianceStatus}`,
          ],
        },
        {
          title: 'Top Concerns',
          emoji: '⚠️',
          content: 'These issues need immediate attention:',
          items: exec.topConcerns.slice(0, 5),
        },
        {
          title: 'Recommended Actions',
          emoji: '🎯',
          content: 'Start with these fixes:',
          items: exec.immediateActions.slice(0, 3),
          cta: { text: 'View Full Report', url: '/dashboard/audit' },
        },
        ...(exec.positiveNotes.length > 0 ? [{
          title: 'Good News',
          emoji: '✅',
          content: 'Areas where you\'re doing well:',
          items: exec.positiveNotes,
        }] : []),
      ],
      footer: `Estimated fix time: ${exec.estimatedFixTime} | Report generated at ${new Date().toLocaleString()}`,
    };
  }

  /**
   * Generate a full markdown report
   */
  generateMarkdownReport(): string {
    const exec = this.generateExecutiveSummary();
    const dev = this.generateDeveloperReport();

    const lines: string[] = [];

    // Header
    lines.push('# Code Audit Report');
    lines.push('');
    lines.push(`**Generated:** ${new Date().toLocaleString()}`);
    lines.push(`**Risk Score:** ${exec.riskScore}/100 (${exec.riskLevel.toUpperCase()})`);
    lines.push('');

    // Executive Summary
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`> ${exec.headline}`);
    lines.push('');
    lines.push('### Key Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Issues | ${exec.keyMetrics.totalIssues} |`);
    lines.push(`| Critical Issues | ${exec.keyMetrics.criticalCount} |`);
    lines.push(`| Security Risk | ${exec.keyMetrics.securityRisk} |`);
    lines.push(`| Compliance | ${exec.keyMetrics.complianceStatus} |`);
    lines.push(`| Technical Debt | ${exec.keyMetrics.technicalDebt} |`);
    lines.push(`| Est. Fix Time | ${exec.estimatedFixTime} |`);
    lines.push('');

    // Top Concerns
    if (exec.topConcerns.length > 0) {
      lines.push('### Top Concerns');
      lines.push('');
      exec.topConcerns.forEach((concern, i) => {
        lines.push(`${i + 1}. ${concern}`);
      });
      lines.push('');
    }

    // Immediate Actions
    if (exec.immediateActions.length > 0) {
      lines.push('### Immediate Actions Required');
      lines.push('');
      exec.immediateActions.forEach(action => {
        lines.push(`- [ ] ${action}`);
      });
      lines.push('');
    }

    // Developer Section
    lines.push('---');
    lines.push('');
    lines.push('## Developer Report');
    lines.push('');
    lines.push(dev.summary);
    lines.push('');

    // File Health
    if (dev.fileHealth.length > 0) {
      lines.push('### File Health Scores');
      lines.push('');
      lines.push('| File | Score | Issues | Top Problem |');
      lines.push('|------|-------|--------|-------------|');
      dev.fileHealth.slice(0, 15).forEach(fh => {
        const scoreEmoji = fh.score >= 80 ? '🟢' : fh.score >= 60 ? '🟡' : '🔴';
        lines.push(`| ${fh.file} | ${scoreEmoji} ${fh.score} | ${fh.issueCount} | ${fh.topIssues[0] || '-'} |`);
      });
      lines.push('');
    }

    // Action Items
    if (dev.actionItems.length > 0) {
      lines.push('### Prioritized Action Items');
      lines.push('');

      const byPriority = [1, 2, 3, 4, 5];
      for (const priority of byPriority) {
        const items = dev.actionItems.filter(a => a.priority === priority);
        if (items.length === 0) continue;

        const priorityLabel = ['Critical', 'High', 'Medium', 'Low', 'Info'][priority - 1];
        lines.push(`#### Priority ${priority} - ${priorityLabel}`);
        lines.push('');

        items.slice(0, 10).forEach(item => {
          lines.push(`**${item.title}**`);
          lines.push(`- ${item.description}`);
          if (item.file) lines.push(`- File: \`${item.file}${item.line ? `:${item.line}` : ''}\``);
          lines.push(`- Effort: ${item.effort} | Impact: ${item.impact}`);
          if (item.autoFixAvailable) lines.push(`- ✨ Auto-fix available`);
          lines.push('');
        });
      }
    }

    // Code Patterns
    if (dev.codePatterns.length > 0) {
      lines.push('### Recurring Code Patterns');
      lines.push('');
      lines.push('These patterns appear multiple times and could be fixed systematically:');
      lines.push('');

      dev.codePatterns.slice(0, 5).forEach(pattern => {
        lines.push(`#### ${pattern.pattern} (${pattern.occurrences} occurrences)`);
        lines.push(`- Severity: ${pattern.severity}`);
        lines.push(`- ${pattern.description}`);
        lines.push(`- **Fix:** ${pattern.suggestedFix}`);
        lines.push(`- Affected files: ${pattern.affectedFiles.slice(0, 3).join(', ')}${pattern.affectedFiles.length > 3 ? ` +${pattern.affectedFiles.length - 3} more` : ''}`);
        lines.push('');
      });
    }

    // Learning Resources
    if (dev.learningResources.length > 0) {
      lines.push('### Learning Resources');
      lines.push('');
      lines.push('Based on the issues found, these resources may help:');
      lines.push('');
      dev.learningResources.forEach(resource => {
        lines.push(`- [${resource.topic}](${resource.url}) - ${resource.relevance}`);
      });
      lines.push('');
    }

    // Compliance Section
    lines.push('---');
    lines.push('');
    lines.push('## Compliance Mapping');
    lines.push('');

    const compliance = this.generateComplianceMapping();
    for (const mapping of compliance) {
      lines.push(`### ${mapping.framework} ${mapping.version}`);
      lines.push(`Coverage: ${mapping.coverage}%`);
      lines.push('');
      if (mapping.failed.length > 0) {
        lines.push('**Failed Checks:**');
        mapping.failed.slice(0, 5).forEach(f => lines.push(`- ❌ ${f}`));
        lines.push('');
      }
      if (mapping.passed.length > 0) {
        lines.push('**Passed Checks:**');
        mapping.passed.slice(0, 5).forEach(p => lines.push(`- ✅ ${p}`));
        lines.push('');
      }
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push('*Report generated by Bugrit AI Intelligence Layer*');

    return lines.join('\n');
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(): string {
    const exec = this.generateExecutiveSummary();
    const dev = this.generateDeveloperReport();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Audit Report</title>
  <style>
    :root {
      --critical: #dc2626;
      --high: #ea580c;
      --medium: #ca8a04;
      --low: #16a34a;
      --info: #2563eb;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; background: #f9fafb; }
    .card { background: white; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .risk-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 600; font-size: 0.875rem; }
    .risk-critical { background: #fecaca; color: var(--critical); }
    .risk-high { background: #fed7aa; color: var(--high); }
    .risk-medium { background: #fef08a; color: var(--medium); }
    .risk-low { background: #bbf7d0; color: var(--low); }
    .risk-healthy { background: #bbf7d0; color: var(--low); }
    .metric { text-align: center; padding: 1rem; }
    .metric-value { font-size: 2rem; font-weight: 700; }
    .metric-label { font-size: 0.875rem; color: #6b7280; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; transition: width 0.3s; }
    .action-item { border-left: 4px solid; padding-left: 1rem; margin-bottom: 1rem; }
    .priority-1 { border-color: var(--critical); }
    .priority-2 { border-color: var(--high); }
    .priority-3 { border-color: var(--medium); }
    .priority-4 { border-color: var(--low); }
    .priority-5 { border-color: var(--info); }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .tag { display: inline-block; background: #e5e7eb; padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-right: 0.25rem; }
  </style>
</head>
<body>
  <header style="margin-bottom: 2rem;">
    <h1>Code Audit Report</h1>
    <p style="color: #6b7280;">Generated: ${new Date().toLocaleString()}</p>
  </header>

  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h2 style="margin: 0;">Risk Overview</h2>
      <span class="risk-badge risk-${exec.riskLevel}">${exec.riskLevel.toUpperCase()}</span>
    </div>
    <p style="font-size: 1.25rem; margin-bottom: 1rem;">${exec.headline}</p>

    <div style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
        <span>Risk Score</span>
        <span><strong>${exec.riskScore}/100</strong></span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${exec.riskScore}%; background: ${this.getRiskColor(exec.riskLevel)};"></div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem;">
      <div class="metric">
        <div class="metric-value">${exec.keyMetrics.totalIssues}</div>
        <div class="metric-label">Total Issues</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: var(--critical);">${exec.keyMetrics.criticalCount}</div>
        <div class="metric-label">Critical</div>
      </div>
      <div class="metric">
        <div class="metric-value">${exec.keyMetrics.securityRisk}</div>
        <div class="metric-label">Security</div>
      </div>
      <div class="metric">
        <div class="metric-value">${exec.keyMetrics.complianceStatus}</div>
        <div class="metric-label">Compliance</div>
      </div>
      <div class="metric">
        <div class="metric-value">${exec.estimatedFixTime}</div>
        <div class="metric-label">Est. Fix Time</div>
      </div>
    </div>
  </div>

  ${exec.topConcerns.length > 0 ? `
  <div class="card">
    <h2>Top Concerns</h2>
    <ul>
      ${exec.topConcerns.map(c => `<li>${c}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${exec.immediateActions.length > 0 ? `
  <div class="card">
    <h2>Immediate Actions</h2>
    <ul>
      ${exec.immediateActions.map(a => `<li><strong>${a}</strong></li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="card">
    <h2>Prioritized Action Items</h2>
    ${dev.actionItems.slice(0, 15).map(item => `
      <div class="action-item priority-${item.priority}">
        <strong>${item.title}</strong>
        ${item.autoFixAvailable ? '<span class="tag" style="background: #dbeafe; color: #1d4ed8;">Auto-fix</span>' : ''}
        <p style="margin: 0.5rem 0;">${item.description}</p>
        ${item.file ? `<code style="font-size: 0.875rem;">${item.file}${item.line ? `:${item.line}` : ''}</code>` : ''}
        <div style="margin-top: 0.5rem;">
          ${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    `).join('')}
  </div>

  ${dev.fileHealth.length > 0 ? `
  <div class="card">
    <h2>File Health Scores</h2>
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Score</th>
          <th>Issues</th>
          <th>Top Problem</th>
        </tr>
      </thead>
      <tbody>
        ${dev.fileHealth.slice(0, 15).map(fh => `
          <tr>
            <td><code>${fh.file}</code></td>
            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="progress-bar" style="width: 60px;">
                  <div class="progress-fill" style="width: ${fh.score}%; background: ${fh.score >= 80 ? 'var(--low)' : fh.score >= 60 ? 'var(--medium)' : 'var(--critical)'};"></div>
                </div>
                ${fh.score}
              </div>
            </td>
            <td>${fh.issueCount}</td>
            <td>${fh.topIssues[0] || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${dev.codePatterns.length > 0 ? `
  <div class="card">
    <h2>Recurring Code Patterns</h2>
    <p>These issues appear multiple times and could be fixed systematically:</p>
    ${dev.codePatterns.slice(0, 5).map(p => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
        <strong>${p.pattern}</strong>
        <span class="tag">${p.occurrences} occurrences</span>
        <span class="tag" style="background: ${p.severity === 'critical' ? '#fecaca' : p.severity === 'high' ? '#fed7aa' : '#fef08a'};">${p.severity}</span>
        <p>${p.description}</p>
        <p><strong>Suggested Fix:</strong> ${p.suggestedFix}</p>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <footer style="text-align: center; color: #6b7280; margin-top: 2rem;">
    <p>Report generated by Bugrit AI Intelligence Layer</p>
  </footer>
</body>
</html>`;
  }

  // === Private helper methods ===

  private calculateRiskScore(): number {
    if (this.findings.length === 0) return 0;

    let score = 0;
    const weights = { critical: 25, high: 15, medium: 8, low: 3, info: 1 };

    for (const finding of this.findings) {
      score += weights[finding.severity];
    }

    // Cap at 100
    return Math.min(100, score);
  }

  private getRiskLevel(score: number): ExecutiveSummary['riskLevel'] {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'healthy';
  }

  private getRiskEmoji(level: ExecutiveSummary['riskLevel']): string {
    const emojis = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢', healthy: '✅' };
    return emojis[level];
  }

  private getRiskColor(level: ExecutiveSummary['riskLevel']): string {
    const colors = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#16a34a', healthy: '#16a34a' };
    return colors[level];
  }

  private generateHeadline(level: ExecutiveSummary['riskLevel'], criticalCount: number, securityCount: number): string {
    if (level === 'healthy') {
      return 'Your codebase is in good health with minimal issues.';
    }
    if (level === 'critical') {
      return `Critical attention required: ${criticalCount} critical issues including ${securityCount} security vulnerabilities.`;
    }
    if (level === 'high') {
      return `High priority issues detected: ${securityCount > 0 ? `${securityCount} security concerns` : 'Quality issues'} need attention.`;
    }
    if (level === 'medium') {
      return 'Moderate issues found. Schedule time to address these to prevent technical debt.';
    }
    return 'Minor issues detected. Address these at your convenience.';
  }

  private getSecurityRiskAssessment(): string {
    const securityFindings = this.findings.filter(f => f.category === 'security');
    const critical = securityFindings.filter(f => f.severity === 'critical').length;
    const high = securityFindings.filter(f => f.severity === 'high').length;

    if (critical > 0) return `Critical (${critical})`;
    if (high > 0) return `High (${high})`;
    if (securityFindings.length > 0) return `Low (${securityFindings.length})`;
    return 'Clean';
  }

  private getComplianceStatus(): string {
    const a11yFindings = this.findings.filter(f => f.category === 'accessibility');
    const wcagViolations = a11yFindings.filter(f => f.severity !== 'info').length;

    if (wcagViolations > 10) return 'Non-compliant';
    if (wcagViolations > 5) return 'Partial';
    if (wcagViolations > 0) return 'Minor issues';
    return 'Compliant';
  }

  private getTechnicalDebtAssessment(): string {
    const codeQuality = this.findings.filter(f => f.category === 'code-quality').length;

    if (codeQuality > 50) return 'High';
    if (codeQuality > 20) return 'Moderate';
    if (codeQuality > 5) return 'Low';
    return 'Minimal';
  }

  private getTopConcerns(): string[] {
    const concerns: string[] = [];

    // Critical security issues
    const criticalSecurity = this.findings.filter(f => f.category === 'security' && f.severity === 'critical');
    if (criticalSecurity.length > 0) {
      concerns.push(`${criticalSecurity.length} critical security vulnerabilities require immediate attention`);
    }

    // Secrets detected
    const secrets = this.findings.filter(f => f.tags?.includes('secrets') || f.tags?.includes('credentials'));
    if (secrets.length > 0) {
      concerns.push(`${secrets.length} potential secrets or credentials exposed in code`);
    }

    // High severity accessibility
    const a11yCritical = this.findings.filter(f => f.category === 'accessibility' && (f.severity === 'critical' || f.severity === 'high'));
    if (a11yCritical.length > 0) {
      concerns.push(`${a11yCritical.length} accessibility violations may exclude users with disabilities`);
    }

    // Performance issues
    const perfIssues = this.findings.filter(f => f.category === 'performance' && f.severity !== 'info');
    if (perfIssues.length > 5) {
      concerns.push(`${perfIssues.length} performance issues may impact user experience`);
    }

    // Files with many issues
    const fileIssueCount = new Map<string, number>();
    this.findings.forEach(f => {
      if (f.file) {
        fileIssueCount.set(f.file, (fileIssueCount.get(f.file) || 0) + 1);
      }
    });
    const hotspots = [...fileIssueCount.entries()].filter(([, count]) => count > 10);
    if (hotspots.length > 0) {
      concerns.push(`${hotspots.length} files have 10+ issues each and may need refactoring`);
    }

    return concerns;
  }

  private getPositiveNotes(): string[] {
    const notes: string[] = [];

    const categories = new Set(this.findings.map(f => f.category));
    const allCategories: ToolCategory[] = ['security', 'accessibility', 'performance', 'code-quality'];

    const cleanCategories = allCategories.filter(c => !categories.has(c) || this.findings.filter(f => f.category === c).length === 0);
    if (cleanCategories.length > 0) {
      notes.push(`No issues found in: ${cleanCategories.join(', ')}`);
    }

    const autoFixable = this.findings.filter(f => f.autoFixable);
    if (autoFixable.length > 0) {
      notes.push(`${autoFixable.length} issues can be automatically fixed`);
    }

    if (this.report.deduplicationRate > 30) {
      notes.push(`AI deduplication reduced noise by ${this.report.deduplicationRate.toFixed(0)}%`);
    }

    return notes;
  }

  private getImmediateActions(): string[] {
    const actions: string[] = [];

    // Critical security
    const criticalSecurity = this.findings.filter(f => f.category === 'security' && f.severity === 'critical');
    if (criticalSecurity.length > 0) {
      actions.push(`Fix ${criticalSecurity.length} critical security vulnerabilities immediately`);
    }

    // Secrets
    const secrets = this.findings.filter(f => f.tags?.includes('secrets'));
    if (secrets.length > 0) {
      actions.push(`Rotate ${secrets.length} exposed credentials and remove from code`);
    }

    // Auto-fixable quick wins
    const quickFixes = this.findings.filter(f => f.autoFixable && (f.severity === 'high' || f.severity === 'critical'));
    if (quickFixes.length > 0) {
      actions.push(`Run auto-fix for ${quickFixes.length} high-priority issues`);
    }

    return actions;
  }

  private estimateTotalFixTime(): string {
    let minutes = 0;
    const effortMinutes = { trivial: 5, easy: 15, moderate: 45, hard: 120 };

    for (const finding of this.findings) {
      minutes += effortMinutes[finding.effort || 'moderate'];
    }

    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 480) return `${Math.round(minutes / 60)} hours`;
    return `${Math.round(minutes / 480)} days`;
  }

  private generateDeveloperSummary(): string {
    const total = this.findings.length;
    const autoFix = this.findings.filter(f => f.autoFixable).length;
    const categories = [...new Set(this.findings.map(f => f.category))];

    return `Found **${total} issues** across ${categories.length} categories. ` +
      `${autoFix} can be auto-fixed. ` +
      `Start with the prioritized action items below, focusing on quick wins first.`;
  }

  private calculateFileHealthScores(): FileHealthScore[] {
    const fileMap = new Map<string, AuditFinding[]>();

    for (const finding of this.findings) {
      if (finding.file) {
        if (!fileMap.has(finding.file)) {
          fileMap.set(finding.file, []);
        }
        fileMap.get(finding.file)!.push(finding);
      }
    }

    return [...fileMap.entries()]
      .map(([file, findings]) => {
        const issueCount = findings.length;
        const severityPenalty = findings.reduce((sum, f) => {
          const penalties = { critical: 25, high: 15, medium: 8, low: 3, info: 1 };
          return sum + penalties[f.severity];
        }, 0);

        const score = Math.max(0, 100 - severityPenalty);

        return {
          file,
          score,
          issueCount,
          topIssues: findings
            .sort((a, b) => {
              const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
              return order[a.severity] - order[b.severity];
            })
            .slice(0, 3)
            .map(f => f.title),
          trend: 'stable' as const,
        };
      })
      .sort((a, b) => a.score - b.score);
  }

  private generateActionItems(): ActionItem[] {
    return this.findings
      .map(finding => {
        const priorityMap = { critical: 1, high: 2, medium: 3, low: 4, info: 5 } as const;

        return {
          id: finding.id,
          priority: priorityMap[finding.severity] as 1 | 2 | 3 | 4 | 5,
          title: finding.title,
          description: finding.explanation || finding.description,
          file: finding.file,
          line: finding.line,
          effort: finding.effort || 'moderate',
          impact: finding.impact || 'Fixes a code quality issue',
          tags: finding.tags || [],
          autoFixAvailable: finding.autoFixable || false,
          aiPrompt: finding.aiPrompt?.short || `Fix: ${finding.title}`,
        };
      })
      .sort((a, b) => a.priority - b.priority);
  }

  private identifyCodePatterns(): CodePattern[] {
    const patternMap = new Map<string, AuditFinding[]>();

    for (const finding of this.findings) {
      const key = finding.ruleId || finding.title.split(':')[0];
      if (!patternMap.has(key)) {
        patternMap.set(key, []);
      }
      patternMap.get(key)!.push(finding);
    }

    return [...patternMap.entries()]
      .filter(([, findings]) => findings.length >= 3)
      .map(([pattern, findings]) => ({
        pattern,
        occurrences: findings.length,
        severity: findings[0].severity,
        description: findings[0].description,
        suggestedFix: findings[0].recommendation || 'Review and fix according to best practices',
        affectedFiles: [...new Set(findings.map(f => f.file).filter(Boolean))] as string[],
      }))
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  private suggestLearningResources(): LearningResource[] {
    const resources: LearningResource[] = [];
    const categories = new Set(this.findings.map(f => f.category));

    if (categories.has('security')) {
      resources.push({
        topic: 'OWASP Top 10',
        url: 'https://owasp.org/www-project-top-ten/',
        type: 'documentation',
        relevance: 'Understanding common security vulnerabilities',
      });
    }

    if (categories.has('accessibility')) {
      resources.push({
        topic: 'WCAG 2.1 Guidelines',
        url: 'https://www.w3.org/WAI/WCAG21/quickref/',
        type: 'documentation',
        relevance: 'Accessibility compliance requirements',
      });
    }

    if (categories.has('performance')) {
      resources.push({
        topic: 'Web Vitals',
        url: 'https://web.dev/vitals/',
        type: 'documentation',
        relevance: 'Core performance metrics explained',
      });
    }

    return resources;
  }

  private generateComplianceMapping(): ComplianceMapping[] {
    const mappings: ComplianceMapping[] = [];

    // OWASP mapping
    const securityFindings = this.findings.filter(f => f.category === 'security');
    const owaspTags = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10'];
    const owaspFailed = owaspTags.filter(tag =>
      securityFindings.some(f => f.tags?.some(t => t.includes(tag)))
    );

    mappings.push({
      framework: 'OWASP Top 10',
      version: '2021',
      coverage: ((owaspTags.length - owaspFailed.length) / owaspTags.length) * 100,
      passed: owaspTags.filter(t => !owaspFailed.includes(t)).map(t => `${t}: Passed`),
      failed: owaspFailed.map(t => `${t}: Violations found`),
      notApplicable: [],
    });

    // WCAG mapping
    const a11yFindings = this.findings.filter(f => f.category === 'accessibility');
    const wcagViolations = a11yFindings.length;

    mappings.push({
      framework: 'WCAG',
      version: '2.1 AA',
      coverage: wcagViolations === 0 ? 100 : Math.max(0, 100 - wcagViolations * 5),
      passed: wcagViolations === 0 ? ['All tested criteria passed'] : [],
      failed: a11yFindings.slice(0, 5).map(f => f.title),
      notApplicable: [],
    });

    return mappings;
  }
}
