import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { logger } from '@/lib/logger';

// GET /api/test-runs/stats - Get dashboard statistics
export async function GET() {
  try {
    const stats = store.getStats();

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Error fetching stats', { error });
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
