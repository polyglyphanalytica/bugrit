// Types for multi-platform test runners

import { BrowserType, NativePlatform, RunnerType } from '../types';

export interface RunnerConfig {
  runnerType: RunnerType;
  browser?: BrowserType;
  platform?: NativePlatform;
  timeout?: number;
  headless?: boolean;
  // Web-specific
  baseUrl?: string;
  viewport?: { width: number; height: number };
  // Mobile-specific (Appium/Capacitor)
  deviceId?: string;
  appPath?: string;
  packageId?: string;
  bundleId?: string;
  platformVersion?: string;
  automationName?: string;
  // Desktop-specific (Tauri)
  tauriAppPath?: string;
  tauriAppName?: string;
}

export interface TestResult {
  success: boolean;
  duration: number;
  error?: string;
  logs: string[];
  screenshots?: string[];
  video?: string;
  // Detailed results
  steps?: StepResult[];
  coverage?: CoverageReport;
}

export interface StepResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
}

export interface CoverageReport {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface TestRunner {
  name: string;
  type: RunnerType;

  // Lifecycle
  initialize(config: RunnerConfig): Promise<void>;
  cleanup(): Promise<void>;

  // Execution
  runScript(code: string, context?: ExecutionContext): Promise<TestResult>;

  // Capabilities
  isAvailable(): Promise<boolean>;
  getSupportedBrowsers(): BrowserType[];
  getSupportedPlatforms(): NativePlatform[];
}

export interface ExecutionContext {
  testId: string;
  scriptId: string;
  applicationId: string;
  environment?: Record<string, string>;
  screenshots?: boolean;
  video?: boolean;
}

// Appium-specific capabilities
export interface AppiumCapabilities {
  platformName: 'Android' | 'iOS';
  platformVersion: string;
  deviceName: string;
  app?: string;
  appPackage?: string;
  appActivity?: string;
  bundleId?: string;
  automationName: string;
  noReset?: boolean;
  fullReset?: boolean;
  newCommandTimeout?: number;
}

// Tauri-specific options
export interface TauriDriverOptions {
  appPath: string;
  appName: string;
  webviewPort?: number;
  args?: string[];
}
