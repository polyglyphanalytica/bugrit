import { NextRequest, NextResponse } from 'next/server';
import { explainCodebase } from '@/ai/flows/explain-codebase';

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
        { error: 'Could not retrieve codebase data' },
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
    console.error('Error explaining codebase:', error);
    return NextResponse.json(
      { error: 'Failed to generate codebase explanation' },
      { status: 500 }
    );
  }
}

// Mock functions - replace with actual implementations
async function getCodebaseFromScan(scanId: string) {
  // TODO: Fetch from Firestore
  return {
    repoUrl: 'https://github.com/example/repo',
    files: [
      { path: 'src/index.ts', content: '// entry point' },
      { path: 'src/components/App.tsx', content: '// main component' },
    ],
    packageJson: {
      name: 'example',
      dependencies: { react: '^18.0.0', next: '^14.0.0' },
    },
  };
}

async function fetchCodebaseFromRepo(repoUrl: string) {
  // TODO: Clone and analyze repo
  return null;
}
