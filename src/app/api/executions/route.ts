import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requirePermission } from '@/lib/api-auth';
import { BrowserType, NativePlatform } from '@/lib/types';
import { logger } from '@/lib/logger';

// GET /api/executions - Get all executions
export async function GET(request: NextRequest) {
  const authError = requirePermission(request, 'executions:read');
  if (authError) return authError;

  try {
    const executions = store.getAllExecutions();

    return NextResponse.json({
      executions,
      count: executions.length,
    });
  } catch (error) {
    logger.error('Error fetching executions', { error });
    return NextResponse.json(
      { error: 'Failed to fetch executions' },
      { status: 500 }
    );
  }
}

// POST /api/executions - Trigger a new execution
export async function POST(request: NextRequest) {
  const authError = requirePermission(request, 'executions:trigger');
  if (authError) return authError;

  try {
    const body = await request.json();

    const { scriptIds, browsers, nativePlatforms } = body;

    if (!scriptIds || !Array.isArray(scriptIds) || scriptIds.length === 0) {
      return NextResponse.json(
        { error: 'scriptIds array is required' },
        { status: 400 }
      );
    }

    // Validate all scripts exist
    for (const scriptId of scriptIds) {
      const script = store.getTestScript(scriptId);
      if (!script) {
        return NextResponse.json(
          { error: `Script not found: ${scriptId}` },
          { status: 404 }
        );
      }
    }

    const defaultBrowsers: BrowserType[] = ['chromium'];
    const execution = store.createExecution({
      scriptIds,
      browsers: browsers || defaultBrowsers,
      nativePlatforms: nativePlatforms as NativePlatform[] | undefined,
    });

    // Determine execution mode
    const hasNativePlatforms =
      nativePlatforms && nativePlatforms.length > 0;
    const mode = hasNativePlatforms ? 'queued' : 'local';

    // For local mode, simulate immediate execution
    if (mode === 'local') {
      simulateExecution(execution.id, scriptIds, browsers || defaultBrowsers);
    }

    return NextResponse.json(
      {
        id: execution.id,
        mode,
        message:
          mode === 'local'
            ? 'Execution started'
            : 'Execution queued for workers',
        execution,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating execution', { error });
    return NextResponse.json(
      { error: 'Failed to create execution' },
      { status: 500 }
    );
  }
}

// Simulate execution (for demo purposes)
function simulateExecution(
  executionId: string,
  scriptIds: string[],
  browsers: BrowserType[]
) {
  // Update to running
  store.updateExecution(executionId, { status: 'running' });

  // Simulate each script running on each browser
  const totalDuration = 2000 + Math.random() * 3000;

  setTimeout(() => {
    // Generate results
    for (const scriptId of scriptIds) {
      for (const browser of browsers) {
        const passed = Math.random() > 0.2; // 80% pass rate
        store.addExecutionResult(executionId, {
          scriptId,
          browser,
          status: passed ? 'passed' : 'failed',
          duration: Math.round(500 + Math.random() * 2000),
          error: passed ? undefined : 'Simulated test failure',
        });
      }
    }

    // Complete the execution
    const execution = store.getExecution(executionId);
    const allPassed = execution?.results.every((r) => r.status === 'passed');
    store.updateExecution(executionId, {
      status: allPassed ? 'completed' : 'failed',
      completedAt: new Date(),
    });
  }, totalDuration);
}
