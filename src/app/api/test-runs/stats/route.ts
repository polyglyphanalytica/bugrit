import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/api-auth';

// GET /api/test-runs/stats - Get user's dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const stats = store.getUserStats(userId);

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Error fetching stats', { error });
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
