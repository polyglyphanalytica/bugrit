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
  category: string;
  credits: number;
  timeEstimate: string;
  languages?: string[];
  frameworks?: string[];
  appTypes?: AppType[];
  tags: string[];
}

const TOOL_DATABASE: ToolInfo[] = [
  // Security - General
  { id: 'semgrep', name: 'Semgrep', category: 'security', credits: 2, timeEstimate: '2-5 min', tags: ['sast', 'multi-language'] },
  { id: 'gitleaks', name: 'Gitleaks', category: 'security', credits: 1, timeEstimate: '1-2 min', tags: ['secrets', 'credentials'] },
  { id: 'trivy', name: 'Trivy', category: 'security', credits: 2, timeEstimate: '2-4 min', tags: ['vulnerabilities', 'dependencies'] },
  { id: 'grype', name: 'Grype', category: 'security', credits: 2, timeEstimate: '2-4 min', tags: ['sbom', 'vulnerabilities'] },
  { id: 'npm-audit', name: 'npm Audit', category: 'security', credits: 1, timeEstimate: '30 sec', languages: ['javascript', 'typescript'], tags: ['dependencies', 'npm'] },
  { id: 'secretlint', name: 'Secretlint', category: 'security', credits: 1, timeEstimate: '1 min', tags: ['secrets', 'credentials'] },

  // Security - Web
  { id: 'owasp-zap', name: 'OWASP ZAP', category: 'security', credits: 5, timeEstimate: '5-15 min', appTypes: ['web', 'pwa', 'api'], tags: ['dast', 'web-security'] },
  { id: 'nuclei', name: 'Nuclei', category: 'security', credits: 3, timeEstimate: '3-10 min', appTypes: ['web', 'pwa', 'api'], tags: ['vulnerability-scanner', 'cve'] },

  // Security - IaC
  { id: 'checkov', name: 'Checkov', category: 'security', credits: 2, timeEstimate: '2-4 min', tags: ['iac', 'terraform', 'kubernetes'] },
  { id: 'tfsec', name: 'tfsec', category: 'security', credits: 2, timeEstimate: '1-3 min', tags: ['terraform', 'iac'] },
  { id: 'dockle', name: 'Dockle', category: 'security', credits: 1, timeEstimate: '1-2 min', tags: ['docker', 'container'] },

  // Security - Language Specific
  { id: 'bandit', name: 'Bandit', category: 'security', credits: 1, timeEstimate: '1-2 min', languages: ['python'], tags: ['python', 'sast'] },
  { id: 'gosec', name: 'gosec', category: 'security', credits: 1, timeEstimate: '1-2 min', languages: ['go'], tags: ['go', 'sast'] },
  { id: 'brakeman', name: 'Brakeman', category: 'security', credits: 2, timeEstimate: '2-4 min', languages: ['ruby'], frameworks: ['rails'], tags: ['ruby', 'rails', 'sast'] },

  // Code Quality
  { id: 'eslint', name: 'ESLint', category: 'code-quality', credits: 1, timeEstimate: '30 sec', languages: ['javascript', 'typescript'], tags: ['linting', 'best-practices'] },
  { id: 'biome', name: 'Biome', category: 'code-quality', credits: 1, timeEstimate: '30 sec', languages: ['javascript', 'typescript'], tags: ['linting', 'formatting'] },
  { id: 'stylelint', name: 'Stylelint', category: 'code-quality', credits: 1, timeEstimate: '30 sec', tags: ['css', 'styling'] },
  { id: 'codeclimate', name: 'Code Climate', category: 'code-quality', credits: 3, timeEstimate: '3-5 min', tags: ['maintainability', 'complexity'] },
  { id: 'shellcheck', name: 'ShellCheck', category: 'code-quality', credits: 1, timeEstimate: '30 sec', tags: ['shell', 'bash'] },

  // Code Quality - Language Specific
  { id: 'phpstan', name: 'PHPStan', category: 'code-quality', credits: 2, timeEstimate: '2-4 min', languages: ['php'], tags: ['php', 'static-analysis'] },
  { id: 'psalm', name: 'Psalm', category: 'code-quality', credits: 2, timeEstimate: '2-4 min', languages: ['php'], tags: ['php', 'type-safety'] },
  { id: 'rubocop', name: 'RuboCop', category: 'code-quality', credits: 1, timeEstimate: '1-2 min', languages: ['ruby'], tags: ['ruby', 'style'] },
  { id: 'spotbugs', name: 'SpotBugs', category: 'code-quality', credits: 3, timeEstimate: '3-5 min', languages: ['java'], tags: ['java', 'bugs'] },
  { id: 'pmd', name: 'PMD', category: 'code-quality', credits: 2, timeEstimate: '2-3 min', languages: ['java'], tags: ['java', 'best-practices'] },
  { id: 'detekt', name: 'Detekt', category: 'code-quality', credits: 2, timeEstimate: '2-3 min', languages: ['kotlin'], tags: ['kotlin', 'style'] },

  // Accessibility
  { id: 'axe-core', name: 'axe-core', category: 'accessibility', credits: 4, timeEstimate: '2-4 min', appTypes: ['web', 'pwa'], tags: ['wcag', 'a11y'] },
  { id: 'pa11y', name: 'Pa11y', category: 'accessibility', credits: 4, timeEstimate: '2-4 min', appTypes: ['web', 'pwa'], tags: ['wcag', 'a11y'] },
  { id: 'lighthouse-a11y', name: 'Lighthouse A11y', category: 'accessibility', credits: 4, timeEstimate: '2-3 min', appTypes: ['web', 'pwa'], tags: ['wcag', 'a11y'] },

  // Performance
  { id: 'lighthouse', name: 'Lighthouse', category: 'performance', credits: 5, timeEstimate: '2-3 min', appTypes: ['web', 'pwa'], tags: ['core-web-vitals', 'seo'] },
  { id: 'sitespeed', name: 'Sitespeed.io', category: 'performance', credits: 5, timeEstimate: '5-10 min', appTypes: ['web', 'pwa'], tags: ['performance', 'metrics'] },

  // Dependencies
  { id: 'dependency-check', name: 'OWASP Dep Check', category: 'dependencies', credits: 3, timeEstimate: '5-10 min', tags: ['cve', 'vulnerabilities'] },
  { id: 'syft', name: 'Syft SBOM', category: 'dependencies', credits: 2, timeEstimate: '2-3 min', tags: ['sbom', 'inventory'] },
  { id: 'license-checker', name: 'License Checker', category: 'dependencies', credits: 1, timeEstimate: '30 sec', tags: ['compliance', 'licenses'] },
  { id: 'depcheck', name: 'Depcheck', category: 'dependencies', credits: 1, timeEstimate: '30 sec', languages: ['javascript', 'typescript'], tags: ['unused', 'missing'] },
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
    requiredCategories: ['security', 'dependencies'],
    priorityTools: ['semgrep', 'owasp-zap', 'gitleaks', 'trivy', 'nuclei'],
    complianceFrameworks: ['pci-dss', 'soc2'],
    extraScrutiny: ['authentication', 'encryption', 'injection'],
  },
  healthcare: {
    requiredCategories: ['security', 'dependencies', 'accessibility'],
    priorityTools: ['semgrep', 'gitleaks', 'trivy', 'axe-core'],
    complianceFrameworks: ['soc2', 'iso-27001'],
    extraScrutiny: ['data-protection', 'access-control', 'audit-logging'],
  },
  government: {
    requiredCategories: ['security', 'dependencies', 'accessibility'],
    priorityTools: ['semgrep', 'owasp-zap', 'gitleaks', 'trivy', 'checkov'],
    complianceFrameworks: ['nist-csf', 'cis-controls'],
    extraScrutiny: ['access-control', 'encryption', 'audit-logging'],
  },
  enterprise: {
    requiredCategories: ['security', 'code-quality', 'dependencies'],
    priorityTools: ['semgrep', 'gitleaks', 'trivy', 'codeclimate'],
    complianceFrameworks: ['soc2'],
    extraScrutiny: ['authentication', 'access-control'],
  },
  ecommerce: {
    requiredCategories: ['security', 'performance', 'accessibility'],
    priorityTools: ['owasp-zap', 'semgrep', 'gitleaks', 'lighthouse'],
    complianceFrameworks: ['pci-dss'],
    extraScrutiny: ['payment', 'injection', 'xss'],
  },
  social: {
    requiredCategories: ['security', 'accessibility'],
    priorityTools: ['semgrep', 'gitleaks', 'owasp-zap', 'axe-core'],
    complianceFrameworks: ['owasp-top-10'],
    extraScrutiny: ['xss', 'access-control', 'data-exposure'],
  },
  entertainment: {
    requiredCategories: ['performance', 'accessibility'],
    priorityTools: ['lighthouse', 'axe-core', 'semgrep'],
    complianceFrameworks: ['owasp-top-10'],
    extraScrutiny: ['performance', 'user-experience'],
  },
  education: {
    requiredCategories: ['security', 'accessibility'],
    priorityTools: ['semgrep', 'gitleaks', 'axe-core', 'pa11y'],
    complianceFrameworks: ['owasp-top-10'],
    extraScrutiny: ['data-protection', 'accessibility'],
  },
  iot: {
    requiredCategories: ['security', 'dependencies'],
    priorityTools: ['semgrep', 'trivy', 'checkov', 'gitleaks'],
    complianceFrameworks: ['owasp-top-10', 'cis-controls'],
    extraScrutiny: ['authentication', 'encryption', 'firmware'],
  },
  'developer-tool': {
    requiredCategories: ['security', 'code-quality'],
    priorityTools: ['semgrep', 'gitleaks', 'trivy', 'codeclimate'],
    complianceFrameworks: ['owasp-top-10'],
    extraScrutiny: ['supply-chain', 'dependencies'],
  },
  personal: {
    requiredCategories: ['security'],
    priorityTools: ['semgrep', 'gitleaks', 'trivy'],
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
    };
  }

  private static getToolsForConcern(concern: DeveloperConcern): string[] {
    const concernMap: Record<DeveloperConcern, string[]> = {
      'security-vulnerabilities': ['semgrep', 'owasp-zap', 'trivy', 'nuclei'],
      'data-leaks': ['gitleaks', 'secretlint'],
      compliance: ['semgrep', 'checkov', 'license-checker'],
      performance: ['lighthouse', 'sitespeed'],
      accessibility: ['axe-core', 'pa11y'],
      'code-quality': ['eslint', 'codeclimate', 'biome'],
      'dependency-risks': ['trivy', 'grype', 'dependency-check', 'npm-audit'],
      'secrets-exposure': ['gitleaks', 'secretlint'],
      'ai-generated-bugs': ['semgrep', 'eslint', 'codeclimate'],
      'not-sure': ['semgrep', 'gitleaks', 'trivy'],
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
// Export
// ============================================================

export {
  TOOL_DATABASE,
  SENSITIVITY_PROFILES,
  AI_AGENT_PROFILES,
};
