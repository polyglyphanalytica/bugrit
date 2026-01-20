// Environment Profiles - QA vs Production Tool Recommendations
// Defines which tools to run in different environments based on practicality

import { ToolCategory } from '../types';

export type Environment = 'development' | 'qa' | 'staging' | 'production' | 'ci';

export interface ToolProfile {
  name: string;
  category: ToolCategory;
  /** Environments where this tool should run */
  environments: Environment[];
  /** Execution time: fast (<30s), medium (<5min), slow (>5min) */
  speed: 'fast' | 'medium' | 'slow';
  /** Resource intensity */
  resources: 'low' | 'medium' | 'high';
  /** Can it run without network access */
  offline: boolean;
  /** Does it need the full application running */
  requiresRunningApp: boolean;
  /** Priority in this environment (1=highest) */
  priority: number;
  /** Rationale for environment selection */
  rationale: string;
}

// Tool profiles organized by practicality for each environment
export const TOOL_PROFILES: ToolProfile[] = [
  // ===========================================
  // CODE QUALITY - Run everywhere, fast feedback
  // ===========================================
  {
    name: 'ESLint',
    category: 'code-quality',
    environments: ['development', 'qa', 'staging', 'production', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 1,
    rationale: 'Essential linting, runs fast, catches issues early',
  },
  {
    name: 'Prettier',
    category: 'code-quality',
    environments: ['development', 'qa', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 2,
    rationale: 'Formatting checks, not critical for production',
  },
  {
    name: 'Biome',
    category: 'code-quality',
    environments: ['development', 'qa', 'staging', 'production', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 1,
    rationale: 'Fast alternative to ESLint+Prettier combo',
  },
  {
    name: 'Stylelint',
    category: 'code-quality',
    environments: ['development', 'qa', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 3,
    rationale: 'CSS linting, important for UI consistency',
  },

  // ===========================================
  // SECURITY - Critical for production
  // ===========================================
  {
    name: 'Semgrep',
    category: 'security',
    environments: ['qa', 'staging', 'production', 'ci'],
    speed: 'medium',
    resources: 'medium',
    offline: true,
    requiresRunningApp: false,
    priority: 1,
    rationale: 'Essential SAST, catches security bugs in code',
  },
  {
    name: 'Trivy',
    category: 'security',
    environments: ['qa', 'staging', 'production', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: false,
    requiresRunningApp: false,
    priority: 1,
    rationale: 'Container and dependency scanning, critical for production',
  },
  {
    name: 'Gitleaks',
    category: 'security',
    environments: ['development', 'qa', 'staging', 'production', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 1,
    rationale: 'Secret detection - must run everywhere to prevent leaks',
  },
  {
    name: 'npm audit',
    category: 'security',
    environments: ['qa', 'staging', 'production', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: false,
    requiresRunningApp: false,
    priority: 2,
    rationale: 'Dependency vulnerabilities, quick and essential',
  },
  {
    name: 'OWASP ZAP',
    category: 'security',
    environments: ['qa', 'staging'],
    speed: 'slow',
    resources: 'high',
    offline: false,
    requiresRunningApp: true,
    priority: 2,
    rationale: 'DAST scanning - needs running app, too slow for every deploy',
  },
  {
    name: 'Nuclei',
    category: 'security',
    environments: ['qa', 'staging'],
    speed: 'medium',
    resources: 'medium',
    offline: false,
    requiresRunningApp: true,
    priority: 2,
    rationale: 'Vulnerability scanning, run against staging not prod traffic',
  },
  {
    name: 'Checkov',
    category: 'security',
    environments: ['qa', 'staging', 'production', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 1,
    rationale: 'IaC security - must catch misconfigs before deploy',
  },
  {
    name: 'Bandit',
    category: 'security',
    environments: ['qa', 'staging', 'production', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 2,
    rationale: 'Python security - fast and essential for Python projects',
  },
  {
    name: 'gosec',
    category: 'security',
    environments: ['qa', 'staging', 'production', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 2,
    rationale: 'Go security - fast and essential for Go projects',
  },

  // ===========================================
  // ACCESSIBILITY - Important for QA, sample for prod
  // ===========================================
  {
    name: 'axe-core',
    category: 'accessibility',
    environments: ['development', 'qa', 'staging', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: true,
    priority: 1,
    rationale: 'Fast a11y checks, can run in browser tests',
  },
  {
    name: 'Lighthouse',
    category: 'accessibility',
    environments: ['qa', 'staging'],
    speed: 'medium',
    resources: 'medium',
    offline: false,
    requiresRunningApp: true,
    priority: 2,
    rationale: 'Comprehensive audits, too slow for every build',
  },
  {
    name: 'Pa11y',
    category: 'accessibility',
    environments: ['qa', 'staging', 'ci'],
    speed: 'medium',
    resources: 'medium',
    offline: false,
    requiresRunningApp: true,
    priority: 2,
    rationale: 'Automated a11y testing for CI pipelines',
  },

  // ===========================================
  // PERFORMANCE - Run in staging, sample prod
  // ===========================================
  {
    name: 'Lighthouse',
    category: 'performance',
    environments: ['qa', 'staging'],
    speed: 'medium',
    resources: 'medium',
    offline: false,
    requiresRunningApp: true,
    priority: 1,
    rationale: 'Performance audits for web vitals',
  },
  {
    name: 'k6',
    category: 'performance',
    environments: ['qa', 'staging'],
    speed: 'slow',
    resources: 'high',
    offline: false,
    requiresRunningApp: true,
    priority: 2,
    rationale: 'Load testing - run against staging, not prod',
  },
  {
    name: 'Artillery',
    category: 'performance',
    environments: ['qa', 'staging'],
    speed: 'slow',
    resources: 'high',
    offline: false,
    requiresRunningApp: true,
    priority: 3,
    rationale: 'Load testing alternative to k6',
  },
  {
    name: 'Bundle Analyzer',
    category: 'performance',
    environments: ['qa', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 2,
    rationale: 'Catch bundle size regressions in CI',
  },

  // ===========================================
  // API TESTING - QA focused
  // ===========================================
  {
    name: 'Newman',
    category: 'api-testing',
    environments: ['qa', 'staging', 'ci'],
    speed: 'medium',
    resources: 'low',
    offline: false,
    requiresRunningApp: true,
    priority: 1,
    rationale: 'API contract testing in CI/QA',
  },
  {
    name: 'Spectral',
    category: 'api-testing',
    environments: ['development', 'qa', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 1,
    rationale: 'OpenAPI linting, fast and essential',
  },
  {
    name: 'Pact',
    category: 'api-testing',
    environments: ['qa', 'staging', 'ci'],
    speed: 'medium',
    resources: 'medium',
    offline: false,
    requiresRunningApp: true,
    priority: 2,
    rationale: 'Contract testing between services',
  },

  // ===========================================
  // COVERAGE & MUTATION - QA focused
  // ===========================================
  {
    name: 'Istanbul',
    category: 'coverage',
    environments: ['qa', 'ci'],
    speed: 'medium',
    resources: 'medium',
    offline: true,
    requiresRunningApp: false,
    priority: 1,
    rationale: 'Code coverage, essential for QA',
  },
  {
    name: 'Stryker',
    category: 'coverage',
    environments: ['qa'],
    speed: 'slow',
    resources: 'high',
    offline: true,
    requiresRunningApp: false,
    priority: 3,
    rationale: 'Mutation testing - slow but valuable for QA',
  },

  // ===========================================
  // DOCUMENTATION - Development focused
  // ===========================================
  {
    name: 'Vale',
    category: 'code-quality',
    environments: ['development', 'qa', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 3,
    rationale: 'Prose linting for docs',
  },
  {
    name: 'cspell',
    category: 'code-quality',
    environments: ['development', 'qa', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 4,
    rationale: 'Spell checking code and docs',
  },

  // ===========================================
  // DATABASE - Development and QA
  // ===========================================
  {
    name: 'SQLFluff',
    category: 'code-quality',
    environments: ['development', 'qa', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 2,
    rationale: 'SQL linting, catches issues early',
  },

  // ===========================================
  // COMPLEXITY - Development focused
  // ===========================================
  {
    name: 'knip',
    category: 'code-quality',
    environments: ['development', 'qa', 'ci'],
    speed: 'fast',
    resources: 'low',
    offline: true,
    requiresRunningApp: false,
    priority: 2,
    rationale: 'Find unused code and dependencies',
  },
];

/**
 * Get recommended tools for an environment
 */
export function getToolsForEnvironment(environment: Environment): ToolProfile[] {
  return TOOL_PROFILES
    .filter(p => p.environments.includes(environment))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get the recommended production profile (minimal, fast, critical)
 */
export function getProductionProfile(): ToolProfile[] {
  return TOOL_PROFILES
    .filter(p => p.environments.includes('production'))
    .filter(p => p.speed === 'fast' || p.priority === 1)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get the recommended QA profile (comprehensive)
 */
export function getQAProfile(): ToolProfile[] {
  return TOOL_PROFILES
    .filter(p => p.environments.includes('qa'))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get the CI profile (fast, no running app required)
 */
export function getCIProfile(): ToolProfile[] {
  return TOOL_PROFILES
    .filter(p => p.environments.includes('ci'))
    .filter(p => !p.requiresRunningApp)
    .filter(p => p.speed === 'fast' || p.speed === 'medium')
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Generate environment recommendations report
 */
export function generateEnvironmentReport(): string {
  const lines: string[] = [];

  lines.push('# Tool Environment Recommendations');
  lines.push('');
  lines.push('## Production Environment');
  lines.push('');
  lines.push('**Goal:** Fast, critical security checks only. Do not slow down deployments.');
  lines.push('');
  lines.push('| Tool | Category | Speed | Rationale |');
  lines.push('|------|----------|-------|-----------|');
  getProductionProfile().forEach(p => {
    lines.push(`| ${p.name} | ${p.category} | ${p.speed} | ${p.rationale} |`);
  });
  lines.push('');
  lines.push('**Estimated Time:** < 2 minutes');
  lines.push('');

  lines.push('## QA Environment');
  lines.push('');
  lines.push('**Goal:** Comprehensive testing. Acceptable to take longer.');
  lines.push('');
  lines.push('| Tool | Category | Speed | Rationale |');
  lines.push('|------|----------|-------|-----------|');
  getQAProfile().forEach(p => {
    lines.push(`| ${p.name} | ${p.category} | ${p.speed} | ${p.rationale} |`);
  });
  lines.push('');
  lines.push('**Estimated Time:** 10-30 minutes');
  lines.push('');

  lines.push('## CI Environment');
  lines.push('');
  lines.push('**Goal:** Fast feedback on every commit. No running app required.');
  lines.push('');
  lines.push('| Tool | Category | Speed | Rationale |');
  lines.push('|------|----------|-------|-----------|');
  getCIProfile().forEach(p => {
    lines.push(`| ${p.name} | ${p.category} | ${p.speed} | ${p.rationale} |`);
  });
  lines.push('');
  lines.push('**Estimated Time:** < 5 minutes');
  lines.push('');

  lines.push('## Summary by Category');
  lines.push('');
  lines.push('| Category | Production | QA | CI |');
  lines.push('|----------|------------|----|----|');

  const categories = [...new Set(TOOL_PROFILES.map(p => p.category))];
  categories.forEach(cat => {
    const prod = TOOL_PROFILES.filter(p => p.category === cat && p.environments.includes('production')).length;
    const qa = TOOL_PROFILES.filter(p => p.category === cat && p.environments.includes('qa')).length;
    const ci = TOOL_PROFILES.filter(p => p.category === cat && p.environments.includes('ci')).length;
    lines.push(`| ${cat} | ${prod} tools | ${qa} tools | ${ci} tools |`);
  });

  return lines.join('\n');
}
