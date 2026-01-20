/**
 * Pure JS Tool Registry
 *
 * All 26 tools run directly in Node.js - no binaries, no Cloud Run, no external APIs.
 * Just `firebase deploy` and everything works.
 */

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  npm: string;  // Primary npm package
  dependencies?: string[];  // Additional npm packages needed
  languages?: string[];  // Languages this tool supports
  filePatterns?: string[];  // File patterns this tool analyzes
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
  | 'container'
  | 'sbom';

export const TOOL_REGISTRY: ToolDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // LINTING & FORMATTING (4 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'eslint',
    name: 'ESLint',
    description: 'JavaScript/TypeScript linter with security and best practice rules',
    category: 'linting',
    npm: 'eslint',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
  },
  {
    id: 'biome',
    name: 'Biome',
    description: 'Fast linter and formatter for JS/TS/JSON',
    category: 'linting',
    npm: '@biomejs/biome',
    languages: ['javascript', 'typescript', 'json'],
    filePatterns: ['**/*.js', '**/*.ts', '**/*.json'],
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
  },
  {
    id: 'prettier',
    name: 'Prettier',
    description: 'Code formatter with diff detection',
    category: 'linting',
    npm: 'prettier',
    languages: ['javascript', 'typescript', 'css', 'json', 'markdown'],
    filePatterns: ['**/*.{js,ts,jsx,tsx,css,json,md}'],
  },

  // ═══════════════════════════════════════════════════════════════
  // SECURITY (4 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'eslint-security',
    name: 'ESLint Security Plugin',
    description: 'Security-focused ESLint rules (XSS, injection, etc.)',
    category: 'security',
    npm: 'eslint-plugin-security',
    dependencies: ['eslint'],
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.ts'],
  },
  {
    id: 'audit-ci',
    name: 'Audit CI',
    description: 'npm audit with configurable severity thresholds',
    category: 'security',
    npm: 'audit-ci',
    languages: ['javascript', 'typescript'],
    filePatterns: ['package.json', 'package-lock.json'],
  },
  {
    id: 'secretlint',
    name: 'Secretlint',
    description: 'Detect hardcoded secrets and credentials',
    category: 'security',
    npm: 'secretlint',
    dependencies: ['@secretlint/secretlint-rule-preset-recommend'],
    filePatterns: ['**/*'],
  },
  {
    id: 'lockfile-lint',
    name: 'Lockfile Lint',
    description: 'Validate package-lock.json for security issues',
    category: 'security',
    npm: 'lockfile-lint',
    filePatterns: ['package-lock.json', 'yarn.lock'],
  },

  // ═══════════════════════════════════════════════════════════════
  // DEPENDENCIES (5 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'npm-audit',
    name: 'npm Audit',
    description: 'Check for known vulnerabilities in dependencies',
    category: 'dependencies',
    npm: 'better-npm-audit',
    filePatterns: ['package.json', 'package-lock.json'],
  },
  {
    id: 'depcheck',
    name: 'Depcheck',
    description: 'Find unused and missing dependencies',
    category: 'dependencies',
    npm: 'depcheck',
    filePatterns: ['package.json'],
  },
  {
    id: 'license-checker',
    name: 'License Checker',
    description: 'Audit dependency licenses for compliance',
    category: 'dependencies',
    npm: 'license-checker',
    filePatterns: ['package.json'],
  },
  {
    id: 'madge',
    name: 'Madge',
    description: 'Detect circular dependencies',
    category: 'dependencies',
    npm: 'madge',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.ts'],
  },
  {
    id: 'dependency-cruiser',
    name: 'Dependency Cruiser',
    description: 'Validate and visualize dependencies',
    category: 'dependencies',
    npm: 'dependency-cruiser',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.ts'],
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
  },
  {
    id: 'pa11y',
    name: 'Pa11y',
    description: 'Automated accessibility testing',
    category: 'accessibility',
    npm: 'pa11y',
    filePatterns: ['**/*.html'],
  },

  // ═══════════════════════════════════════════════════════════════
  // CODE QUALITY (5 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'typescript',
    name: 'TypeScript',
    description: 'Type checking and compile errors',
    category: 'quality',
    npm: 'typescript',
    languages: ['typescript'],
    filePatterns: ['**/*.ts', '**/*.tsx'],
  },
  {
    id: 'knip',
    name: 'Knip',
    description: 'Find unused files, exports, and dependencies',
    category: 'quality',
    npm: 'knip',
    languages: ['javascript', 'typescript'],
    filePatterns: ['**/*.js', '**/*.ts'],
  },
  {
    id: 'jscpd',
    name: 'jscpd',
    description: 'Detect copy-paste code duplication',
    category: 'quality',
    npm: 'jscpd',
    languages: ['javascript', 'typescript', 'css'],
    filePatterns: ['**/*.{js,ts,jsx,tsx,css}'],
  },
  {
    id: 'cspell',
    name: 'cspell',
    description: 'Spell checker for code and comments',
    category: 'quality',
    npm: 'cspell',
    filePatterns: ['**/*'],
  },
  {
    id: 'publint',
    name: 'publint',
    description: 'Lint npm package for publishing issues',
    category: 'quality',
    npm: 'publint',
    filePatterns: ['package.json'],
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
  },
  {
    id: 'remark-lint',
    name: 'remark-lint',
    description: 'Pluggable markdown linter',
    category: 'documentation',
    npm: 'remark-cli',
    dependencies: ['remark-preset-lint-recommended'],
    filePatterns: ['**/*.md'],
  },
  {
    id: 'alex',
    name: 'alex',
    description: 'Catch insensitive, inconsiderate writing',
    category: 'documentation',
    npm: 'alex',
    filePatterns: ['**/*.md', '**/*.txt'],
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
    filePatterns: [],  // Operates on git history
  },

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE (2 tools)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    description: 'Performance, SEO, and best practices audit',
    category: 'performance',
    npm: 'lighthouse',
    dependencies: ['puppeteer'],
    filePatterns: [],  // Operates on URLs
  },
  {
    id: 'size-limit',
    name: 'size-limit',
    description: 'Bundle size monitoring with limits',
    category: 'performance',
    npm: 'size-limit',
    dependencies: ['@size-limit/preset-small-lib'],
    filePatterns: ['package.json'],
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
    packages.add(tool.npm);
    tool.dependencies?.forEach(dep => packages.add(dep));
  }
  return Array.from(packages);
}

export const TOOL_COUNT = TOOL_REGISTRY.length;  // 30

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  linting: 'Linting & Formatting',
  security: 'Security',
  dependencies: 'Dependencies',
  accessibility: 'Accessibility',
  quality: 'Code Quality',
  documentation: 'Documentation',
  git: 'Git & Commits',
  performance: 'Performance',
  container: 'Container Security',
  sbom: 'SBOM & Supply Chain',
};
