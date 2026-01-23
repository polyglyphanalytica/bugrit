/**
 * Vibe Score System
 *
 * A single 0-100 score representing overall code health,
 * with sub-scores for different dimensions.
 */

export interface VibeScore {
  // Overall score (0-100)
  overall: number;

  // Component scores (0-100 each)
  components: {
    security: number;      // Vulnerabilities, secrets, injections
    quality: number;       // Linting, complexity, duplication
    accessibility: number; // WCAG compliance, a11y issues
    performance: number;   // Lighthouse, bundle size, load time
    dependencies: number;  // Outdated, vulnerable, unused deps
    documentation: number; // README, comments, API docs
  };

  // Grade letter (A+ to F)
  grade: VibeGrade;

  // Trend from previous scan
  trend: {
    direction: 'up' | 'down' | 'stable';
    delta: number;  // Points changed
    previousScore: number | null;
  };

  // Percentile ranking vs similar repos
  percentile: number | null;  // "Better than X% of similar repos"

  // Breakdown of how score was calculated
  breakdown: ScoreBreakdown;
}

export type VibeGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export interface ScoreBreakdown {
  // Points deducted by category
  deductions: {
    category: string;
    points: number;
    reason: string;
    count: number;  // Number of issues
  }[];

  // Bonuses earned
  bonuses: {
    category: string;
    points: number;
    reason: string;
  }[];

  // Maximum possible score (usually 100)
  maxScore: number;

  // Raw score before normalization
  rawScore: number;
}

/**
 * Badges earned based on achievements
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;  // Emoji or icon name
  earnedAt: Date | null;
  category: BadgeCategory;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress?: {
    current: number;
    target: number;
  };
}

export type BadgeCategory =
  | 'security'
  | 'quality'
  | 'accessibility'
  | 'performance'
  | 'streak'
  | 'milestone';

/**
 * All available badges
 */
export const BADGE_DEFINITIONS: Omit<Badge, 'earnedAt' | 'progress'>[] = [
  // Security badges
  {
    id: 'secret-keeper',
    name: 'Secret Keeper',
    description: 'No exposed secrets in your codebase',
    icon: '🔐',
    category: 'security',
    tier: 'gold',
  },
  {
    id: 'vault-master',
    name: 'Vault Master',
    description: 'Fixed 10+ exposed secrets',
    icon: '🏰',
    category: 'security',
    tier: 'platinum',
  },
  {
    id: 'injection-free',
    name: 'Injection Free',
    description: 'No SQL/XSS/Command injection vulnerabilities',
    icon: '💉',
    category: 'security',
    tier: 'gold',
  },
  {
    id: 'supply-chain-defender',
    name: 'Supply Chain Defender',
    description: 'No vulnerable dependencies for 30 days',
    icon: '⛓️',
    category: 'security',
    tier: 'platinum',
  },

  // Quality badges
  {
    id: 'lint-free',
    name: 'Lint Free',
    description: 'Zero linting errors',
    icon: '✨',
    category: 'quality',
    tier: 'silver',
  },
  {
    id: 'type-safe',
    name: 'Type Safe',
    description: 'No TypeScript errors',
    icon: '🛡️',
    category: 'quality',
    tier: 'silver',
  },
  {
    id: 'no-duplication',
    name: 'DRY Champion',
    description: 'Less than 3% code duplication',
    icon: '🏜️',
    category: 'quality',
    tier: 'gold',
  },

  // Accessibility badges
  {
    id: 'a11y-ally',
    name: 'A11y Ally',
    description: 'Reached 90+ accessibility score',
    icon: '♿',
    category: 'accessibility',
    tier: 'gold',
  },
  {
    id: 'wcag-compliant',
    name: 'WCAG Compliant',
    description: 'Passes all WCAG 2.1 AA checks',
    icon: '🏆',
    category: 'accessibility',
    tier: 'platinum',
  },

  // Performance badges
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Lighthouse performance score 90+',
    icon: '⚡',
    category: 'performance',
    tier: 'gold',
  },
  {
    id: 'lean-bundle',
    name: 'Lean Bundle',
    description: 'Bundle size under 100KB gzipped',
    icon: '📦',
    category: 'performance',
    tier: 'silver',
  },

  // Streak badges
  {
    id: 'first-scan',
    name: 'First Scan',
    description: 'Completed your first scan',
    icon: '🎯',
    category: 'milestone',
    tier: 'bronze',
  },
  {
    id: 'weekly-warrior',
    name: 'Weekly Warrior',
    description: 'Scanned every week for a month',
    icon: '📅',
    category: 'streak',
    tier: 'silver',
  },
  {
    id: 'consistent-coder',
    name: 'Consistent Coder',
    description: 'Maintained 80+ score for 30 days',
    icon: '📈',
    category: 'streak',
    tier: 'gold',
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Achieved a Vibe Score of 100',
    icon: '💯',
    category: 'milestone',
    tier: 'platinum',
  },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    description: 'Improved score by 20+ points in one scan',
    icon: '🚀',
    category: 'milestone',
    tier: 'gold',
  },
];

/**
 * Scan modes for "Ship It" feature
 */
export type ScanMode = 'ship-it' | 'quick-check' | 'full-audit' | 'deep-dive';

export interface ScanModeConfig {
  id: ScanMode;
  name: string;
  description: string;
  icon: string;
  estimatedTime: string;
  tools: string[];  // Tool IDs to run
  creditCost: number;
}

export const SCAN_MODES: ScanModeConfig[] = [
  {
    id: 'ship-it',
    name: 'Ship It',
    description: 'Critical security only - secrets, SQLi, XSS',
    icon: '🚀',
    estimatedTime: '30 seconds',
    tools: [
      'gitleaks',      // Secrets
      'secretlint',    // Secrets
      'semgrep',       // Security patterns (limited rules)
      'npm-audit',     // Critical vulns only
    ],
    creditCost: 1,
  },
  {
    id: 'quick-check',
    name: 'Quick Check',
    description: 'Security + accessibility + broken deps',
    icon: '⚡',
    estimatedTime: '2 minutes',
    tools: [
      // Security
      'gitleaks',
      'secretlint',
      'semgrep',
      'npm-audit',
      'trivy',
      // Accessibility
      'axe-core',
      // Dependencies
      'depcheck',
      'osv-scanner',
      // Basic quality
      'eslint',
      'typescript',
    ],
    creditCost: 5,
  },
  {
    id: 'full-audit',
    name: 'Full Audit',
    description: 'All 118 tools - comprehensive analysis',
    icon: '🔍',
    estimatedTime: '10-15 minutes',
    tools: [], // Empty means all tools
    creditCost: 15,
  },
  {
    id: 'deep-dive',
    name: 'Deep Dive',
    description: 'Full audit + historical analysis + DAST',
    icon: '🏊',
    estimatedTime: '30+ minutes',
    tools: [], // All tools + extras
    creditCost: 30,
  },
];

/**
 * Repo Health Profile - public page data
 */
export interface RepoHealthProfile {
  // Basic info
  repoUrl: string;
  repoName: string;
  owner: string;

  // Current status
  vibeScore: VibeScore;
  lastScanAt: Date;

  // Badges earned
  badges: Badge[];

  // History (last 30 days)
  scoreHistory: {
    date: Date;
    score: number;
  }[];

  // Public visibility settings
  isPublic: boolean;
  showBadges: boolean;
  showScore: boolean;
  showTrend: boolean;

  // Embed badge URL
  badgeUrl: string;
}

/**
 * Team/Organization features
 */
export interface Team {
  id: string;
  name: string;
  slug: string;

  // Members
  members: TeamMember[];

  // Repos
  repos: string[];  // Repo URLs

  // Aggregate scores
  aggregateScore: VibeScore | null;

  // Policies
  policies: TeamPolicy[];

  // Billing
  plan: 'free' | 'pro' | 'enterprise';
  credits: number;

  createdAt: Date;
}

export interface TeamMember {
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

export interface TeamPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // What triggers the policy
  trigger: 'on-scan' | 'on-pr' | 'scheduled';

  // Conditions
  conditions: PolicyCondition[];

  // Actions when conditions met
  actions: PolicyAction[];
}

export interface PolicyCondition {
  type: 'score-below' | 'severity-found' | 'tool-failed' | 'badge-lost';
  value: number | string;
}

export interface PolicyAction {
  type: 'block-merge' | 'notify-slack' | 'notify-email' | 'create-issue' | 'require-approval';
  config: Record<string, unknown>;
}

/**
 * Learning content for findings
 */
export interface LearningContent {
  // For the finding type
  findingType: string;

  // Educational content
  whyItMatters: string;
  realWorldExample: string;
  howAttackersExploit?: string;
  videoUrl?: string;  // Short explainer video

  // The fix pattern
  fixPattern: {
    description: string;
    beforeCode?: string;
    afterCode?: string;
    steps: string[];
  };

  // Quiz for gamification
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };

  // Related resources
  resources: {
    title: string;
    url: string;
    type: 'docs' | 'video' | 'article' | 'course';
  }[];
}
