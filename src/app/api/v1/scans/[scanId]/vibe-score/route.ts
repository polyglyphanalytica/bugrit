import { NextRequest, NextResponse } from 'next/server';
import { calculateVibeScore } from '@/lib/vibe-score/calculator';

interface RouteParams {
  params: Promise<{ scanId: string }>;
}

/**
 * GET /api/v1/scans/{scanId}/vibe-score
 *
 * Get the Vibe Score for a completed scan.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { scanId } = await params;

  try {
    // TODO: Replace with actual database query
    const scan = await getScanData(scanId);

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    if (scan.status !== 'completed') {
      return NextResponse.json(
        { error: 'Scan not yet completed', status: scan.status },
        { status: 400 }
      );
    }

    // Calculate Vibe Score from scan results
    const vibeScore = calculateVibeScore(scan.results);

    return NextResponse.json({
      scanId,
      score: vibeScore.score,
      grade: vibeScore.grade,
      components: {
        security: {
          score: vibeScore.components.security,
          weight: 0.30,
          issues: scan.results.security?.issues || 0,
        },
        codeQuality: {
          score: vibeScore.components.codeQuality,
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
      achievements: vibeScore.achievements,
      trend: vibeScore.trend,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating Vibe Score:', error);
    return NextResponse.json(
      { error: 'Failed to calculate Vibe Score' },
      { status: 500 }
    );
  }
}

// Mock function - replace with actual database query
async function getScanData(scanId: string) {
  // TODO: Replace with Firestore query
  return {
    id: scanId,
    status: 'completed',
    results: {
      security: { score: 92, issues: 2 },
      linting: { score: 85, issues: 15 },
      accessibility: { score: 88, issues: 5 },
      performance: { score: 82, metrics: { lcp: 2.1, fid: 50, cls: 0.05 } },
      dependencies: { score: 90, outdated: 3, vulnerabilities: 0 },
      documentation: { score: 75 },
    },
  };
}
