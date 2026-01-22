/**
 * System Health API
 *
 * Provides comprehensive health monitoring for the tool orchestration system.
 * Admin-only endpoints for viewing and managing system health.
 *
 * GET /api/admin/health - Get system health status
 * POST /api/admin/health/reset-circuit/:toolName - Reset a circuit breaker
 * POST /api/admin/health/reset-all-circuits - Reset all circuit breakers
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthMonitor, circuitRegistry, bulkheadRegistry, jobQueue } from '@/lib/resilience';
import { authenticateRequest } from '@/lib/api/auth';
import { handleError, successResponse, Errors } from '@/lib/api/errors';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/health
 * Get comprehensive system health status
 */
export async function GET(request: NextRequest) {
  try {
    // Admin endpoint - use reports:read permission as proxy for admin access
    const context = await authenticateRequest(request, 'reports:read');
    const userId = context.apiKey.ownerId;

    // In production, would check admin role from organization membership
    // For now, allow any authenticated user with reports:read

    const [systemHealth, queueStats, circuitHealth, bulkheadHealth] = await Promise.all([
      healthMonitor.getSystemHealth(),
      jobQueue.getStats(),
      Promise.resolve(circuitRegistry.getHealthSummary()),
      Promise.resolve(bulkheadRegistry.getHealthSummary()),
    ]);

    // Get detailed tool health
    const toolHealth = healthMonitor.getAllToolHealth();

    // Get DLQ preview
    const dlqPreview = await jobQueue.getDLQEntries(10);

    return successResponse({
      system: systemHealth,

      tools: {
        summary: systemHealth.tools,
        details: toolHealth,
      },

      circuits: {
        summary: circuitHealth,
        byTool: circuitRegistry.getAllStats(),
      },

      bulkheads: {
        summary: bulkheadHealth,
        byCategory: bulkheadRegistry.getAllStats(),
      },

      queue: {
        stats: queueStats,
        dlqPreview: dlqPreview.map(j => ({
          id: j.id,
          scanId: j.scanId,
          movedAt: j.movedAt,
          reason: j.reason,
          attempts: j.attempts,
        })),
      },

      alerts: systemHealth.alerts.slice(0, 50),
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    return handleError(error);
  }
}

/**
 * POST /api/admin/health
 * Admin actions for health management
 */
export async function POST(request: NextRequest) {
  try {
    // Admin endpoint - use reports:write permission as proxy for admin access
    const context = await authenticateRequest(request, 'reports:write');
    const adminId = context.apiKey.ownerId;

    // In production, would check admin role from organization membership

    const body = await request.json();
    const { action, toolName, dlqId, notes } = body;

    switch (action) {
      case 'reset-circuit': {
        if (!toolName) {
          return Errors.missingField('toolName');
        }
        const success = circuitRegistry.resetCircuit(toolName);
        if (!success) {
          return Errors.notFound('Circuit breaker');
        }
        logger.info('Circuit breaker reset by admin', {
          toolName,
          adminId: adminId,
        });
        return successResponse({ message: `Circuit breaker for ${toolName} reset` });
      }

      case 'reset-all-circuits': {
        circuitRegistry.resetAll();
        logger.info('All circuit breakers reset by admin', {
          adminId: adminId,
        });
        return successResponse({ message: 'All circuit breakers reset' });
      }

      case 'drain-bulkheads': {
        const drained = bulkheadRegistry.drainAll();
        logger.warn('All bulkheads drained by admin', {
          adminId: adminId,
          drained,
        });
        return successResponse({ message: 'All bulkheads drained', drained });
      }

      case 'retry-dlq': {
        if (!dlqId) {
          return Errors.missingField('dlqId');
        }
        const newJob = await jobQueue.retryFromDLQ(dlqId, adminId);
        logger.info('DLQ entry retried by admin', {
          dlqId,
          newJobId: newJob.id,
          adminId: adminId,
        });
        return successResponse({
          message: 'Job retried from DLQ',
          newJobId: newJob.id,
        });
      }

      case 'discard-dlq': {
        if (!dlqId) {
          return Errors.missingField('dlqId');
        }
        await jobQueue.discardFromDLQ(dlqId, adminId, notes);
        logger.info('DLQ entry discarded by admin', {
          dlqId,
          adminId: adminId,
          notes,
        });
        return successResponse({ message: 'DLQ entry discarded' });
      }

      case 'cleanup-old-jobs': {
        const days = body.days || 30;
        const deleted = await jobQueue.cleanupOldJobs(days);
        logger.info('Old jobs cleaned up by admin', {
          adminId: adminId,
          deleted,
          olderThanDays: days,
        });
        return successResponse({ message: `Cleaned up ${deleted} old jobs` });
      }

      case 'run-health-check': {
        const results = await healthMonitor.runHealthCheck();
        return successResponse({
          message: 'Health check completed',
          results,
        });
      }

      default:
        return Errors.validationError('Unknown action', { action });
    }
  } catch (error) {
    logger.error('Health action failed', { error });
    return handleError(error);
  }
}
