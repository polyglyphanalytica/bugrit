// Types for Code QA Module

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingCategory =
  | 'security'
  | 'performance'
  | 'quality'
  | 'build'
  | 'error'
  | 'accessibility'
  | 'maintainability'
  | 'best-practice';

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;

  // Plain English description
  title: string;
  description: string;
  explanation: string;

  // Location
  file: string;
  line?: number;
  column?: number;
  codeSnippet?: string;

  // Impact
  impact: string;
  affectedArea: string;

  // Recommendations (plain English)
  recommendation: string;
  additionalContext?: string;

  // AI prompt for fixing
  aiPrompt: AIPrompt;

  // Metadata
  rule?: string;
  cweId?: string;
  owaspCategory?: string;
  references?: string[];
  tags: string[];
}

export interface AIPrompt {
  // Short prompt for quick fixes
  shortPrompt: string;

  // Detailed prompt with context
  detailedPrompt: string;

  // Step-by-step instructions
  steps?: string[];

  // Example of expected fix (not actual code)
  expectedOutcome: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'immediate' | 'short-term' | 'long-term';
  effort: 'low' | 'medium' | 'high';
  category: FindingCategory;
  relatedFindings: string[];
}

export interface CodeQAReport {
  // Metadata
  id: string;
  repositoryName: string;
  branch: string;
  commitSha: string;
  analyzedAt: Date;

  // Summary
  summary: ReportSummary;

  // Findings by category
  findings: Finding[];

  // Overall recommendations
  recommendations: Recommendation[];

  // Statistics
  stats: ReportStats;

  // Health score (0-100)
  healthScore: number;
}

export interface ReportSummary {
  // Plain English overview
  overview: string;

  // Key concerns
  keyConcerns: string[];

  // Positive aspects
  positives: string[];

  // Quick wins
  quickWins: string[];
}

export interface ReportStats {
  totalFindings: number;
  bySeverity: Record<FindingSeverity, number>;
  byCategory: Record<FindingCategory, number>;
  filesAnalyzed: number;
  linesOfCode: number;
  analysisTime: number;
}

export interface AnalyzerConfig {
  // File patterns
  includePatterns?: string[];
  excludePatterns?: string[];

  // Severity threshold
  minSeverity?: FindingSeverity;

  // Categories to analyze
  categories?: FindingCategory[];

  // Language-specific options
  languages?: string[];

  // Custom rules
  customRules?: AnalyzerRule[];
}

export interface AnalyzerRule {
  id: string;
  name: string;
  description: string;
  category: FindingCategory;
  severity: FindingSeverity;
  pattern: string;
  recommendation: string;
}

export interface AnalyzerContext {
  file: string;
  content: string;
  language: string;
  lines: string[];
}
