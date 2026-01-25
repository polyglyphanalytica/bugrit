import { NextRequest } from 'next/server';
import { generateFix, generateBatchFixes, GenerateFixInput } from '@/ai/flows/generate-fix';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';

// Maximum batch size to prevent abuse
const MAX_BATCH_SIZE = 50;

/**
 * POST /api/v1/fixes
 *
 * Generate a fix for a specific finding or batch of findings.
 * Requires authentication with 'scans:read' permission.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'scans:read');
    const body = await request.json();

    // Check if batch request
    if (body.findingIds && Array.isArray(body.findingIds)) {
      // Validate batch size
      if (body.findingIds.length > MAX_BATCH_SIZE) {
        return Errors.validationError(`Batch size exceeds maximum of ${MAX_BATCH_SIZE}`);
      }
      return handleBatchFixes(body, context);
    }

    // Single fix request
    return handleSingleFix(body, context);
  } catch (error) {
    return handleError(error);
  }
}

async function handleSingleFix(
  body: {
    findingId: string;
    scanId: string;
    context?: GenerateFixInput['context'];
  },
  authContext: { organizationId: string }
) {
  const { findingId, scanId, context } = body;

  if (!findingId || !scanId) {
    return Errors.validationError('findingId and scanId are required');
  }

  // Verify scan belongs to organization
  const scanAccess = await verifyScanAccess(scanId, authContext.organizationId);
  if (!scanAccess) {
    return Errors.forbidden('No access to this scan');
  }

  // Get finding details from database
  const finding = await getFindingDetails(scanId, findingId);

  if (!finding) {
    return Errors.notFound('Finding');
  }

  // Get file content if available
  const fileContent = finding.file
    ? (await getFileContent(scanId, finding.file)) ?? undefined
    : undefined;

  // Generate fix
  const fix = await generateFix({
    finding,
    fileContent,
    language: finding.file ? detectLanguage(finding.file) : undefined,
    context,
  });

  return successResponse({
    findingId,
    scanId,
    ...fix,
    generatedAt: new Date().toISOString(),
  });
}

async function handleBatchFixes(
  body: {
    scanId: string;
    findingIds: string[];
    context?: GenerateFixInput['context'];
  },
  authContext: { organizationId: string }
) {
  const { scanId, findingIds, context } = body;

  if (!scanId || !findingIds.length) {
    return Errors.validationError('scanId and findingIds are required');
  }

  // Verify scan belongs to organization
  const scanAccess = await verifyScanAccess(scanId, authContext.organizationId);
  if (!scanAccess) {
    return Errors.forbidden('No access to this scan');
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
    return Errors.notFound('Findings');
  }

  // Generate batch fixes
  const fixes = await generateBatchFixes(findings, fileContents, context);

  // Convert map to object
  const fixResults: Record<string, unknown> = {};
  for (const [id, fix] of fixes) {
    fixResults[id] = fix;
  }

  return successResponse({
    scanId,
    requested: findingIds.length,
    processed: findings.length,
    fixes: fixResults,
    generatedAt: new Date().toISOString(),
  });
}

async function verifyScanAccess(scanId: string, organizationId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    const scanDoc = await db.collection(COLLECTIONS.SCANS).doc(scanId).get();
    if (!scanDoc.exists) return false;

    const scanData = scanDoc.data();
    return scanData?.organizationId === organizationId;
  } catch (error) {
    logger.error('Error verifying scan access', { scanId, error });
    return false;
  }
}

async function getFindingDetails(scanId: string, findingId: string) {
  const db = getDb();
  if (!db) {
    logger.warn('Firestore not available for finding lookup');
    return null;
  }

  try {
    // First get the scan to access its findings
    const scanDoc = await db.collection(COLLECTIONS.SCANS).doc(scanId).get();
    if (!scanDoc.exists) {
      return null;
    }

    const scanData = scanDoc.data();
    const results = scanData?.results || [];

    // Search through tool results to find the specific finding
    for (const toolResult of results) {
      const findings = toolResult?.findings || [];
      const finding = findings.find((f: { id: string }) => f.id === findingId);
      if (finding) {
        return {
          id: finding.id,
          tool: toolResult.tool || 'unknown',
          severity: finding.severity || 'medium',
          title: finding.title || finding.message || 'Finding',
          description: finding.description || finding.message || '',
          file: finding.file || finding.location?.file,
          line: finding.line || finding.location?.line,
          codeSnippet: finding.codeSnippet || finding.snippet,
          recommendation: finding.recommendation || finding.fix,
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Error fetching finding details', { scanId, findingId, error });
    return null;
  }
}

async function getFileContent(scanId: string, filePath: string) {
  // File content is stored in scan artifacts in Cloud Storage
  // For now, return null - file content is optional for fix generation
  // TODO: Implement Cloud Storage file retrieval when needed
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
