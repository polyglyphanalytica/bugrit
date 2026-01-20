// Runner types and interfaces

import { BrowserType, NativePlatform, RunnerType } from '../types';

/**
 * Result from running a test
 */
export interface RunResult {
  success: boolean;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  logs: string[];
  error?: string;
  screenshots?: string[];
  video?: string;
}

/**
 * Configuration for running a test
 */
export interface RunConfig {
  // Script content or path
  code: string;

  // Target URL or app identifier
  targetUrl?: string;
  appId?: string;

  // Browser options (for web tests)
  browser?: BrowserType;
  headless?: boolean;

  // Mobile options (for Capacitor/Appium tests)
  platform?: NativePlatform;
  deviceName?: string;
  platformVersion?: string;

  // Tauri options (for desktop tests)
  tauriAppPath?: string;

  // Timeouts
  timeout?: number;

  // Recording options
  recordVideo?: boolean;
  recordScreenshots?: boolean;

  // Environment variables
  env?: Record<string, string>;
}

/**
 * Base interface for all test runners
 */
export interface TestRunner {
  /**
   * Get the runner type
   */
  getType(): RunnerType;

  /**
   * Check if the runner is available/installed
   */
  isAvailable(): Promise<boolean>;

  /**
   * Run a test script
   */
  run(config: RunConfig): Promise<RunResult>;

  /**
   * Stop any running tests
   */
  stop(): Promise<void>;
}

/**
 * Supported browser configurations
 */
export const BROWSER_CONFIGS: Record<BrowserType, { name: string; channel?: string }> = {
  chromium: { name: 'chromium' },
  webkit: { name: 'webkit' },
  edge: { name: 'chromium', channel: 'msedge' },
  'mobile-chrome': { name: 'chromium' },
  'mobile-safari': { name: 'webkit' },
  'tablet-chrome': { name: 'chromium' },
  'tablet-safari': { name: 'webkit' },
};

/**
 * Device viewport configurations
 */
export const DEVICE_VIEWPORTS: Record<string, { width: number; height: number; isMobile: boolean }> = {
  'mobile-chrome': { width: 375, height: 812, isMobile: true },
  'mobile-safari': { width: 375, height: 812, isMobile: true },
  'tablet-chrome': { width: 768, height: 1024, isMobile: true },
  'tablet-safari': { width: 768, height: 1024, isMobile: true },
  chromium: { width: 1280, height: 720, isMobile: false },
  webkit: { width: 1280, height: 720, isMobile: false },
  edge: { width: 1280, height: 720, isMobile: false },
};

/**
 * Platform-specific Appium capabilities
 */
export const APPIUM_CAPS: Record<NativePlatform, Record<string, unknown>> = {
  android: {
    platformName: 'Android',
    automationName: 'UiAutomator2',
    deviceName: 'Android Emulator',
  },
  ios: {
    platformName: 'iOS',
    automationName: 'XCUITest',
    deviceName: 'iPhone Simulator',
  },
  windows: {
    platformName: 'Windows',
    automationName: 'Windows',
  },
  macos: {
    platformName: 'Mac',
    automationName: 'Mac2',
  },
  linux: {
    platformName: 'Linux',
  },
};
