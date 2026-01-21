/**
 * Core API Types for Bugrit
 *
 * These types define the structure of all API requests and responses.
 */

// ============================================================================
// Common Types
// ============================================================================

export type Platform = 'web' | 'ios' | 'android' | 'desktop';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'error';

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: Pagination;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  platforms: Platform[];
  repositoryUrl?: string;
  defaultBranch?: string;
  organizationId: string;
  apiKey: string;
  webhookUrl?: string;
  webhookSecret?: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  autoScan: boolean;
  scanOnPush: boolean;
  scanOnPullRequest: boolean;
  failThreshold: Severity;
  enabledTools: string[];
  customRules?: Record<string, unknown>;
  notifications: {
    email: boolean;
    slack?: string;
    webhook: boolean;
  };
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  platforms: Platform[];
  repositoryUrl?: string;
  defaultBranch?: string;
  settings?: Partial<ProjectSettings>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  platforms?: Platform[];
  repositoryUrl?: string;
  defaultBranch?: string;
  webhookUrl?: string;
  settings?: Partial<ProjectSettings>;
}

// ============================================================================
// Scan Types
// ============================================================================

export interface Scan {
  id: string;
  projectId: string;
  status: ScanStatus;
  platforms: Platform[];
  branch?: string;
  commitSha?: string;
  triggeredBy: 'manual' | 'api' | 'webhook' | 'schedule';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  toolsRun: string[];
  summary?: ScanSummary;
  createdAt: string;
}

export interface ScanSummary {
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  coverage?: number;
  score: number;
}

export interface CreateScanRequest {
  projectId: string;
  platforms?: Platform[];
  branch?: string;
  commitSha?: string;
  tools?: string[];
  source?: {
    type: 'upload' | 'repository' | 'url';
    data: string;
  };
}

// ============================================================================
// Test Case Types
// ============================================================================

export interface TestCase {
  id: string;
  projectId: string;
  scanId?: string;
  name: string;
  description?: string;
  suite?: string;
  file?: string;
  line?: number;
  platform: Platform;
  status: TestStatus;
  duration?: number;
  error?: TestError;
  steps?: TestStep[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TestError {
  message: string;
  stack?: string;
  screenshot?: string;
  video?: string;
  diff?: {
    expected: string;
    actual: string;
  };
}

export interface TestStep {
  name: string;
  status: TestStatus;
  duration?: number;
  error?: string;
  screenshot?: string;
}

export interface CreateTestCaseRequest {
  name: string;
  description?: string;
  suite?: string;
  file?: string;
  line?: number;
  platform: Platform;
  status: TestStatus;
  duration?: number;
  error?: TestError;
  steps?: TestStep[];
  metadata?: Record<string, unknown>;
}

export interface SubmitTestResultsRequest {
  projectId: string;
  scanId?: string;
  branch?: string;
  commitSha?: string;
  platform: Platform;
  framework?: string;
  testCases: CreateTestCaseRequest[];
  summary?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

export interface TestResultsResponse {
  id: string;
  projectId: string;
  scanId: string;
  testsReceived: number;
  testsProcessed: number;
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    error: number;
  };
}

// ============================================================================
// Issue Types
// ============================================================================

export interface Issue {
  id: string;
  scanId: string;
  tool: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  codeSnippet?: string;
  suggestion?: string;
  documentation?: string;
  fingerprint: string;
  isNew: boolean;
  createdAt: string;
}

// ============================================================================
// Report Types
// ============================================================================

export interface Report {
  id: string;
  scanId: string;
  projectId: string;
  generatedAt: string;
  summary: ScanSummary;
  aiAnalysis: AiAnalysis;
  issuesByTool: Record<string, Issue[]>;
  issuesBySeverity: Record<Severity, Issue[]>;
  trends?: ReportTrends;
}

export interface AiAnalysis {
  summary: string;
  priorityFixes: PriorityFix[];
  riskAssessment: string;
  recommendations: string[];
  score: number;
  scoreBreakdown: {
    security: number;
    quality: number;
    maintainability: number;
    performance: number;
    testing: number;
  };
}

export interface PriorityFix {
  rank: number;
  issueId: string;
  title: string;
  severity: Severity;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  file?: string;
  line?: number;
}

export interface ReportTrends {
  issuesTrend: TrendPoint[];
  scoreTrend: TrendPoint[];
  coverageTrend: TrendPoint[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  projectId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export type WebhookEventType =
  | 'scan.started'
  | 'scan.completed'
  | 'scan.failed'
  | 'issue.critical'
  | 'issue.security'
  | 'test.failed'
  | 'score.dropped';

// ============================================================================
// Tool Types
// ============================================================================

export const AVAILABLE_TOOLS = [
  // Linting
  'eslint', 'biome', 'stylelint', 'prettier',
  // Security
  'semgrep', 'gitleaks', 'trivy', 'grype', 'nuclei', 'checkov', 'secretlint',
  'npm-audit', 'bandit', 'gosec', 'brakeman', 'owasp-zap', 'flawfinder',
  'garak', 'modelscan',
  // Dependencies
  'depcheck', 'license-checker', 'madge', 'dependency-cruiser', 'osv-scanner',
  'pip-audit', 'cargo-audit',
  // Accessibility
  'axe-core', 'pa11y',
  // Quality
  'typescript', 'knip', 'jscpd', 'cspell', 'publint', 'codeclimate', 'phpstan',
  'rubocop', 'detekt', 'cppcheck', 'clippy', 'shellcheck',
  // Documentation
  'markdownlint', 'remark-lint', 'alex',
  // Git
  'commitlint',
  // Performance
  'lighthouse', 'size-limit',
  // Mobile
  'mobsf', 'apkleaks', 'androguard', 'swiftlint',
  // API Security
  'spectral', 'dredd', 'graphql-cop', 'schemathesis',
  // Cloud Native
  'kubesec', 'kube-bench', 'polaris', 'terrascan', 'kube-hunter',
] as const;

export type ToolName = (typeof AVAILABLE_TOOLS)[number];

export type ToolCategory =
  | 'linting'
  | 'security'
  | 'dependencies'
  | 'accessibility'
  | 'quality'
  | 'documentation'
  | 'git'
  | 'performance'
  | 'mobile'
  | 'api-security'
  | 'cloud-native';

export interface ToolConfig {
  name: ToolName;
  enabled: boolean;
  category?: ToolCategory;
  credits?: number;
  options?: Record<string, unknown>;
}
