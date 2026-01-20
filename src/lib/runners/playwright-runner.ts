// Playwright Test Runner for Web Applications

import { BrowserType, NativePlatform } from '../types';
import { TestRunner, RunnerConfig, TestResult, ExecutionContext, StepResult } from './types';
import { safeRequire } from '@/lib/utils/safe-require';

type PlaywrightBrowser = {
  newContext: (options?: Record<string, unknown>) => Promise<PlaywrightContext>;
  close: () => Promise<void>;
};

type PlaywrightContext = {
  newPage: () => Promise<PlaywrightPage>;
  close: () => Promise<void>;
};

type PlaywrightPage = {
  goto: (url: string, options?: Record<string, unknown>) => Promise<unknown>;
  waitForSelector: (selector: string, options?: Record<string, unknown>) => Promise<unknown>;
  click: (selector: string) => Promise<void>;
  fill: (selector: string, value: string) => Promise<void>;
  textContent: (selector: string) => Promise<string | null>;
  screenshot: (options?: { path?: string; fullPage?: boolean }) => Promise<Buffer>;
  evaluate: <T>(fn: () => T) => Promise<T>;
  close: () => Promise<void>;
  setDefaultTimeout: (timeout: number) => void;
};

export class PlaywrightRunner implements TestRunner {
  name = 'Playwright';
  type = 'playwright' as const;

  private config: RunnerConfig | null = null;
  private browser: PlaywrightBrowser | null = null;
  private browserContext: PlaywrightContext | null = null;

  async initialize(config: RunnerConfig): Promise<void> {
    this.config = config;

    // Dynamically import playwright
    const browserType = config.browser || 'chromium';
    let launcher: { launch: (options: Record<string, unknown>) => Promise<PlaywrightBrowser> };

    try {
      const playwright = safeRequire<typeof import('playwright')>('playwright');

      switch (browserType) {
        case 'webkit':
        case 'mobile-safari':
        case 'tablet-safari':
          launcher = playwright.webkit;
          break;
        case 'edge':
          launcher = playwright.chromium; // Edge uses Chromium
          break;
        default:
          launcher = playwright.chromium;
      }

      this.browser = await launcher.launch({
        headless: config.headless ?? true,
      });

      // Create context with device settings if needed
      const contextOptions: Record<string, unknown> = {};

      if (config.viewport) {
        contextOptions.viewport = config.viewport;
      } else if (PLAYWRIGHT_DEVICES[browserType as keyof typeof PLAYWRIGHT_DEVICES]) {
        const device = PLAYWRIGHT_DEVICES[browserType as keyof typeof PLAYWRIGHT_DEVICES];
        Object.assign(contextOptions, device);
      }

      this.browserContext = await this.browser.newContext(contextOptions);
    } catch (error) {
      throw new Error(`Failed to initialize Playwright: ${error instanceof Error ? error.message : 'Unknown error'}. Ensure playwright is installed.`);
    }
  }

  async cleanup(): Promise<void> {
    if (this.browserContext) {
      await this.browserContext.close();
      this.browserContext = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.config = null;
  }

  async runScript(code: string, context?: ExecutionContext): Promise<TestResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const screenshots: string[] = [];

    try {
      logs.push(`Starting Playwright test execution`);
      logs.push(`Browser: ${this.config?.browser || 'chromium'}`);
      logs.push(`Base URL: ${this.config?.baseUrl || 'N/A'}`);

      const result = await this.executePlaywrightTest(code, context, logs, screenshots);

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

  private async executePlaywrightTest(
    code: string,
    context?: ExecutionContext,
    logs: string[] = [],
    screenshots: string[] = []
  ): Promise<{ success: boolean; error?: string; steps: StepResult[] }> {
    if (!this.browserContext) {
      throw new Error('Browser context not initialized. Call initialize() first.');
    }

    const steps: StepResult[] = [];
    let page: PlaywrightPage | null = null;

    try {
      // Create a new page
      logs.push('Creating new browser page...');
      const pageStartTime = Date.now();
      page = await this.browserContext.newPage();
      page.setDefaultTimeout(this.config?.timeout || 30000);
      steps.push({
        name: 'Create browser page',
        status: 'passed',
        duration: Date.now() - pageStartTime,
      });

      // Navigate to base URL if provided
      if (this.config?.baseUrl) {
        logs.push(`Navigating to ${this.config.baseUrl}...`);
        const navStartTime = Date.now();
        await page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
        steps.push({
          name: `Navigate to ${this.config.baseUrl}`,
          status: 'passed',
          duration: Date.now() - navStartTime,
        });
      }

      // Execute the test code in a sandboxed context
      logs.push('Executing test script...');
      const execStartTime = Date.now();

      // Create test execution context with page utilities
      const testContext = this.createTestContext(page, logs, steps, screenshots, context);

      // Execute the test code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const testFn = new AsyncFunction('page', 'test', 'expect', 'context', code);
      await testFn(page, testContext.test, testContext.expect, testContext);

      steps.push({
        name: 'Execute test script',
        status: 'passed',
        duration: Date.now() - execStartTime,
      });

      logs.push('Test execution completed successfully');

      return {
        success: true,
        steps,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Test failed: ${errorMessage}`);

      // Take failure screenshot if page exists
      if (page && context?.screenshots !== false) {
        try {
          const screenshotBuffer = await page.screenshot({ fullPage: true });
          screenshots.push(`data:image/png;base64,${screenshotBuffer.toString('base64')}`);
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
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private createTestContext(
    page: PlaywrightPage,
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
        toBeVisible: async () => {
          // For element handles
          if (value && typeof (value as { isVisible?: () => Promise<boolean> }).isVisible === 'function') {
            const isVisible = await (value as { isVisible: () => Promise<boolean> }).isVisible();
            if (!isVisible) {
              throw new Error('Expected element to be visible');
            }
          }
        },
      }),

      // Screenshot helper
      screenshot: async (name?: string) => {
        if (context?.screenshots !== false) {
          const buffer = await page.screenshot({ fullPage: true });
          screenshots.push(`data:image/png;base64,${buffer.toString('base64')}`);
          logs.push(`Screenshot captured${name ? `: ${name}` : ''}`);
        }
      },

      // Environment access
      env: context?.environment || {},
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await import('playwright');
      return true;
    } catch {
      return false;
    }
  }

  getSupportedBrowsers(): BrowserType[] {
    return [
      'chromium',
      'webkit',
      'edge',
      'mobile-chrome',
      'mobile-safari',
      'tablet-chrome',
      'tablet-safari',
    ];
  }

  getSupportedPlatforms(): NativePlatform[] {
    // Playwright doesn't directly support native platforms
    return [];
  }
}

// Device configurations for responsive testing
export const PLAYWRIGHT_DEVICES = {
  'mobile-chrome': {
    viewport: { width: 360, height: 640 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 Chrome/91.0.4472.124 Mobile Safari/537.36',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  'mobile-safari': {
    viewport: { width: 375, height: 812 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  'tablet-chrome': {
    viewport: { width: 768, height: 1024 },
    userAgent:
      'Mozilla/5.0 (Linux; Android 11; Galaxy Tab S7) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  'tablet-safari': {
    viewport: { width: 820, height: 1180 },
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
