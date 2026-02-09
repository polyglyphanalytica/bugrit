/**
 * Comprehensive Tool Registry
 *
 * 150 tools for security, quality, and compliance.
 *
 * All tools are registered, credited, orchestrated, and reported equally.
 *
 * Deployment types:
 * - Native JS/npm (51 tools): Run via npm packages on Node.js
 * - Docker (95 tools): Run via Google Cloud Build containers
 * - Git/CLI (4 tools): Uses git or system CLI
 *
 * Total: 150 tools across 11 categories
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
  | 'cloud-native'
  | 'container'
  | 'sbom';

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
    id: 'eslint-security',
    name: 'ESLint Security',
    description: 'Detect security vulnerabilities in JavaScript/TypeScript using eslint-plugin-security rules',
    category: 'security',
    npm: 'eslint-plugin-security',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    credits: 0,
  },
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

  // ═══════════════════════════════════════════════════════════════
  // NEW TOOLS - January 2026 Expansion (11 tools)
  // ═══════════════════════════════════════════════════════════════

  // --- Linting ---
  {
    id: 'oxlint',
    name: 'Oxlint',
    description: 'Ultra-fast JavaScript/TypeScript linter (50-100x faster than ESLint)',
    category: 'linting',
    npm: 'oxlint',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    credits: 0,
  },

  // --- Python Quality ---
  {
    id: 'ruff',
    name: 'Ruff',
    description: 'Extremely fast Python linter and formatter (replaces Flake8, Black, isort)',
    category: 'quality',
    docker: 'ghcr.io/astral-sh/ruff:latest',
    languages: ['python'],
    filePatterns: ['**/*.py'],
    credits: 1,
  },
  {
    id: 'mypy',
    name: 'Mypy',
    description: 'Static type checker for Python',
    category: 'quality',
    docker: 'python:3.11-slim',  // pip install mypy
    languages: ['python'],
    filePatterns: ['**/*.py'],
    credits: 1,
  },

  // --- Dockerfile & SQL ---
  {
    id: 'hadolint',
    name: 'Hadolint',
    description: 'Dockerfile linter for best practices (uses ShellCheck for RUN instructions)',
    category: 'quality',
    docker: 'hadolint/hadolint:latest',
    filePatterns: ['**/Dockerfile', '**/Dockerfile.*', '**/*.dockerfile'],
    credits: 1,
  },
  {
    id: 'sqlfluff',
    name: 'SQLFluff',
    description: 'SQL linter supporting 15+ dialects (PostgreSQL, MySQL, BigQuery, etc.)',
    category: 'quality',
    docker: 'sqlfluff/sqlfluff:latest',
    languages: ['sql'],
    filePatterns: ['**/*.sql'],
    credits: 1,
  },

  // --- Go ---
  {
    id: 'golangci-lint',
    name: 'GolangCI-Lint',
    description: 'Fast Go linters runner - runs 50+ linters in parallel',
    category: 'quality',
    docker: 'golangci/golangci-lint:latest',
    languages: ['go'],
    filePatterns: ['**/*.go'],
    credits: 2,
  },

  // --- Security ---
  {
    id: 'trufflehog',
    name: 'TruffleHog',
    description: 'Deep secrets scanner - scans git history for leaked credentials',
    category: 'security',
    docker: 'trufflesecurity/trufflehog:latest',
    credits: 2,
  },

  // --- CI/CD ---
  {
    id: 'actionlint',
    name: 'actionlint',
    description: 'Static checker for GitHub Actions workflow files',
    category: 'quality',
    docker: 'rhysd/actionlint:latest',
    filePatterns: ['**/.github/workflows/*.yml', '**/.github/workflows/*.yaml'],
    credits: 1,
  },

  // --- Cloud Native / IaC ---
  {
    id: 'kics',
    name: 'KICS',
    description: 'Keeping Infrastructure as Code Secure - comprehensive IaC scanner',
    category: 'cloud-native',
    docker: 'checkmarx/kics:latest',
    filePatterns: ['**/*.tf', '**/*.yaml', '**/*.yml', '**/Dockerfile'],
    credits: 2,
  },
  {
    id: 'cfn-lint',
    name: 'cfn-lint',
    description: 'AWS CloudFormation linter for template validation',
    category: 'cloud-native',
    docker: 'python:3.11-slim',  // pip install cfn-lint
    filePatterns: ['**/*.template', '**/*.template.json', '**/*.template.yaml', '**/cloudformation/*.yml'],
    credits: 1,
  },

  // --- Documentation ---
  {
    id: 'vale',
    name: 'Vale',
    description: 'Prose linter for technical writing - enforces style guides',
    category: 'documentation',
    docker: 'jdkato/vale:latest',
    filePatterns: ['**/*.md', '**/*.txt', '**/*.rst'],
    credits: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // Wave 6: January 2026 Expansion Part 2 (9 tools)
  // ═══════════════════════════════════════════════════════════════

  // --- npm Tools ---
  {
    id: 'html-validate',
    name: 'html-validate',
    description: 'Offline HTML validator with extensive rule set',
    category: 'quality',
    npm: 'html-validate',
    languages: ['html'],
    filePatterns: ['**/*.html', '**/*.htm'],
    credits: 0,
  },
  {
    id: 'textlint',
    name: 'textlint',
    description: 'Pluggable natural language linter for text and markdown',
    category: 'documentation',
    npm: 'textlint',
    filePatterns: ['**/*.md', '**/*.txt'],
    credits: 0,
  },
  {
    id: 'npm-check-updates',
    name: 'npm-check-updates',
    description: 'Find outdated, incorrect, and unused dependencies',
    category: 'dependencies',
    npm: 'npm-check-updates',
    filePatterns: ['**/package.json'],
    credits: 0,
  },

  // --- Docker Tools ---
  {
    id: 'yamllint',
    name: 'yamllint',
    description: 'Linter for YAML files (syntax, formatting, best practices)',
    category: 'quality',
    docker: 'cytopia/yamllint:latest',
    filePatterns: ['**/*.yaml', '**/*.yml'],
    credits: 0,
  },
  {
    id: 'bearer',
    name: 'Bearer',
    description: 'Data privacy scanner - finds PII exposure and sensitive data flows',
    category: 'security',
    docker: 'bearer/bearer:latest',
    credits: 2,
  },
  {
    id: 'pylint',
    name: 'Pylint',
    description: 'Comprehensive Python static code analyzer',
    category: 'quality',
    docker: 'python:3.12-slim',
    languages: ['python'],
    filePatterns: ['**/*.py'],
    credits: 1,
  },
  {
    id: 'dart-analyze',
    name: 'Dart Analyzer',
    description: 'Static analysis for Dart and Flutter projects',
    category: 'quality',
    docker: 'dart:stable',
    languages: ['dart'],
    filePatterns: ['**/*.dart'],
    credits: 1,
  },
  {
    id: 'ktlint',
    name: 'ktlint',
    description: 'Kotlin linter with built-in formatter',
    category: 'quality',
    docker: 'pinterest/ktlint:latest',
    languages: ['kotlin'],
    filePatterns: ['**/*.kt', '**/*.kts'],
    credits: 1,
  },
  {
    id: 'prowler',
    name: 'Prowler',
    description: 'AWS security best practices assessment and auditing',
    category: 'cloud-native',
    docker: 'prowler/prowler:latest',
    credits: 3,
  },

  // ═══════════════════════════════════════════════════════════════
  // Wave 7: January 2026 Expansion Part 3 (12 tools)
  // ═══════════════════════════════════════════════════════════════

  // --- npm Tools (4) ---
  {
    id: 'lockfile-lint',
    name: 'lockfile-lint',
    description: 'Lint npm/yarn lockfiles for security policies and trusted sources',
    category: 'dependencies',
    npm: 'lockfile-lint',
    filePatterns: ['**/package-lock.json', '**/yarn.lock'],
    credits: 0,
  },
  {
    id: 'audit-ci',
    name: 'audit-ci',
    description: 'CI-friendly npm/yarn audit with configurable severity thresholds',
    category: 'dependencies',
    npm: 'audit-ci',
    filePatterns: ['**/package.json', '**/package-lock.json'],
    credits: 0,
  },
  {
    id: 'webhint',
    name: 'webhint',
    description: 'Web best practices linter for performance, accessibility, and security',
    category: 'quality',
    npm: 'hint',
    languages: ['html', 'css', 'javascript'],
    filePatterns: ['**/*.html'],
    credits: 1,
  },
  {
    id: 'accessibility-checker',
    name: 'Accessibility Checker',
    description: 'IBM Equal Access automated accessibility testing',
    category: 'accessibility',
    npm: 'accessibility-checker',
    languages: ['html'],
    filePatterns: ['**/*.html'],
    credits: 1,
  },

  // --- Docker Tools (8) ---
  {
    id: 'clair',
    name: 'Clair',
    description: 'Static analysis for container vulnerabilities (CoreOS/Quay)',
    category: 'security',
    docker: 'quay.io/projectquay/clair:latest',
    credits: 2,
  },
  {
    id: 'falco',
    name: 'Falco',
    description: 'Cloud-native runtime security and threat detection (CNCF)',
    category: 'security',
    docker: 'falcosecurity/falco:latest',
    credits: 3,
  },
  {
    id: 'slither',
    name: 'Slither',
    description: 'Solidity smart contract static analyzer (Trail of Bits)',
    category: 'security',
    docker: 'trailofbits/slither:latest',
    languages: ['solidity'],
    filePatterns: ['**/*.sol'],
    credits: 2,
  },
  {
    id: 'error-prone',
    name: 'Error Prone',
    description: 'Java compile-time bug detection (Google)',
    category: 'quality',
    docker: 'maven:3.9-eclipse-temurin-21',
    languages: ['java'],
    filePatterns: ['**/*.java'],
    credits: 2,
  },
  {
    id: 'credo',
    name: 'Credo',
    description: 'Static code analysis for Elixir with focus on consistency',
    category: 'quality',
    docker: 'elixir:1.16-slim',
    languages: ['elixir'],
    filePatterns: ['**/*.ex', '**/*.exs'],
    credits: 1,
  },
  {
    id: 'steampipe',
    name: 'Steampipe',
    description: 'SQL-based cloud infrastructure queries and compliance checks',
    category: 'cloud-native',
    docker: 'turbot/steampipe:latest',
    credits: 2,
  },
  {
    id: 'sonar-scanner',
    name: 'SonarScanner',
    description: 'Multi-language code quality and security scanner (SonarQube)',
    category: 'quality',
    docker: 'sonarsource/sonar-scanner-cli:latest',
    languages: ['javascript', 'typescript', 'python', 'java', 'go', 'php', 'ruby'],
    credits: 2,
  },
  {
    id: 'infer',
    name: 'Infer',
    description: 'Static analysis for C, C++, Java, and Objective-C (Meta)',
    category: 'security',
    docker: 'facebook/infer:latest',
    languages: ['c', 'cpp', 'java', 'objective-c'],
    filePatterns: ['**/*.c', '**/*.cpp', '**/*.java', '**/*.m'],
    credits: 2,
  },

  // ═══════════════════════════════════════════════════════════════
  // Wave 8: January 2026 Expansion Part 4 (15 tools)
  // ═══════════════════════════════════════════════════════════════

  // --- npm Tools (4) ---
  {
    id: 'pyright',
    name: 'Pyright',
    description: 'Fast Python type checker with full type inference (Microsoft)',
    category: 'quality',
    npm: 'pyright',
    languages: ['python'],
    filePatterns: ['**/*.py'],
    credits: 1,
  },
  {
    id: 'nbqa',
    name: 'nbqa',
    description: 'Run any Python linter or formatter on Jupyter notebooks',
    category: 'quality',
    npm: 'nbqa',
    filePatterns: ['**/*.ipynb'],
    credits: 1,
  },
  {
    id: 'eslint-plugin-vue',
    name: 'eslint-plugin-vue',
    description: 'Official ESLint plugin for Vue.js with 100+ rules',
    category: 'quality',
    npm: 'eslint-plugin-vue',
    languages: ['vue', 'javascript'],
    filePatterns: ['**/*.vue'],
    credits: 0,
  },
  {
    id: 'eslint-plugin-react',
    name: 'eslint-plugin-react',
    description: 'React-specific linting rules for ESLint',
    category: 'quality',
    npm: 'eslint-plugin-react',
    languages: ['javascript', 'typescript', 'jsx', 'tsx'],
    filePatterns: ['**/*.jsx', '**/*.tsx'],
    credits: 0,
  },

  // --- Docker Tools (11) ---
  {
    id: 'scalafmt',
    name: 'scalafmt',
    description: 'Code formatter for Scala with configurable style',
    category: 'quality',
    docker: 'scalameta/scalafmt:latest',
    languages: ['scala'],
    filePatterns: ['**/*.scala', '**/*.sbt'],
    credits: 1,
  },
  {
    id: 'scalafix',
    name: 'Scalafix',
    description: 'Refactoring and linting tool for Scala',
    category: 'quality',
    docker: 'scalacenter/scalafix:latest',
    languages: ['scala'],
    filePatterns: ['**/*.scala'],
    credits: 1,
  },
  {
    id: 'hlint',
    name: 'HLint',
    description: 'Haskell source code suggestions and linting',
    category: 'quality',
    docker: 'haskell:9.6-slim',
    languages: ['haskell'],
    filePatterns: ['**/*.hs', '**/*.lhs'],
    credits: 1,
  },
  {
    id: 'buf',
    name: 'Buf',
    description: 'Protocol Buffers linting and breaking change detection',
    category: 'quality',
    docker: 'bufbuild/buf:latest',
    filePatterns: ['**/*.proto'],
    credits: 1,
  },
  {
    id: 'angular-eslint',
    name: 'angular-eslint',
    description: 'Angular-specific linting rules and best practices',
    category: 'quality',
    docker: 'node:20-slim',
    languages: ['typescript', 'angular'],
    filePatterns: ['**/*.component.ts', '**/*.module.ts'],
    credits: 1,
  },
  {
    id: 'scancode-toolkit',
    name: 'ScanCode Toolkit',
    description: 'Scan code for licenses, copyrights, and dependencies',
    category: 'dependencies',
    docker: 'ghcr.io/nexb/scancode-toolkit:latest',
    credits: 2,
  },
  {
    id: 'licensee',
    name: 'Licensee',
    description: 'Detect open source licenses from LICENSE files (GitHub)',
    category: 'dependencies',
    docker: 'ruby:3.2-slim',
    filePatterns: ['**/LICENSE*', '**/COPYING*'],
    credits: 1,
  },
  {
    id: 'cosign',
    name: 'Cosign',
    description: 'Container image signing and verification (Sigstore)',
    category: 'security',
    docker: 'gcr.io/projectsigstore/cosign:latest',
    credits: 2,
  },
  {
    id: 'safety',
    name: 'Safety',
    description: 'Python dependency vulnerability scanner',
    category: 'dependencies',
    docker: 'python:3.12-slim',
    languages: ['python'],
    filePatterns: ['**/requirements*.txt', '**/Pipfile', '**/pyproject.toml'],
    credits: 1,
  },
  {
    id: 'sqlcheck',
    name: 'sqlcheck',
    description: 'Automatically detect SQL anti-patterns',
    category: 'quality',
    docker: 'aaronmorgenegg/sqlcheck:latest',
    languages: ['sql'],
    filePatterns: ['**/*.sql'],
    credits: 1,
  },
  {
    id: 'pgformatter',
    name: 'pgFormatter',
    description: 'PostgreSQL SQL syntax beautifier and formatter',
    category: 'quality',
    docker: 'darold/pgformatter:latest',
    languages: ['sql'],
    filePatterns: ['**/*.sql'],
    credits: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // SBOM & Release Analysis (2 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'sbom-generator',
    name: 'SBOM Generator',
    description: 'Generate CycloneDX Software Bill of Materials and analyze components for license compliance, missing metadata, and supply chain risks',
    category: 'dependencies',
    npm: '@cyclonedx/cdxgen',
    filePatterns: ['**/package.json', '**/package-lock.json', '**/yarn.lock', '**/requirements*.txt', '**/go.mod', '**/Cargo.toml', '**/pom.xml'],
    credits: 2,
  },
  {
    id: 'release-risk-analyzer',
    name: 'Release Risk Analyzer',
    description: 'Analyze git changes between releases to identify high-risk patterns including auth modifications, test deletions, large diffs, and infrastructure changes',
    category: 'quality',
    languages: ['javascript', 'typescript', 'python', 'go', 'java', 'ruby', 'php', 'rust'],
    credits: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // API TESTING (4 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'openapi-diff',
    name: 'OpenAPI Diff',
    description: 'Detect breaking and non-breaking changes between OpenAPI specifications',
    category: 'api-security',
    npm: 'openapi-diff',
    filePatterns: ['**/openapi.{json,yaml,yml}', '**/swagger.{json,yaml,yml}'],
    credits: 1,
  },
  {
    id: 'graphql-inspector',
    name: 'GraphQL Inspector',
    description: 'Detect breaking changes, validate coverage, and audit GraphQL schemas',
    category: 'api-security',
    npm: '@graphql-inspector/cli',
    filePatterns: ['**/*.graphql', '**/*.gql', '**/schema.json'],
    languages: ['graphql', 'typescript'],
    credits: 1,
  },
  {
    id: 'newman',
    name: 'Newman',
    description: 'Command-line collection runner for Postman API tests',
    category: 'api-security',
    npm: 'newman',
    filePatterns: ['**/*.postman_collection.json', '**/*.postman_environment.json'],
    credits: 2,
  },
  {
    id: 'pact',
    name: 'Pact',
    description: 'Contract testing for microservices integration verification',
    category: 'api-security',
    npm: '@pact-foundation/pact',
    languages: ['javascript', 'typescript'],
    credits: 2,
  },

  // ═══════════════════════════════════════════════════════════════
  // QUALITY - Analysis, Complexity & Coverage (7 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'sonarqube',
    name: 'SonarQube',
    description: 'Continuous code quality inspection with deep analysis for bugs, vulnerabilities, and code smells',
    category: 'quality',
    docker: 'sonarqube:lts-community',
    languages: ['javascript', 'typescript', 'python', 'java', 'php', 'csharp', 'go'],
    credits: 3,
  },
  {
    id: 'htmlhint',
    name: 'HTMLHint',
    description: 'Static code analysis tool for HTML',
    category: 'quality',
    npm: 'htmlhint',
    filePatterns: ['**/*.html', '**/*.htm'],
    languages: ['html'],
    credits: 0,
  },
  {
    id: 'lizard',
    name: 'Lizard',
    description: 'Code complexity analyzer with cyclomatic complexity metrics across multiple languages',
    category: 'quality',
    docker: 'lizard:latest',
    languages: ['javascript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust'],
    credits: 1,
  },
  {
    id: 'ts-prune',
    name: 'ts-prune',
    description: 'Find unused exports in TypeScript projects to identify dead code',
    category: 'quality',
    npm: 'ts-prune',
    filePatterns: ['**/*.ts', '**/*.tsx'],
    languages: ['typescript'],
    credits: 0,
  },
  {
    id: 'bundle-analyzer',
    name: 'Bundle Analyzer',
    description: 'Analyze webpack bundle size and composition to identify bloat',
    category: 'quality',
    npm: 'webpack-bundle-analyzer',
    filePatterns: ['**/webpack.config.*', '**/stats.json'],
    languages: ['javascript', 'typescript'],
    credits: 1,
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    description: 'JavaScript code coverage instrumentation and reporting with ES6+ support',
    category: 'quality',
    npm: 'nyc',
    filePatterns: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
    languages: ['javascript', 'typescript'],
    credits: 2,
  },
  {
    id: 'stryker',
    name: 'Stryker',
    description: 'Mutation testing framework to measure test suite quality by injecting faults',
    category: 'quality',
    npm: '@stryker-mutator/core',
    filePatterns: ['**/stryker.conf.*', '**/*.test.*', '**/*.spec.*'],
    languages: ['javascript', 'typescript'],
    credits: 3,
  },

  // ═══════════════════════════════════════════════════════════════
  // VISUAL TESTING (3 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'backstop',
    name: 'BackstopJS',
    description: 'Visual regression testing with automated screenshot comparison',
    category: 'quality',
    npm: 'backstopjs',
    filePatterns: ['**/backstop.json', '**/backstop_data/**'],
    credits: 2,
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Headless browser automation for visual testing and screenshot capture',
    category: 'quality',
    npm: 'puppeteer',
    languages: ['javascript', 'typescript'],
    credits: 1,
  },
  {
    id: 'storybook',
    name: 'Storybook',
    description: 'UI component development environment with visual regression testing support',
    category: 'quality',
    npm: 'storybook',
    filePatterns: ['.storybook/**', '**/*.stories.*'],
    languages: ['javascript', 'typescript'],
    credits: 2,
  },

  // ═══════════════════════════════════════════════════════════════
  // SECURITY - Secret Scanning (2 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'git-secrets',
    name: 'git-secrets',
    description: 'Prevent committing secrets and credentials into git repositories',
    category: 'security',
    credits: 0,
  },
  {
    id: 'detect-secrets',
    name: 'detect-secrets',
    description: 'Enterprise-friendly detection of secrets in code to prevent leaks into the codebase',
    category: 'security',
    docker: 'yelp/detect-secrets:latest',
    credits: 1,
  },
  {
    id: 'retirejs',
    name: 'Retire.js',
    description: 'Detect use of JavaScript libraries with known vulnerabilities',
    category: 'security',
    npm: 'retire',
    filePatterns: ['**/package.json', '**/*.js', '**/*.html'],
    languages: ['javascript'],
    credits: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTATION (1 tool)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'write-good',
    name: 'write-good',
    description: 'Naive linter for English prose that catches passive voice, weasel words, and other issues',
    category: 'documentation',
    npm: 'write-good',
    filePatterns: ['**/*.md', '**/*.txt', '**/*.mdx'],
    credits: 0,
  },

  // ═══════════════════════════════════════════════════════════════
  // DEPENDENCIES - License (1 tool)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'scancode',
    name: 'ScanCode Toolkit',
    description: 'Scan code for licenses, copyrights, and dependencies with high accuracy',
    category: 'dependencies',
    docker: 'ghcr.io/nexb/scancode-toolkit:latest',
    credits: 2,
  },

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE - Load Testing (5 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'artillery',
    name: 'Artillery',
    description: 'Modern load testing toolkit for APIs, microservices, and web apps',
    category: 'performance',
    npm: 'artillery',
    filePatterns: ['**/artillery.yml', '**/*.artillery.yml'],
    languages: ['yaml', 'javascript'],
    credits: 2,
  },
  {
    id: 'jmeter',
    name: 'Apache JMeter',
    description: 'Load testing and performance measurement for web applications',
    category: 'performance',
    docker: 'justb4/jmeter:latest',
    filePatterns: ['**/*.jmx'],
    credits: 2,
  },
  {
    id: 'k6',
    name: 'k6',
    description: 'Modern load testing tool with JavaScript scripting for developers',
    category: 'performance',
    docker: 'grafana/k6:latest',
    filePatterns: ['**/k6/**', '**/*.k6.js'],
    languages: ['javascript'],
    credits: 2,
  },
  {
    id: 'locust',
    name: 'Locust',
    description: 'Scalable user load testing tool written in Python',
    category: 'performance',
    docker: 'locustio/locust:latest',
    filePatterns: ['**/locustfile.py'],
    languages: ['python'],
    credits: 2,
  },
  {
    id: 'webpagetest',
    name: 'WebPageTest',
    description: 'Web performance testing with real browsers and network conditions',
    category: 'performance',
    docker: 'webpagetest/server:latest',
    credits: 3,
  },

  // ═══════════════════════════════════════════════════════════════
  // CLOUD-NATIVE (3 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'kubebench',
    name: 'kube-bench (CIS)',
    description: 'Check Kubernetes clusters against CIS Benchmark security recommendations',
    category: 'cloud-native',
    docker: 'aquasec/kube-bench:latest',
    filePatterns: ['**/*.yaml', '**/*.yml'],
    credits: 1,
  },
  {
    id: 'litmus',
    name: 'LitmusChaos',
    description: 'Cloud-native chaos engineering framework for Kubernetes resilience testing',
    category: 'cloud-native',
    docker: 'litmuschaos/litmusctl:latest',
    filePatterns: ['**/experiments/**', '**/*.yaml'],
    credits: 3,
  },
  {
    id: 'schemaspy',
    name: 'SchemaSpy',
    description: 'Database documentation generator that analyzes schema metadata and relationships',
    category: 'cloud-native',
    docker: 'schemaspy/schemaspy:latest',
    filePatterns: ['**/schema.sql', '**/migrations/**', '**/schema.prisma'],
    credits: 2,
  },

  // ═══════════════════════════════════════════════════════════════
  // OBSERVABILITY (2 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'opentelemetry',
    name: 'OpenTelemetry',
    description: 'Distributed tracing and metrics analysis for application observability',
    category: 'quality',
    npm: '@opentelemetry/sdk-node',
    credits: 1,
  },
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Application monitoring and error tracking for production systems',
    category: 'quality',
    npm: '@sentry/node',
    credits: 1,
  },

  // ═══════════════════════════════════════════════════════════════
  // AI ANALYSIS (3 modules)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'environment-profiles',
    name: 'Environment Profiles',
    description: 'AI-powered environment-specific tool configuration and optimization profiles',
    category: 'quality',
    credits: 1,
  },
  {
    id: 'finding-intelligence',
    name: 'Finding Intelligence',
    description: 'AI-powered finding correlation, deduplication, and prioritization across tools',
    category: 'quality',
    credits: 1,
  },
  {
    id: 'report-generator',
    name: 'AI Report Generator',
    description: 'AI-powered aggregated report generation with executive summaries and fix recommendations',
    category: 'quality',
    credits: 2,
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTAINER SECURITY (3 tools) - Binary tools included in Docker
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'hadolint',
    name: 'Hadolint',
    description: 'Dockerfile linter with best practice rules',
    category: 'container',
    npm: 'hadolint',  // Binary tool, npm is placeholder
    filePatterns: ['**/Dockerfile', '**/Dockerfile.*', '**/*.dockerfile'],
  },
  {
    id: 'dockle',
    name: 'Dockle',
    description: 'Container image linter for security best practices',
    category: 'container',
    npm: 'dockle',  // Binary tool, npm is placeholder
    filePatterns: ['**/Dockerfile'],
  },
  {
    id: 'gitleaks',
    name: 'Gitleaks',
    description: 'Detect hardcoded secrets and credentials in git repos',
    category: 'security',
    npm: 'gitleaks',  // Binary tool, npm is placeholder
    filePatterns: ['**/*'],
  },

  // ═══════════════════════════════════════════════════════════════
  // SBOM & SUPPLY CHAIN (1 tool)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'syft',
    name: 'Syft',
    description: 'Generate Software Bill of Materials (SBOM) for supply chain security',
    category: 'sbom',
    npm: 'syft',  // Binary tool, npm is placeholder
    filePatterns: ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
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

export const TOOL_COUNT = TOOL_REGISTRY.length;

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
  container: 'Container Security',
  sbom: 'SBOM & Supply Chain',
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
  container: '🐳',
  sbom: '📋',
};
