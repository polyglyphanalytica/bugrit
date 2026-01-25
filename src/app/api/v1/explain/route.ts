import { NextRequest } from 'next/server';
import { explainCodebase } from '@/ai/flows/explain-codebase';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';

/**
 * POST /api/v1/explain
 *
 * Generate an AI explanation of a codebase based on scan findings.
 * Requires authentication with 'scans:read' permission.
 *
 * Body:
 * - scanId: string (required) - The scan ID to explain
 * - question: string (required) - The question to answer about the codebase
 */
export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'scans:read');
    const body = await request.json();
    const { scanId, question } = body;

    if (!scanId) {
      return Errors.validationError('scanId is required');
    }

    if (!question) {
      return Errors.validationError('question is required');
    }

    // Verify scan belongs to organization
    const scanData = await getScanWithFindings(scanId, context.organizationId);
    if (!scanData) {
      return Errors.notFound('Scan');
    }

    if (!scanData.hasAccess) {
      return Errors.forbidden('No access to this scan');
    }

    // Generate explanation using AI
    const explanation = await explainCodebase({
      question,
      findings: scanData.findings,
      vibeScore: scanData.vibeScore,
      repoInfo: scanData.repoInfo,
    });

    const response = successResponse({
      scanId,
      question,
      answer: explanation.answer,
      insights: explanation.insights,
      followUpQuestions: explanation.followUpQuestions,
      canOfferFix: explanation.canOfferFix,
      fixSuggestion: explanation.fixSuggestion,
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

async function getScanWithFindings(scanId: string, organizationId: string) {
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
    const hasAccess = scanData?.organizationId === organizationId;

    if (!hasAccess) {
      return { hasAccess: false, findings: [], vibeScore: undefined, repoInfo: undefined };
    }

    // Get findings from subcollection
    const findingsSnapshot = await db
      .collection(COLLECTIONS.SCANS)
      .doc(scanId)
      .collection('findings')
      .get();

    const findings = findingsSnapshot.docs.map(findingDoc => {
      const data = findingDoc.data();
      return {
        tool: data.tool || 'unknown',
        severity: data.severity || 'medium',
        title: data.title || data.message || 'Unknown finding',
        description: data.description || '',
        file: data.file || data.location?.file,
        line: data.line || data.location?.line,
        category: data.category || 'code-quality',
      };
    });

    // Build vibe score if available
    const vibeScore = scanData?.vibeScore ? {
      overall: scanData.vibeScore.overall || 0,
      components: {
        security: scanData.vibeScore.components?.security || 0,
        quality: scanData.vibeScore.components?.quality || 0,
        accessibility: scanData.vibeScore.components?.accessibility || 0,
        performance: scanData.vibeScore.components?.performance || 0,
        dependencies: scanData.vibeScore.components?.dependencies || 0,
        documentation: scanData.vibeScore.components?.documentation || 0,
      },
    } : undefined;

    // Build repo info
    const repoInfo = {
      name: scanData?.source?.repoUrl || scanData?.source?.url || 'Unknown',
      language: scanData?.metadata?.primaryLanguage,
      framework: scanData?.metadata?.framework,
      linesOfCode: scanData?.metadata?.linesOfCode,
      fileCount: scanData?.metadata?.fileCount,
    };

    return {
      hasAccess: true,
      findings,
      vibeScore,
      repoInfo,
    };
  } catch (error) {
    logger.error('Error fetching scan for explain', { scanId, error });
    return null;
  }
}
