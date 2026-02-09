import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { notifyTestCompleted, notifyTestFailed } from '@/lib/notifications/dispatcher';
import { getDb } from '@/lib/firestore';
import { logger } from '@/lib/logger';

/**
 * Get user email from Firestore
 */
async function getUserEmail(userId: string): Promise<string> {
  const db = getDb();
  if (db) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        return userDoc.data()?.email || userId;
      }
    } catch (error) {
      logger.warn('Could not fetch user email', { error });
    }
  }
  return userId; // Fallback to userId
}

// GET /api/test-runs - Get all test runs
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const runs = store.getRecentTestRuns(limit);

    return NextResponse.json({
      runs,
      count: runs.length,
    });
  } catch (error) {
    logger.error('Error fetching test runs', { error });
    return NextResponse.json(
      { error: 'Failed to fetch test runs' },
      { status: 500 }
    );
  }
}

// POST /api/test-runs - Create a new test run
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // authResult is the userId string
    const userId = authResult;
    const userEmail = await getUserEmail(userId);

    const body = await request.json();

    const { testCaseId, testCaseName, runnerType, config, scriptId } = body;

    if (!testCaseId || !testCaseName) {
      return NextResponse.json(
        { error: 'Missing required fields: testCaseId, testCaseName' },
        { status: 400 }
      );
    }

    // SECURITY: Code must come from a stored script, not inline in the request body.
    // Accepting arbitrary code would allow remote code execution (RCE).
    let code = '';
    if (scriptId) {
      const script = store.getTestScript(scriptId);
      if (!script) {
        return NextResponse.json(
          { error: 'Script not found. Create one via /api/scripts first.' },
          { status: 404 }
        );
      }
      code = script.code;
    } else if (body.code) {
      return NextResponse.json(
        { error: 'Inline code execution is not allowed. Create a script via /api/scripts first and pass scriptId.' },
        { status: 403 }
      );
    }

    // Create the test run record
    const testRun = store.createTestRun({
      testCaseId,
      testCaseName,
      status: 'running',
    });

    // Get base URL for notification links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bugrit.com';

    // Execute test in background using dynamic import
    executeTestInBackground(testRun.id, testCaseName, {
      runnerType: runnerType || 'playwright',
      config: config || {},
      code,
      userId,
      userEmail,
      baseUrl,
    });

    return NextResponse.json(testRun, { status: 201 });
  } catch (error) {
    logger.error('Error creating test run', { error });
    return NextResponse.json(
      { error: 'Failed to create test run' },
      { status: 500 }
    );
  }
}

interface TestExecutionOptions {
  runnerType: 'playwright' | 'appium' | 'tauri-driver';
  config: Record<string, unknown>;
  code: string;
  userId: string;
  userEmail: string;
  baseUrl: string;
}

// Runner interface for test execution
interface TestRunner {
  initialize: (config: unknown) => Promise<void>;
  runScript: (code: string, context: unknown) => Promise<{
    success: boolean;
    duration: number;
    error?: string;
    logs?: string[];
    screenshots?: string[];
  }>;
  cleanup: () => Promise<void>;
}

// Execute test using dynamically imported test runners
async function executeTestInBackground(testRunId: string, testName: string, options: TestExecutionOptions) {
  const startTime = Date.now();
  const testUrl = `${options.baseUrl}/test-runs/${testRunId}`;

  try {
    // Dynamically import runners to avoid bundling issues
    let runner: TestRunner;

    switch (options.runnerType) {
      case 'playwright': {
        const { PlaywrightRunner } = await import('@/lib/runners/playwright-runner');
        runner = new PlaywrightRunner() as TestRunner;
        break;
      }
      case 'appium': {
        const { AppiumRunner } = await import('@/lib/runners/appium-runner');
        runner = new AppiumRunner() as TestRunner;
        break;
      }
      case 'tauri-driver': {
        const { TauriRunner } = await import('@/lib/runners/tauri-runner');
        runner = new TauriRunner() as TestRunner;
        break;
      }
      default:
        throw new Error(`Unknown runner type: ${options.runnerType}`);
    }

    // Initialize runner
    await runner.initialize({
      runnerType: options.runnerType,
      ...options.config,
    });

    try {
      // Run the test
      const result = await runner.runScript(options.code, {
        testId: testRunId,
        scriptId: testRunId,
        applicationId: 'api-test',
        screenshots: true,
      });

      // Update test run with results
      store.updateTestRun(testRunId, {
        status: result.success ? 'passed' : 'failed',
        duration: result.duration,
        completedAt: new Date(),
        error: result.error,
        logs: result.logs,
        screenshots: result.screenshots,
      });

      // Send notification
      if (options.userId && options.userEmail) {
        await notifyTestCompleted({
          userId: options.userId,
          userEmail: options.userEmail,
          testRunId,
          testName,
          duration: result.duration,
          passed: result.success,
          testUrl,
        });
      }
    } finally {
      // Always cleanup runner
      await runner.cleanup();
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    store.updateTestRun(testRunId, {
      status: 'failed',
      duration,
      completedAt: new Date(),
      error: errorMessage,
      logs: [`Test execution failed: ${errorMessage}`],
    });

    // Send failure notification
    if (options.userId && options.userEmail) {
      await notifyTestFailed({
        userId: options.userId,
        userEmail: options.userEmail,
        testRunId,
        testName,
        error: errorMessage,
        testUrl,
      });
    }
  }
}
