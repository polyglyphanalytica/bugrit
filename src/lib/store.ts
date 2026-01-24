// In-memory data store for development
// Replace with database (Firebase Firestore, PostgreSQL, etc.) in production

import {
  TestCase,
  TestRun,
  TestScript,
  TestExecution,
  ApiKey,
  Worker,
  TestJob,
  DashboardStats,
  ExecutionResult,
} from './types';

class Store {
  private testCases: Map<string, TestCase> = new Map();
  private testRuns: Map<string, TestRun> = new Map();
  private testScripts: Map<string, TestScript> = new Map();
  private executions: Map<string, TestExecution> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private workers: Map<string, Worker> = new Map();
  private jobs: Map<string, TestJob> = new Map();

  constructor() {
    this.seedData();
  }

  // Seed initial data for development
  private seedData() {
    const now = new Date();

    // Sample test cases
    const sampleTestCases: TestCase[] = [
      {
        id: 'tc-1',
        name: 'User Authentication Flow',
        description: 'Verify user can login with valid credentials',
        category: 'Authentication',
        priority: 'critical',
        status: 'active',
        steps: [
          { id: 's1', order: 1, action: 'Navigate to login page', expectedResult: 'Login form displayed' },
          { id: 's2', order: 2, action: 'Enter valid email', expectedResult: 'Email accepted' },
          { id: 's3', order: 3, action: 'Enter valid password', expectedResult: 'Password accepted' },
          { id: 's4', order: 4, action: 'Click login button', expectedResult: 'User redirected to dashboard' },
        ],
        expectedResult: 'User successfully logged in and redirected to dashboard',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      },
      {
        id: 'tc-2',
        name: 'Dashboard KPI Display',
        description: 'Verify dashboard displays correct KPI metrics',
        category: 'Dashboard',
        priority: 'high',
        status: 'active',
        steps: [
          { id: 's1', order: 1, action: 'Login as admin user', expectedResult: 'Logged in successfully' },
          { id: 's2', order: 2, action: 'Navigate to dashboard', expectedResult: 'Dashboard loaded' },
          { id: 's3', order: 3, action: 'Verify KPI cards visible', expectedResult: 'All KPI cards displayed' },
        ],
        expectedResult: 'Dashboard shows accurate KPI metrics',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      },
      {
        id: 'tc-3',
        name: 'Payment Processing',
        description: 'Verify payment flow completes successfully',
        category: 'Payments',
        priority: 'critical',
        status: 'active',
        steps: [
          { id: 's1', order: 1, action: 'Add item to cart', expectedResult: 'Item added' },
          { id: 's2', order: 2, action: 'Proceed to checkout', expectedResult: 'Checkout page displayed' },
          { id: 's3', order: 3, action: 'Enter payment details', expectedResult: 'Details accepted' },
          { id: 's4', order: 4, action: 'Confirm payment', expectedResult: 'Payment processed' },
        ],
        expectedResult: 'Payment completed and confirmation shown',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: now,
      },
    ];

    sampleTestCases.forEach(tc => this.testCases.set(tc.id, tc));

    // Sample test runs
    const sampleTestRuns: TestRun[] = [
      {
        id: 'tr-1',
        testCaseId: 'tc-1',
        testCaseName: 'User Authentication Flow',
        status: 'passed',
        duration: 4523,
        startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 4523),
        logs: ['Test started', 'Login page loaded', 'Credentials entered', 'Login successful'],
      },
      {
        id: 'tr-2',
        testCaseId: 'tc-2',
        testCaseName: 'Dashboard KPI Display',
        status: 'passed',
        duration: 2341,
        startedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        completedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000 + 2341),
        logs: ['Test started', 'Dashboard loaded', 'KPIs verified'],
      },
      {
        id: 'tr-3',
        testCaseId: 'tc-3',
        testCaseName: 'Payment Processing',
        status: 'failed',
        duration: 8921,
        startedAt: new Date(now.getTime() - 30 * 60 * 1000),
        completedAt: new Date(now.getTime() - 30 * 60 * 1000 + 8921),
        error: 'Payment gateway timeout after 5000ms',
        logs: ['Test started', 'Item added to cart', 'Checkout initiated', 'Payment timeout'],
      },
      {
        id: 'tr-4',
        testCaseId: 'tc-1',
        testCaseName: 'User Authentication Flow',
        status: 'passed',
        duration: 4102,
        startedAt: new Date(now.getTime() - 15 * 60 * 1000),
        completedAt: new Date(now.getTime() - 15 * 60 * 1000 + 4102),
        logs: ['Test started', 'Login successful'],
      },
      {
        id: 'tr-5',
        testCaseId: 'tc-2',
        testCaseName: 'Dashboard KPI Display',
        status: 'skipped',
        startedAt: new Date(now.getTime() - 10 * 60 * 1000),
        logs: ['Test skipped due to dependency failure'],
      },
    ];

    sampleTestRuns.forEach(tr => this.testRuns.set(tr.id, tr));
  }

  // ==================== Test Cases ====================

  getAllTestCases(limit: number = 100): TestCase[] {
    return Array.from(this.testCases.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  getTestCase(id: string): TestCase | undefined {
    return this.testCases.get(id);
  }

  createTestCase(testCase: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>): TestCase {
    const id = `tc-${Date.now()}`;
    const now = new Date();
    const newTestCase: TestCase = {
      ...testCase,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.testCases.set(id, newTestCase);
    return newTestCase;
  }

  updateTestCase(id: string, updates: Partial<TestCase>): TestCase | undefined {
    const existing = this.testCases.get(id);
    if (!existing) return undefined;

    const updated: TestCase = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.testCases.set(id, updated);
    return updated;
  }

  deleteTestCase(id: string): boolean {
    return this.testCases.delete(id);
  }

  // ==================== Test Runs ====================

  getAllTestRuns(limit: number = 100): TestRun[] {
    return Array.from(this.testRuns.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  getRecentTestRuns(limit: number = 5): TestRun[] {
    return this.getAllTestRuns().slice(0, limit);
  }

  getTestRun(id: string): TestRun | undefined {
    return this.testRuns.get(id);
  }

  createTestRun(testRun: Omit<TestRun, 'id' | 'startedAt' | 'logs'>): TestRun {
    const id = `tr-${Date.now()}`;
    const newTestRun: TestRun = {
      ...testRun,
      id,
      startedAt: new Date(),
      logs: [],
    };
    this.testRuns.set(id, newTestRun);
    return newTestRun;
  }

  updateTestRun(id: string, updates: Partial<TestRun>): TestRun | undefined {
    const existing = this.testRuns.get(id);
    if (!existing) return undefined;

    const updated: TestRun = {
      ...existing,
      ...updates,
      id,
      startedAt: existing.startedAt,
    };
    this.testRuns.set(id, updated);
    return updated;
  }

  // ==================== Test Scripts ====================

  getAllTestScripts(limit: number = 100): TestScript[] {
    return Array.from(this.testScripts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getRegressionScripts(): TestScript[] {
    return this.getAllTestScripts().filter(s => s.isRegression);
  }

  getTestScript(id: string): TestScript | undefined {
    return this.testScripts.get(id);
  }

  createTestScript(script: Omit<TestScript, 'id' | 'createdAt' | 'updatedAt' | 'isRegression' | 'status'>): TestScript {
    const id = `ts-${Date.now()}`;
    const now = new Date();
    const newScript: TestScript = {
      ...script,
      id,
      isRegression: false,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.testScripts.set(id, newScript);
    return newScript;
  }

  promoteToRegression(id: string): TestScript | undefined {
    const script = this.testScripts.get(id);
    if (!script) return undefined;

    script.isRegression = true;
    script.updatedAt = new Date();
    return script;
  }

  deleteTestScript(id: string): boolean {
    return this.testScripts.delete(id);
  }

  // ==================== Executions ====================

  getAllExecutions(limit: number = 100): TestExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getExecution(id: string): TestExecution | undefined {
    return this.executions.get(id);
  }

  createExecution(execution: Omit<TestExecution, 'id' | 'createdAt' | 'results' | 'status'>): TestExecution {
    const id = `ex-${Date.now()}`;
    const newExecution: TestExecution = {
      ...execution,
      id,
      status: 'queued',
      results: [],
      createdAt: new Date(),
    };
    this.executions.set(id, newExecution);
    return newExecution;
  }

  updateExecution(id: string, updates: Partial<TestExecution>): TestExecution | undefined {
    const existing = this.executions.get(id);
    if (!existing) return undefined;

    const updated: TestExecution = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
    };
    this.executions.set(id, updated);
    return updated;
  }

  addExecutionResult(executionId: string, result: ExecutionResult): TestExecution | undefined {
    const execution = this.executions.get(executionId);
    if (!execution) return undefined;

    execution.results.push(result);
    return execution;
  }

  // ==================== API Keys ====================

  getAllApiKeys(limit: number = 100): ApiKey[] {
    return Array.from(this.apiKeys.values()).slice(0, limit);
  }

  getApiKey(id: string): ApiKey | undefined {
    return this.apiKeys.get(id);
  }

  getApiKeyByKey(key: string): ApiKey | undefined {
    return Array.from(this.apiKeys.values()).find(k => k.key === key);
  }

  createApiKey(apiKey: Omit<ApiKey, 'id' | 'key' | 'createdAt' | 'usageCount' | 'status'>): ApiKey {
    const id = `ak-${Date.now()}`;
    const key = `bg_${generateRandomString(32)}`;
    const newApiKey: ApiKey = {
      ...apiKey,
      id,
      key,
      usageCount: 0,
      status: 'active',
      createdAt: new Date(),
    };
    this.apiKeys.set(id, newApiKey);
    return newApiKey;
  }

  revokeApiKey(id: string): ApiKey | undefined {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return undefined;

    apiKey.status = 'revoked';
    return apiKey;
  }

  incrementApiKeyUsage(id: string): void {
    const apiKey = this.apiKeys.get(id);
    if (apiKey) {
      apiKey.usageCount++;
      apiKey.lastUsedAt = new Date();
    }
  }

  // ==================== Workers ====================

  getAllWorkers(limit: number = 100): Worker[] {
    return Array.from(this.workers.values()).slice(0, limit);
  }

  getWorker(id: string): Worker | undefined {
    return this.workers.get(id);
  }

  registerWorker(worker: Omit<Worker, 'id' | 'registeredAt' | 'lastHeartbeat' | 'currentJobs' | 'status'>): Worker {
    const id = `wk-${Date.now()}`;
    const now = new Date();
    const newWorker: Worker = {
      ...worker,
      id,
      status: 'online',
      currentJobs: 0,
      registeredAt: now,
      lastHeartbeat: now,
    };
    this.workers.set(id, newWorker);
    return newWorker;
  }

  updateWorkerHeartbeat(id: string): Worker | undefined {
    const worker = this.workers.get(id);
    if (!worker) return undefined;

    worker.lastHeartbeat = new Date();
    worker.status = 'online';
    return worker;
  }

  removeWorker(id: string): boolean {
    return this.workers.delete(id);
  }

  // ==================== Jobs ====================

  getAllJobs(limit: number = 100): TestJob[] {
    return Array.from(this.jobs.values()).slice(0, limit);
  }

  getQueuedJobs(): TestJob[] {
    return this.getAllJobs().filter(j => j.status === 'queued');
  }

  getJob(id: string): TestJob | undefined {
    return this.jobs.get(id);
  }

  createJob(job: Omit<TestJob, 'id' | 'createdAt' | 'status' | 'retryCount'>): TestJob {
    const id = `job-${Date.now()}-${generateRandomString(9)}`;
    const newJob: TestJob = {
      ...job,
      id,
      status: 'queued',
      retryCount: 0,
      createdAt: new Date(),
    };
    this.jobs.set(id, newJob);
    return newJob;
  }

  claimJob(jobId: string, workerId: string): TestJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'queued') return undefined;

    job.status = 'claimed';
    job.workerId = workerId;
    job.claimedAt = new Date();
    return job;
  }

  completeJob(jobId: string, result: ExecutionResult): TestJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date();
    return job;
  }

  failJob(jobId: string, error: string): TestJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;

    job.retryCount++;
    if (job.retryCount >= job.maxRetries) {
      job.status = 'failed';
      job.result = {
        scriptId: job.scriptId,
        browser: job.browser || 'chromium',
        status: 'failed',
        duration: 0,
        error,
      };
    } else {
      job.status = 'queued';
      job.workerId = undefined;
      job.claimedAt = undefined;
    }
    return job;
  }

  // ==================== Statistics ====================

  getStats(): DashboardStats {
    const runs = this.getAllTestRuns();
    const passing = runs.filter(r => r.status === 'passed').length;
    const failing = runs.filter(r => r.status === 'failed').length;
    const skipped = runs.filter(r => r.status === 'skipped').length;

    return {
      totalTests: this.testCases.size,
      totalRuns: runs.length,
      passing,
      failing,
      skipped,
      passRate: runs.length > 0 ? Math.round((passing / runs.length) * 100) : 0,
    };
  }
}

// Helper function to generate cryptographically secure random string
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for Node.js environments
    const nodeCrypto = require('crypto');
    const nodeRandom = nodeCrypto.randomBytes(length);
    randomBytes.set(nodeRandom);
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomBytes[i] % chars.length);
  }
  return result;
}

// Singleton instance
export const store = new Store();
