// Core types for the E2E Testing Dashboard

// Test Step definition
export interface TestStep {
  id: string;
  order: number;
  action: string;
  expectedResult: string;
}

// Test Case - individual test specification
export interface TestCase {
  id: string;
  userId?: string;
  name: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'inactive' | 'draft';
  steps: TestStep[];
  expectedResult: string;
  createdAt: Date;
  updatedAt: Date;
}

// Test Run - execution instance of a test case
export interface TestRun {
  id: string;
  userId?: string;
  testCaseId: string;
  testCaseName: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  logs: string[];
  screenshots?: string[];
  // Platform information
  platform?: 'web' | NativePlatform;
  browser?: BrowserType;
  runnerType?: RunnerType;
}

// Test Script - submitted test code (Playwright, Appium, or Tauri)
export interface TestScript {
  id: string;
  name: string;
  description: string;
  code: string;
  targetUrl: string;
  tags: string[];
  appId: string;
  buildId: string;
  isRegression: boolean;
  status: 'pending' | 'validated' | 'failed';
  // Runner configuration
  runnerType: RunnerType;
  targetPlatform?: NativePlatform;
  createdAt: Date;
  updatedAt: Date;
}

// Test Execution - orchestrates multiple script executions
export interface TestExecution {
  id: string;
  scriptIds: string[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  browsers: BrowserType[];
  nativePlatforms?: NativePlatform[];
  results: ExecutionResult[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Execution Result - individual script performance
export interface ExecutionResult {
  scriptId: string;
  browser: BrowserType;
  platform?: NativePlatform;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

// Registered Application
export interface Application {
  id: string;
  name: string;
  description: string;
  ownerId: string; // User who registered the app
  type: 'web' | 'mobile' | 'desktop' | 'hybrid';
  platforms: NativePlatform[];
  // URLs and identifiers
  targetUrl?: string;
  packageId?: string; // Android package name
  bundleId?: string; // iOS bundle ID
  // Tauri/Desktop identifiers
  tauriAppName?: string;
  // Configuration
  settings: ApplicationSettings;
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Application settings
export interface ApplicationSettings {
  // Test defaults
  defaultBrowsers: BrowserType[];
  defaultTimeout: number;
  enableScreenshots: boolean;
  enableVideo: boolean;

  // Email notification settings (per-application)
  emailEnabled: boolean;
  emailRecipients: string[]; // List of email addresses
  emailNotifyOnFailure: boolean;
  emailNotifyOnSuccess: boolean;

  // Slack integration (per-application)
  slackEnabled: boolean;
  slackWebhookUrl?: string;
  slackChannel?: string;
  slackNotifyOnFailure: boolean;
  slackNotifyOnSuccess: boolean;

  // Generic webhook (per-application)
  webhookEnabled: boolean;
  webhookUrl?: string;
  webhookSecret?: string;

  // Test scheduling (per-application)
  scheduling: TestScheduleSettings;
}

// Test scheduling configuration
export interface TestScheduleSettings {
  // Uptime monitoring
  enableUptimeMonitoring: boolean;
  uptimeCheckInterval: 5 | 10 | 15 | 30 | 60; // minutes
  uptimeEndpoints: UptimeEndpoint[];

  // Scheduled runs
  enableDailySmoke: boolean;
  dailySmokeTime?: string; // HH:MM format (UTC)
  dailySmokeDays?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];

  // Full regression schedule
  enableWeeklyRegression: boolean;
  weeklyRegressionDay?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  weeklyRegressionTime?: string; // HH:MM format (UTC)

  // Deployment triggers
  runOnDeployment: boolean;
  deploymentTestType: 'smoke' | 'regression' | 'all';

  // PR/Branch triggers
  runOnPullRequest: boolean;
  prTestType: 'smoke' | 'affected' | 'all';

  // Custom cron (advanced)
  customCronEnabled: boolean;
  customCronExpression?: string;
  customCronTestType?: 'smoke' | 'regression' | 'all';
}

// Uptime endpoint configuration
export interface UptimeEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  expectedStatus: number;
  expectedBodyContains?: string;
  timeout: number; // ms
  headers?: Record<string, string>;
}

// API Key for authentication (now associated with an application)
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  applicationId: string; // Associated application
  ownerId: string; // User who created the key
  permissions: ApiKeyPermission[];
  rateLimit: number;
  usageCount: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
}

// API Key permissions
export type ApiKeyPermission =
  // Legacy permissions
  | 'scripts:submit'
  | 'scripts:read'
  | 'executions:trigger'
  | 'executions:read'
  | 'results:read'
  // V1 API permissions
  | 'projects:read'
  | 'projects:write'
  | 'scans:read'
  | 'scans:write'
  | 'tests:read'
  | 'tests:write'
  | 'reports:read'
  | 'reports:write';

// Permission groups for easy assignment
export const API_PERMISSION_GROUPS = {
  readonly: [
    'scripts:read',
    'executions:read',
    'results:read',
    'projects:read',
    'scans:read',
    'tests:read',
    'reports:read',
  ] as ApiKeyPermission[],
  execute: [
    'scripts:read',
    'scripts:submit',
    'executions:read',
    'executions:trigger',
    'results:read',
    'projects:read',
    'projects:write',
    'scans:read',
    'scans:write',
    'tests:read',
    'tests:write',
    'reports:read',
  ] as ApiKeyPermission[],
  full: [
    'scripts:read',
    'scripts:submit',
    'executions:read',
    'executions:trigger',
    'results:read',
    'projects:read',
    'projects:write',
    'scans:read',
    'scans:write',
    'tests:read',
    'tests:write',
    'reports:read',
    'reports:write',
  ] as ApiKeyPermission[],
};

// Test Job - task unit for distributed workers
export interface TestJob {
  id: string;
  executionId: string;
  scriptId: string;
  runnerType: RunnerType;
  browser?: BrowserType;
  platform?: NativePlatform;
  appConfig?: AppConfig;
  status: 'queued' | 'claimed' | 'running' | 'completed' | 'failed';
  workerId?: string;
  retryCount: number;
  maxRetries: number;
  result?: ExecutionResult;
  createdAt: Date;
  claimedAt?: Date;
  completedAt?: Date;
}

// Worker - agent for distributed execution
export interface Worker {
  id: string;
  name: string;
  capabilities: WorkerCapabilities;
  status: 'online' | 'offline' | 'busy';
  currentJobs: number;
  maxConcurrent: number;
  lastHeartbeat: Date;
  registeredAt: Date;
}

// Worker capabilities
export interface WorkerCapabilities {
  runners: RunnerType[];
  browsers: BrowserType[];
  nativePlatforms: NativePlatform[];
  maxConcurrent: number;
}

// App configuration for native testing
export interface AppConfig {
  path?: string;
  packageId?: string;
  bundleId?: string;
  deviceId?: string;
}

// Browser types supported
export type BrowserType =
  | 'chromium'
  | 'webkit'
  | 'edge'
  | 'mobile-chrome'
  | 'mobile-safari'
  | 'tablet-chrome'
  | 'tablet-safari';

// Test runner types
export type RunnerType = 'playwright' | 'appium' | 'tauri-driver';

// Native platforms supported
export type NativePlatform =
  | 'android'
  | 'ios'
  | 'windows'
  | 'macos'
  | 'linux';

// API Request Types
export interface SubmitScriptRequest {
  name: string;
  description: string;
  code: string;
  targetUrl: string;
  tags?: string[];
  appId: string;
  buildId: string;
}

export interface TriggerExecutionRequest {
  scriptIds: string[];
  browsers?: BrowserType[];
  nativePlatforms?: NativePlatform[];
  appConfig?: AppConfig;
}

export interface CreateApiKeyRequest {
  name: string;
  applicationId: string;
  permissions: ApiKeyPermission[];
  expiresInDays?: number;
  rateLimit?: number;
}

// Create Application Request
export interface CreateApplicationRequest {
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'desktop' | 'hybrid';
  platforms?: NativePlatform[];
  targetUrl?: string;
  packageId?: string;
  bundleId?: string;
  tauriAppName?: string;
}

// Dashboard Statistics
export interface DashboardStats {
  totalTests: number;
  totalRuns: number;
  passing: number;
  failing: number;
  skipped: number;
  passRate: number;
}

// User type for auth - compatible with Firebase User
// We import the actual Firebase User type where needed for full compatibility
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  phoneNumber: string | null;
  providerId: string;
  refreshToken: string;
  tenantId: string | null;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData: Array<{
    providerId: string;
    uid: string;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
  }>;
  // Methods
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ token: string; claims: Record<string, unknown> }>;
  reload: () => Promise<void>;
  delete: () => Promise<void>;
  toJSON: () => object;
}
