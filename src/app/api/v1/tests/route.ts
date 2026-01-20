/**
 * Test Results API
 *
 * POST /api/v1/tests - Submit test results
 * GET /api/v1/tests - List test cases (requires scanId or projectId)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';
import {
  getProject,
  getTestCasesByScan,
  submitTestResults,
  checkScanLimit,
  checkPlatformAccess,
  Platform,
  TestStatus,
} from '@/lib/api/store';
import { getDb } from '@/lib/firestore';

interface SubmitTestRequest {
  projectId: string;
  platform: Platform;
  branch?: string;
  commitSha?: string;
  testCases: Array<{
    name: string;
    suite?: string;
    status: TestStatus;
    duration?: number;
    error?: string;
    steps?: string[];
    metadata?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'tests:write');

    const body: SubmitTestRequest = await request.json();

    // Validate required fields
    if (!body.projectId) {
      return Errors.missingField('projectId');
    }
    if (!body.platform) {
      return Errors.missingField('platform');
    }
    if (!body.testCases || body.testCases.length === 0) {
      return Errors.missingField('testCases');
    }

    // Validate platform
    const validPlatforms: Platform[] = ['web', 'ios', 'android', 'desktop'];
    if (!validPlatforms.includes(body.platform)) {
      return Errors.validationError(`Invalid platform: ${body.platform}`, {
        validPlatforms,
      });
    }

    // Check tier access for platform
    if (!checkPlatformAccess(context.tier, body.platform)) {
      return Errors.validationError(
        `Platform "${body.platform}" not available on ${context.tier} tier. Upgrade to access this platform.`,
        {
          currentTier: context.tier,
          platform: body.platform,
        }
      );
    }

    // Verify project exists and belongs to organization
    const project = await getProject(body.projectId);
    if (!project) {
      return Errors.notFound('Project');
    }
    if (project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    // Check scan limit (get current usage)
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

    // Validate test cases
    const validStatuses: TestStatus[] = ['passed', 'failed', 'skipped', 'error'];
    for (const tc of body.testCases) {
      if (!tc.name) {
        return Errors.validationError('Each test case must have a name');
      }
      if (!tc.status || !validStatuses.includes(tc.status)) {
        return Errors.validationError(`Invalid status for test "${tc.name}": ${tc.status}`, {
          validStatuses,
        });
      }
    }

    // Submit test results
    const result = await submitTestResults(context.organizationId, {
      projectId: body.projectId,
      platform: body.platform,
      branch: body.branch,
      commitSha: body.commitSha,
      testCases: body.testCases,
      metadata: body.metadata,
    });

    // Update organization scan count
    if (db) {
      await db.collection('organizations').doc(context.organizationId).update({
        'usage.scansThisMonth': scansThisMonth + 1,
        'usage.lastScanAt': new Date(),
      });
    }

    const response = successResponse(
      {
        scanId: result.scan.id,
        status: result.scan.status,
        summary: result.summary,
        testCases: result.testCases.map((tc) => ({
          id: tc.id,
          name: tc.name,
          status: tc.status,
        })),
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

export async function GET(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'tests:read');

    const url = new URL(request.url);
    const scanId = url.searchParams.get('scanId');

    if (!scanId) {
      return Errors.validationError('scanId query parameter is required');
    }

    const testCases = await getTestCasesByScan(scanId);

    // Verify access - get first test case's project to check org
    if (testCases.length > 0) {
      const project = await getProject(testCases[0].projectId);
      if (!project || project.organizationId !== context.organizationId) {
        return Errors.forbidden();
      }
    }

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '50'), 100);
    const start = (page - 1) * perPage;
    const end = start + perPage;

    const paginatedTests = testCases.slice(start, end);

    const response = successResponse(paginatedTests, 200, {
      page,
      perPage,
      total: testCases.length,
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
