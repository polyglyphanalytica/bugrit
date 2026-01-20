// Runner Factory - Creates appropriate test runner based on configuration

import { RunnerType } from '../types';
import { TestRunner, RunnerConfig } from './types';
import { PlaywrightRunner } from './playwright-runner';
import { AppiumRunner } from './appium-runner';
import { TauriRunner } from './tauri-runner';

export class RunnerFactory {
  private static runners: Map<RunnerType, TestRunner> = new Map();

  /**
   * Create or get a test runner based on runner type
   */
  static getRunner(type: RunnerType): TestRunner {
    const existing = this.runners.get(type);
    if (existing) {
      return existing;
    }

    const runner = this.createRunner(type);
    this.runners.set(type, runner);
    return runner;
  }

  /**
   * Create a new runner instance
   */
  private static createRunner(type: RunnerType): TestRunner {
    switch (type) {
      case 'playwright':
        return new PlaywrightRunner();
      case 'appium':
        return new AppiumRunner();
      case 'tauri-driver':
        return new TauriRunner();
      default:
        throw new Error(`Unknown runner type: ${type}`);
    }
  }

  /**
   * Get all available runner types
   */
  static getAvailableRunners(): RunnerType[] {
    return ['playwright', 'appium', 'tauri-driver'];
  }

  /**
   * Check if a runner type is available/installed
   */
  static async isRunnerAvailable(type: RunnerType): Promise<boolean> {
    const runner = this.getRunner(type);
    return runner.isAvailable();
  }

  /**
   * Get the best runner for a given platform
   */
  static getRunnerForPlatform(platform: string): RunnerType {
    switch (platform) {
      case 'web':
        return 'playwright';
      case 'android':
      case 'ios':
        return 'appium';
      case 'windows':
      case 'macos':
      case 'linux':
        return 'tauri-driver';
      default:
        return 'playwright';
    }
  }

  /**
   * Clean up all runners
   */
  static async cleanupAll(): Promise<void> {
    for (const runner of this.runners.values()) {
      await runner.cleanup();
    }
    this.runners.clear();
  }
}

/**
 * Convenience function to create and initialize a runner
 */
export async function createRunner(config: RunnerConfig): Promise<TestRunner> {
  const runner = RunnerFactory.getRunner(config.runnerType);
  await runner.initialize(config);
  return runner;
}

/**
 * Helper to determine runner type from test script metadata
 */
export function inferRunnerType(script: {
  targetUrl?: string;
  targetPlatform?: string;
  runnerType?: RunnerType;
}): RunnerType {
  // Explicit runner type takes precedence
  if (script.runnerType) {
    return script.runnerType;
  }

  // Infer from target platform
  if (script.targetPlatform) {
    return RunnerFactory.getRunnerForPlatform(script.targetPlatform);
  }

  // Default to Playwright for web URLs
  if (script.targetUrl?.startsWith('http')) {
    return 'playwright';
  }

  // Default fallback
  return 'playwright';
}

/**
 * Get recommended configuration for a platform
 */
export function getRecommendedConfig(
  platform: string,
  appType: 'web' | 'mobile' | 'desktop' | 'hybrid'
): Partial<RunnerConfig> {
  const baseConfig: Partial<RunnerConfig> = {
    timeout: 30000,
    headless: true,
  };

  switch (appType) {
    case 'web':
      return {
        ...baseConfig,
        runnerType: 'playwright',
        browser: 'chromium',
        viewport: { width: 1280, height: 720 },
      };

    case 'mobile':
      return {
        ...baseConfig,
        runnerType: 'appium',
        platform: platform === 'ios' ? 'ios' : 'android',
        automationName: platform === 'ios' ? 'XCUITest' : 'UiAutomator2',
      };

    case 'desktop':
      return {
        ...baseConfig,
        runnerType: 'tauri-driver',
        platform: platform as RunnerConfig['platform'],
      };

    case 'hybrid':
      // Hybrid apps can be tested with Appium for mobile or Tauri for desktop
      if (platform === 'android' || platform === 'ios') {
        return {
          ...baseConfig,
          runnerType: 'appium',
          platform: platform as 'android' | 'ios',
        };
      }
      return {
        ...baseConfig,
        runnerType: 'tauri-driver',
        platform: platform as RunnerConfig['platform'],
      };

    default:
      return baseConfig;
  }
}
