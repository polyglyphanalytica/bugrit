// Tauri Driver Test Runner for Desktop Applications

import { BrowserType, NativePlatform } from '../types';
import {
  TestRunner,
  RunnerConfig,
  TestResult,
  ExecutionContext,
  TauriDriverOptions,
  StepResult,
} from './types';
import { spawn, ChildProcess } from 'child_process';
import { safeRequire } from '@/lib/utils/safe-require';

// WebdriverIO Browser type for Tauri
interface WDIOBrowser {
  $: (selector: string) => Promise<WDIOElement>;
  $$: (selector: string) => Promise<WDIOElement[]>;
  execute: <T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]) => Promise<T>;
  executeAsync: <T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]) => Promise<T>;
  saveScreenshot: (filepath?: string) => Promise<Buffer>;
  getTitle: () => Promise<string>;
  getWindowHandles: () => Promise<string[]>;
  switchToWindow: (handle: string) => Promise<void>;
  pause: (ms: number) => Promise<void>;
  deleteSession: () => Promise<void>;
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

export class TauriRunner implements TestRunner {
  name = 'Tauri Driver';
  type = 'tauri-driver' as const;

  private config: RunnerConfig | null = null;
  private driver: WDIOBrowser | null = null;
  private tauriDriverProcess: ChildProcess | null = null;
  private driverPort = 4444;

  async initialize(config: RunnerConfig): Promise<void> {
    this.config = config;

    const options = this.buildOptions(config);

    if (!options.appPath) {
      throw new Error('Tauri app path is required. Set tauriAppPath in config.');
    }

    try {
      // Start tauri-driver process
      await this.startTauriDriver();

      // Wait for driver to be ready
      await this.waitForDriverReady();

      // Connect using WebDriverIO
      const { remote } = safeRequire<typeof import('webdriverio')>('webdriverio');

      this.driver = await remote({
        hostname: 'localhost',
        port: this.driverPort,
        capabilities: {
          'tauri:options': {
            application: options.appPath,
            webviewOptions: {},
          },
        } as unknown as Record<string, unknown>,
        connectionRetryTimeout: 30000,
        connectionRetryCount: 3,
      }) as unknown as WDIOBrowser;
    } catch (error) {
      await this.cleanup();
      throw new Error(`Failed to initialize Tauri driver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async startTauriDriver(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.tauriDriverProcess = spawn('tauri-driver', ['--port', this.driverPort.toString()], {
          stdio: ['ignore', 'pipe', 'pipe'],
        }) as ChildProcess;

        this.tauriDriverProcess.on('error', (err) => {
          reject(new Error(`Failed to start tauri-driver: ${err.message}. Ensure tauri-driver is installed.`));
        });

        // Give the driver a moment to start
        setTimeout(resolve, 1000);
      } catch (error) {
        reject(new Error(`Failed to spawn tauri-driver: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  private async waitForDriverReady(maxAttempts = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.driverPort}/status`);
        if (response.ok) {
          return;
        }
      } catch {
        // Driver not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error('Tauri driver failed to start within timeout');
  }

  private buildOptions(config: RunnerConfig): TauriDriverOptions {
    return {
      appPath: config.tauriAppPath || '',
      appName: config.tauriAppName || '',
      webviewPort: 9222,
      args: [],
    };
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
    if (this.tauriDriverProcess) {
      this.tauriDriverProcess.kill();
      this.tauriDriverProcess = null;
    }
    this.config = null;
  }

  async runScript(code: string, context?: ExecutionContext): Promise<TestResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const screenshots: string[] = [];

    try {
      logs.push(`Starting Tauri test execution`);
      logs.push(`Platform: ${this.config?.platform || process.platform}`);
      logs.push(`App: ${this.config?.tauriAppName || 'N/A'}`);

      const result = await this.executeTauriTest(code, context, logs, screenshots);

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

  private async executeTauriTest(
    code: string,
    context?: ExecutionContext,
    logs: string[] = [],
    screenshots: string[] = []
  ): Promise<{ success: boolean; error?: string; steps: StepResult[] }> {
    if (!this.driver) {
      throw new Error('Tauri driver not initialized. Call initialize() first.');
    }

    const steps: StepResult[] = [];

    try {
      logs.push('Connected to tauri-driver');
      steps.push({
        name: 'Connect to tauri-driver',
        status: 'passed',
        duration: 0,
      });

      // Wait for app window to be ready
      logs.push('Waiting for application window...');
      const windowStart = Date.now();
      await this.driver.pause(2000); // Give the app time to initialize
      const title = await this.driver.getTitle();
      logs.push(`Application window ready: ${title}`);
      steps.push({
        name: 'Wait for window',
        status: 'passed',
        duration: Date.now() - windowStart,
      });

      // Execute the test code
      logs.push('Executing test script...');
      const execStartTime = Date.now();

      const testContext = this.createTestContext(this.driver, logs, steps, screenshots, context);

      // Execute the test code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const testFn = new AsyncFunction('driver', 'test', 'expect', 'tauri', 'context', code);
      await testFn(this.driver, testContext.test, testContext.expect, testContext.tauri, testContext);

      steps.push({
        name: 'Execute test script',
        status: 'passed',
        duration: Date.now() - execStartTime,
      });

      logs.push('Desktop test execution completed successfully');

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
          const screenshotBuffer = await this.driver.saveScreenshot();
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

      // Tauri-specific helpers
      tauri: {
        // Invoke a Tauri command
        invoke: async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
          return driver.execute<T>(((cmd: string, a: Record<string, unknown> | undefined) => {
            // @ts-expect-error - __TAURI__ is available in Tauri webview
            return window.__TAURI__.invoke(cmd, a);
          }) as (...args: unknown[]) => T, command, args);
        },

        // Window operations
        window: {
          minimize: () => driver.execute(() => {
            // @ts-expect-error - __TAURI__ is available in Tauri webview
            return window.__TAURI__.window.appWindow.minimize();
          }),
          maximize: () => driver.execute(() => {
            // @ts-expect-error - __TAURI__ is available in Tauri webview
            return window.__TAURI__.window.appWindow.maximize();
          }),
          close: () => driver.execute(() => {
            // @ts-expect-error - __TAURI__ is available in Tauri webview
            return window.__TAURI__.window.appWindow.close();
          }),
          isMaximized: () => driver.execute<boolean>(() => {
            // @ts-expect-error - __TAURI__ is available in Tauri webview
            return window.__TAURI__.window.appWindow.isMaximized();
          }),
        },

        // Clipboard
        clipboard: {
          readText: () => driver.execute<string>(() => {
            // @ts-expect-error - __TAURI__ is available in Tauri webview
            return window.__TAURI__.clipboard.readText();
          }),
          writeText: (text: string) => driver.execute(((t: string) => {
            // @ts-expect-error - __TAURI__ is available in Tauri webview
            return window.__TAURI__.clipboard.writeText(t);
          }) as (...args: unknown[]) => unknown, text),
        },
      },

      // Screenshot helper
      screenshot: async (name?: string) => {
        if (context?.screenshots !== false) {
          const buffer = await driver.saveScreenshot();
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
      // Check if tauri-driver responds
      const response = await fetch(`http://localhost:${this.driverPort}/status`);
      return response.ok;
    } catch {
      // Also try to check if tauri-driver command exists
      return new Promise((resolve) => {
        const proc = spawn('tauri-driver', ['--version'], { stdio: 'ignore' });
        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
      });
    }
  }

  getSupportedBrowsers(): BrowserType[] {
    // Tauri uses WebKit webview
    return ['webkit'];
  }

  getSupportedPlatforms(): NativePlatform[] {
    return ['windows', 'macos', 'linux'];
  }
}

// Tauri-specific test helpers
export const TAURI_HELPERS = {
  // Invoking Tauri commands from tests
  invoke: (command: string, args?: Record<string, unknown>) =>
    `await window.__TAURI__.invoke('${command}'${args ? `, ${JSON.stringify(args)}` : ''})`,

  // Window operations
  window: {
    minimize: "await window.__TAURI__.window.appWindow.minimize()",
    maximize: "await window.__TAURI__.window.appWindow.maximize()",
    close: "await window.__TAURI__.window.appWindow.close()",
    setTitle: (title: string) =>
      `await window.__TAURI__.window.appWindow.setTitle('${title}')`,
    isMaximized: 'await window.__TAURI__.window.appWindow.isMaximized()',
    isMinimized: 'await window.__TAURI__.window.appWindow.isMinimized()',
  },

  // Dialog operations
  dialog: {
    open: (options?: { multiple?: boolean; directory?: boolean; filters?: Array<{ name: string; extensions: string[] }> }) =>
      `await window.__TAURI__.dialog.open(${options ? JSON.stringify(options) : ''})`,
    save: (options?: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
      `await window.__TAURI__.dialog.save(${options ? JSON.stringify(options) : ''})`,
    message: (message: string, options?: { title?: string; type?: 'info' | 'warning' | 'error' }) =>
      `await window.__TAURI__.dialog.message('${message}'${options ? `, ${JSON.stringify(options)}` : ''})`,
    confirm: (message: string, title?: string) =>
      `await window.__TAURI__.dialog.confirm('${message}'${title ? `, '${title}'` : ''})`,
  },

  // File system operations
  fs: {
    readTextFile: (path: string) =>
      `await window.__TAURI__.fs.readTextFile('${path}')`,
    writeTextFile: (path: string, contents: string) =>
      `await window.__TAURI__.fs.writeTextFile('${path}', '${contents}')`,
    exists: (path: string) =>
      `await window.__TAURI__.fs.exists('${path}')`,
  },

  // Shell operations
  shell: {
    open: (path: string) => `await window.__TAURI__.shell.open('${path}')`,
    execute: (program: string, args?: string[]) =>
      `await window.__TAURI__.shell.execute('${program}'${args ? `, ${JSON.stringify(args)}` : ''})`,
  },

  // Event system
  events: {
    emit: (event: string, payload?: unknown) =>
      `await window.__TAURI__.event.emit('${event}'${payload ? `, ${JSON.stringify(payload)}` : ''})`,
    listen: (event: string, handler: string) =>
      `await window.__TAURI__.event.listen('${event}', ${handler})`,
  },

  // Clipboard
  clipboard: {
    readText: 'await window.__TAURI__.clipboard.readText()',
    writeText: (text: string) =>
      `await window.__TAURI__.clipboard.writeText('${text}')`,
  },

  // Notification
  notification: {
    isPermissionGranted: 'await window.__TAURI__.notification.isPermissionGranted()',
    requestPermission: 'await window.__TAURI__.notification.requestPermission()',
    sendNotification: (options: { title: string; body?: string; icon?: string }) =>
      `window.__TAURI__.notification.sendNotification(${JSON.stringify(options)})`,
  },
};

// WebDriver commands specific to Tauri testing
export const TAURI_WEBDRIVER_COMMANDS = {
  // Standard WebDriver commands work with Tauri's webview
  findElement: (selector: string) => `await driver.$('${selector}')`,
  findElements: (selector: string) => `await driver.$$('${selector}')`,
  click: (element: string) => `await ${element}.click()`,
  setValue: (element: string, value: string) => `await ${element}.setValue('${value}')`,
  getText: (element: string) => `await ${element}.getText()`,
  getAttribute: (element: string, attr: string) => `await ${element}.getAttribute('${attr}')`,

  // Execute script in webview context
  executeScript: (script: string) => `await driver.execute('${script}')`,
  executeAsync: (script: string) => `await driver.executeAsync('${script}')`,

  // Take screenshot
  screenshot: 'await driver.saveScreenshot()',

  // Window handling
  getWindowHandles: 'await driver.getWindowHandles()',
  switchToWindow: (handle: string) => `await driver.switchToWindow('${handle}')`,
};
