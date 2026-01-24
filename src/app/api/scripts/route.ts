import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requirePermission } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

// GET /api/scripts - Get all test scripts
export async function GET(request: NextRequest) {
  const authError = requirePermission(request, 'scripts:read');
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const regression = searchParams.get('regression') === 'true';

    const scripts = regression
      ? store.getRegressionScripts()
      : store.getAllTestScripts();

    return NextResponse.json({
      scripts,
      count: scripts.length,
    });
  } catch (error) {
    logger.error('Error fetching scripts', { error });
    return NextResponse.json(
      { error: 'Failed to fetch scripts' },
      { status: 500 }
    );
  }
}

// POST /api/scripts - Submit a new test script
export async function POST(request: NextRequest) {
  const authError = requirePermission(request, 'scripts:submit');
  if (authError) return authError;

  try {
    const body = await request.json();

    const { name, description, code, targetUrl, tags, appId, buildId, runnerType, targetPlatform } = body;

    if (!name || !code || !targetUrl || !appId || !buildId) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: name, code, targetUrl, appId, buildId',
        },
        { status: 400 }
      );
    }

    const script = store.createTestScript({
      name,
      description: description || '',
      code,
      targetUrl,
      tags: tags || [],
      appId,
      buildId,
      runnerType: runnerType || 'playwright',
      targetPlatform,
    });

    return NextResponse.json(
      {
        id: script.id,
        message: 'Script submitted successfully',
        script,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating script', { error });
    return NextResponse.json(
      { error: 'Failed to create script' },
      { status: 500 }
    );
  }
}
