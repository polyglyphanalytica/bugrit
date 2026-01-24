/**
 * Sessions API
 *
 * Manage audit sessions with real-time polling support.
 *
 * GET /api/sessions - List user's recent sessions
 * POST /api/sessions - Start a new streaming audit session
 */

import { NextRequest } from 'next/server';
import { streamingOrchestrator, sessionReportStore, StreamingOrchestratorConfig } from '@/lib/resilience';
import { authenticateRequest } from '@/lib/api/auth';
import { handleError, successResponse, Errors } from '@/lib/api/errors';
import { countLinesOfCode, getBillingAccount } from '@/lib/billing/scan-billing';
import { ToolCategory } from '@/lib/integrations/types';
import { logger } from '@/lib/logger';

/**
 * GET /api/sessions
 * List user's recent audit sessions
 */
export async function GET(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'scans:read');
    const userId = context.apiKey.ownerId;

    const url = new URL(request.url);
    const limitParam = parseInt(url.searchParams.get('limit') || '20', 10);
    // Validate and clamp limit to reasonable bounds
    const limit = Math.max(1, Math.min(100, isNaN(limitParam) ? 20 : limitParam));

    const sessions = await sessionReportStore.getUserSessions(userId, limit);

    return successResponse({
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    logger.error('Failed to list sessions', { error });
    return handleError(error);
  }
}

/**
 * POST /api/sessions
 * Start a new streaming audit session
 */
export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'scans:write');
    const userId = context.apiKey.ownerId;

    const body = await request.json();
    const {
      target,
      categories,
      tools,
      excludeTools,
      enableIntelligence = true,
      timeout,
      maxConcurrent,
      scanId,
    } = body;

    // Validate target
    if (!target || (!target.directory && !target.url && !target.urls)) {
      return Errors.validationError('Target must include directory, url, or urls');
    }

    // Check billing account exists
    const account = await getBillingAccount(userId);
    if (!account) {
      return Errors.paymentRequired('Billing account not found');
    }

    // Basic credit check
    if (account.credits.remaining <= 0) {
      return Errors.paymentRequired('Insufficient credits. Please upgrade your plan.');
    }

    // Count lines of code if directory provided
    let estimatedLines = 0;
    if (target.directory) {
      estimatedLines = await countLinesOfCode(target.directory);
    }

    // Get tool categories that will run
    const selectedCategories: ToolCategory[] = categories || [
      'code-quality',
      'security',
      'accessibility',
      'performance',
    ];

    // Generate scan ID
    // Generate cryptographically secure scan ID if not provided
    let generatedScanId = scanId;
    if (!generatedScanId) {
      const randomBytes = new Uint8Array(5);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(randomBytes);
      } else {
        const nodeCrypto = require('crypto');
        const nodeRandom = nodeCrypto.randomBytes(5);
        randomBytes.set(nodeRandom);
      }
      const random = Array.from(randomBytes)
        .map(b => b.toString(36).padStart(2, '0'))
        .join('')
        .substring(0, 9);
      generatedScanId = `scan-${Date.now()}-${random}`;
    }

    // Start streaming audit
    const config: StreamingOrchestratorConfig = {
      userId,
      organizationId: context.organizationId,
      scanId: generatedScanId,
      categories: selectedCategories,
      tools,
      excludeTools,
      generateIntelligence: enableIntelligence,
      timeout: timeout || 300000,
      maxConcurrent: maxConcurrent || 5,
      enableRetry: true,
      enableBulkhead: true,
      enableCreditRefund: true,
      estimatedLinesOfCode: estimatedLines,
    };

    const handle = await streamingOrchestrator.startAudit(target, config);

    logger.info('Streaming audit session started', {
      sessionId: handle.sessionId,
      userId,
      scanId: generatedScanId,
      categories: selectedCategories,
    });

    return successResponse({
      sessionId: handle.sessionId,
      scanId: generatedScanId,
      status: 'started',
      message: 'Audit session started. Poll /api/sessions/{sessionId} for real-time updates.',
      pollUrls: {
        full: `/api/sessions/${handle.sessionId}`,
        progress: `/api/sessions/${handle.sessionId}?progress=true`,
        newReports: `/api/sessions/${handle.sessionId}?since={timestamp}`,
      },
    }, 202);
  } catch (error) {
    logger.error('Failed to start session', { error });
    return handleError(error);
  }
}
