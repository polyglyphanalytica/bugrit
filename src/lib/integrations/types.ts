// Common types for all integrations

export type ToolCategory =
  | 'code-quality'
  | 'security'
  | 'accessibility'
  | 'performance'
  | 'api-testing'
  | 'visual'
  | 'coverage'
  | 'observability'
  | 'chaos';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ToolConfig {
  enabled: boolean;
  configPath?: string;
  options?: Record<string, unknown>;
}

export interface AuditFinding {
  id: string;
  tool: string;
  category: ToolCategory;
  severity: Severity;

  // Plain English
  title: string;
  description: string;
  explanation: string;
  impact: string;

  // Location
  file?: string;
  line?: number;
  column?: number;
  url?: string;
  selector?: string;

  // Evidence
  codeSnippet?: string;
  screenshot?: string;

  // Fix guidance
  recommendation: string;
  fixExample?: string;
  documentationUrl?: string;

  // AI Prompt
  aiPrompt: {
    short: string;
    detailed: string;
    steps: string[];
  };

  // Metadata
  ruleId?: string;
  tags: string[];
  effort: 'trivial' | 'easy' | 'moderate' | 'hard' | 'complex';
}

export interface AuditResult {
  tool: string;
  category: ToolCategory;
  success: boolean;
  duration: number;
  findings: AuditFinding[];
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    passed: number;
    failed: number;
  };
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface ToolIntegration {
  name: string;
  category: ToolCategory;
  description: string;
  website: string;

  // Check if tool is available
  isAvailable(): Promise<boolean>;

  // Run the audit
  run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult>;

  // Get default configuration
  getDefaultConfig(): ToolConfig;
}

export interface AuditTarget {
  // For code analysis
  directory?: string;
  files?: string[];

  // For web testing
  url?: string;
  urls?: string[];

  // For API testing
  apiSpec?: string;
  baseUrl?: string;

  // For container scanning
  image?: string;

  // Common
  branch?: string;
  commit?: string;
}

export interface ComprehensiveAuditReport {
  id: string;
  target: AuditTarget;
  startedAt: Date;
  completedAt: Date;
  duration: number;

  // Results by category
  results: AuditResult[];

  // Aggregated findings
  allFindings: AuditFinding[];

  // Summary
  summary: {
    totalTools: number;
    successfulTools: number;
    failedTools: number;
    totalFindings: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<ToolCategory, number>;
    byTool: Record<string, number>;
  };

  // Health scores
  scores: {
    overall: number;
    security: number;
    accessibility: number;
    performance: number;
    codeQuality: number;
    maintainability: number;
  };

  // Recommendations
  recommendations: AuditRecommendation[];
}

export interface AuditRecommendation {
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'trivial' | 'easy' | 'moderate' | 'hard' | 'complex';
  category: ToolCategory;
  relatedFindings: string[];
  estimatedImpact: string;
}

// Performance-specific types
export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift

  // Other metrics
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  tti?: number; // Time to Interactive
  tbt?: number; // Total Blocking Time
  si?: number; // Speed Index

  // Load testing
  requestsPerSecond?: number;
  avgResponseTime?: number;
  p95ResponseTime?: number;
  p99ResponseTime?: number;
  errorRate?: number;
  throughput?: number;
}

// Accessibility-specific types
export interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

// Security-specific types
export interface SecurityVulnerability {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  cwe?: string;
  cve?: string;
  cvss?: number;
  package?: string;
  version?: string;
  fixedIn?: string;
  path?: string;
  line?: number;
}

// Chaos-specific types
export interface ChaosExperiment {
  id: string;
  name: string;
  type: 'pod-kill' | 'network-delay' | 'cpu-stress' | 'memory-stress' | 'disk-fill' | 'custom';
  target: string;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: {
    recovered: boolean;
    recoveryTime?: number;
    impactedServices: string[];
    observations: string[];
  };
}
