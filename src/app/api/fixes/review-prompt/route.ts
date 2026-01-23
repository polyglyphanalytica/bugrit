import { NextRequest, NextResponse } from 'next/server';
import { generateReviewMergePrompt, generateQuickReviewPrompt } from '@/ai/flows/generate-fix';

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
    // Fetch scan details (mock for now - replace with actual DB call)
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
    console.error('Error generating review prompt:', error);
    return NextResponse.json(
      { error: 'Failed to generate review prompt' },
      { status: 500 }
    );
  }
}

// Mock function - replace with actual database call
async function getScanData(scanId: string) {
  // TODO: Replace with actual Firestore query
  // const scan = await db.collection('scans').doc(scanId).get();
  // const fixes = await db.collection('fixes').where('scanId', '==', scanId).get();

  // Mock data for development
  return {
    repoUrl: 'https://github.com/example/repo',
    baseBranch: 'main',
    fixBranch: `bugrit/fixes-${scanId}`,
    prUrl: `https://github.com/example/repo/pull/123`,
    findings: [
      {
        id: 'finding-1',
        severity: 'critical',
        title: 'SQL Injection vulnerability',
        file: 'src/api/users.ts',
        line: 42,
      },
      {
        id: 'finding-2',
        severity: 'high',
        title: 'Cross-Site Scripting (XSS)',
        file: 'src/components/Comment.tsx',
        line: 18,
      },
      {
        id: 'finding-3',
        severity: 'medium',
        title: 'Missing input validation',
        file: 'src/api/posts.ts',
        line: 55,
      },
    ],
  };
}
