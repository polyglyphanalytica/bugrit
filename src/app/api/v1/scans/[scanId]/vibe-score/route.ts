import { NextRequest, NextResponse } from 'next/server';
import { calculateVibeScore } from '@/lib/vibe-score/calculator';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';
import { authenticateRequest } from '@/lib/api/auth';
import { handleError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ scanId: string }>;
}

/**
 * GET /api/v1/scans/{scanId}/vibe-score
 *
 * Get the Vibe Score for a completed scan.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { scanId } = await params;
    const context = await authenticateRequest(request, 'scans:read');

    const scan = await getScanData(scanId);

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    // SECURITY: Verify organization owns this scan via the project
    if (scan.projectId) {
      const db = getDb();
      if (db) {
        const projectDoc = await db.collection('projects').doc(scan.projectId).get();
        const project = projectDoc.exists ? projectDoc.data() : null;
        if (!project || project.organizationId !== context.organizationId) {
          return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        }
      }
    }

    if (scan.status !== 'completed') {
      return NextResponse.json(
        { error: 'Scan not yet completed', status: scan.status },
        { status: 400 }
      );
    }

    // Calculate Vibe Score from scan results
    const vibeScore = calculateVibeScore(scan.results);
    if (!vibeScore) {
      return NextResponse.json(
        { error: 'Failed to calculate vibe score' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      scanId,
      score: vibeScore.overall,
      grade: vibeScore.grade,
      components: {
        security: {
          score: vibeScore.components.security,
          weight: 0.30,
          issues: scan.results.security?.issues || 0,
        },
        codeQuality: {
          score: vibeScore.components.quality,
          weight: 0.25,
          issues: scan.results.linting?.issues || 0,
        },
        accessibility: {
          score: vibeScore.components.accessibility,
          weight: 0.15,
          issues: scan.results.accessibility?.issues || 0,
        },
        performance: {
          score: vibeScore.components.performance,
          weight: 0.15,
          metrics: scan.results.performance?.metrics || {},
        },
        dependencies: {
          score: vibeScore.components.dependencies,
          weight: 0.10,
          outdated: scan.results.dependencies?.outdated || 0,
        },
        documentation: {
          score: vibeScore.components.documentation,
          weight: 0.05,
        },
      },
      trend: vibeScore.trend,
      percentile: vibeScore.percentile,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
}

async function getScanData(scanId: string) {
  const db = getDb();
  if (!db) {
    logger.warn('Firestore not available for vibe score lookup');
    return null;
  }

  try {
    const doc = await db.collection(COLLECTIONS.SCANS).doc(scanId).get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      projectId: data?.projectId,
      status: data?.status,
      results: data?.results || {
        security: { score: 0, issues: 0 },
        linting: { score: 0, issues: 0 },
        accessibility: { score: 0, issues: 0 },
        performance: { score: 0, metrics: {} },
        dependencies: { score: 0, outdated: 0, vulnerabilities: 0 },
        documentation: { score: 0 },
      },
    };
  } catch (error) {
    logger.error('Error fetching scan data', { scanId, error });
    return null;
  }
}
