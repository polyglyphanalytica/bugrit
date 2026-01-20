// Runtime Environment Detection and Adaptation
// Automatically selects the appropriate execution method based on environment

export type RuntimeEnvironment = 'firebase' | 'cloud-run' | 'docker' | 'local';

export interface RuntimeConfig {
  environment: RuntimeEnvironment;
  cloudRunUrl?: string;
  useNpmPackages: boolean;
  availableSystemTools: string[];
}

let cachedConfig: RuntimeConfig | null = null;

/**
 * Detect the current runtime environment
 */
export function detectEnvironment(): RuntimeEnvironment {
  // Firebase Functions
  if (process.env.FIREBASE_CONFIG || process.env.GCLOUD_PROJECT) {
    if (process.env.K_SERVICE) {
      return 'cloud-run'; // Cloud Run (including Cloud Functions gen2)
    }
    return 'firebase';
  }

  // Cloud Run
  if (process.env.K_SERVICE || process.env.K_REVISION) {
    return 'cloud-run';
  }

  // Docker
  if (process.env.DOCKER_CONTAINER === 'true' ||
      (typeof window === 'undefined' && require('fs').existsSync('/.dockerenv'))) {
    return 'docker';
  }

  return 'local';
}

/**
 * Get runtime configuration
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const environment = detectEnvironment();

  cachedConfig = {
    environment,
    cloudRunUrl: process.env.AUDIT_TOOLS_CLOUD_RUN_URL,
    useNpmPackages: environment === 'firebase' || environment === 'cloud-run',
    availableSystemTools: [],
  };

  return cachedConfig;
}

/**
 * Check if we should use npm package or system binary
 */
export function shouldUseNpmPackage(): boolean {
  return getRuntimeConfig().useNpmPackages;
}

/**
 * Get Cloud Run URL for binary tools
 */
export function getCloudRunUrl(): string | undefined {
  return getRuntimeConfig().cloudRunUrl;
}

// Tool categories by execution method
export const NPM_BASED_TOOLS = [
  'eslint',
  'prettier',
  'stylelint',
  'htmlhint',
  'markdownlint',
  'commitlint',
  'biome',
  'axe-core',
  'istanbul',
  'stryker',
  'retire',
  'npm-audit',
  'depcheck',
  'bundle-analyzer',
  'graphql-inspector',
] as const;

export const BINARY_BASED_TOOLS = [
  'semgrep',
  'trivy',
  'owasp-zap',
  'dependency-check',
  'detect-secrets',
  'bandit',
  'gosec',
  'brakeman',
  'sonarqube',
  'codeclimate',
  'k6',
  'artillery',
  'jmeter',
  'locust',
  'lighthouse',
  'pa11y',
  'sitespeed',
  'webpagetest',
  'puppeteer',
  'backstop',
  'sentry',
  'opentelemetry',
  'litmus',
] as const;

export type NpmBasedTool = typeof NPM_BASED_TOOLS[number];
export type BinaryBasedTool = typeof BINARY_BASED_TOOLS[number];

/**
 * Check if a tool can run in the current environment
 */
export function canToolRun(toolName: string): { canRun: boolean; method: 'npm' | 'binary' | 'cloud-run' | 'unavailable' } {
  const config = getRuntimeConfig();
  const normalizedName = toolName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check if it's an npm-based tool
  const isNpmTool = NPM_BASED_TOOLS.some(t => normalizedName.includes(t.replace('-', '')));
  if (isNpmTool) {
    return { canRun: true, method: 'npm' };
  }

  // Binary-based tools
  if (config.environment === 'firebase') {
    // Firebase can only use Cloud Run for binary tools
    if (config.cloudRunUrl) {
      return { canRun: true, method: 'cloud-run' };
    }
    return { canRun: false, method: 'unavailable' };
  }

  if (config.environment === 'cloud-run' || config.environment === 'docker') {
    return { canRun: true, method: 'binary' };
  }

  // Local environment - check if binary exists
  return { canRun: true, method: 'binary' };
}
