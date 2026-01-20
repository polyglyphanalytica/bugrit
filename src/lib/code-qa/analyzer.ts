// Main Code QA Analyzer
// Orchestrates all analyzers and produces comprehensive reports

import { RepoSnapshot } from '../github/repo-analyzer';
import { SecurityAnalyzer } from './analyzers/security';
import { QualityAnalyzer } from './analyzers/quality';
import { PerformanceAnalyzer } from './analyzers/performance';
import { ErrorAnalyzer } from './analyzers/errors';
import {
  CodeQAReport,
  Finding,
  Recommendation,
  AnalyzerConfig,
  AnalyzerContext,
  FindingSeverity,
  FindingCategory,
} from './types';

export class CodeQAAnalyzer {
  private securityAnalyzer: SecurityAnalyzer;
  private qualityAnalyzer: QualityAnalyzer;
  private performanceAnalyzer: PerformanceAnalyzer;
  private errorAnalyzer: ErrorAnalyzer;

  constructor() {
    this.securityAnalyzer = new SecurityAnalyzer();
    this.qualityAnalyzer = new QualityAnalyzer();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.errorAnalyzer = new ErrorAnalyzer();
  }

  /**
   * Analyze a repository snapshot and generate a comprehensive report
   */
  async analyzeRepository(
    snapshot: RepoSnapshot,
    config?: AnalyzerConfig
  ): Promise<CodeQAReport> {
    const startTime = Date.now();
    const findings: Finding[] = [];

    // Analyze each file
    for (const file of snapshot.files) {
      const language = this.detectLanguage(file.path);

      // Skip if not in requested languages
      if (config?.languages && !config.languages.includes(language)) {
        continue;
      }

      const context: AnalyzerContext = {
        file: file.path,
        content: file.content,
        language,
        lines: file.content.split('\n'),
      };

      // Run all analyzers
      const categories = config?.categories || ['security', 'quality', 'performance', 'error', 'build', 'maintainability'];

      if (categories.includes('security')) {
        findings.push(...this.securityAnalyzer.analyze(context));
      }
      if (categories.includes('quality') || categories.includes('maintainability')) {
        findings.push(...this.qualityAnalyzer.analyze(context));
      }
      if (categories.includes('performance')) {
        findings.push(...this.performanceAnalyzer.analyze(context));
      }
      if (categories.includes('error') || categories.includes('build')) {
        findings.push(...this.errorAnalyzer.analyze(context));
      }
    }

    // Filter by severity if configured
    const filteredFindings = config?.minSeverity
      ? findings.filter((f) => this.meetsMinSeverity(f.severity, config.minSeverity!))
      : findings;

    // Sort findings by severity
    filteredFindings.sort((a, b) => this.severityWeight(b.severity) - this.severityWeight(a.severity));

    // Calculate statistics
    const stats = this.calculateStats(filteredFindings, snapshot, startTime);

    // Generate recommendations
    const recommendations = this.generateRecommendations(filteredFindings);

    // Generate summary
    const summary = this.generateSummary(filteredFindings, snapshot);

    // Calculate health score
    const healthScore = this.calculateHealthScore(filteredFindings, snapshot.stats.totalFiles);

    return {
      id: `report-${Date.now()}`,
      repositoryName: snapshot.repository.fullName,
      branch: snapshot.branch,
      commitSha: snapshot.commitSha,
      analyzedAt: new Date(),
      summary,
      findings: filteredFindings,
      recommendations,
      stats,
      healthScore,
    };
  }

  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      rb: 'ruby',
      php: 'php',
      rs: 'rust',
      swift: 'swift',
      kt: 'kotlin',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'c',
    };
    return languageMap[extension] || 'unknown';
  }

  private severityWeight(severity: FindingSeverity): number {
    const weights: Record<FindingSeverity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };
    return weights[severity];
  }

  private meetsMinSeverity(severity: FindingSeverity, minSeverity: FindingSeverity): boolean {
    return this.severityWeight(severity) >= this.severityWeight(minSeverity);
  }

  private calculateStats(
    findings: Finding[],
    snapshot: RepoSnapshot,
    startTime: number
  ) {
    const bySeverity: Record<FindingSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const byCategory: Record<FindingCategory, number> = {
      security: 0,
      performance: 0,
      quality: 0,
      build: 0,
      error: 0,
      accessibility: 0,
      maintainability: 0,
      'best-practice': 0,
    };

    for (const finding of findings) {
      bySeverity[finding.severity]++;
      byCategory[finding.category]++;
    }

    return {
      totalFindings: findings.length,
      bySeverity,
      byCategory,
      filesAnalyzed: snapshot.stats.totalFiles,
      linesOfCode: snapshot.files.reduce((sum, f) => sum + f.content.split('\n').length, 0),
      analysisTime: Date.now() - startTime,
    };
  }

  private generateRecommendations(findings: Finding[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const categoryGroups = new Map<string, Finding[]>();

    // Group findings by category
    for (const finding of findings) {
      const existing = categoryGroups.get(finding.category) || [];
      existing.push(finding);
      categoryGroups.set(finding.category, existing);
    }

    // Security recommendations
    const securityFindings = categoryGroups.get('security') || [];
    if (securityFindings.length > 0) {
      const criticalSecurity = securityFindings.filter((f) => f.severity === 'critical' || f.severity === 'high');
      if (criticalSecurity.length > 0) {
        recommendations.push({
          title: 'Address Critical Security Vulnerabilities',
          description: `Found ${criticalSecurity.length} high or critical security issues that should be fixed immediately. These vulnerabilities could allow attackers to compromise your application or data.`,
          priority: 'immediate',
          effort: criticalSecurity.length > 5 ? 'high' : 'medium',
          category: 'security',
          relatedFindings: criticalSecurity.map((f) => f.id),
        });
      }
    }

    // Performance recommendations
    const perfFindings = categoryGroups.get('performance') || [];
    if (perfFindings.length > 3) {
      recommendations.push({
        title: 'Improve Application Performance',
        description: `Found ${perfFindings.length} performance issues. Addressing these will make your application faster and more responsive for users.`,
        priority: 'short-term',
        effort: 'medium',
        category: 'performance',
        relatedFindings: perfFindings.map((f) => f.id),
      });
    }

    // Error handling recommendations
    const errorFindings = categoryGroups.get('error') || [];
    if (errorFindings.length > 0) {
      recommendations.push({
        title: 'Improve Error Handling',
        description: `Found ${errorFindings.length} potential error handling issues. Better error handling will make your application more reliable and easier to debug.`,
        priority: errorFindings.some((f) => f.severity === 'critical') ? 'immediate' : 'short-term',
        effort: 'low',
        category: 'error',
        relatedFindings: errorFindings.map((f) => f.id),
      });
    }

    // Code quality recommendations
    const qualityFindings = [...(categoryGroups.get('quality') || []), ...(categoryGroups.get('maintainability') || [])];
    if (qualityFindings.length > 5) {
      recommendations.push({
        title: 'Improve Code Quality',
        description: `Found ${qualityFindings.length} code quality issues. While not urgent, addressing these will make your codebase easier to maintain and reduce future bugs.`,
        priority: 'long-term',
        effort: 'low',
        category: 'quality',
        relatedFindings: qualityFindings.map((f) => f.id),
      });
    }

    return recommendations;
  }

  private generateSummary(findings: Finding[], snapshot: RepoSnapshot) {
    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const highCount = findings.filter((f) => f.severity === 'high').length;
    const securityCount = findings.filter((f) => f.category === 'security').length;

    // Generate overview
    let overview: string;
    if (criticalCount > 0) {
      overview = `This codebase has ${criticalCount} critical issues that need immediate attention. Overall, ${findings.length} issues were found across ${snapshot.stats.totalFiles} files.`;
    } else if (highCount > 0) {
      overview = `This codebase has ${highCount} high-priority issues that should be addressed soon. In total, ${findings.length} issues were found.`;
    } else if (findings.length > 10) {
      overview = `This codebase has ${findings.length} issues to address, but none are critical. Consider scheduling time to work through these improvements.`;
    } else if (findings.length > 0) {
      overview = `This codebase is in good shape with only ${findings.length} minor issues found. Keep up the good work!`;
    } else {
      overview = `Excellent! No issues were found in this analysis. The codebase appears to follow best practices.`;
    }

    // Key concerns
    const keyConcerns: string[] = [];
    if (securityCount > 0) {
      keyConcerns.push(`Security vulnerabilities found (${securityCount} issues) - review and fix before deploying`);
    }
    if (criticalCount > 0) {
      keyConcerns.push(`Critical issues present that could cause application failures`);
    }
    if (findings.filter((f) => f.category === 'error').length > 5) {
      keyConcerns.push('Multiple potential runtime errors that could affect user experience');
    }

    // Positives
    const positives: string[] = [];
    if (securityCount === 0) {
      positives.push('No security vulnerabilities detected');
    }
    if (criticalCount === 0) {
      positives.push('No critical issues found');
    }
    if (findings.length < 10) {
      positives.push('Code quality is generally good');
    }

    // Quick wins
    const quickWins = findings
      .filter((f) => f.severity === 'low' && f.category !== 'security')
      .slice(0, 3)
      .map((f) => `${f.title} in ${f.file}`);

    return {
      overview,
      keyConcerns,
      positives,
      quickWins,
    };
  }

  private calculateHealthScore(findings: Finding[], totalFiles: number): number {
    // Start with 100 and deduct points based on findings
    let score = 100;

    // Deduct based on severity
    for (const finding of findings) {
      switch (finding.severity) {
        case 'critical':
          score -= 10;
          break;
        case 'high':
          score -= 5;
          break;
        case 'medium':
          score -= 2;
          break;
        case 'low':
          score -= 0.5;
          break;
        case 'info':
          score -= 0.1;
          break;
      }
    }

    // Normalize based on codebase size
    const findingsPerFile = findings.length / totalFiles;
    if (findingsPerFile > 2) {
      score -= 10;
    } else if (findingsPerFile > 1) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
