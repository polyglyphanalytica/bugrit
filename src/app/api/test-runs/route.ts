import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireAuthenticatedUser } from '@/lib/api-auth';

// GET /api/test-runs - Get all test runs
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuthenticatedUser(request);
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
    console.error('Error fetching test runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test runs' },
      { status: 500 }
    );
  }
}

// POST /api/test-runs - Create a new test run
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();

    const { testCaseId, testCaseName, runnerType, config, code } = body;

    if (!testCaseId || !testCaseName) {
      return NextResponse.json(
        { error: 'Missing required fields: testCaseId, testCaseName' },
        { status: 400 }
      );
    }

    // Create the test run record
    const testRun = store.createTestRun({
      testCaseId,
      testCaseName,
      status: 'running',
    });

    // Execute test in background using dynamic import
    executeTestInBackground(testRun.id, {
      runnerType: runnerType || 'playwright',
      config: config || {},
      code: code || '',
    });

    return NextResponse.json(testRun, { status: 201 });
  } catch (error) {
    console.error('Error creating test run:', error);
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
}

// Execute test using dynamically imported test runners
async function executeTestInBackground(testRunId: string, options: TestExecutionOptions) {
  const startTime = Date.now();

  try {
    // Dynamically import runners to avoid bundling issues
    let runner: { initialize: (config: Record<string, unknown>) => Promise<void>; runScript: (code: string, context: Record<string, unknown>) => Promise<{ success: boolean; duration: number; error?: string; logs?: string[]; screenshots?: string[] }>; cleanup: () => Promise<void> };

    switch (options.runnerType) {
      case 'playwright': {
        const { PlaywrightRunner } = await import('@/lib/runners/playwright-runner');
        runner = new PlaywrightRunner();
        break;
      }
      case 'appium': {
        const { AppiumRunner } = await import('@/lib/runners/appium-runner');
        runner = new AppiumRunner();
        break;
      }
      case 'tauri-driver': {
        const { TauriRunner } = await import('@/lib/runners/tauri-runner');
        runner = new TauriRunner();
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
  }
}
