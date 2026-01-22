/**
 * Session Reports API
 *
 * Real-time polling endpoint for aggregated audit reports.
 * Each tool's report is stored immediately as it completes,
 * and this endpoint returns the current aggregated state.
 *
 * GET /api/sessions/[sessionId] - Get current aggregated report
 * GET /api/sessions/[sessionId]?progress=true - Get progress only (lightweight)
 * GET /api/sessions/[sessionId]?since=<timestamp> - Get new reports since timestamp
 */

import { NextRequest } from 'next/server';
import { sessionReportStore } from '@/lib/resilience';
import { authenticateRequest } from '@/lib/api/auth';
import { handleError, successResponse, Errors } from '@/lib/api/errors';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: {
    sessionId: string;
  };
}

/**
 * GET /api/sessions/[sessionId]
 * Get aggregated report for polling
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'scans:read');
    const userId = context.apiKey.ownerId;
    const { sessionId } = params;

    const url = new URL(request.url);
    const progressOnly = url.searchParams.get('progress') === 'true';
    const sinceParam = url.searchParams.get('since');

    // Progress-only polling (lightweight)
    if (progressOnly) {
      const progress = await sessionReportStore.getProgress(sessionId);

      if (!progress) {
        return Errors.notFound('Session');
      }

      return successResponse({
        sessionId,
        ...progress,
      });
    }

    // Get new reports since timestamp
    if (sinceParam) {
      const since = new Date(sinceParam);
      if (isNaN(since.getTime())) {
        return Errors.validationError('Invalid since timestamp');
      }

      const newReports = await sessionReportStore.getNewReports(sessionId, since);
      const progress = await sessionReportStore.getProgress(sessionId);

      return successResponse({
        sessionId,
        progress: progress?.progress,
        status: progress?.status,
        newReports,
        lastUpdated: progress?.lastUpdated,
      });
    }

    // Full aggregated report
    const report = await sessionReportStore.getAggregatedReport(sessionId);

    if (!report) {
      return Errors.notFound('Session');
    }

    // Verify user owns this session
    if (report.userId !== userId) {
      return Errors.forbidden('Not authorized to view this session');
    }

    return successResponse(report);
  } catch (error) {
    logger.error('Failed to get session report', { error });
    return handleError(error);
  }
}
