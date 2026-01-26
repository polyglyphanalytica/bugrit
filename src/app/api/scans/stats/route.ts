import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/scans/stats - Get scan statistics for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    const db = getDb();
    if (!db) {
      // Return empty stats if Firestore is not available
      return NextResponse.json({
        totalScans: 0,
        criticalFindings: 0,
        highFindings: 0,
        mediumFindings: 0,
        lowFindings: 0,
      });
    }

    // Get all completed scans for the user
    const snapshot = await db
      .collection(COLLECTIONS.SCANS)
      .where('userId', '==', userId)
      .get();

    let totalScans = 0;
    let criticalFindings = 0;
    let highFindings = 0;
    let mediumFindings = 0;
    let lowFindings = 0;

    for (const doc of snapshot.docs) {
      totalScans++;
      const data = doc.data();
      const summary = data.summary;
      if (summary) {
        // The scan model uses errors/warnings/info; map to severity levels
        criticalFindings += summary.errors || 0;
        highFindings += summary.warnings || 0;
        mediumFindings += summary.info || 0;
        // lowFindings stays 0 unless we add that severity level
      }
    }

    return NextResponse.json({
      totalScans,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
    });
  } catch (error) {
    logger.error('Error fetching scan stats', { error });
    return NextResponse.json(
      { error: 'Failed to fetch scan statistics' },
      { status: 500 }
    );
  }
}
