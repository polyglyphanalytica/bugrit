/**
 * Autofix System Types
 *
 * AI-powered code fix generation with multi-provider support (BYOK)
 * and GitHub push integration. Enterprise tier only.
 */

// ═══════════════════════════════════════════════════════════════
// AI Provider Types
// ═══════════════════════════════════════════════════════════════

export type AIProviderID =
  | 'claude'
  | 'gemini'
  | 'openai'
  | 'grok'
  | 'deepseek'
  | 'copilot';

/**
 * Auth methods for AI providers:
 * - api_key: Traditional API key (e.g., sk-ant-..., sk-proj-...)
 * - oauth_token: OAuth/CLI-derived token (e.g., from `gh auth token`,
 *   `gcloud auth print-access-token`, Copilot CLI, or any CLI that
 *   produces a Bearer token for the provider's API)
 *
 * Both are stored encrypted. The difference is how they're sent:
 * - api_key: Provider-specific header (x-api-key for Claude, query param for Gemini)
 * - oauth_token: Always sent as `Authorization: Bearer <token>`
 */
export type AuthMethod = 'api_key' | 'oauth_token';

export interface AIProviderConfig {
  id: AIProviderID;
  name: string;
  description: string;
  apiBaseUrl: string;
  defaultModel: string;
  models: string[];
  keyPlaceholder: string;
  docsUrl: string;
  /** Auth methods this provider supports */
  authMethods: AuthMethod[];
  /** Help text for how to get an OAuth token for this provider */
  oauthHint?: string;
}

export interface UserProviderSettings {
  providerId: AIProviderID;
  model: string;
  /** Encrypted API key / OAuth token reference (stored in keys collection) */
  keyId: string;
  /** How the credential authenticates — determines header format */
  authMethod: AuthMethod;
}

// ═══════════════════════════════════════════════════════════════
// BYOK Key Types
// ═══════════════════════════════════════════════════════════════

export interface StoredAPIKey {
  id: string;
  userId: string;
  providerId: AIProviderID;
  /** AES-256-GCM encrypted key/token value */
  encryptedKey: string;
  /** First 8 chars for display (e.g., "sk-proj-...") */
  keyPrefix: string;
  label: string;
  /** How this credential authenticates */
  authMethod: AuthMethod;
  createdAt: Date;
  lastUsedAt: Date | null;
}

// ═══════════════════════════════════════════════════════════════
// Autofix Settings (per-user)
// ═══════════════════════════════════════════════════════════════

export interface AutofixSettings {
  userId: string;
  enabled: boolean;
  /** When true, autofix runs automatically after every scan completes */
  autoRun: boolean;
  /** Which AI provider to use */
  provider: UserProviderSettings | null;
  /** GitHub settings */
  github: {
    /** Create PR automatically (vs just pushing branch) */
    createPR: boolean;
    /** Branch name prefix (default: "bugrit/autofix") */
    branchPrefix: string;
    /** Target only these severities */
    minSeverity: 'critical' | 'high' | 'medium' | 'low';
    /** Max findings to fix per run (cost control) */
    maxFindings: number;
  };
  updatedAt: Date;
}

export const DEFAULT_AUTOFIX_SETTINGS: Omit<AutofixSettings, 'userId'> = {
  enabled: false,
  autoRun: false,
  provider: null,
  github: {
    createPR: true,
    branchPrefix: 'bugrit/autofix',
    minSeverity: 'high',
    maxFindings: 25,
  },
  updatedAt: new Date(),
};

// ═══════════════════════════════════════════════════════════════
// Autofix Job Types
// ═══════════════════════════════════════════════════════════════

export type AutofixJobStatus =
  | 'queued'
  | 'fetching_code'
  | 'generating_fixes'
  | 'pushing_branch'
  | 'creating_pr'
  | 'completed'
  | 'failed';

export interface AutofixJob {
  id: string;
  userId: string;
  scanId: string;
  appId: string;
  status: AutofixJobStatus;
  provider: AIProviderID;
  model: string;

  /** GitHub repo info */
  repo: {
    owner: string;
    name: string;
    defaultBranch: string;
    fullName: string;
  };

  /** Progress tracking */
  progress: {
    totalFindings: number;
    fixedCount: number;
    skippedCount: number;
    failedCount: number;
    currentFinding?: string;
  };

  /** Result */
  result?: {
    branch: string;
    prUrl?: string;
    prNumber?: number;
    commitSha?: string;
    filesChanged: number;
    summary: string;
  };

  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// Fix Generation Types
// ═══════════════════════════════════════════════════════════════

export interface FindingForFix {
  id: string;
  tool: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  file?: string;
  line?: number;
  codeSnippet?: string;
  recommendation?: string;
}

export interface GeneratedFix {
  findingId: string;
  file: string;
  originalContent: string;
  fixedContent: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════
// Integration Generation Types
// ═══════════════════════════════════════════════════════════════

export type IntegrationTarget =
  | 'ci_cd'         // GitHub Actions / GitLab CI / Jenkins integration
  | 'pre_commit'    // Git pre-commit hook
  | 'api_client'    // API client library for Bugrit
  | 'webhook'       // Webhook handler for scan results
  | 'monitoring'    // Continuous monitoring setup
  | 'custom';       // Custom integration prompt

export interface IntegrationRequest {
  target: IntegrationTarget;
  /** User's app framework (e.g., 'nextjs', 'express', 'django', 'rails') */
  framework?: string;
  /** User's app language */
  language: string;
  /** Package manager (npm, pip, gem, etc.) */
  packageManager?: string;
  /** Bugrit project/app ID */
  appId: string;
  /** Repo info */
  repoOwner: string;
  repoName: string;
  /** Existing files in repo for context (path → content) */
  existingFiles?: Map<string, string>;
  /** Custom prompt for 'custom' target */
  customPrompt?: string;
}

export interface GeneratedIntegration {
  files: Array<{
    path: string;
    content: string;
    description: string;
  }>;
  instructions: string;
  explanation: string;
}

// ═══════════════════════════════════════════════════════════════
// Provider Catalog
// ═══════════════════════════════════════════════════════════════

export const AI_PROVIDERS: Record<AIProviderID, AIProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Advanced reasoning and code analysis',
    apiBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-5-20250929',
    models: ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001', 'claude-opus-4-6'],
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://docs.anthropic.com/en/docs/api-reference',
    authMethods: ['api_key', 'oauth_token'],
    oauthHint: 'Run: claude auth token (Claude CLI) or use a Bearer token from your Anthropic workspace',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini (Google)',
    description: 'Fast, multimodal AI with large context',
    apiBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    keyPlaceholder: 'AIza...',
    docsUrl: 'https://ai.google.dev/docs',
    authMethods: ['api_key', 'oauth_token'],
    oauthHint: 'Run: gcloud auth print-access-token',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models for code generation',
    apiBaseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
    keyPlaceholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/docs',
    authMethods: ['api_key', 'oauth_token'],
    oauthHint: 'Use an OAuth token from your OpenAI organization SSO',
  },
  grok: {
    id: 'grok',
    name: 'Grok (xAI)',
    description: 'Real-time knowledge and code understanding',
    apiBaseUrl: 'https://api.x.ai',
    defaultModel: 'grok-3',
    models: ['grok-3', 'grok-3-mini'],
    keyPlaceholder: 'xai-...',
    docsUrl: 'https://docs.x.ai',
    authMethods: ['api_key'],
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Cost-effective code-specialized model',
    apiBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/docs',
    authMethods: ['api_key'],
  },
  copilot: {
    id: 'copilot',
    name: 'GitHub Copilot',
    description: 'GitHub-native code completion and fixes',
    apiBaseUrl: 'https://api.githubcopilot.com',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'claude-sonnet-4-5-20250929'],
    keyPlaceholder: 'ghu_...',
    docsUrl: 'https://docs.github.com/en/copilot',
    authMethods: ['api_key', 'oauth_token'],
    oauthHint: 'Run: gh auth token (requires Copilot subscription)',
  },
};
