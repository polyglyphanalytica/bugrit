import { NextRequest, NextResponse } from 'next/server';
import { generateReviewMergePrompt, generateQuickReviewPrompt } from '@/ai/flows/generate-fix';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';

/**
 * GET /api/fixes/review-prompt
 *
 * Generates an AI agent prompt for reviewing and merging a fix branch.
 *
 * Query params:
 * - scanId: The scan ID (required)
 * - format: 'full' | 'quick' (default: 'full')
 *
 * Returns the prompt as plain text (for easy copy/paste) or JSON.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');
  const format = searchParams.get('format') || 'full';
  const responseFormat = searchParams.get('response') || 'text';

  if (!scanId) {
    return NextResponse.json(
      { error: 'scanId is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch scan details from database
    const scanData = await getScanData(scanId);

    if (!scanData) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    let prompt: string;

    if (format === 'quick') {
      prompt = generateQuickReviewPrompt({
        repoUrl: scanData.repoUrl,
        baseBranch: scanData.baseBranch,
        fixBranch: scanData.fixBranch,
        findingCount: scanData.findings.length,
        criticalCount: scanData.findings.filter(f => f.severity === 'critical').length,
        highCount: scanData.findings.filter(f => f.severity === 'high').length,
      });
    } else {
      prompt = generateReviewMergePrompt({
        repoUrl: scanData.repoUrl,
        baseBranch: scanData.baseBranch,
        fixBranch: scanData.fixBranch,
        scanId,
        findings: scanData.findings,
        prUrl: scanData.prUrl,
      });
    }

    // Return as plain text for easy copy/paste
    if (responseFormat === 'text') {
      return new NextResponse(prompt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }

    // Return as JSON
    return NextResponse.json({
      scanId,
      format,
      prompt,
      metadata: {
        repoUrl: scanData.repoUrl,
        baseBranch: scanData.baseBranch,
        fixBranch: scanData.fixBranch,
        findingCount: scanData.findings.length,
        prUrl: scanData.prUrl,
      },
    });
  } catch (error) {
    logger.error('Error generating review prompt', { error });
    return NextResponse.json(
      { error: 'Failed to generate review prompt' },
      { status: 500 }
    );
  }
}

// Fetch scan data from Firestore
async function getScanData(scanId: string) {
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
    if (!scanData) {
      return null;
    }

    // Get findings from the scan
    const findingsSnapshot = await db
      .collection(COLLECTIONS.SCANS)
      .doc(scanId)
      .collection('findings')
      .limit(100)
      .get();

    const findings = findingsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        severity: data.severity || 'medium',
        title: data.title || data.message || 'Unknown finding',
        file: data.file || data.location?.file,
        line: data.line || data.location?.line,
      };
    });

    return {
      repoUrl: scanData.source?.repoUrl || scanData.source?.url || '',
      baseBranch: scanData.baseBranch || 'main',
      fixBranch: scanData.fixBranch || `bugrit/fixes-${scanId}`,
      prUrl: scanData.prUrl || null,
      findings,
    };
  } catch (error) {
    logger.error('Error fetching scan data for review prompt', { scanId, error });
    return null;
  }
}
