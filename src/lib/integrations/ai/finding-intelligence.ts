// AI Intelligence Layer for Finding Aggregation
// Handles deduplication, correlation, prioritization, and surfacing of findings

import { AuditFinding, AuditResult, Severity, ToolCategory } from '../types';

interface CorrelationGroup {
  id: string;
  primaryFinding: AuditFinding;
  relatedFindings: AuditFinding[];
  tools: string[];
  confidence: number;
  aggregatedSeverity: Severity;
  category: ToolCategory;
  summary: string;
  recommendation: string;
  estimatedEffort: AuditFinding['effort'];
  impact: 'critical' | 'high' | 'medium' | 'low';
}

interface IntelligenceReport {
  timestamp: string;
  totalRawFindings: number;
  totalGroupedFindings: number;
  deduplicationRate: number;
  correlationGroups: CorrelationGroup[];
  prioritizedFindings: PrioritizedFinding[];
  categoryBreakdown: Record<ToolCategory, CategorySummary>;
  topIssues: TopIssue[];
  contradictions: Contradiction[];
  trends: Trend[];
  recommendations: SmartRecommendation[];
}

interface PrioritizedFinding {
  finding: AuditFinding;
  priorityScore: number;
  factors: PriorityFactor[];
  relatedFindings: string[]; // IDs
}

interface PriorityFactor {
  name: string;
  weight: number;
  reason: string;
}

interface CategorySummary {
  total: number;
  bySeverity: Record<Severity, number>;
  tools: string[];
  topIssues: string[];
}

interface TopIssue {
  title: string;
  description: string;
  occurrences: number;
  tools: string[];
  severity: Severity;
  category: ToolCategory;
  affectedFiles: string[];
}

interface Contradiction {
  findingA: AuditFinding;
  findingB: AuditFinding;
  type: 'severity' | 'recommendation' | 'classification';
  explanation: string;
  resolution: string;
}

interface Trend {
  metric: string;
  direction: 'improving' | 'worsening' | 'stable';
  change: number;
  period: string;
}

interface SmartRecommendation {
  title: string;
  description: string;
  priority: 'immediate' | 'soon' | 'later';
  estimatedImpact: string;
  relatedFindings: string[];
  effort: AuditFinding['effort'];
}

export class FindingIntelligence {
  private findings: AuditFinding[] = [];
  private results: AuditResult[] = [];

  constructor(results: AuditResult[]) {
    this.results = results;
    this.findings = results.flatMap(r => r.findings);
  }

  /**
   * Generate a comprehensive intelligence report from all audit results
   */
  generateReport(): IntelligenceReport {
    const correlationGroups = this.correlateFindings();
    const prioritizedFindings = this.prioritizeFindings();
    const contradictions = this.detectContradictions();

    return {
      timestamp: new Date().toISOString(),
      totalRawFindings: this.findings.length,
      totalGroupedFindings: correlationGroups.length,
      deduplicationRate: this.findings.length > 0
        ? ((this.findings.length - correlationGroups.length) / this.findings.length) * 100
        : 0,
      correlationGroups,
      prioritizedFindings,
      categoryBreakdown: this.getCategoryBreakdown(),
      topIssues: this.identifyTopIssues(),
      contradictions,
      trends: this.analyzeTrends(),
      recommendations: this.generateSmartRecommendations(correlationGroups, prioritizedFindings),
    };
  }

  /**
   * Correlate and deduplicate findings from multiple tools
   */
  private correlateFindings(): CorrelationGroup[] {
    const groups: CorrelationGroup[] = [];
    const processed = new Set<string>();

    for (const finding of this.findings) {
      if (processed.has(finding.id)) continue;

      const related = this.findRelatedFindings(finding);
      const allFindings = [finding, ...related];

      // Mark all as processed
      allFindings.forEach(f => processed.add(f.id));

      const tools = [...new Set(allFindings.map(f => f.tool))];
      const aggregatedSeverity = this.aggregateSeverity(allFindings);

      groups.push({
        id: `group-${groups.length + 1}`,
        primaryFinding: finding,
        relatedFindings: related,
        tools,
        confidence: this.calculateCorrelationConfidence(allFindings),
        aggregatedSeverity,
        category: finding.category,
        summary: this.generateGroupSummary(allFindings),
        recommendation: this.mergeRecommendations(allFindings),
        estimatedEffort: this.estimateGroupEffort(allFindings),
        impact: this.calculateImpact(aggregatedSeverity, allFindings.length),
      });
    }

    // Sort by impact and severity
    return groups.sort((a, b) => {
      const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

      if (impactOrder[a.impact] !== impactOrder[b.impact]) {
        return impactOrder[a.impact] - impactOrder[b.impact];
      }
      return severityOrder[a.aggregatedSeverity] - severityOrder[b.aggregatedSeverity];
    });
  }

  /**
   * Find related findings based on multiple correlation factors
   */
  private findRelatedFindings(finding: AuditFinding): AuditFinding[] {
    const related: AuditFinding[] = [];

    for (const other of this.findings) {
      if (other.id === finding.id) continue;

      const correlationScore = this.calculateCorrelationScore(finding, other);
      if (correlationScore > 0.6) {
        related.push(other);
      }
    }

    return related;
  }

  /**
   * Calculate correlation score between two findings
   */
  private calculateCorrelationScore(a: AuditFinding, b: AuditFinding): number {
    let score = 0;
    let weights = 0;

    // Same file
    if (a.file && b.file && a.file === b.file) {
      score += 0.3;
      weights += 0.3;

      // Same line (very strong correlation)
      if (a.line && b.line && Math.abs(a.line - b.line) <= 5) {
        score += 0.4;
        weights += 0.4;
      }
    }

    // Same URL
    if (a.url && b.url && a.url === b.url) {
      score += 0.2;
      weights += 0.2;
    }

    // Same selector
    if (a.selector && b.selector && a.selector === b.selector) {
      score += 0.3;
      weights += 0.3;
    }

    // Similar title (fuzzy match)
    const titleSimilarity = this.calculateStringSimilarity(a.title, b.title);
    if (titleSimilarity > 0.5) {
      score += titleSimilarity * 0.2;
      weights += 0.2;
    }

    // Same category
    if (a.category === b.category) {
      score += 0.1;
      weights += 0.1;
    }

    // Overlapping tags
    if (a.tags && b.tags) {
      const commonTags = a.tags.filter(t => b.tags?.includes(t));
      if (commonTags.length > 0) {
        score += (commonTags.length / Math.max(a.tags.length, b.tags.length)) * 0.1;
        weights += 0.1;
      }
    }

    // Same rule ID pattern
    if (a.ruleId && b.ruleId) {
      if (a.ruleId === b.ruleId) {
        score += 0.25;
        weights += 0.25;
      } else if (this.isSimilarRule(a.ruleId, b.ruleId)) {
        score += 0.15;
        weights += 0.15;
      }
    }

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Check if two rule IDs are similar (e.g., same vulnerability type from different tools)
   */
  private isSimilarRule(ruleA: string, ruleB: string): boolean {
    const rulePatterns: Record<string, string[]> = {
      'xss': ['xss', 'cross-site-scripting', 'script-injection', 'html-injection'],
      'sqli': ['sql-injection', 'sqli', 'sql-query'],
      'auth': ['authentication', 'auth', 'login', 'session'],
      'csrf': ['csrf', 'cross-site-request-forgery'],
      'injection': ['injection', 'command-injection', 'code-injection'],
      'disclosure': ['disclosure', 'information-leak', 'exposure'],
      'a11y-color': ['color-contrast', 'contrast', 'color'],
      'a11y-alt': ['image-alt', 'alt-text', 'img-alt'],
      'perf-lcp': ['lcp', 'largest-contentful-paint'],
      'perf-fcp': ['fcp', 'first-contentful-paint'],
    };

    const normalizedA = ruleA.toLowerCase().replace(/[-_]/g, ' ');
    const normalizedB = ruleB.toLowerCase().replace(/[-_]/g, ' ');

    for (const patterns of Object.values(rulePatterns)) {
      const matchA = patterns.some(p => normalizedA.includes(p));
      const matchB = patterns.some(p => normalizedB.includes(p));
      if (matchA && matchB) return true;
    }

    return false;
  }

  /**
   * Calculate string similarity using Jaccard coefficient
   */
  private calculateStringSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Aggregate severity from multiple findings - take the highest
   */
  private aggregateSeverity(findings: AuditFinding[]): Severity {
    const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

    for (const severity of severityOrder) {
      if (findings.some(f => f.severity === severity)) {
        return severity;
      }
    }

    return 'info';
  }

  /**
   * Calculate confidence in correlation
   */
  private calculateCorrelationConfidence(findings: AuditFinding[]): number {
    if (findings.length === 1) return 1;

    // More tools agreeing = higher confidence
    const uniqueTools = new Set(findings.map(f => f.tool)).size;

    // Same file/location = higher confidence
    const sameFile = findings.every(f => f.file === findings[0].file);
    const sameLine = findings.every(f => f.line === findings[0].line);

    let confidence = 0.5;
    confidence += uniqueTools * 0.1;
    if (sameFile) confidence += 0.2;
    if (sameLine) confidence += 0.2;

    return Math.min(confidence, 1);
  }

  /**
   * Generate a human-readable summary for a group of findings
   */
  private generateGroupSummary(findings: AuditFinding[]): string {
    const tools = [...new Set(findings.map(f => f.tool))];
    const categories = [...new Set(findings.map(f => f.category))];

    if (findings.length === 1) {
      return findings[0].description;
    }

    const primary = findings[0];
    return `${tools.length} tools (${tools.join(', ')}) identified this ${categories[0]} issue: ${primary.description.substring(0, 100)}${primary.description.length > 100 ? '...' : ''}`;
  }

  /**
   * Merge recommendations from multiple findings
   */
  private mergeRecommendations(findings: AuditFinding[]): string {
    if (findings.length === 1) {
      return findings[0].recommendation;
    }

    // Combine unique recommendations
    const recommendations = new Set<string>();
    for (const f of findings) {
      if (f.recommendation) {
        recommendations.add(f.recommendation);
      }
    }

    const uniqueRecs = [...recommendations];
    if (uniqueRecs.length === 1) {
      return uniqueRecs[0];
    }

    return `Multiple tools suggest:\n${uniqueRecs.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }

  /**
   * Estimate effort for a group of findings
   */
  private estimateGroupEffort(findings: AuditFinding[]): AuditFinding['effort'] {
    const efforts = findings.map(f => f.effort).filter(Boolean) as AuditFinding['effort'][];

    if (efforts.length === 0) return 'moderate';

    const effortOrder = { trivial: 1, easy: 2, moderate: 3, hard: 4 };

    // Take the maximum effort
    const maxEffort = efforts.reduce((max, e) => {
      return effortOrder[e!] > effortOrder[max!] ? e : max;
    }, efforts[0]);

    return maxEffort;
  }

  /**
   * Calculate impact level
   */
  private calculateImpact(
    severity: Severity,
    findingCount: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (severity === 'critical') return 'critical';
    if (severity === 'high') return findingCount > 2 ? 'critical' : 'high';
    if (severity === 'medium') return findingCount > 3 ? 'high' : 'medium';
    return 'low';
  }

  /**
   * Prioritize findings based on multiple factors
   */
  private prioritizeFindings(): PrioritizedFinding[] {
    return this.findings.map(finding => {
      const factors = this.calculatePriorityFactors(finding);
      const priorityScore = factors.reduce((sum, f) => sum + f.weight, 0);

      return {
        finding,
        priorityScore,
        factors,
        relatedFindings: this.findRelatedFindings(finding).map(f => f.id),
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Calculate priority factors for a finding
   */
  private calculatePriorityFactors(finding: AuditFinding): PriorityFactor[] {
    const factors: PriorityFactor[] = [];

    // Severity
    const severityWeights: Record<Severity, number> = {
      critical: 50,
      high: 40,
      medium: 25,
      low: 10,
      info: 5,
    };
    factors.push({
      name: 'severity',
      weight: severityWeights[finding.severity],
      reason: `${finding.severity} severity issue`,
    });

    // Category importance
    const categoryWeights: Partial<Record<ToolCategory, number>> = {
      security: 30,
      accessibility: 20,
      performance: 15,
      'code-quality': 10,
    };
    if (categoryWeights[finding.category]) {
      factors.push({
        name: 'category',
        weight: categoryWeights[finding.category]!,
        reason: `${finding.category} category`,
      });
    }

    // Effort (easier fixes get higher priority)
    const effortWeights: Record<NonNullable<AuditFinding['effort']>, number> = {
      trivial: 15,
      easy: 12,
      moderate: 8,
      hard: 3,
    };
    if (finding.effort) {
      factors.push({
        name: 'effort',
        weight: effortWeights[finding.effort],
        reason: `${finding.effort} fix effort`,
      });
    }

    // Has documentation
    if (finding.documentationUrl) {
      factors.push({
        name: 'documentation',
        weight: 5,
        reason: 'Has documentation available',
      });
    }

    // Multiple tools detected
    const relatedCount = this.findRelatedFindings(finding).length;
    if (relatedCount > 0) {
      factors.push({
        name: 'validation',
        weight: Math.min(relatedCount * 5, 20),
        reason: `Confirmed by ${relatedCount + 1} tools`,
      });
    }

    return factors;
  }

  /**
   * Detect contradictions between findings from different tools
   */
  private detectContradictions(): Contradiction[] {
    const contradictions: Contradiction[] = [];

    for (let i = 0; i < this.findings.length; i++) {
      for (let j = i + 1; j < this.findings.length; j++) {
        const a = this.findings[i];
        const b = this.findings[j];

        // Check if findings are about the same thing
        const correlationScore = this.calculateCorrelationScore(a, b);
        if (correlationScore < 0.6) continue;

        // Check for severity contradiction
        if (this.hasSeverityContradiction(a, b)) {
          contradictions.push({
            findingA: a,
            findingB: b,
            type: 'severity',
            explanation: `${a.tool} rates this as ${a.severity} while ${b.tool} rates it as ${b.severity}`,
            resolution: this.resolveSeverityContradiction(a, b),
          });
        }

        // Check for recommendation contradiction
        if (this.hasRecommendationContradiction(a, b)) {
          contradictions.push({
            findingA: a,
            findingB: b,
            type: 'recommendation',
            explanation: `Different recommendations: "${a.recommendation?.substring(0, 50)}" vs "${b.recommendation?.substring(0, 50)}"`,
            resolution: 'Consider both recommendations and choose based on your specific context.',
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Check if two findings have contradictory severity
   */
  private hasSeverityContradiction(a: AuditFinding, b: AuditFinding): boolean {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const diff = Math.abs(severityOrder[a.severity] - severityOrder[b.severity]);
    return diff >= 2;
  }

  /**
   * Check if recommendations contradict each other
   */
  private hasRecommendationContradiction(a: AuditFinding, b: AuditFinding): boolean {
    if (!a.recommendation || !b.recommendation) return false;

    const contradictionPatterns = [
      ['enable', 'disable'],
      ['add', 'remove'],
      ['increase', 'decrease'],
      ['use', 'avoid'],
    ];

    for (const [pattern1, pattern2] of contradictionPatterns) {
      const aHas1 = a.recommendation.toLowerCase().includes(pattern1);
      const aHas2 = a.recommendation.toLowerCase().includes(pattern2);
      const bHas1 = b.recommendation.toLowerCase().includes(pattern1);
      const bHas2 = b.recommendation.toLowerCase().includes(pattern2);

      if ((aHas1 && bHas2) || (aHas2 && bHas1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve severity contradiction
   */
  private resolveSeverityContradiction(a: AuditFinding, b: AuditFinding): string {
    // Prefer security tool assessment for security issues
    if (a.category === 'security' || b.category === 'security') {
      const securityTool = a.category === 'security' ? a : b;
      return `For security issues, prefer ${securityTool.tool}'s assessment (${securityTool.severity}).`;
    }

    // Default to higher severity to be safe
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const higher = severityOrder[a.severity] < severityOrder[b.severity] ? a : b;
    return `Treat as ${higher.severity} (${higher.tool}'s assessment) to be safe.`;
  }

  /**
   * Get breakdown by category
   */
  private getCategoryBreakdown(): Record<ToolCategory, CategorySummary> {
    const breakdown: Record<ToolCategory, CategorySummary> = {} as Record<ToolCategory, CategorySummary>;

    for (const finding of this.findings) {
      if (!breakdown[finding.category]) {
        breakdown[finding.category] = {
          total: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          tools: [],
          topIssues: [],
        };
      }

      breakdown[finding.category].total++;
      breakdown[finding.category].bySeverity[finding.severity]++;

      if (!breakdown[finding.category].tools.includes(finding.tool)) {
        breakdown[finding.category].tools.push(finding.tool);
      }

      if (breakdown[finding.category].topIssues.length < 3) {
        breakdown[finding.category].topIssues.push(finding.title);
      }
    }

    return breakdown;
  }

  /**
   * Identify top issues across all findings
   */
  private identifyTopIssues(): TopIssue[] {
    const issueMap = new Map<string, TopIssue>();

    for (const finding of this.findings) {
      // Create a normalized key for grouping
      const key = `${finding.category}-${finding.ruleId || finding.title.substring(0, 30)}`;

      if (!issueMap.has(key)) {
        issueMap.set(key, {
          title: finding.title.replace(/^[^:]+:\s*/, ''), // Remove tool prefix
          description: finding.description,
          occurrences: 0,
          tools: [],
          severity: finding.severity,
          category: finding.category,
          affectedFiles: [],
        });
      }

      const issue = issueMap.get(key)!;
      issue.occurrences++;

      if (!issue.tools.includes(finding.tool)) {
        issue.tools.push(finding.tool);
      }

      if (finding.file && !issue.affectedFiles.includes(finding.file)) {
        issue.affectedFiles.push(finding.file);
      }

      // Update severity if higher
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      if (severityOrder[finding.severity] < severityOrder[issue.severity]) {
        issue.severity = finding.severity;
      }
    }

    return [...issueMap.values()]
      .sort((a, b) => {
        // Sort by severity then occurrences
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.occurrences - a.occurrences;
      })
      .slice(0, 10);
  }

  /**
   * Analyze trends (placeholder for historical comparison)
   */
  private analyzeTrends(): Trend[] {
    // Would compare with historical data if available
    return [];
  }

  /**
   * Generate smart recommendations based on all findings
   */
  private generateSmartRecommendations(
    groups: CorrelationGroup[],
    prioritized: PrioritizedFinding[]
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];

    // Quick wins: High priority, easy fixes
    const quickWins = prioritized.filter(
      p => p.priorityScore > 50 && (p.finding.effort === 'trivial' || p.finding.effort === 'easy')
    );

    if (quickWins.length > 0) {
      recommendations.push({
        title: 'Quick Wins Available',
        description: `${quickWins.length} high-priority issues can be fixed quickly.`,
        priority: 'immediate',
        estimatedImpact: `Fix ${quickWins.length} issues with minimal effort`,
        relatedFindings: quickWins.slice(0, 5).map(q => q.finding.id),
        effort: 'easy',
      });
    }

    // Security first
    const securityIssues = groups.filter(g => g.category === 'security' && g.aggregatedSeverity !== 'info');
    if (securityIssues.length > 0) {
      recommendations.push({
        title: 'Address Security Issues First',
        description: `${securityIssues.length} security issues need attention.`,
        priority: 'immediate',
        estimatedImpact: 'Reduce security risk exposure',
        relatedFindings: securityIssues.slice(0, 5).map(s => s.primaryFinding.id),
        effort: 'moderate',
      });
    }

    // Accessibility compliance
    const a11yIssues = groups.filter(g => g.category === 'accessibility' && g.aggregatedSeverity !== 'info');
    if (a11yIssues.length > 0) {
      recommendations.push({
        title: 'Improve Accessibility',
        description: `${a11yIssues.length} accessibility issues affect users with disabilities.`,
        priority: 'soon',
        estimatedImpact: 'Better user experience for all users',
        relatedFindings: a11yIssues.slice(0, 5).map(a => a.primaryFinding.id),
        effort: 'moderate',
      });
    }

    // Performance improvements
    const perfIssues = groups.filter(g => g.category === 'performance' && g.aggregatedSeverity !== 'info');
    if (perfIssues.length > 0) {
      recommendations.push({
        title: 'Optimize Performance',
        description: `${perfIssues.length} performance issues affecting user experience.`,
        priority: 'soon',
        estimatedImpact: 'Faster page loads and better UX',
        relatedFindings: perfIssues.slice(0, 5).map(p => p.primaryFinding.id),
        effort: 'moderate',
      });
    }

    // Technical debt
    const codeQualityIssues = groups.filter(g => g.category === 'code-quality');
    if (codeQualityIssues.length > 10) {
      recommendations.push({
        title: 'Address Technical Debt',
        description: `${codeQualityIssues.length} code quality issues accumulating.`,
        priority: 'later',
        estimatedImpact: 'Improved maintainability',
        relatedFindings: codeQualityIssues.slice(0, 5).map(c => c.primaryFinding.id),
        effort: 'moderate',
      });
    }

    return recommendations;
  }

  /**
   * Get a user-friendly summary of the intelligence report
   */
  static generateSummary(report: IntelligenceReport): string {
    const lines: string[] = [];

    lines.push(`## Audit Intelligence Summary`);
    lines.push('');
    lines.push(`**Analysis Date:** ${new Date(report.timestamp).toLocaleString()}`);
    lines.push(`**Total Findings:** ${report.totalRawFindings} raw → ${report.totalGroupedFindings} unique issues (${report.deduplicationRate.toFixed(1)}% deduplicated)`);
    lines.push('');

    // Top Issues
    if (report.topIssues.length > 0) {
      lines.push(`### Top Issues`);
      for (const issue of report.topIssues.slice(0, 5)) {
        lines.push(`- **${issue.title}** (${issue.severity}) - ${issue.occurrences} occurrences`);
      }
      lines.push('');
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push(`### Recommended Actions`);
      for (const rec of report.recommendations) {
        const priority = rec.priority === 'immediate' ? '🔴' : rec.priority === 'soon' ? '🟡' : '🟢';
        lines.push(`${priority} **${rec.title}**: ${rec.description}`);
      }
      lines.push('');
    }

    // Contradictions warning
    if (report.contradictions.length > 0) {
      lines.push(`### ⚠️ Contradictions Detected`);
      lines.push(`${report.contradictions.length} findings have conflicting assessments from different tools.`);
      for (const c of report.contradictions.slice(0, 3)) {
        lines.push(`- ${c.explanation}`);
        lines.push(`  Resolution: ${c.resolution}`);
      }
    }

    return lines.join('\n');
  }
}

export type { IntelligenceReport, CorrelationGroup, PrioritizedFinding, SmartRecommendation, Contradiction };
