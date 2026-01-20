// Multi-platform Test Runner Framework
// Supports Playwright (web), Appium (mobile/Capacitor), and Tauri Driver (desktop)

export { PlaywrightRunner } from './playwright-runner';
export { AppiumRunner } from './appium-runner';
export { TauriRunner } from './tauri-runner';
export { createRunner, RunnerFactory } from './runner-factory';
export type { TestRunner, RunnerConfig, TestResult } from './types';
