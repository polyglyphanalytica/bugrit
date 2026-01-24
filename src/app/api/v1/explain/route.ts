import { NextRequest, NextResponse } from 'next/server';
import { explainCodebase } from '@/ai/flows/explain-codebase';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';

/**
 * POST /api/v1/explain
 *
 * Generate an AI explanation of a codebase.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, scanId, focus = 'all' } = body;

    if (!repoUrl && !scanId) {
      return NextResponse.json(
        { error: 'Either repoUrl or scanId is required' },
        { status: 400 }
      );
    }

    // Get codebase data from scan or fetch from repo
    const codebaseData = scanId
      ? await getCodebaseFromScan(scanId)
      : await fetchCodebaseFromRepo(repoUrl);

    if (!codebaseData) {
      return NextResponse.json(
        { error: 'Could not retrieve codebase data. Ensure the scan exists and has completed.' },
        { status: 404 }
      );
    }

    // Generate explanation using AI
    const explanation = await explainCodebase({
      files: codebaseData.files,
      packageJson: codebaseData.packageJson,
      focus: focus as 'architecture' | 'security' | 'performance' | 'all',
    });

    return NextResponse.json({
      repoUrl: repoUrl || codebaseData.repoUrl,
      scanId,
      focus,
      explanation,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error explaining codebase', { error });
    return NextResponse.json(
      { error: 'Failed to generate codebase explanation' },
      { status: 500 }
    );
  }
}

async function getCodebaseFromScan(scanId: string) {
  const db = getDb();
  if (!db) {
    logger.warn('Firestore not available for scan lookup');
    return null;
  }

  try {
    const scanDoc = await db.collection(COLLECTIONS.SCANS).doc(scanId).get();
    if (!scanDoc.exists) {
      return null;
    }

    const scanData = scanDoc.data();
    if (scanData?.status !== 'completed') {
      logger.info('Scan not yet completed', { scanId, status: scanData?.status });
      return null;
    }

    // Get codebase data from scan metadata
    return {
      repoUrl: scanData?.source?.repoUrl || scanData?.source?.url || '',
      files: scanData?.codebaseSnapshot?.files || [],
      packageJson: scanData?.codebaseSnapshot?.packageJson || null,
    };
  } catch (error) {
    logger.error('Error fetching scan for explain', { scanId, error });
    return null;
  }
}

async function fetchCodebaseFromRepo(repoUrl: string) {
  // Fetching from a repo URL requires cloning - this is handled by the scan flow
  // For direct repo explanation, the user should first run a scan
  logger.info('Direct repo fetch not yet supported', { repoUrl });
  return null;
}
