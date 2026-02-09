import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

const MAX_CODE_LENGTH = 100_000; // 100KB limit for script code

// GET /api/scripts - Get user's test scripts
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { searchParams } = new URL(request.url);
    const regression = searchParams.get('regression') === 'true';

    const scripts = regression
      ? store.getUserRegressionScripts(userId)
      : store.getUserTestScripts(userId);

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
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

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

    // Validate code size to prevent resource exhaustion
    if (typeof code !== 'string' || code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        { error: `Code exceeds maximum size of ${MAX_CODE_LENGTH} characters` },
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
      userId,
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
