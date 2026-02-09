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

    // SECURITY: Validate directory path to prevent path traversal
    if (target.directory) {
      const normalizedDir = require('path').resolve(target.directory);
      // Only allow directories under /tmp or known safe workspace paths
      const allowedPrefixes = ['/tmp/', '/workspace/', '/home/'];
      const isAllowed = allowedPrefixes.some(p => normalizedDir.startsWith(p));
      if (!isAllowed || normalizedDir.includes('..')) {
        return Errors.validationError('Invalid directory path. Only workspace directories are allowed.');
      }
    }

    // SECURITY: Validate URLs to prevent SSRF against internal services.
    // Must handle all bypass vectors: decimal IPs, IPv6, hex notation, DNS rebinding.
    const validateUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        // Only allow http/https
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        // Block URLs with credentials (can be used to bypass host checks)
        if (parsed.username || parsed.password) return false;

        const host = parsed.hostname.toLowerCase();
        // Must have a hostname with at least one dot (blocks single-label like "0", "localhost")
        if (!host.includes('.') && !host.startsWith('[')) return false;
        // Block localhost variants
        if (host === 'localhost' || host.endsWith('.localhost')) return false;
        // Block raw IPs — require hostnames for public targets.
        // This prevents all IP-based bypasses (decimal, hex, octal, IPv4-mapped IPv6, etc.)
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const isIp = ipv4Regex.test(host) || host.startsWith('[') || /^\d+$/.test(host) || host.startsWith('0x');
        if (isIp) return false;
        // Block known internal/cloud-metadata domains
        if (host.endsWith('.internal') || host.endsWith('.local') || host.endsWith('.corp')) return false;
        if (host === 'metadata.google.internal' || host === 'instance-data') return false;
        return true;
      } catch {
        return false;
      }
    };

    if (target.url && !validateUrl(target.url)) {
      return Errors.validationError('Invalid target URL. Internal and private addresses are not allowed.');
    }
    if (target.urls) {
      for (const url of target.urls) {
        if (!validateUrl(url)) {
          return Errors.validationError(`Invalid target URL: ${url}. Internal and private addresses are not allowed.`);
        }
      }
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
