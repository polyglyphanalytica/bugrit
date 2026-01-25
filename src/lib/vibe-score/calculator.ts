/**
 * Vibe Score Calculator
 *
 * Calculates a 0-100 score based on scan findings.
 * Higher score = healthier codebase.
 */

import type { AuditFinding, Severity } from '@/lib/integrations/types';
import type { VibeScore, VibeGrade, ScoreBreakdown, Badge, BADGE_DEFINITIONS } from './types';

// Severity weights for deductions
const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 15,
  high: 8,
  medium: 3,
  low: 1,
  info: 0,
};

// Category weights (how much each category contributes to overall)
const CATEGORY_WEIGHTS = {
  security: 0.35,      // Security is most important
  quality: 0.20,
  accessibility: 0.15,
  performance: 0.10,
  dependencies: 0.15,
  documentation: 0.05,
};

// Maximum deductions per category (prevents one bad area from tanking entire score)
const MAX_CATEGORY_DEDUCTION = 40;

interface CalculatorInput {
  findings: AuditFinding[];
  previousScore?: number | null;
  linesOfCode?: number;
}

export function calculateVibeScore(input: CalculatorInput): VibeScore {
  const { findings, previousScore, linesOfCode } = input;

  // Group findings by category
  const byCategory = groupFindingsByCategory(findings);

  // Calculate component scores
  const components = {
    security: calculateComponentScore(byCategory.security || []),
    quality: calculateComponentScore(byCategory.quality || []),
    accessibility: calculateComponentScore(byCategory.accessibility || []),
    performance: calculateComponentScore(byCategory.performance || []),
    dependencies: calculateComponentScore(byCategory.dependencies || []),
    documentation: calculateComponentScore(byCategory.documentation || []),
  };

  // Calculate weighted overall score
  const overall = Math.round(
    components.security * CATEGORY_WEIGHTS.security +
    components.quality * CATEGORY_WEIGHTS.quality +
    components.accessibility * CATEGORY_WEIGHTS.accessibility +
    components.performance * CATEGORY_WEIGHTS.performance +
    components.dependencies * CATEGORY_WEIGHTS.dependencies +
    components.documentation * CATEGORY_WEIGHTS.documentation
  );

  // Calculate grade
  const grade = scoreToGrade(overall);

  // Calculate trend
  const trend = calculateTrend(overall, previousScore);

  // Build breakdown
  const breakdown = buildBreakdown(findings, components);

  return {
    overall,
    components,
    grade,
    trend,
    percentile: null, // Calculated separately with benchmark data
    breakdown,
  };
}

function groupFindingsByCategory(findings: AuditFinding[]): Record<string, AuditFinding[]> {
  const groups: Record<string, AuditFinding[]> = {};

  for (const finding of findings) {
    const category = mapToolCategoryToScoreCategory(finding.category);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(finding);
  }

  return groups;
}

function mapToolCategoryToScoreCategory(toolCategory: string): string {
  const mapping: Record<string, string> = {
    'linting': 'quality',
    'security': 'security',
    'dependencies': 'dependencies',
    'accessibility': 'accessibility',
    'quality': 'quality',
    'documentation': 'documentation',
    'git': 'quality',
    'performance': 'performance',
    'mobile': 'security',
    'api-security': 'security',
    'cloud-native': 'security',
  };

  return mapping[toolCategory] || 'quality';
}

function calculateComponentScore(findings: AuditFinding[]): number {
  if (findings.length === 0) {
    return 100; // Perfect score if no findings
  }

  let deduction = 0;

  for (const finding of findings) {
    const weight = SEVERITY_WEIGHTS[finding.severity] || 0;
    deduction += weight;
  }

  // Cap deduction at maximum
  deduction = Math.min(deduction, MAX_CATEGORY_DEDUCTION);

  // Score is 100 minus deductions, minimum 0
  return Math.max(0, 100 - deduction);
}

function scoreToGrade(score: number): VibeGrade {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

function calculateTrend(
  current: number,
  previous: number | null | undefined
): VibeScore['trend'] {
  if (previous === null || previous === undefined) {
    return {
      direction: 'stable',
      delta: 0,
      previousScore: null,
    };
  }

  const delta = current - previous;
  let direction: 'up' | 'down' | 'stable';

  if (delta > 2) {
    direction = 'up';
  } else if (delta < -2) {
    direction = 'down';
  } else {
    direction = 'stable';
  }

  return {
    direction,
    delta,
    previousScore: previous,
  };
}

function buildBreakdown(
  findings: AuditFinding[],
  components: VibeScore['components']
): ScoreBreakdown {
  const deductions: ScoreBreakdown['deductions'] = [];

  // Group findings by severity and category for deduction summary
  const severityGroups: Record<string, AuditFinding[]> = {};

  for (const finding of findings) {
    const key = `${finding.severity}-${finding.category}`;
    if (!severityGroups[key]) {
      severityGroups[key] = [];
    }
    severityGroups[key].push(finding);
  }

  for (const [key, groupFindings] of Object.entries(severityGroups)) {
    const [severity, category] = key.split('-');
    const weight = SEVERITY_WEIGHTS[severity as Severity] || 0;
    const totalPoints = weight * groupFindings.length;

    if (totalPoints > 0) {
      deductions.push({
        category: `${severity} ${category}`,
        points: totalPoints,
        reason: `${groupFindings.length} ${severity} ${category} issue${groupFindings.length > 1 ? 's' : ''}`,
        count: groupFindings.length,
      });
    }
  }

  // Sort deductions by points descending
  deductions.sort((a, b) => b.points - a.points);

  // Calculate bonuses for perfect component scores
  const bonuses: ScoreBreakdown['bonuses'] = [];

  if (components.security === 100) {
    bonuses.push({
      category: 'security',
      points: 5,
      reason: 'No security vulnerabilities found',
    });
  }

  if (components.accessibility === 100) {
    bonuses.push({
      category: 'accessibility',
      points: 3,
      reason: 'Perfect accessibility score',
    });
  }

  // Calculate raw score
  const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
  const totalBonuses = bonuses.reduce((sum, b) => sum + b.points, 0);
  const rawScore = 100 - totalDeductions + totalBonuses;

  return {
    deductions,
    bonuses,
    maxScore: 100,
    rawScore: Math.max(0, Math.min(100, rawScore)),
  };
}

/**
 * Calculate which badges have been earned
 */
export function calculateBadges(
  findings: AuditFinding[],
  vibeScore: VibeScore,
  scanHistory: { date: Date; score: number }[],
  existingBadges: Badge[]
): Badge[] {
  const badges: Badge[] = [];
  const now = new Date();

  // Helper to check if badge already earned
  const hasEarned = (id: string) => existingBadges.some(b => b.id === id && b.earnedAt);

  // Security badges
  const securityFindings = findings.filter(f =>
    f.category === 'security' || f.category === 'api-security' || f.category === 'cloud-native'
  );
  const hasSecrets = findings.some(f =>
    f.tool === 'gitleaks' || f.tool === 'secretlint' || f.tool === 'trufflehog'
  );
  const hasInjections = findings.some(f =>
    f.title.toLowerCase().includes('injection') ||
    f.title.toLowerCase().includes('xss')
  );

  if (!hasSecrets) {
    badges.push({
      id: 'secret-keeper',
      name: 'Secret Keeper',
      description: 'No exposed secrets in your codebase',
      icon: '🔐',
      category: 'security',
      tier: 'gold',
      earnedAt: hasEarned('secret-keeper') ? existingBadges.find(b => b.id === 'secret-keeper')!.earnedAt : now,
    });
  }

  if (!hasInjections) {
    badges.push({
      id: 'injection-free',
      name: 'Injection Free',
      description: 'No SQL/XSS/Command injection vulnerabilities',
      icon: '💉',
      category: 'security',
      tier: 'gold',
      earnedAt: hasEarned('injection-free') ? existingBadges.find(b => b.id === 'injection-free')!.earnedAt : now,
    });
  }

  // Quality badges
  const lintingFindings = findings.filter(f => f.category === 'code-quality');
  const typeErrors = findings.filter(f => f.tool === 'typescript');

  if (lintingFindings.length === 0) {
    badges.push({
      id: 'lint-free',
      name: 'Lint Free',
      description: 'Zero linting errors',
      icon: '✨',
      category: 'quality',
      tier: 'silver',
      earnedAt: hasEarned('lint-free') ? existingBadges.find(b => b.id === 'lint-free')!.earnedAt : now,
    });
  }

  if (typeErrors.length === 0) {
    badges.push({
      id: 'type-safe',
      name: 'Type Safe',
      description: 'No TypeScript errors',
      icon: '🛡️',
      category: 'quality',
      tier: 'silver',
      earnedAt: hasEarned('type-safe') ? existingBadges.find(b => b.id === 'type-safe')!.earnedAt : now,
    });
  }

  // Accessibility badges
  if (vibeScore.components.accessibility >= 90) {
    badges.push({
      id: 'a11y-ally',
      name: 'A11y Ally',
      description: 'Reached 90+ accessibility score',
      icon: '♿',
      category: 'accessibility',
      tier: 'gold',
      earnedAt: hasEarned('a11y-ally') ? existingBadges.find(b => b.id === 'a11y-ally')!.earnedAt : now,
    });
  }

  // Performance badges
  if (vibeScore.components.performance >= 90) {
    badges.push({
      id: 'speed-demon',
      name: 'Speed Demon',
      description: 'Lighthouse performance score 90+',
      icon: '⚡',
      category: 'performance',
      tier: 'gold',
      earnedAt: hasEarned('speed-demon') ? existingBadges.find(b => b.id === 'speed-demon')!.earnedAt : now,
    });
  }

  // Milestone badges
  if (scanHistory.length === 1) {
    badges.push({
      id: 'first-scan',
      name: 'First Scan',
      description: 'Completed your first scan',
      icon: '🎯',
      category: 'milestone',
      tier: 'bronze',
      earnedAt: hasEarned('first-scan') ? existingBadges.find(b => b.id === 'first-scan')!.earnedAt : now,
    });
  }

  if (vibeScore.overall === 100) {
    badges.push({
      id: 'perfect-score',
      name: 'Perfect Score',
      description: 'Achieved a Vibe Score of 100',
      icon: '💯',
      category: 'milestone',
      tier: 'platinum',
      earnedAt: hasEarned('perfect-score') ? existingBadges.find(b => b.id === 'perfect-score')!.earnedAt : now,
    });
  }

  // Comeback kid - improved by 20+ points
  if (vibeScore.trend.delta >= 20) {
    badges.push({
      id: 'comeback-kid',
      name: 'Comeback Kid',
      description: 'Improved score by 20+ points in one scan',
      icon: '🚀',
      category: 'milestone',
      tier: 'gold',
      earnedAt: hasEarned('comeback-kid') ? existingBadges.find(b => b.id === 'comeback-kid')!.earnedAt : now,
    });
  }

  return badges;
}

/**
 * Generate embeddable badge SVG URL
 */
export function generateBadgeUrl(
  repoOwner: string,
  repoName: string,
  score: number,
  grade: VibeGrade
): string {
  const color = getGradeColor(grade);
  // This would point to a badge generation endpoint
  return `https://bugrit.dev/api/badge/${repoOwner}/${repoName}?score=${score}&grade=${grade}&color=${color}`;
}

function getGradeColor(grade: VibeGrade): string {
  if (grade.startsWith('A')) return '4ade80'; // Green
  if (grade.startsWith('B')) return 'a3e635'; // Lime
  if (grade.startsWith('C')) return 'facc15'; // Yellow
  if (grade === 'D') return 'fb923c'; // Orange
  return 'f87171'; // Red
}

/**
 * Calculate percentile ranking compared to similar repos
 */
export function calculatePercentile(
  score: number,
  benchmarkScores: number[]
): number {
  if (benchmarkScores.length === 0) return 50;

  const belowCount = benchmarkScores.filter(s => s < score).length;
  return Math.round((belowCount / benchmarkScores.length) * 100);
}
