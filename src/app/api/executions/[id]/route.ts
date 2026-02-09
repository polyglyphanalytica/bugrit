import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/executions/[id] - Get execution status (owned by user)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;
    const execution = store.getExecution(id);

    if (!execution || execution.userId !== userId) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Calculate summary
    const results = execution.results || [];
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return NextResponse.json({
      ...execution,
      summary: {
        total: results.length,
        passed,
        failed,
        skipped,
        passRate:
          results.length > 0 ? Math.round((passed / results.length) * 100) : 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching execution', { error });
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}
