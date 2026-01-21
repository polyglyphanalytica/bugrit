/**
 * Comprehensive Tool Registry
 *
 * 69 security, quality, and compliance tools supporting multiple languages.
 *
 * Deployment types:
 * - Native JS (25 tools): Run via npm packages on Node.js
 * - Docker (44 tools): Run via Google Cloud Build containers
 *
 * Total: 69 tools across 11 categories
 */

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  npm?: string;  // Primary npm package (for JS tools)
  docker?: string;  // Docker image (for Cloud Build tools)
  dependencies?: string[];  // Additional npm packages needed
  languages?: string[];  // Languages this tool supports
  filePatterns?: string[];  // File patterns this tool analyzes
  credits: number;  // Credit cost for this tool
}

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

export const TOOL_REGISTRY: ToolDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // LINTING & FORMATTING (4 tools) - Free, fast static analysis
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'eslint',
    name: 'ESLint',
    description: 'JavaScript/TypeScript linter with security and best practice rules',
    category: 'linting',
    npm: 'eslint',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    credits: 0,
  },
  {
    id: 'biome',
    name: 'Biome',
    description: 'Fast linter and formatter for JS/TS/JSON',
    category: 'linting',
    npm: '@biomejs/biome',
    languages: ['javascript', 'typescript', 'json'],
    filePatterns: ['**/*.js', '**/*.ts', '**/*.json'],
    credits: 0,
  },
  {
    id: 'stylelint',
    name: 'Stylelint',
    description: 'CSS/SCSS/Less linter',
    category: 'linting',
    npm: 'stylelint',
    dependencies: ['stylelint-config-standard'],
    languages: ['css', 'scss', 'less'],
    filePatterns: ['**/*.css', '**/*.scss', '**/*.less'],
    credits: 0,
  },
  {
    id: 'prettier',
    name: 'Prettier',
    description: 'Code formatter with diff detection',
    category: 'linting',
    npm: 'prettier',
    languages: ['javascript', 'typescript', 'css', 'json', 'markdown'],
    filePatterns: ['**/*.{js,ts,jsx,tsx,css,json,md}'],
    credits: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECURITY - General (10+ tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'semgrep',
    name: 'Semgrep',
    description: 'Find bugs and security issues with custom rules across 30+ languages',
    category: 'security',
    docker: 'returntocorp/semgrep:latest',
    languages: ['javascript', 'typescript', 'python', 'go', 'java', 'ruby', 'php'],
    credits: 2,
  },
  {
    id: 'gitleaks',
    name: 'Gitleaks',
    description: 'Detect hardcoded secrets like API keys and passwords',
    category: 'security',
    docker: 'ghcr.io/gitleaks/gitleaks:latest',
    credits: 1,
  },
  {
    id: 'trivy',
    name: 'Trivy',
    description: 'Scan for vulnerabilities in dependencies and containers',
    category: 'security',
    docker: 'aquasec/trivy:latest',
    credits: 2,
  },
  {
    id: 'grype',
    name: 'Grype',
    description: 'Vulnerability scanner for container images and filesystems',
    category: 'security',
    docker: 'anchore/grype:latest',
    credits: 2,
  },
  {
    id: 'nuclei',
    name: 'Nuclei',
    description: 'Fast vulnerability scanner with 8000+ community templates',
    category: 'security',
    docker: 'projectdiscovery/nuclei:latest',
    credits: 3,
  },
  {
    id: 'checkov',
    name: 'Checkov',
    description: 'Security scanner for Terraform, CloudFormation, and Kubernetes',
    category: 'security',
    docker: 'bridgecrew/checkov:latest',
    credits: 2,
  },
  {
    id: 'secretlint',
    name: 'Secretlint',
    description: 'Detect hardcoded secrets and credentials',
    category: 'security',
    npm: 'secretlint',
    dependencies: ['@secretlint/secretlint-rule-preset-recommend'],
    filePatterns: ['**/*'],
    credits: 1,
  },
  {
    id: 'npm-audit',
    name: 'npm Audit',
    description: 'Check npm packages for known vulnerabilities',
    category: 'security',
    npm: 'better-npm-audit',
    languages: ['javascript', 'typescript'],
    filePatterns: ['package.json', 'package-lock.json'],
    credits: 1,
  },
  {
    id: 'bandit',
    name: 'Bandit',
    description: 'Security linter for Python code',
    category: 'security',
    docker: 'ghcr.io/pycqa/bandit/bandit:latest',
    languages: ['python'],
    credits: 1,
  },
  {
    id: 'gosec',
    name: 'Gosec',
    description: 'Security checker for Go source code',
    category: 'security',
    docker: 'securego/gosec:latest',
    languages: ['go'],
    credits: 1,
  },
  {
    id: 'brakeman',
    name: 'Brakeman',
    description: 'Security scanner for Ruby on Rails applications',
    category: 'security',
    docker: 'presidentbeef/brakeman:latest',
    languages: ['ruby'],
    credits: 2,
  },
  {
    id: 'owasp-zap',
    name: 'OWASP ZAP',
    description: 'Dynamic security testing for web applications',
    category: 'security',
    docker: 'ghcr.io/zaproxy/zaproxy:stable',
    credits: 5,
  },
  {
    id: 'dependency-check',
    name: 'OWASP Dependency Check',
    description: 'Detect publicly known vulnerabilities in project dependencies',
    category: 'security',
    docker: 'owasp/dependency-check:latest',
    credits: 2,
  },
  {
    id: 'tfsec',
    name: 'tfsec',
    description: 'Security scanner for Terraform code',
    category: 'security',
    docker: 'aquasec/tfsec:latest',
    credits: 2,
  },
  {
    id: 'dockle',
    name: 'Dockle',
    description: 'Container image linter for security best practices',
    category: 'security',
    docker: 'goodwithtech/dockle:latest',
    credits: 1,
  },
  {
    id: 'syft',
    name: 'Syft',
    description: 'Software Bill of Materials (SBOM) generator',
    category: 'security',
    docker: 'anchore/syft:latest',
    credits: 1,
  },
  {
    id: 'flawfinder',
    name: 'Flawfinder',
    description: 'Security-focused scanner for C/C++ source code',
    category: 'security',
    docker: 'python:3.11-slim',  // pip install flawfinder
    languages: ['c', 'cpp'],
    credits: 2,
  },
  {
    id: 'garak',
    name: 'Garak',
    description: 'LLM vulnerability scanner - prompt injection, jailbreaks',
    category: 'security',
    docker: 'ghcr.io/leondz/garak:latest',
    credits: 4,
  },
  {
    id: 'modelscan',
    name: 'ModelScan',
    description: 'Scan ML models for security issues and malicious code',
    category: 'security',
    docker: 'python:3.11-slim',  // pip install modelscan
    credits: 3,
  },

  // ═══════════════════════════════════════════════════════════════
  // DEPENDENCIES (7 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'depcheck',
    name: 'Depcheck',
    description: 'Find unused and missing dependencies',
    category: 'dependencies',
    npm: 'depcheck',
    filePatterns: ['package.json'],
    credits: 0,
  },
  {
    id: 'license-checker',
    name: 'License Checker',
    description: 'Audit dependency licenses for compliance',
    category: 'dependencies',
    npm: 'license-checker',
    filePatterns: ['package.json'],
    credits: 1,
  },
  {
    id: 'madge',
    name: 'Madge',
    description: 'Detect circular dependencies',
    category: 'dependencies',
    npm: 'madge',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.ts'],
    credits: 0,
  },
  {
    id: 'dependency-cruiser',
    name: 'Dependency Cruiser',
    description: 'Validate and visualize dependencies',
    category: 'dependencies',
    npm: 'dependency-cruiser',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.ts'],
    credits: 1,
  },
  {
    id: 'osv-scanner',
    name: 'OSV Scanner',
    description: 'Google vulnerability scanner using OSV database',
    category: 'dependencies',
    docker: 'ghcr.io/google/osv-scanner:latest',
    credits: 1,
  },
  {
    id: 'pip-audit',
    name: 'pip-audit',
    description: 'Audit Python dependencies for known vulnerabilities',
    category: 'dependencies',
    docker: 'python:3.11-slim',  // pip install pip-audit
    languages: ['python'],
    credits: 1,
  },
  {
    id: 'cargo-audit',
    name: 'Cargo Audit',
    description: 'Audit Rust Cargo.lock for vulnerable dependencies',
    category: 'dependencies',
    docker: 'rust:latest',  // cargo install cargo-audit
    languages: ['rust'],
    credits: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESSIBILITY (2 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'axe-core',
    name: 'axe-core',
    description: 'WCAG accessibility testing engine',
    category: 'accessibility',
    npm: '@axe-core/cli',
    dependencies: ['puppeteer'],
    filePatterns: ['**/*.html'],
    credits: 4,
  },
  {
    id: 'pa11y',
    name: 'Pa11y',
    description: 'Automated accessibility testing',
    category: 'accessibility',
    npm: 'pa11y',
    filePatterns: ['**/*.html'],
    credits: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // CODE QUALITY (10+ tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'typescript',
    name: 'TypeScript',
    description: 'Type checking and compile errors',
    category: 'quality',
    npm: 'typescript',
    languages: ['typescript'],
    filePatterns: ['**/*.ts', '**/*.tsx'],
    credits: 0,
  },
  {
    id: 'knip',
    name: 'Knip',
    description: 'Find unused files, exports, and dependencies',
    category: 'quality',
    npm: 'knip',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.ts'],
    credits: 1,
  },
  {
    id: 'jscpd',
    name: 'jscpd',
    description: 'Detect copy-paste code duplication',
    category: 'quality',
    npm: 'jscpd',
    languages: ['javascript', 'typescript', 'css'],
    filePatterns: ['**/*.{js,ts,jsx,tsx,css}'],
    credits: 1,
  },
  {
    id: 'cspell',
    name: 'cspell',
    description: 'Spell checker for code and comments',
    category: 'quality',
    npm: 'cspell',
    filePatterns: ['**/*'],
    credits: 0,
  },
  {
    id: 'publint',
    name: 'publint',
    description: 'Lint npm package for publishing issues',
    category: 'quality',
    npm: 'publint',
    filePatterns: ['package.json'],
    credits: 0,
  },
  {
    id: 'codeclimate',
    name: 'Code Climate',
    description: 'Automated code review for maintainability',
    category: 'quality',
    docker: 'codeclimate/codeclimate',
    credits: 3,
  },
  {
    id: 'phpstan',
    name: 'PHPStan',
    description: 'Static analysis for PHP - finds bugs without running code',
    category: 'quality',
    docker: 'ghcr.io/phpstan/phpstan:latest',
    languages: ['php'],
    credits: 2,
  },
  {
    id: 'psalm',
    name: 'Psalm',
    description: 'Type-safe PHP static analysis tool',
    category: 'quality',
    docker: 'vimeo/psalm:latest',
    languages: ['php'],
    credits: 2,
  },
  {
    id: 'spotbugs',
    name: 'SpotBugs',
    description: 'Static analysis for Java bytecode to find bugs',
    category: 'quality',
    docker: 'spotbugs/spotbugs:latest',
    languages: ['java'],
    credits: 2,
  },
  {
    id: 'pmd',
    name: 'PMD',
    description: 'Extensible cross-language static code analyzer',
    category: 'quality',
    docker: 'pmd/pmd:latest',
    languages: ['java', 'javascript', 'apex', 'xml'],
    credits: 2,
  },
  {
    id: 'checkstyle',
    name: 'Checkstyle',
    description: 'Java code style checker for coding standards compliance',
    category: 'quality',
    docker: 'checkstyle/checkstyle:latest',
    languages: ['java'],
    credits: 1,
  },
  {
    id: 'rubocop',
    name: 'RuboCop',
    description: 'Ruby style guide enforcer and linter',
    category: 'quality',
    docker: 'ruby:latest',  // gem install rubocop
    languages: ['ruby'],
    credits: 1,
  },
  {
    id: 'detekt',
    name: 'Detekt',
    description: 'Static code analysis for Kotlin',
    category: 'quality',
    docker: 'detekt/detekt:latest',
    languages: ['kotlin'],
    credits: 2,
  },
  {
    id: 'cppcheck',
    name: 'Cppcheck',
    description: 'Static analysis for C/C++ code',
    category: 'quality',
    docker: 'neszt/cppcheck:latest',
    languages: ['c', 'cpp'],
    credits: 2,
  },
  {
    id: 'clippy',
    name: 'Clippy',
    description: 'Rust linter for idiomatic code and common mistakes',
    category: 'quality',
    docker: 'rust:latest',  // rustup component add clippy
    languages: ['rust'],
    credits: 1,
  },
  {
    id: 'shellcheck',
    name: 'ShellCheck',
    description: 'Static analysis for shell scripts',
    category: 'quality',
    docker: 'koalaman/shellcheck:stable',
    credits: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTATION (3 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'markdownlint',
    name: 'markdownlint',
    description: 'Markdown style and formatting linter',
    category: 'documentation',
    npm: 'markdownlint-cli',
    filePatterns: ['**/*.md'],
    credits: 0,
  },
  {
    id: 'remark-lint',
    name: 'remark-lint',
    description: 'Pluggable markdown linter',
    category: 'documentation',
    npm: 'remark-cli',
    dependencies: ['remark-preset-lint-recommended'],
    filePatterns: ['**/*.md'],
    credits: 0,
  },
  {
    id: 'alex',
    name: 'alex',
    description: 'Catch insensitive, inconsiderate writing',
    category: 'documentation',
    npm: 'alex',
    filePatterns: ['**/*.md', '**/*.txt'],
    credits: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // GIT & COMMITS (1 tool)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'commitlint',
    name: 'commitlint',
    description: 'Lint commit messages against conventional format',
    category: 'git',
    npm: '@commitlint/cli',
    dependencies: ['@commitlint/config-conventional'],
    filePatterns: [],
    credits: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE (3 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    description: 'Performance, SEO, and best practices audit',
    category: 'performance',
    npm: 'lighthouse',
    dependencies: ['puppeteer'],
    filePatterns: [],
    credits: 5,
  },
  {
    id: 'sitespeed',
    name: 'Sitespeed.io',
    description: 'Complete web performance testing toolkit',
    category: 'performance',
    docker: 'sitespeedio/sitespeed.io:latest',
    credits: 4,
  },
  {
    id: 'size-limit',
    name: 'size-limit',
    description: 'Bundle size monitoring with limits',
    category: 'performance',
    npm: 'size-limit',
    dependencies: ['@size-limit/preset-small-lib'],
    filePatterns: ['package.json'],
    credits: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // MOBILE SECURITY (4 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'mobsf',
    name: 'MobSF',
    description: 'Mobile Security Framework - Android/iOS static analysis',
    category: 'mobile',
    docker: 'opensecurity/mobile-security-framework-mobsf:latest',
    credits: 5,
  },
  {
    id: 'apkleaks',
    name: 'APKLeaks',
    description: 'Scan Android APKs for hardcoded secrets and URLs',
    category: 'mobile',
    docker: 'python:3.11-slim',  // pip install apkleaks
    credits: 2,
  },
  {
    id: 'androguard',
    name: 'Androguard',
    description: 'Android APK reverse engineering and analysis',
    category: 'mobile',
    docker: 'python:3.11-slim',  // pip install androguard
    credits: 3,
  },
  {
    id: 'swiftlint',
    name: 'SwiftLint',
    description: 'Linter for Swift style and conventions',
    category: 'mobile',
    docker: 'norionomura/swiftlint:latest',
    languages: ['swift'],
    credits: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // API SECURITY (4 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'spectral',
    name: 'Spectral',
    description: 'OpenAPI and AsyncAPI linter for API contract validation',
    category: 'api-security',
    npm: '@stoplight/spectral-cli',
    credits: 1,
  },
  {
    id: 'dredd',
    name: 'Dredd',
    description: 'API contract testing against documentation',
    category: 'api-security',
    npm: 'dredd',
    credits: 3,
  },
  {
    id: 'graphql-cop',
    name: 'GraphQL Cop',
    description: 'Security audit for GraphQL endpoints',
    category: 'api-security',
    docker: 'python:3.11-slim',  // pip install graphql-cop
    credits: 2,
  },
  {
    id: 'schemathesis',
    name: 'Schemathesis',
    description: 'Property-based testing for OpenAPI schemas',
    category: 'api-security',
    docker: 'schemathesis/schemathesis:stable',
    credits: 3,
  },

  // ═══════════════════════════════════════════════════════════════
  // CLOUD NATIVE / KUBERNETES (5 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'kubesec',
    name: 'Kubesec',
    description: 'Security risk analysis for Kubernetes manifests',
    category: 'cloud-native',
    docker: 'kubesec/kubesec:v2',
    credits: 1,
  },
  {
    id: 'kube-bench',
    name: 'Kube-bench',
    description: 'CIS Kubernetes benchmark compliance checker',
    category: 'cloud-native',
    docker: 'aquasec/kube-bench:latest',
    credits: 2,
  },
  {
    id: 'polaris',
    name: 'Polaris',
    description: 'Kubernetes deployment best practices validation',
    category: 'cloud-native',
    docker: 'quay.io/fairwinds/polaris:latest',
    credits: 2,
  },
  {
    id: 'terrascan',
    name: 'Terrascan',
    description: 'Multi-cloud IaC security scanner (Terraform, K8s, Helm)',
    category: 'cloud-native',
    docker: 'tenable/terrascan:latest',
    credits: 2,
  },
  {
    id: 'kube-hunter',
    name: 'Kube-hunter',
    description: 'Hunt for security weaknesses in Kubernetes clusters',
    category: 'cloud-native',
    docker: 'aquasec/kube-hunter:latest',
    credits: 3,
  },
];

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter(tool => tool.category === category);
}

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find(tool => tool.id === id);
}

export function getToolsForLanguage(language: string): ToolDefinition[] {
  return TOOL_REGISTRY.filter(tool =>
    tool.languages?.includes(language) || !tool.languages
  );
}

export function getAllNpmPackages(): string[] {
  const packages = new Set<string>();
  for (const tool of TOOL_REGISTRY) {
    if (tool.npm) packages.add(tool.npm);
    tool.dependencies?.forEach(dep => packages.add(dep));
  }
  return Array.from(packages);
}

export function getDockerTools(): ToolDefinition[] {
  return TOOL_REGISTRY.filter(tool => tool.docker);
}

export function getTotalCredits(toolIds: string[]): number {
  return toolIds.reduce((total, id) => {
    const tool = getToolById(id);
    return total + (tool?.credits || 0);
  }, 0);
}

export const TOOL_COUNT = TOOL_REGISTRY.length;  // 69 tools (25 npm + 44 docker)

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  linting: 'Linting & Formatting',
  security: 'Security',
  dependencies: 'Dependencies',
  accessibility: 'Accessibility',
  quality: 'Code Quality',
  documentation: 'Documentation',
  git: 'Git & Commits',
  performance: 'Performance',
  mobile: 'Mobile Security',
  'api-security': 'API Security',
  'cloud-native': 'Cloud Native',
};

export const CATEGORY_ICONS: Record<ToolCategory, string> = {
  linting: '📝',
  security: '🔒',
  dependencies: '📦',
  accessibility: '♿',
  quality: '✨',
  documentation: '📚',
  git: '🔀',
  performance: '⚡',
  mobile: '📱',
  'api-security': '🔌',
  'cloud-native': '☁️',
};
