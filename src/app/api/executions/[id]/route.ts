import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requirePermission } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/executions/[id] - Get execution status
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = requirePermission(request, 'executions:read');
  if (authError) return authError;

  try {
    const { id } = await params;
    const execution = store.getExecution(id);

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Calculate summary
    const results = execution.results;
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
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}
