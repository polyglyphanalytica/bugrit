/**
 * Scan Recommendation Wizard
 *
 * Guides vibe coders through selecting the right scans based on:
 * - App type (web, mobile, desktop, API)
 * - App sensitivity (financial, healthcare, entertainment, etc.)
 * - Language and framework (auto-detected or specified)
 * - AI coding assistant used (Cursor, Copilot, Claude, etc.)
 * - Developer concerns
 *
 * Returns a prioritized, curated list of recommended scans.
 */

// ============================================================
// Types
// ============================================================

export type AppType = 'web' | 'pwa' | 'mobile-native' | 'desktop-native' | 'api' | 'cli' | 'library';

export type AppSensitivity =
  | 'financial'      // Banking, payments, trading
  | 'healthcare'     // PHI, medical records
  | 'government'     // Civic, compliance-heavy
  | 'enterprise'     // B2B, internal tools
  | 'ecommerce'      // Online stores
  | 'social'         // User data, UGC
  | 'entertainment'  // Games, media, streaming
  | 'education'      // EdTech, student data
  | 'iot'            // Connected devices
  | 'developer-tool' // Dev tools, SDKs
  | 'personal';      // Side projects, hobby

export type AICodingAgent =
  | 'cursor'
  | 'copilot'
  | 'claude-code'
  | 'codeium'
  | 'tabnine'
  | 'amazon-q'
  | 'gemini-code'
  | 'other-ai'
  | 'none';

export type DeveloperConcern =
  | 'security-vulnerabilities'
  | 'data-leaks'
  | 'compliance'
  | 'performance'
  | 'accessibility'
  | 'code-quality'
  | 'dependency-risks'
  | 'secrets-exposure'
  | 'ai-generated-bugs'
  | 'not-sure';

export interface WizardInput {
  appType: AppType;
  sensitivity: AppSensitivity;
  languages?: string[];           // Auto-detected or specified
  frameworks?: string[];          // Auto-detected or specified
  aiAgent?: AICodingAgent;
  concerns?: DeveloperConcern[];
  hasExistingTests?: boolean;
  deploymentTarget?: 'cloud' | 'on-premise' | 'hybrid' | 'serverless';
  teamSize?: 'solo' | 'small' | 'medium' | 'large';
}

export interface ScanRecommendation {
  toolId: string;
  toolName: string;
  category: string;
  priority: 'essential' | 'recommended' | 'optional';
  reason: string;
  estimatedCredits: number;
  estimatedTime: string;
  tags: string[];
}

// ============================================================
// UI-Friendly Tool Selection Types
// ============================================================

export type ToolCategory =
  | 'security'
  | 'code-quality'
  | 'accessibility'
  | 'performance'
  | 'dependencies'
  | 'mobile'
  | 'api-security'
  | 'cloud-native';

export interface SelectableTool {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  credits: number;
  timeEstimate: string;
  tags: string[];
  languages?: string[];
  frameworks?: string[];
  appTypes?: AppType[];
  // Selection state
  selected: boolean;
  preSelected: boolean;  // Was this auto-selected by wizard?
  selectionReason?: string;  // Why it was recommended
}

export interface ToolCategoryGroup {
  category: ToolCategory;
  displayName: string;
  icon: string;
  tools: SelectableTool[];
}

export interface SelectionState {
  selectedTools: SelectableTool[];
  availableByCategory: ToolCategoryGroup[];
  credits: {
    selected: number;
    perTool: Record<string, number>;
  };
  estimatedTime: string;
}

export interface WizardOutput {
  summary: {
    totalScans: number;
    essentialScans: number;
    estimatedCredits: number;
    estimatedTime: string;
  };
  recommendations: ScanRecommendation[];
  packages: ScanPackage[];
  insights: string[];
  // New: UI-ready selection state
  selectionState: SelectionState;
}

export interface ScanPackage {
  id: string;
  name: string;
  description: string;
  scans: string[];
  credits: number;
  bestFor: string;
}

// ============================================================
// Tool Database
// ============================================================

interface ToolInfo {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  credits: number;
  timeEstimate: string;
  languages?: string[];
  frameworks?: string[];
  appTypes?: AppType[];
  tags: string[];
}

// Category display info
export const CATEGORY_INFO: Record<ToolCategory, { displayName: string; icon: string; description: string }> = {
  security: { displayName: 'Security', icon: '🛡️', description: 'Find vulnerabilities and security issues' },
  'code-quality': { displayName: 'Code Quality', icon: '✨', description: 'Improve code maintainability and standards' },
  accessibility: { displayName: 'Accessibility', icon: '♿', description: 'Ensure your app works for everyone' },
  performance: { displayName: 'Performance', icon: '⚡', description: 'Optimize speed and user experience' },
  dependencies: { displayName: 'Dependencies', icon: '📦', description: 'Manage and audit third-party packages' },
  mobile: { displayName: 'Mobile Security', icon: '📱', description: 'Security scanning for iOS and Android apps' },
  'api-security': { displayName: 'API Security', icon: '🔌', description: 'Validate and secure your APIs' },
  'cloud-native': { displayName: 'Cloud Native', icon: '☁️', description: 'Kubernetes and cloud infrastructure security' },
};

const TOOL_DATABASE: ToolInfo[] = [
  // Security - General
  { id: 'semgrep', name: 'Semgrep', description: 'Find bugs and security issues with custom rules across 30+ languages', category: 'security', credits: 2, timeEstimate: '2-5 min', tags: ['sast', 'multi-language'] },
  { id: 'gitleaks', name: 'Gitleaks', description: 'Detect hardcoded secrets like API keys and passwords', category: 'security', credits: 1, timeEstimate: '1-2 min', tags: ['secrets', 'credentials'] },
  { id: 'trivy', name: 'Trivy', description: 'Scan for vulnerabilities in dependencies and containers', category: 'security', credits: 2, timeEstimate: '2-4 min', tags: ['vulnerabilities', 'dependencies'] },
  { id: 'grype', name: 'Grype', description: 'Vulnerability scanner for container images and filesystems', category: 'security', credits: 2, timeEstimate: '2-4 min', tags: ['sbom', 'vulnerabilities'] },
  { id: 'npm-audit', name: 'npm Audit', description: 'Check npm packages for known vulnerabilities', category: 'security', credits: 1, timeEstimate: '30 sec', languages: ['javascript', 'typescript'], tags: ['dependencies', 'npm'] },
  { id: 'secretlint', name: 'Secretlint', description: 'Lint for credentials and secrets in your codebase', category: 'security', credits: 1, timeEstimate: '1 min', tags: ['secrets', 'credentials'] },

  // Security - Web
  { id: 'owasp-zap', name: 'OWASP ZAP', description: 'Dynamic security testing for web applications', category: 'security', credits: 5, timeEstimate: '5-15 min', appTypes: ['web', 'pwa', 'api'], tags: ['dast', 'web-security'] },
  { id: 'nuclei', name: 'Nuclei', description: 'Fast vulnerability scanner with 8000+ community templates', category: 'security', credits: 3, timeEstimate: '3-10 min', appTypes: ['web', 'pwa', 'api'], tags: ['vulnerability-scanner', 'cve'] },

  // Security - IaC
  { id: 'checkov', name: 'Checkov', description: 'Security scanner for Terraform, CloudFormation, and Kubernetes', category: 'security', credits: 2, timeEstimate: '2-4 min', tags: ['iac', 'terraform', 'kubernetes'] },
  { id: 'tfsec', name: 'tfsec', description: 'Static analysis for Terraform security issues', category: 'security', credits: 2, timeEstimate: '1-3 min', tags: ['terraform', 'iac'] },
  { id: 'dockle', name: 'Dockle', description: 'Container image linter for security best practices', category: 'security', credits: 1, timeEstimate: '1-2 min', tags: ['docker', 'container'] },

  // Security - Language Specific
  { id: 'bandit', name: 'Bandit', description: 'Security linter for Python code', category: 'security', credits: 1, timeEstimate: '1-2 min', languages: ['python'], tags: ['python', 'sast'] },
  { id: 'gosec', name: 'gosec', description: 'Security checker for Go source code', category: 'security', credits: 1, timeEstimate: '1-2 min', languages: ['go'], tags: ['go', 'sast'] },
  { id: 'brakeman', name: 'Brakeman', description: 'Security scanner for Ruby on Rails applications', category: 'security', credits: 2, timeEstimate: '2-4 min', languages: ['ruby'], frameworks: ['rails'], tags: ['ruby', 'rails', 'sast'] },

  // Code Quality
  { id: 'eslint', name: 'ESLint', description: 'Linting and best practices for JavaScript/TypeScript', category: 'code-quality', credits: 1, timeEstimate: '30 sec', languages: ['javascript', 'typescript'], tags: ['linting', 'best-practices'] },
  { id: 'biome', name: 'Biome', description: 'Fast linter and formatter for web projects', category: 'code-quality', credits: 1, timeEstimate: '30 sec', languages: ['javascript', 'typescript'], tags: ['linting', 'formatting'] },
  { id: 'stylelint', name: 'Stylelint', description: 'Linter for CSS, SCSS, and styled-components', category: 'code-quality', credits: 1, timeEstimate: '30 sec', tags: ['css', 'styling'] },
  { id: 'codeclimate', name: 'Code Climate', description: 'Automated code review for maintainability', category: 'code-quality', credits: 3, timeEstimate: '3-5 min', tags: ['maintainability', 'complexity'] },
  { id: 'shellcheck', name: 'ShellCheck', description: 'Static analysis for shell scripts', category: 'code-quality', credits: 1, timeEstimate: '30 sec', tags: ['shell', 'bash'] },

  // Code Quality - Language Specific
  { id: 'phpstan', name: 'PHPStan', description: 'Static analysis for PHP - finds bugs without running code', category: 'code-quality', credits: 2, timeEstimate: '2-4 min', languages: ['php'], tags: ['php', 'static-analysis'] },
  { id: 'psalm', name: 'Psalm', description: 'Type-safe PHP analysis with great IDE support', category: 'code-quality', credits: 2, timeEstimate: '2-4 min', languages: ['php'], tags: ['php', 'type-safety'] },
  { id: 'rubocop', name: 'RuboCop', description: 'Ruby style guide enforcer and linter', category: 'code-quality', credits: 1, timeEstimate: '1-2 min', languages: ['ruby'], tags: ['ruby', 'style'] },
  { id: 'spotbugs', name: 'SpotBugs', description: 'Find bugs in Java programs using static analysis', category: 'code-quality', credits: 3, timeEstimate: '3-5 min', languages: ['java'], tags: ['java', 'bugs'] },
  { id: 'pmd', name: 'PMD', description: 'Source code analyzer for Java - finds common issues', category: 'code-quality', credits: 2, timeEstimate: '2-3 min', languages: ['java'], tags: ['java', 'best-practices'] },
  { id: 'detekt', name: 'Detekt', description: 'Static code analysis for Kotlin', category: 'code-quality', credits: 2, timeEstimate: '2-3 min', languages: ['kotlin'], tags: ['kotlin', 'style'] },

  // Accessibility
  { id: 'axe-core', name: 'axe-core', description: 'WCAG accessibility testing engine', category: 'accessibility', credits: 4, timeEstimate: '2-4 min', appTypes: ['web', 'pwa'], tags: ['wcag', 'a11y'] },
  { id: 'pa11y', name: 'Pa11y', description: 'Automated accessibility testing with detailed reports', category: 'accessibility', credits: 4, timeEstimate: '2-4 min', appTypes: ['web', 'pwa'], tags: ['wcag', 'a11y'] },
  { id: 'lighthouse-a11y', name: 'Lighthouse A11y', description: 'Accessibility audit from Google Lighthouse', category: 'accessibility', credits: 4, timeEstimate: '2-3 min', appTypes: ['web', 'pwa'], tags: ['wcag', 'a11y'] },

  // Performance
  { id: 'lighthouse', name: 'Lighthouse', description: 'Performance, SEO, and best practices audit', category: 'performance', credits: 5, timeEstimate: '2-3 min', appTypes: ['web', 'pwa'], tags: ['core-web-vitals', 'seo'] },
  { id: 'sitespeed', name: 'Sitespeed.io', description: 'Complete web performance testing toolkit', category: 'performance', credits: 5, timeEstimate: '5-10 min', appTypes: ['web', 'pwa'], tags: ['performance', 'metrics'] },

  // Dependencies
  { id: 'dependency-check', name: 'OWASP Dep Check', description: 'Identify known vulnerabilities in project dependencies', category: 'dependencies', credits: 3, timeEstimate: '5-10 min', tags: ['cve', 'vulnerabilities'] },
  { id: 'syft', name: 'Syft SBOM', description: 'Generate software bill of materials for your project', category: 'dependencies', credits: 2, timeEstimate: '2-3 min', tags: ['sbom', 'inventory'] },
  { id: 'license-checker', name: 'License Checker', description: 'Verify dependency licenses for compliance', category: 'dependencies', credits: 1, timeEstimate: '30 sec', tags: ['compliance', 'licenses'] },
  { id: 'depcheck', name: 'Depcheck', description: 'Find unused or missing dependencies in your project', category: 'dependencies', credits: 1, timeEstimate: '30 sec', languages: ['javascript', 'typescript'], tags: ['unused', 'missing'] },
  { id: 'osv-scanner', name: 'OSV Scanner', description: 'Google vulnerability scanner using OSV database', category: 'dependencies', credits: 1, timeEstimate: '1-2 min', tags: ['cve', 'google', 'vulnerabilities'] },
  { id: 'pip-audit', name: 'pip-audit', description: 'Audit Python dependencies for known vulnerabilities', category: 'dependencies', credits: 1, timeEstimate: '1-2 min', languages: ['python'], tags: ['python', 'cve'] },
  { id: 'cargo-audit', name: 'Cargo Audit', description: 'Audit Rust Cargo.lock for vulnerable dependencies', category: 'dependencies', credits: 1, timeEstimate: '30 sec', languages: ['rust'], tags: ['rust', 'cve'] },

  // API Security
  { id: 'spectral', name: 'Spectral', description: 'OpenAPI and AsyncAPI linter for API contract validation', category: 'api-security', credits: 1, timeEstimate: '30 sec', appTypes: ['api'], tags: ['openapi', 'asyncapi', 'linting'] },
  { id: 'dredd', name: 'Dredd', description: 'API contract testing against documentation', category: 'api-security', credits: 3, timeEstimate: '3-5 min', appTypes: ['api'], tags: ['contract-testing', 'openapi'] },
  { id: 'graphql-cop', name: 'GraphQL Cop', description: 'Security audit for GraphQL endpoints', category: 'api-security', credits: 2, timeEstimate: '2-3 min', appTypes: ['api'], tags: ['graphql', 'security'] },
  { id: 'schemathesis', name: 'Schemathesis', description: 'Property-based testing for OpenAPI schemas', category: 'api-security', credits: 3, timeEstimate: '3-5 min', appTypes: ['api'], tags: ['openapi', 'fuzzing'] },

  // Mobile Security
  { id: 'mobsf', name: 'MobSF', description: 'Mobile Security Framework - Android/iOS static analysis', category: 'mobile', credits: 5, timeEstimate: '5-10 min', appTypes: ['mobile-native'], tags: ['android', 'ios', 'sast'] },
  { id: 'apkleaks', name: 'APKLeaks', description: 'Scan Android APKs for hardcoded secrets and URLs', category: 'mobile', credits: 2, timeEstimate: '2-3 min', appTypes: ['mobile-native'], tags: ['android', 'secrets'] },
  { id: 'androguard', name: 'Androguard', description: 'Android APK reverse engineering and analysis', category: 'mobile', credits: 3, timeEstimate: '3-5 min', appTypes: ['mobile-native'], tags: ['android', 'analysis'] },
  { id: 'swiftlint', name: 'SwiftLint', description: 'Linter for Swift style and conventions', category: 'mobile', credits: 1, timeEstimate: '1-2 min', languages: ['swift'], appTypes: ['mobile-native', 'desktop-native'], tags: ['swift', 'ios', 'style'] },

  // Cloud Native / Kubernetes
  { id: 'kubesec', name: 'Kubesec', description: 'Security risk analysis for Kubernetes manifests', category: 'cloud-native', credits: 1, timeEstimate: '30 sec', tags: ['kubernetes', 'security'] },
  { id: 'kube-bench', name: 'Kube-bench', description: 'CIS Kubernetes benchmark compliance checker', category: 'cloud-native', credits: 2, timeEstimate: '2-3 min', tags: ['kubernetes', 'cis', 'compliance'] },
  { id: 'polaris', name: 'Polaris', description: 'Kubernetes deployment best practices validation', category: 'cloud-native', credits: 2, timeEstimate: '1-2 min', tags: ['kubernetes', 'best-practices'] },
  { id: 'terrascan', name: 'Terrascan', description: 'Multi-cloud IaC security scanner (Terraform, K8s, Helm)', category: 'cloud-native', credits: 2, timeEstimate: '2-4 min', tags: ['iac', 'terraform', 'kubernetes', 'helm'] },
  { id: 'kube-hunter', name: 'Kube-hunter', description: 'Hunt for security weaknesses in Kubernetes clusters', category: 'cloud-native', credits: 3, timeEstimate: '3-5 min', tags: ['kubernetes', 'penetration-testing'] },

  // Additional Language Tools
  { id: 'cppcheck', name: 'Cppcheck', description: 'Static analysis for C/C++ code', category: 'code-quality', credits: 2, timeEstimate: '2-4 min', languages: ['c', 'cpp'], tags: ['c', 'cpp', 'static-analysis'] },
  { id: 'flawfinder', name: 'Flawfinder', description: 'Security-focused scanner for C/C++ source code', category: 'security', credits: 2, timeEstimate: '1-3 min', languages: ['c', 'cpp'], tags: ['c', 'cpp', 'security'] },
  { id: 'clippy', name: 'Clippy', description: 'Rust linter for idiomatic code and common mistakes', category: 'code-quality', credits: 1, timeEstimate: '1-2 min', languages: ['rust'], tags: ['rust', 'linting'] },

  // AI/ML Security
  { id: 'garak', name: 'Garak', description: 'LLM vulnerability scanner - prompt injection, jailbreaks', category: 'security', credits: 4, timeEstimate: '5-10 min', tags: ['llm', 'ai-security', 'prompt-injection'] },
  { id: 'modelscan', name: 'ModelScan', description: 'Scan ML models for security issues and malicious code', category: 'security', credits: 3, timeEstimate: '2-4 min', tags: ['ml', 'ai-security', 'model-security'] },

  // Test Quality
  { id: 'stryker', name: 'Stryker', description: 'Mutation testing for JavaScript/TypeScript', category: 'code-quality', credits: 4, timeEstimate: '5-15 min', languages: ['javascript', 'typescript'], tags: ['mutation-testing', 'test-quality'] },
  { id: 'coverage-js', name: 'Istanbul/nyc', description: 'JavaScript code coverage reporting', category: 'code-quality', credits: 2, timeEstimate: '2-4 min', languages: ['javascript', 'typescript'], tags: ['coverage', 'testing'] },
];

// ============================================================
// Sensitivity Profiles
// ============================================================

interface SensitivityProfile {
  requiredCategories: string[];
  priorityTools: string[];
  complianceFrameworks: string[];
  extraScrutiny: string[];
}

const SENSITIVITY_PROFILES: Record<AppSensitivity, SensitivityProfile> = {
  financial: {
    requiredCategories: ['security', 'dependencies', 'api-security'],
    priorityTools: ['semgrep', 'owasp-zap', 'gitleaks', 'trivy', 'nuclei', 'osv-scanner', 'spectral'],
    complianceFrameworks: ['pci-dss', 'soc2'],
    extraScrutiny: ['authentication', 'encryption', 'injection'],
  },
  healthcare: {
    requiredCategories: ['security', 'dependencies', 'accessibility', 'api-security'],
    priorityTools: ['semgrep', 'gitleaks', 'trivy', 'axe-core', 'osv-scanner', 'spectral'],
    complianceFrameworks: ['soc2', 'iso-27001'],
    extraScrutiny: ['data-protection', 'access-control', 'audit-logging'],
  },
  government: {
    requiredCategories: ['security', 'dependencies', 'accessibility', 'cloud-native'],
    priorityTools: ['semgrep', 'owasp-zap', 'gitleaks', 'trivy', 'checkov', 'kube-bench', 'osv-scanner'],
    complianceFrameworks: ['nist-csf', 'cis-controls'],
    extraScrutiny: ['access-control', 'encryption', 'audit-logging'],
  },
  enterprise: {
    requiredCategories: ['security', 'code-quality', 'dependencies', 'api-security'],
    priorityTools: ['semgrep', 'gitleaks', 'trivy', 'codeclimate', 'osv-scanner', 'spectral'],
    complianceFrameworks: ['soc2'],
    extraScrutiny: ['authentication', 'access-control'],
  },
  ecommerce: {
    requiredCategories: ['security', 'performance', 'accessibility', 'mobile'],
    priorityTools: ['owasp-zap', 'semgrep', 'gitleaks', 'lighthouse', 'mobsf'],
    complianceFrameworks: ['pci-dss'],
    extraScrutiny: ['payment', 'injection', 'xss'],
  },
  social: {
    requiredCategories: ['security', 'accessibility', 'mobile'],
    priorityTools: ['semgrep', 'gitleaks', 'owasp-zap', 'axe-core', 'mobsf'],
    complianceFrameworks: ['owasp-top-10'],
    extraScrutiny: ['xss', 'access-control', 'data-exposure'],
  },
  entertainment: {
    requiredCategories: ['performance', 'accessibility', 'mobile'],
    priorityTools: ['lighthouse', 'axe-core', 'semgrep', 'mobsf'],
    complianceFrameworks: ['owasp-top-10'],
    extraScrutiny: ['performance', 'user-experience'],
  },
  education: {
    requiredCategories: ['security', 'accessibility', 'mobile'],
    priorityTools: ['semgrep', 'gitleaks', 'axe-core', 'pa11y', 'mobsf'],
    complianceFrameworks: ['owasp-top-10'],
    extraScrutiny: ['data-protection', 'accessibility'],
  },
  iot: {
    requiredCategories: ['security', 'dependencies', 'cloud-native'],
    priorityTools: ['semgrep', 'trivy', 'checkov', 'gitleaks', 'flawfinder', 'kubesec'],
    complianceFrameworks: ['owasp-top-10', 'cis-controls'],
    extraScrutiny: ['authentication', 'encryption', 'firmware'],
  },
  'developer-tool': {
    requiredCategories: ['security', 'code-quality', 'dependencies'],
    priorityTools: ['semgrep', 'gitleaks', 'trivy', 'codeclimate', 'osv-scanner', 'pip-audit', 'cargo-audit'],
    complianceFrameworks: ['owasp-top-10'],
    extraScrutiny: ['supply-chain', 'dependencies'],
  },
  personal: {
    requiredCategories: ['security'],
    priorityTools: ['semgrep', 'gitleaks', 'osv-scanner'],
    complianceFrameworks: [],
    extraScrutiny: [],
  },
};

// ============================================================
// AI Agent Risk Profiles
// ============================================================

interface AIRiskProfile {
  commonIssues: string[];
  recommendedTools: string[];
  additionalChecks: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

const AI_AGENT_PROFILES: Record<AICodingAgent, AIRiskProfile> = {
  cursor: {
    commonIssues: ['incomplete-validation', 'hardcoded-secrets', 'missing-error-handling'],
    recommendedTools: ['semgrep', 'gitleaks', 'eslint'],
    additionalChecks: ['Review AI-generated auth code', 'Check for placeholder secrets'],
    riskLevel: 'medium',
  },
  copilot: {
    commonIssues: ['insecure-defaults', 'deprecated-apis', 'injection-vulnerabilities'],
    recommendedTools: ['semgrep', 'gitleaks', 'npm-audit'],
    additionalChecks: ['Review suggested dependencies', 'Check for outdated patterns'],
    riskLevel: 'medium',
  },
  'claude-code': {
    commonIssues: ['over-engineering', 'unused-imports', 'verbose-error-messages'],
    recommendedTools: ['semgrep', 'depcheck', 'codeclimate'],
    additionalChecks: ['Review for unnecessary complexity'],
    riskLevel: 'low',
  },
  codeium: {
    commonIssues: ['incomplete-implementations', 'missing-null-checks'],
    recommendedTools: ['semgrep', 'eslint', 'typescript'],
    additionalChecks: ['Review edge case handling'],
    riskLevel: 'medium',
  },
  tabnine: {
    commonIssues: ['outdated-patterns', 'missing-async-handling'],
    recommendedTools: ['semgrep', 'eslint'],
    additionalChecks: ['Review async/await usage'],
    riskLevel: 'low',
  },
  'amazon-q': {
    commonIssues: ['aws-specific-issues', 'iam-misconfigurations'],
    recommendedTools: ['semgrep', 'checkov', 'tfsec'],
    additionalChecks: ['Review IAM policies', 'Check for overly permissive configs'],
    riskLevel: 'medium',
  },
  'gemini-code': {
    commonIssues: ['incomplete-validation', 'missing-tests'],
    recommendedTools: ['semgrep', 'gitleaks'],
    additionalChecks: ['Review input validation'],
    riskLevel: 'medium',
  },
  'other-ai': {
    commonIssues: ['unknown-patterns', 'potential-vulnerabilities'],
    recommendedTools: ['semgrep', 'gitleaks', 'trivy', 'owasp-zap'],
    additionalChecks: ['Comprehensive security review recommended'],
    riskLevel: 'high',
  },
  none: {
    commonIssues: [],
    recommendedTools: [],
    additionalChecks: [],
    riskLevel: 'low',
  },
};

// ============================================================
// Language Detection
// ============================================================

export interface DetectedStack {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  hasDocker: boolean;
  hasTerraform: boolean;
  hasKubernetes: boolean;
}

const FILE_PATTERNS: Record<string, { language?: string; framework?: string; packageManager?: string }> = {
  'package.json': { language: 'javascript', packageManager: 'npm' },
  'yarn.lock': { packageManager: 'yarn' },
  'pnpm-lock.yaml': { packageManager: 'pnpm' },
  'tsconfig.json': { language: 'typescript' },
  'next.config.js': { framework: 'nextjs' },
  'next.config.mjs': { framework: 'nextjs' },
  'nuxt.config.ts': { framework: 'nuxt' },
  'angular.json': { framework: 'angular' },
  'vue.config.js': { framework: 'vue' },
  'svelte.config.js': { framework: 'svelte' },
  'requirements.txt': { language: 'python', packageManager: 'pip' },
  'Pipfile': { language: 'python', packageManager: 'pipenv' },
  'pyproject.toml': { language: 'python', packageManager: 'poetry' },
  'setup.py': { language: 'python' },
  'manage.py': { framework: 'django' },
  'Gemfile': { language: 'ruby', packageManager: 'bundler' },
  'config/routes.rb': { framework: 'rails' },
  'go.mod': { language: 'go' },
  'Cargo.toml': { language: 'rust', packageManager: 'cargo' },
  'pom.xml': { language: 'java', packageManager: 'maven' },
  'build.gradle': { language: 'java', packageManager: 'gradle' },
  'build.gradle.kts': { language: 'kotlin', packageManager: 'gradle' },
  'composer.json': { language: 'php', packageManager: 'composer' },
  'artisan': { framework: 'laravel' },
  'Dockerfile': { language: 'docker' },
  'docker-compose.yml': { language: 'docker' },
  '*.tf': { language: 'terraform' },
  'main.tf': { language: 'terraform' },
  'k8s/': { language: 'kubernetes' },
  'kubernetes/': { language: 'kubernetes' },
};

export async function detectStack(projectPath: string): Promise<DetectedStack> {
  const fs = await import('fs');
  const path = await import('path');

  const detected: DetectedStack = {
    languages: [],
    frameworks: [],
    packageManagers: [],
    hasDocker: false,
    hasTerraform: false,
    hasKubernetes: false,
  };

  const addUnique = (arr: string[], item: string) => {
    if (item && !arr.includes(item)) arr.push(item);
  };

  // Check for known files
  for (const [pattern, info] of Object.entries(FILE_PATTERNS)) {
    const filePath = path.join(projectPath, pattern);
    try {
      if (fs.existsSync(filePath)) {
        if (info.language) addUnique(detected.languages, info.language);
        if (info.framework) addUnique(detected.frameworks, info.framework);
        if (info.packageManager) addUnique(detected.packageManagers, info.packageManager);

        if (info.language === 'docker') detected.hasDocker = true;
        if (info.language === 'terraform') detected.hasTerraform = true;
        if (info.language === 'kubernetes') detected.hasKubernetes = true;
      }
    } catch {
      // File doesn't exist, continue
    }
  }

  // Scan for file extensions
  try {
    const files = fs.readdirSync(projectPath, { recursive: true }) as string[];
    const extensions = new Set<string>();

    for (const file of files.slice(0, 1000)) {
      // Limit scan
      const ext = path.extname(String(file)).toLowerCase();
      if (ext) extensions.add(ext);
    }

    // Map extensions to languages
    const extMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.kt': 'kotlin',
      '.php': 'php',
      '.swift': 'swift',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
    };

    for (const ext of extensions) {
      if (extMap[ext]) {
        addUnique(detected.languages, extMap[ext]);
      }
    }
  } catch {
    // Can't read directory
  }

  return detected;
}

// ============================================================
// Recommendation Engine
// ============================================================

export class ScanRecommendationEngine {
  /**
   * Generate scan recommendations based on wizard input
   */
  static recommend(input: WizardInput): WizardOutput {
    const recommendations: ScanRecommendation[] = [];
    const insights: string[] = [];

    // Get sensitivity profile
    const sensitivityProfile = SENSITIVITY_PROFILES[input.sensitivity];

    // Get AI agent profile
    const aiProfile = input.aiAgent ? AI_AGENT_PROFILES[input.aiAgent] : null;

    // Track which tools we've added
    const addedTools = new Set<string>();

    // 1. Add essential tools based on sensitivity
    for (const toolId of sensitivityProfile.priorityTools) {
      const tool = TOOL_DATABASE.find(t => t.id === toolId);
      if (tool && !addedTools.has(toolId)) {
        recommendations.push({
          toolId: tool.id,
          toolName: tool.name,
          category: tool.category,
          priority: 'essential',
          reason: `Required for ${input.sensitivity} apps`,
          estimatedCredits: tool.credits,
          estimatedTime: tool.timeEstimate,
          tags: tool.tags,
        });
        addedTools.add(toolId);
      }
    }

    // 2. Add AI-specific tools
    if (aiProfile && aiProfile.riskLevel !== 'low') {
      for (const toolId of aiProfile.recommendedTools) {
        if (!addedTools.has(toolId)) {
          const tool = TOOL_DATABASE.find(t => t.id === toolId);
          if (tool) {
            recommendations.push({
              toolId: tool.id,
              toolName: tool.name,
              category: tool.category,
              priority: 'essential',
              reason: `Recommended for ${input.aiAgent} generated code`,
              estimatedCredits: tool.credits,
              estimatedTime: tool.timeEstimate,
              tags: tool.tags,
            });
            addedTools.add(toolId);
          }
        }
      }

      insights.push(`🤖 AI-generated code detected (${input.aiAgent}). Added extra security checks for: ${aiProfile.commonIssues.join(', ')}`);
    }

    // 3. Add language-specific tools
    for (const language of input.languages || []) {
      const langTools = TOOL_DATABASE.filter(
        t => t.languages?.includes(language) && !addedTools.has(t.id)
      );

      for (const tool of langTools) {
        recommendations.push({
          toolId: tool.id,
          toolName: tool.name,
          category: tool.category,
          priority: 'recommended',
          reason: `Specialized for ${language}`,
          estimatedCredits: tool.credits,
          estimatedTime: tool.timeEstimate,
          tags: tool.tags,
        });
        addedTools.add(tool.id);
      }
    }

    // 4. Add framework-specific tools
    for (const framework of input.frameworks || []) {
      const fwTools = TOOL_DATABASE.filter(
        t => t.frameworks?.includes(framework) && !addedTools.has(t.id)
      );

      for (const tool of fwTools) {
        recommendations.push({
          toolId: tool.id,
          toolName: tool.name,
          category: tool.category,
          priority: 'recommended',
          reason: `Specialized for ${framework}`,
          estimatedCredits: tool.credits,
          estimatedTime: tool.timeEstimate,
          tags: tool.tags,
        });
        addedTools.add(tool.id);
      }
    }

    // 5. Add app-type specific tools
    const appTypeTools = TOOL_DATABASE.filter(
      t => t.appTypes?.includes(input.appType) && !addedTools.has(t.id)
    );

    for (const tool of appTypeTools) {
      const isInRequiredCategory = sensitivityProfile.requiredCategories.includes(tool.category);
      recommendations.push({
        toolId: tool.id,
        toolName: tool.name,
        category: tool.category,
        priority: isInRequiredCategory ? 'recommended' : 'optional',
        reason: `Useful for ${input.appType} applications`,
        estimatedCredits: tool.credits,
        estimatedTime: tool.timeEstimate,
        tags: tool.tags,
      });
      addedTools.add(tool.id);
    }

    // 6. Address developer concerns
    if (input.concerns?.length) {
      for (const concern of input.concerns) {
        const concernTools = this.getToolsForConcern(concern);
        for (const toolId of concernTools) {
          if (!addedTools.has(toolId)) {
            const tool = TOOL_DATABASE.find(t => t.id === toolId);
            if (tool) {
              recommendations.push({
                toolId: tool.id,
                toolName: tool.name,
                category: tool.category,
                priority: 'recommended',
                reason: `Addresses your concern: ${concern.replace(/-/g, ' ')}`,
                estimatedCredits: tool.credits,
                estimatedTime: tool.timeEstimate,
                tags: tool.tags,
              });
              addedTools.add(toolId);
            }
          }
        }
      }
    }

    // Sort by priority
    const priorityOrder = { essential: 0, recommended: 1, optional: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Calculate summary
    const essentialScans = recommendations.filter(r => r.priority === 'essential').length;
    const totalCredits = recommendations.reduce((sum, r) => sum + r.estimatedCredits, 0);

    // Generate packages
    const packages = this.generatePackages(recommendations, input);

    // Add insights
    if (sensitivityProfile.complianceFrameworks.length) {
      insights.push(`📋 Compliance: These scans cover ${sensitivityProfile.complianceFrameworks.join(', ')} requirements`);
    }

    if (essentialScans > 5) {
      insights.push(`💡 Tip: Start with the ${essentialScans} essential scans, then add recommended ones based on findings`);
    }

    // Build UI-ready selection state
    const selectionState = this.buildSelectionState(recommendations, addedTools);

    return {
      summary: {
        totalScans: recommendations.length,
        essentialScans,
        estimatedCredits: totalCredits,
        estimatedTime: this.estimateTotalTime(recommendations),
      },
      recommendations,
      packages,
      insights,
      selectionState,
    };
  }

  /**
   * Build UI-ready selection state with all tools
   * - Selected tools (recommendations) bubble to the top
   * - Remaining tools grouped by category
   */
  private static buildSelectionState(
    recommendations: ScanRecommendation[],
    selectedToolIds: Set<string>
  ): SelectionState {
    // Build selected tools array from recommendations
    const selectedTools: SelectableTool[] = recommendations.map(rec => {
      const tool = TOOL_DATABASE.find(t => t.id === rec.toolId)!;
      return {
        id: tool.id,
        name: tool.name,
        category: tool.category,
        description: tool.description,
        credits: tool.credits,
        timeEstimate: tool.timeEstimate,
        tags: tool.tags,
        languages: tool.languages,
        frameworks: tool.frameworks,
        appTypes: tool.appTypes,
        selected: true,
        preSelected: true,
        selectionReason: rec.reason,
      };
    });

    // Build category groups for unselected tools
    const availableByCategory: ToolCategoryGroup[] = [];
    const categories = Object.keys(CATEGORY_INFO) as ToolCategory[];

    for (const category of categories) {
      const categoryInfo = CATEGORY_INFO[category];
      const unselectedTools = TOOL_DATABASE
        .filter(t => t.category === category && !selectedToolIds.has(t.id))
        .map(tool => ({
          id: tool.id,
          name: tool.name,
          category: tool.category,
          description: tool.description,
          credits: tool.credits,
          timeEstimate: tool.timeEstimate,
          tags: tool.tags,
          languages: tool.languages,
          frameworks: tool.frameworks,
          appTypes: tool.appTypes,
          selected: false,
          preSelected: false,
        }));

      // Only add category if it has unselected tools
      if (unselectedTools.length > 0) {
        availableByCategory.push({
          category,
          displayName: categoryInfo.displayName,
          icon: categoryInfo.icon,
          tools: unselectedTools,
        });
      }
    }

    // Calculate credits
    const selectedCredits = selectedTools.reduce((sum, t) => sum + t.credits, 0);
    const perToolCredits: Record<string, number> = {};
    for (const tool of TOOL_DATABASE) {
      perToolCredits[tool.id] = tool.credits;
    }

    // Calculate estimated time for selected tools
    const estimatedTime = this.estimateTimeForTools(selectedTools.map(t => t.id));

    return {
      selectedTools,
      availableByCategory,
      credits: {
        selected: selectedCredits,
        perTool: perToolCredits,
      },
      estimatedTime,
    };
  }

  /**
   * Estimate time for a set of tools
   */
  private static estimateTimeForTools(toolIds: string[]): string {
    let minMinutes = 0;
    let maxMinutes = 0;

    for (const toolId of toolIds) {
      const tool = TOOL_DATABASE.find(t => t.id === toolId);
      if (!tool) continue;

      const match = tool.timeEstimate.match(/(\d+)(?:-(\d+))?\s*(min|sec)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const max = parseInt(match[2] || match[1], 10);
        const unit = match[3];

        if (unit === 'sec') {
          minMinutes += min / 60;
          maxMinutes += max / 60;
        } else {
          minMinutes += min;
          maxMinutes += max;
        }
      }
    }

    minMinutes = Math.ceil(minMinutes);
    maxMinutes = Math.ceil(maxMinutes);

    if (maxMinutes < 60) {
      return `${minMinutes}-${maxMinutes} min`;
    } else {
      return `${Math.ceil(minMinutes / 60)}-${Math.ceil(maxMinutes / 60)} hours`;
    }
  }

  private static getToolsForConcern(concern: DeveloperConcern): string[] {
    const concernMap: Record<DeveloperConcern, string[]> = {
      'security-vulnerabilities': ['semgrep', 'owasp-zap', 'trivy', 'nuclei', 'osv-scanner', 'garak'],
      'data-leaks': ['gitleaks', 'secretlint', 'apkleaks'],
      compliance: ['semgrep', 'checkov', 'license-checker', 'kube-bench', 'terrascan'],
      performance: ['lighthouse', 'sitespeed'],
      accessibility: ['axe-core', 'pa11y'],
      'code-quality': ['eslint', 'codeclimate', 'biome', 'stryker', 'coverage-js'],
      'dependency-risks': ['trivy', 'grype', 'dependency-check', 'npm-audit', 'osv-scanner', 'pip-audit', 'cargo-audit'],
      'secrets-exposure': ['gitleaks', 'secretlint', 'apkleaks'],
      'ai-generated-bugs': ['semgrep', 'eslint', 'codeclimate', 'garak', 'modelscan', 'stryker'],
      'not-sure': ['semgrep', 'gitleaks', 'trivy', 'osv-scanner'],
    };

    return concernMap[concern] || [];
  }

  private static generatePackages(
    recommendations: ScanRecommendation[],
    input: WizardInput
  ): ScanPackage[] {
    const packages: ScanPackage[] = [];

    // Quick Scan package
    const quickScans = recommendations
      .filter(r => r.priority === 'essential')
      .slice(0, 5)
      .map(r => r.toolId);

    packages.push({
      id: 'quick',
      name: '⚡ Quick Scan',
      description: 'Essential checks in under 10 minutes',
      scans: quickScans,
      credits: quickScans.reduce((sum, id) => {
        const tool = TOOL_DATABASE.find(t => t.id === id);
        return sum + (tool?.credits || 0);
      }, 0),
      bestFor: 'Daily development, quick PR checks',
    });

    // Full Security package
    const securityScans = recommendations
      .filter(r => r.category === 'security')
      .map(r => r.toolId);

    packages.push({
      id: 'security',
      name: '🛡️ Security Deep Dive',
      description: 'Comprehensive security analysis',
      scans: securityScans,
      credits: securityScans.reduce((sum, id) => {
        const tool = TOOL_DATABASE.find(t => t.id === id);
        return sum + (tool?.credits || 0);
      }, 0),
      bestFor: 'Pre-release, security audits',
    });

    // Full scan package
    const allScans = recommendations.map(r => r.toolId);

    packages.push({
      id: 'comprehensive',
      name: '🔬 Comprehensive',
      description: 'Every recommended scan',
      scans: allScans,
      credits: recommendations.reduce((sum, r) => sum + r.estimatedCredits, 0),
      bestFor: 'Major releases, quarterly audits',
    });

    return packages;
  }

  private static estimateTotalTime(recommendations: ScanRecommendation[]): string {
    // Parse time estimates and sum
    let minMinutes = 0;
    let maxMinutes = 0;

    for (const rec of recommendations) {
      const match = rec.estimatedTime.match(/(\d+)(?:-(\d+))?\s*(min|sec)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const max = parseInt(match[2] || match[1], 10);
        const unit = match[3];

        if (unit === 'sec') {
          minMinutes += min / 60;
          maxMinutes += max / 60;
        } else {
          minMinutes += min;
          maxMinutes += max;
        }
      }
    }

    minMinutes = Math.ceil(minMinutes);
    maxMinutes = Math.ceil(maxMinutes);

    if (maxMinutes < 60) {
      return `${minMinutes}-${maxMinutes} min`;
    } else {
      return `${Math.ceil(minMinutes / 60)}-${Math.ceil(maxMinutes / 60)} hours`;
    }
  }
}

// ============================================================
// Wizard Flow
// ============================================================

export interface WizardStep {
  id: string;
  question: string;
  description: string;
  type: 'single-select' | 'multi-select' | 'auto-detect';
  options?: Array<{ value: string; label: string; description?: string; icon?: string }>;
  required: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'appType',
    question: 'What type of application is this?',
    description: "We'll customize scans based on your app type",
    type: 'single-select',
    options: [
      { value: 'web', label: 'Web App', description: 'Browser-based application', icon: '🌐' },
      { value: 'pwa', label: 'PWA', description: 'Progressive web app', icon: '📱' },
      { value: 'api', label: 'API / Backend', description: 'REST, GraphQL, or gRPC', icon: '⚙️' },
      { value: 'mobile-native', label: 'Mobile App', description: 'iOS or Android native', icon: '📲' },
      { value: 'desktop-native', label: 'Desktop App', description: 'Windows, Mac, Linux', icon: '🖥️' },
      { value: 'cli', label: 'CLI Tool', description: 'Command-line application', icon: '💻' },
      { value: 'library', label: 'Library / Package', description: 'Reusable module', icon: '📦' },
    ],
    required: true,
  },
  {
    id: 'sensitivity',
    question: 'How sensitive is the data your app handles?',
    description: 'This determines the depth of security scanning',
    type: 'single-select',
    options: [
      { value: 'financial', label: 'Financial', description: 'Payments, banking, trading', icon: '💰' },
      { value: 'healthcare', label: 'Healthcare', description: 'Medical records, PHI', icon: '🏥' },
      { value: 'government', label: 'Government', description: 'Civic, compliance-heavy', icon: '🏛️' },
      { value: 'enterprise', label: 'Enterprise', description: 'B2B, internal tools', icon: '🏢' },
      { value: 'ecommerce', label: 'E-commerce', description: 'Online shopping', icon: '🛒' },
      { value: 'social', label: 'Social', description: 'User content, messaging', icon: '👥' },
      { value: 'entertainment', label: 'Entertainment', description: 'Games, media', icon: '🎮' },
      { value: 'education', label: 'Education', description: 'Learning platforms', icon: '📚' },
      { value: 'personal', label: 'Personal Project', description: 'Hobby, learning', icon: '🧪' },
    ],
    required: true,
  },
  {
    id: 'stack',
    question: 'Detecting your tech stack...',
    description: "We'll scan your project to identify languages and frameworks",
    type: 'auto-detect',
    required: false,
  },
  {
    id: 'aiAgent',
    question: 'Did you use an AI coding assistant?',
    description: 'AI-generated code may need extra scrutiny in certain areas',
    type: 'single-select',
    options: [
      { value: 'cursor', label: 'Cursor', icon: '🔵' },
      { value: 'copilot', label: 'GitHub Copilot', icon: '🟣' },
      { value: 'claude-code', label: 'Claude Code', icon: '🟠' },
      { value: 'codeium', label: 'Codeium', icon: '🟢' },
      { value: 'amazon-q', label: 'Amazon Q', icon: '🟡' },
      { value: 'gemini-code', label: 'Gemini', icon: '🔴' },
      { value: 'other-ai', label: 'Other AI Tool', icon: '🤖' },
      { value: 'none', label: 'No AI used', description: 'All human-written', icon: '👤' },
    ],
    required: false,
  },
  {
    id: 'concerns',
    question: 'What are you most worried about?',
    description: 'Select all that apply - we\'ll prioritize those areas',
    type: 'multi-select',
    options: [
      { value: 'security-vulnerabilities', label: 'Security vulnerabilities', icon: '🔓' },
      { value: 'secrets-exposure', label: 'Leaked secrets/API keys', icon: '🔑' },
      { value: 'dependency-risks', label: 'Risky dependencies', icon: '📦' },
      { value: 'ai-generated-bugs', label: 'AI-generated bugs', icon: '🤖' },
      { value: 'performance', label: 'Performance issues', icon: '⚡' },
      { value: 'accessibility', label: 'Accessibility', icon: '♿' },
      { value: 'code-quality', label: 'Code quality', icon: '✨' },
      { value: 'compliance', label: 'Compliance requirements', icon: '📋' },
      { value: 'not-sure', label: "Not sure, scan everything", icon: '🔍' },
    ],
    required: false,
  },
];

// ============================================================
// Selection State Helpers
// ============================================================

/**
 * Toggle a tool's selection state and return the updated selection state
 * - When selecting: tool moves from category to selectedTools
 * - When deselecting: tool moves from selectedTools back to its category
 */
export function toggleToolSelection(
  currentState: SelectionState,
  toolId: string
): SelectionState {
  const tool = TOOL_DATABASE.find(t => t.id === toolId);
  if (!tool) return currentState;

  // Check if tool is currently selected
  const selectedIndex = currentState.selectedTools.findIndex(t => t.id === toolId);
  const isCurrentlySelected = selectedIndex >= 0;

  if (isCurrentlySelected) {
    // Deselecting - move to category
    const removedTool = currentState.selectedTools[selectedIndex];
    const newSelectedTools = [
      ...currentState.selectedTools.slice(0, selectedIndex),
      ...currentState.selectedTools.slice(selectedIndex + 1),
    ];

    // Add to appropriate category
    const newAvailableByCategory = currentState.availableByCategory.map(group => {
      if (group.category === tool.category) {
        return {
          ...group,
          tools: [
            ...group.tools,
            { ...removedTool, selected: false, preSelected: false, selectionReason: undefined },
          ].sort((a, b) => a.name.localeCompare(b.name)),
        };
      }
      return group;
    });

    // If category didn't exist, create it
    const categoryExists = newAvailableByCategory.some(g => g.category === tool.category);
    if (!categoryExists) {
      const categoryInfo = CATEGORY_INFO[tool.category];
      newAvailableByCategory.push({
        category: tool.category,
        displayName: categoryInfo.displayName,
        icon: categoryInfo.icon,
        tools: [{ ...removedTool, selected: false, preSelected: false, selectionReason: undefined }],
      });
    }

    return recalculateState(newSelectedTools, newAvailableByCategory);
  } else {
    // Selecting - move from category to selected
    let foundTool: SelectableTool | null = null;
    const newAvailableByCategory = currentState.availableByCategory.map(group => {
      if (group.category === tool.category) {
        const toolIndex = group.tools.findIndex(t => t.id === toolId);
        if (toolIndex >= 0) {
          foundTool = group.tools[toolIndex];
          return {
            ...group,
            tools: [
              ...group.tools.slice(0, toolIndex),
              ...group.tools.slice(toolIndex + 1),
            ],
          };
        }
      }
      return group;
    }).filter(group => group.tools.length > 0); // Remove empty categories

    if (!foundTool) return currentState;

    // TypeScript doesn't narrow foundTool after the map closure, so we use a local const
    const selectedTool: SelectableTool = foundTool;
    const newSelectedTools = [
      ...currentState.selectedTools,
      { ...selectedTool, selected: true, preSelected: false, selectionReason: 'User selected' },
    ];

    return recalculateState(newSelectedTools, newAvailableByCategory);
  }
}

/**
 * Select multiple tools at once
 */
export function selectTools(
  currentState: SelectionState,
  toolIds: string[]
): SelectionState {
  let state = currentState;
  for (const toolId of toolIds) {
    // Only select if not already selected
    if (!state.selectedTools.some(t => t.id === toolId)) {
      state = toggleToolSelection(state, toolId);
    }
  }
  return state;
}

/**
 * Deselect all tools and return to initial state
 */
export function deselectAllTools(currentState: SelectionState): SelectionState {
  // Move all selected tools back to their categories
  const allTools = [
    ...currentState.selectedTools.map(t => ({ ...t, selected: false, preSelected: false, selectionReason: undefined })),
    ...currentState.availableByCategory.flatMap(g => g.tools),
  ];

  // Group by category
  const byCategory = new Map<ToolCategory, SelectableTool[]>();
  for (const tool of allTools) {
    const existing = byCategory.get(tool.category) || [];
    existing.push(tool);
    byCategory.set(tool.category, existing);
  }

  // Build category groups
  const categories = Object.keys(CATEGORY_INFO) as ToolCategory[];
  const availableByCategory: ToolCategoryGroup[] = [];

  for (const category of categories) {
    const tools = byCategory.get(category);
    if (tools && tools.length > 0) {
      const categoryInfo = CATEGORY_INFO[category];
      availableByCategory.push({
        category,
        displayName: categoryInfo.displayName,
        icon: categoryInfo.icon,
        tools: tools.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }

  return {
    selectedTools: [],
    availableByCategory,
    credits: {
      selected: 0,
      perTool: currentState.credits.perTool,
    },
    estimatedTime: '0 min',
  };
}

/**
 * Reset to recommended selections (preSelected tools only)
 */
export function resetToRecommended(currentState: SelectionState): SelectionState {
  // Get all tools (both selected and available)
  const allTools = [
    ...currentState.selectedTools,
    ...currentState.availableByCategory.flatMap(g => g.tools),
  ];

  // Separate pre-selected and non-pre-selected
  const selectedTools = allTools
    .filter(t => t.preSelected)
    .map(t => ({ ...t, selected: true }));

  const unselected = allTools.filter(t => !t.preSelected);

  // Group unselected by category
  const byCategory = new Map<ToolCategory, SelectableTool[]>();
  for (const tool of unselected) {
    const existing = byCategory.get(tool.category) || [];
    existing.push({ ...tool, selected: false });
    byCategory.set(tool.category, existing);
  }

  // Build category groups
  const categories = Object.keys(CATEGORY_INFO) as ToolCategory[];
  const availableByCategory: ToolCategoryGroup[] = [];

  for (const category of categories) {
    const tools = byCategory.get(category);
    if (tools && tools.length > 0) {
      const categoryInfo = CATEGORY_INFO[category];
      availableByCategory.push({
        category,
        displayName: categoryInfo.displayName,
        icon: categoryInfo.icon,
        tools: tools.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
  }

  return recalculateState(selectedTools, availableByCategory);
}

/**
 * Recalculate credits and time for a selection state
 */
function recalculateState(
  selectedTools: SelectableTool[],
  availableByCategory: ToolCategoryGroup[]
): SelectionState {
  const selectedCredits = selectedTools.reduce((sum, t) => sum + t.credits, 0);
  const estimatedTime = calculateEstimatedTime(selectedTools);

  // Build perTool credits map
  const perToolCredits: Record<string, number> = {};
  for (const tool of TOOL_DATABASE) {
    perToolCredits[tool.id] = tool.credits;
  }

  return {
    selectedTools,
    availableByCategory,
    credits: {
      selected: selectedCredits,
      perTool: perToolCredits,
    },
    estimatedTime,
  };
}

/**
 * Calculate estimated time for selected tools
 */
function calculateEstimatedTime(tools: SelectableTool[]): string {
  let minMinutes = 0;
  let maxMinutes = 0;

  for (const tool of tools) {
    const match = tool.timeEstimate.match(/(\d+)(?:-(\d+))?\s*(min|sec)/);
    if (match) {
      const min = parseInt(match[1], 10);
      const max = parseInt(match[2] || match[1], 10);
      const unit = match[3];

      if (unit === 'sec') {
        minMinutes += min / 60;
        maxMinutes += max / 60;
      } else {
        minMinutes += min;
        maxMinutes += max;
      }
    }
  }

  minMinutes = Math.ceil(minMinutes);
  maxMinutes = Math.ceil(maxMinutes);

  if (minMinutes === 0 && maxMinutes === 0) {
    return '0 min';
  } else if (maxMinutes < 60) {
    return `${minMinutes}-${maxMinutes} min`;
  } else {
    return `${Math.ceil(minMinutes / 60)}-${Math.ceil(maxMinutes / 60)} hours`;
  }
}

/**
 * Get the full tool list for display (both selected and available)
 */
export function getAllToolsFlat(): SelectableTool[] {
  return TOOL_DATABASE.map(tool => ({
    id: tool.id,
    name: tool.name,
    category: tool.category,
    description: tool.description,
    credits: tool.credits,
    timeEstimate: tool.timeEstimate,
    tags: tool.tags,
    languages: tool.languages,
    frameworks: tool.frameworks,
    appTypes: tool.appTypes,
    selected: false,
    preSelected: false,
  }));
}

// ============================================================
// Export
// ============================================================

export {
  TOOL_DATABASE,
  SENSITIVITY_PROFILES,
  AI_AGENT_PROFILES,
};
