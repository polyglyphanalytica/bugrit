import { NextRequest } from 'next/server';
import { explainCodebase } from '@/ai/flows/explain-codebase';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';

/**
 * POST /api/v1/explain
 *
 * Generate an AI explanation of a codebase.
 * Requires authentication with 'scans:read' permission.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'scans:read');
    const body = await request.json();
    const { repoUrl, scanId, focus = 'all' } = body;

    if (!repoUrl && !scanId) {
      return Errors.validationError('Either repoUrl or scanId is required');
    }

    // Verify scan belongs to organization if scanId provided
    if (scanId) {
      const scanAccess = await verifyScanAccess(scanId, context.organizationId);
      if (!scanAccess) {
        return Errors.forbidden('No access to this scan');
      }
    }

    // Get codebase data from scan or fetch from repo
    const codebaseData = scanId
      ? await getCodebaseFromScan(scanId)
      : await fetchCodebaseFromRepo(repoUrl);

    if (!codebaseData) {
      return Errors.notFound('Codebase data');
    }

    // Generate explanation using AI
    const explanation = await explainCodebase({
      files: codebaseData.files,
      packageJson: codebaseData.packageJson,
      focus: focus as 'architecture' | 'security' | 'performance' | 'all',
    });

    const response = successResponse({
      repoUrl: repoUrl || codebaseData.repoUrl,
      scanId,
      focus,
      explanation,
      generatedAt: new Date().toISOString(),
    });

    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
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
