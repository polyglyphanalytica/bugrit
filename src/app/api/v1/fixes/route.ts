import { NextRequest, NextResponse } from 'next/server';
import { generateFix, generateBatchFixes, GenerateFixInput } from '@/ai/flows/generate-fix';

/**
 * POST /api/v1/fixes
 *
 * Generate a fix for a specific finding or batch of findings.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if batch request
    if (body.findingIds && Array.isArray(body.findingIds)) {
      return handleBatchFixes(body);
    }

    // Single fix request
    return handleSingleFix(body);
  } catch (error) {
    console.error('Error generating fix:', error);
    return NextResponse.json(
      { error: 'Failed to generate fix' },
      { status: 500 }
    );
  }
}

async function handleSingleFix(body: {
  findingId: string;
  scanId: string;
  context?: GenerateFixInput['context'];
}) {
  const { findingId, scanId, context } = body;

  if (!findingId || !scanId) {
    return NextResponse.json(
      { error: 'findingId and scanId are required' },
      { status: 400 }
    );
  }

  // Get finding details from database
  const finding = await getFindingDetails(scanId, findingId);

  if (!finding) {
    return NextResponse.json(
      { error: 'Finding not found' },
      { status: 404 }
    );
  }

  // Get file content if available
  const fileContent = finding.file
    ? await getFileContent(scanId, finding.file)
    : undefined;

  // Generate fix
  const fix = await generateFix({
    finding,
    fileContent,
    language: finding.file ? detectLanguage(finding.file) : undefined,
    context,
  });

  return NextResponse.json({
    findingId,
    scanId,
    ...fix,
    generatedAt: new Date().toISOString(),
  });
}

async function handleBatchFixes(body: {
  scanId: string;
  findingIds: string[];
  context?: GenerateFixInput['context'];
}) {
  const { scanId, findingIds, context } = body;

  if (!scanId || !findingIds.length) {
    return NextResponse.json(
      { error: 'scanId and findingIds are required' },
      { status: 400 }
    );
  }

  // Get all findings
  const findings: GenerateFixInput['finding'][] = [];
  const fileContents = new Map<string, string>();

  for (const findingId of findingIds) {
    const finding = await getFindingDetails(scanId, findingId);
    if (finding) {
      findings.push(finding);
      if (finding.file && !fileContents.has(finding.file)) {
        const content = await getFileContent(scanId, finding.file);
        if (content) {
          fileContents.set(finding.file, content);
        }
      }
    }
  }

  if (findings.length === 0) {
    return NextResponse.json(
      { error: 'No valid findings found' },
      { status: 404 }
    );
  }

  // Generate batch fixes
  const fixes = await generateBatchFixes(findings, fileContents, context);

  // Convert map to object
  const fixResults: Record<string, unknown> = {};
  for (const [id, fix] of fixes) {
    fixResults[id] = fix;
  }

  return NextResponse.json({
    scanId,
    requested: findingIds.length,
    processed: findings.length,
    fixes: fixResults,
    generatedAt: new Date().toISOString(),
  });
}

// Mock functions - replace with actual implementations
async function getFindingDetails(scanId: string, findingId: string) {
  // TODO: Fetch from Firestore
  return {
    id: findingId,
    tool: 'eslint-security',
    severity: 'high' as const,
    title: 'Potential XSS vulnerability',
    description: 'User input is rendered without sanitization',
    file: 'src/components/Comment.tsx',
    line: 42,
    codeSnippet: 'dangerouslySetInnerHTML={{ __html: userInput }}',
    recommendation: 'Use DOMPurify to sanitize HTML',
  };
}

async function getFileContent(scanId: string, filePath: string) {
  // TODO: Fetch from Cloud Storage or repo
  return null;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    go: 'go',
    rs: 'rust',
  };
  return langMap[ext || ''] || ext || 'text';
}
