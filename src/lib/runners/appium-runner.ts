// Appium Test Runner for Mobile Applications (Android/iOS, Capacitor)

import { BrowserType, NativePlatform } from '../types';
import {
  TestRunner,
  RunnerConfig,
  TestResult,
  ExecutionContext,
  AppiumCapabilities,
  StepResult,
} from './types';
import { safeRequire } from '@/lib/utils/safe-require';

// WebdriverIO Browser type
interface WDIOBrowser {
  $: (selector: string) => Promise<WDIOElement>;
  $$: (selector: string) => Promise<WDIOElement[]>;
  getContext: () => Promise<string>;
  getContexts: () => Promise<string[]>;
  switchContext: (context: string) => Promise<void>;
  pause: (ms: number) => Promise<void>;
  takeScreenshot: () => Promise<string>;
  deleteSession: () => Promise<void>;
  execute: <T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]) => Promise<T>;
  touchAction: (action: unknown) => Promise<void>;
}

interface WDIOElement {
  click: () => Promise<void>;
  setValue: (value: string) => Promise<void>;
  getText: () => Promise<string>;
  getAttribute: (name: string) => Promise<string | null>;
  isDisplayed: () => Promise<boolean>;
  isEnabled: () => Promise<boolean>;
  waitForDisplayed: (options?: { timeout?: number }) => Promise<void>;
  waitForEnabled: (options?: { timeout?: number }) => Promise<void>;
}

export class AppiumRunner implements TestRunner {
  name = 'Appium';
  type = 'appium' as const;

  private config: RunnerConfig | null = null;
  private driver: WDIOBrowser | null = null;
  private serverUrl = 'http://localhost:4723';

  async initialize(config: RunnerConfig): Promise<void> {
    this.config = config;

    const capabilities = this.buildCapabilities(config);

    try {
      // Dynamically import webdriverio
      const { remote } = safeRequire<typeof import('webdriverio')>('webdriverio');

      this.driver = await remote({
        protocol: 'http',
        hostname: process.env.APPIUM_HOST || 'localhost',
        port: parseInt(process.env.APPIUM_PORT || '4723', 10),
        path: '/wd/hub',
        capabilities: capabilities as unknown as Record<string, unknown>,
        connectionRetryTimeout: 120000,
        connectionRetryCount: 3,
      }) as unknown as WDIOBrowser;
    } catch (error) {
      throw new Error(`Failed to connect to Appium server: ${error instanceof Error ? error.message : 'Unknown error'}. Ensure Appium is running.`);
    }
  }

  private buildCapabilities(config: RunnerConfig): AppiumCapabilities {
    const isAndroid = config.platform === 'android';

    const baseCapabilities: AppiumCapabilities = {
      platformName: isAndroid ? 'Android' : 'iOS',
      platformVersion: config.platformVersion || (isAndroid ? '11.0' : '14.5'),
      deviceName: config.deviceId || (isAndroid ? 'Android Emulator' : 'iPhone Simulator'),
      automationName: config.automationName || (isAndroid ? 'UiAutomator2' : 'XCUITest'),
      noReset: false,
      fullReset: false,
      newCommandTimeout: config.timeout || 300,
    };

    // App configuration
    if (config.appPath) {
      baseCapabilities.app = config.appPath;
    }

    // Android-specific
    if (isAndroid && config.packageId) {
      baseCapabilities.appPackage = config.packageId;
      baseCapabilities.appActivity = 'MainActivity';
    }

    // iOS-specific
    if (!isAndroid && config.bundleId) {
      baseCapabilities.bundleId = config.bundleId;
    }

    return baseCapabilities;
  }

  async cleanup(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.deleteSession();
      } catch {
        // Session may already be closed
      }
      this.driver = null;
    }
    this.config = null;
  }

  async runScript(code: string, context?: ExecutionContext): Promise<TestResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const screenshots: string[] = [];

    try {
      logs.push(`Starting Appium test execution`);
      logs.push(`Platform: ${this.config?.platform || 'android'}`);
      logs.push(`Device: ${this.config?.deviceId || 'emulator'}`);

      const result = await this.executeAppiumTest(code, context, logs, screenshots);

      const duration = Date.now() - startTime;

      return {
        success: result.success,
        duration,
        logs,
        screenshots,
        steps: result.steps,
        error: result.error,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Error: ${errorMessage}`);

      return {
        success: false,
        duration,
        error: errorMessage,
        logs,
        screenshots,
      };
    }
  }

  private async executeAppiumTest(
    code: string,
    context?: ExecutionContext,
    logs: string[] = [],
    screenshots: string[] = []
  ): Promise<{ success: boolean; error?: string; steps: StepResult[] }> {
    if (!this.driver) {
      throw new Error('Appium driver not initialized. Call initialize() first.');
    }

    const steps: StepResult[] = [];

    try {
      logs.push('Connected to Appium server');
      steps.push({
        name: 'Connect to Appium',
        status: 'passed',
        duration: 0,
      });

      // Wait for app to be ready
      logs.push('Waiting for app to load...');
      const appLoadStart = Date.now();
      await this.driver.pause(2000); // Give app time to load
      steps.push({
        name: 'Wait for app ready',
        status: 'passed',
        duration: Date.now() - appLoadStart,
      });

      // Execute the test code
      logs.push('Executing test script...');
      const execStartTime = Date.now();

      const testContext = this.createTestContext(this.driver, logs, steps, screenshots, context);

      // Execute the test code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const testFn = new AsyncFunction('driver', 'test', 'expect', 'context', code);
      await testFn(this.driver, testContext.test, testContext.expect, testContext);

      steps.push({
        name: 'Execute test script',
        status: 'passed',
        duration: Date.now() - execStartTime,
      });

      logs.push('Mobile test execution completed successfully');

      return {
        success: true,
        steps,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Test failed: ${errorMessage}`);

      // Take failure screenshot
      if (this.driver && context?.screenshots !== false) {
        try {
          const screenshotBase64 = await this.driver.takeScreenshot();
          screenshots.push(`data:image/png;base64,${screenshotBase64}`);
        } catch {
          logs.push('Failed to capture failure screenshot');
        }
      }

      steps.push({
        name: 'Test execution',
        status: 'failed',
        duration: 0,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        steps,
      };
    }
  }

  private createTestContext(
    driver: WDIOBrowser,
    logs: string[],
    steps: StepResult[],
    screenshots: string[],
    context?: ExecutionContext
  ) {
    return {
      // Test step wrapper
      test: async (name: string, fn: () => Promise<void>) => {
        const stepStartTime = Date.now();
        logs.push(`Running step: ${name}`);
        try {
          await fn();
          steps.push({
            name,
            status: 'passed',
            duration: Date.now() - stepStartTime,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          steps.push({
            name,
            status: 'failed',
            duration: Date.now() - stepStartTime,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Assertion helper
      expect: (value: unknown) => ({
        toBe: (expected: unknown) => {
          if (value !== expected) {
            throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`);
          }
        },
        toContain: (expected: string) => {
          if (typeof value !== 'string' || !value.includes(expected)) {
            throw new Error(`Expected "${value}" to contain "${expected}"`);
          }
        },
        toBeTruthy: () => {
          if (!value) {
            throw new Error(`Expected ${JSON.stringify(value)} to be truthy`);
          }
        },
        toBeFalsy: () => {
          if (value) {
            throw new Error(`Expected ${JSON.stringify(value)} to be falsy`);
          }
        },
        toBeDisplayed: async () => {
          if (value && typeof (value as WDIOElement).isDisplayed === 'function') {
            const isDisplayed = await (value as WDIOElement).isDisplayed();
            if (!isDisplayed) {
              throw new Error('Expected element to be displayed');
            }
          }
        },
      }),

      // Screenshot helper
      screenshot: async (name?: string) => {
        if (context?.screenshots !== false) {
          const screenshotBase64 = await driver.takeScreenshot();
          screenshots.push(`data:image/png;base64,${screenshotBase64}`);
          logs.push(`Screenshot captured${name ? `: ${name}` : ''}`);
        }
      },

      // Context switching for Capacitor/hybrid apps
      switchToWebView: async () => {
        const contexts = await driver.getContexts();
        const webviewContext = contexts.find((c: string) => c.includes('WEBVIEW'));
        if (webviewContext) {
          await driver.switchContext(webviewContext);
          logs.push(`Switched to webview context: ${webviewContext}`);
        } else {
          throw new Error('No webview context found');
        }
      },

      switchToNative: async () => {
        await driver.switchContext('NATIVE_APP');
        logs.push('Switched to native context');
      },

      // Environment access
      env: context?.environment || {},
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/status`);
      return response.ok;
    } catch {
      return false;
    }
  }

  getSupportedBrowsers(): BrowserType[] {
    return ['mobile-chrome', 'mobile-safari'];
  }

  getSupportedPlatforms(): NativePlatform[] {
    return ['android', 'ios'];
  }
}

// Common Appium commands for reference
export const APPIUM_COMMANDS = {
  // Finding elements
  findById: (id: string) => `await driver.findElement('id', '${id}')`,
  findByAccessibilityId: (id: string) =>
    `await driver.findElement('accessibility id', '${id}')`,
  findByXPath: (xpath: string) => `await driver.findElement('xpath', '${xpath}')`,

  // Actions
  tap: (element: string) => `await ${element}.click()`,
  sendKeys: (element: string, text: string) => `await ${element}.sendKeys('${text}')`,
  swipe: (startX: number, startY: number, endX: number, endY: number) =>
    `await driver.touchAction([
      { action: 'press', x: ${startX}, y: ${startY} },
      { action: 'moveTo', x: ${endX}, y: ${endY} },
      { action: 'release' }
    ])`,

  // Waits
  waitForElement: (selector: string, timeout: number) =>
    `await driver.waitForElement('${selector}', ${timeout})`,

  // Assertions
  assertText: (element: string, expected: string) =>
    `const text = await ${element}.getText(); expect(text).toBe('${expected}')`,
};

// Capacitor-specific helpers
export const CAPACITOR_HELPERS = {
  // Capacitor uses standard web views
  getWebViewContext: 'await driver.getContext()',
  switchToWebView: "await driver.switchContext('WEBVIEW_com.example.app')",
  switchToNative: "await driver.switchContext('NATIVE_APP')",

  // Common Capacitor plugin interactions
  plugins: {
    camera: 'Capacitor.Plugins.Camera',
    storage: 'Capacitor.Plugins.Storage',
    geolocation: 'Capacitor.Plugins.Geolocation',
    pushNotifications: 'Capacitor.Plugins.PushNotifications',
  },
};
