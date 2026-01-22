/**
 * Scans API
 *
 * GET /api/v1/scans - List scans (with optional project filter)
 * POST /api/v1/scans - Create a new scan
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';
import {
  getProject,
  getScansByProject,
  getScansByOrganization,
  createScan,
  startScan,
  checkScanLimit,
  checkPlatformAccess,
  Platform,
  ScanStatus,
} from '@/lib/api/store';
import { getDb } from '@/lib/firestore';
import {
  checkScanAffordability,
  reserveCreditsForScan,
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
} from '@/lib/billing';
import { ToolCategory } from '@/lib/tools/registry';

export async function GET(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'scans:read');

    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');
    const status = url.searchParams.get('status') as ScanStatus | null;
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20'), 100);

    let scans;

    if (projectId) {
      // Verify project access
      const project = await getProject(projectId);
      if (!project || project.organizationId !== context.organizationId) {
        return Errors.forbidden();
      }
      scans = await getScansByProject(projectId);
    } else {
      // Get all scans for organization
      scans = await getScansByOrganization(context.organizationId);
    }

    // Filter by status if provided
    if (status) {
      scans = scans.filter((s) => s.status === status);
    }

    // Paginate
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedScans = scans.slice(start, end);

    const response = successResponse(paginatedScans, 200, {
      page,
      perPage,
      total: scans.length,
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

export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'scans:write');

    const body = await request.json();

    // Validate required fields
    if (!body.projectId) {
      return Errors.missingField('projectId');
    }
    if (!body.platform) {
      return Errors.missingField('platform');
    }

    // Verify project exists and user has access
    const project = await getProject(body.projectId);
    if (!project) {
      return Errors.notFound('Project');
    }
    if (project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    // Validate platform
    const validPlatforms: Platform[] = ['web', 'ios', 'android', 'desktop'];
    if (!validPlatforms.includes(body.platform as Platform)) {
      return Errors.validationError(`Invalid platform: ${body.platform}`, {
        validPlatforms,
      });
    }

    // Check tier access for platform
    if (!checkPlatformAccess(context.tier, body.platform as Platform)) {
      return Errors.validationError(
        `Platform "${body.platform}" not available on ${context.tier} tier. Upgrade to access this platform.`,
        {
          currentTier: context.tier,
          platform: body.platform,
        }
      );
    }

    // Check scan limit
    const db = getDb();
    let scansThisMonth = 0;
    if (db) {
      const orgDoc = await db.collection('organizations').doc(context.organizationId).get();
      if (orgDoc.exists) {
        scansThisMonth = orgDoc.data()?.usage?.scansThisMonth || 0;
      }
    }

    const scanLimit = await checkScanLimit(context.organizationId, context.tier, scansThisMonth);
    if (!scanLimit.allowed) {
      return Errors.validationError(
        `Monthly scan limit reached (${scanLimit.current}/${scanLimit.limit}). Upgrade your plan for more scans.`,
        {
          currentCount: scanLimit.current,
          limit: scanLimit.limit,
          tier: context.tier,
        }
      );
    }

    // Check if user can afford this scan (credit-based billing)
    const userId = context.apiKey.ownerId;
    const defaultCategories: ToolCategory[] = ['linting', 'security', 'accessibility'];
    const estimatedLines = body.estimatedLines || 50000;

    // Check maxRepoSize limit for the tier
    const tierConfig = SUBSCRIPTION_TIERS[context.tier as SubscriptionTier];
    if (tierConfig) {
      const maxRepoSize = tierConfig.features.maxRepoSize;
      // -1 means unlimited
      if (maxRepoSize !== -1 && estimatedLines > maxRepoSize) {
        const formattedMax = maxRepoSize >= 1000
          ? `${(maxRepoSize / 1000).toFixed(0)}K`
          : maxRepoSize.toString();
        const formattedEstimate = estimatedLines >= 1000
          ? `${(estimatedLines / 1000).toFixed(0)}K`
          : estimatedLines.toString();

        return Errors.validationError(
          `Estimated repository size (${formattedEstimate} lines) exceeds your ${context.tier} tier limit of ${formattedMax} lines. Upgrade to scan larger repositories.`,
          {
            estimatedLines,
            maxRepoSize,
            currentTier: context.tier,
          }
        );
      }
    }

    const affordCheck = await checkScanAffordability(userId, {
      categories: body.toolCategories || defaultCategories,
      aiFeatures: body.aiFeatures || ['summary'],
      estimatedLines,
    });

    if (!affordCheck.allowed) {
      return Errors.validationError(
        affordCheck.reason || 'Insufficient credits',
        {
          required: affordCheck.estimate.total,
          available: affordCheck.currentBalance,
          overage: affordCheck.overage,
        }
      );
    }

    // Create scan
    const scan = await createScan({
      projectId: body.projectId,
      organizationId: context.organizationId,
      platform: body.platform as Platform,
      branch: body.branch,
      commitSha: body.commitSha,
      status: 'pending',
      metadata: {
        ...body.metadata,
        billing: {
          estimatedCredits: affordCheck.estimate.total,
          userId,
        },
      },
    });

    // Reserve credits for this scan
    const reservation = await reserveCreditsForScan(userId, scan.id, affordCheck.estimate.total);
    if (!reservation.success) {
      return Errors.validationError(
        reservation.error || 'Failed to reserve credits',
        { required: affordCheck.estimate.total }
      );
    }

    // Start the scan
    await startScan(scan.id);

    // Update organization scan count
    if (db) {
      await db.collection('organizations').doc(context.organizationId).update({
        'usage.scansThisMonth': scansThisMonth + 1,
        'usage.lastScanAt': new Date(),
      });
    }

    const response = successResponse(
      {
        ...scan,
        status: 'running',
        startedAt: new Date().toISOString(),
      },
      201
    );

    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}
