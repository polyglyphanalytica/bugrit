/**
 * Individual Test Case API
 *
 * GET /api/v1/tests/:testId - Get test case details
 * PUT /api/v1/tests/:testId - Update test case
 * DELETE /api/v1/tests/:testId - Delete test case
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';
import { getProject, getTestCase, updateTestCase, deleteTestCase, TestStatus } from '@/lib/api/store';

interface RouteParams {
  params: Promise<{ testId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'tests:read');
    const { testId } = await params;

    const testCase = await getTestCase(testId);

    if (!testCase) {
      return Errors.notFound('Test case');
    }

    // Verify access
    const project = await getProject(testCase.projectId);
    if (!project || project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    const response = successResponse(testCase);
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'tests:write');
    const { testId } = await params;

    const testCase = await getTestCase(testId);

    if (!testCase) {
      return Errors.notFound('Test case');
    }

    // Verify access
    const project = await getProject(testCase.projectId);
    if (!project || project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    const body = await request.json();

    // Validate status if provided
    if (body.status) {
      const validStatuses: TestStatus[] = ['passed', 'failed', 'skipped', 'error'];
      if (!validStatuses.includes(body.status)) {
        return Errors.validationError(`Invalid status: ${body.status}`, { validStatuses });
      }
    }

    // Update test case
    const updated = await updateTestCase(testId, {
      ...(body.name && { name: body.name }),
      ...(body.suite !== undefined && { suite: body.suite }),
      ...(body.status && { status: body.status }),
      ...(body.duration !== undefined && { duration: body.duration }),
      ...(body.error !== undefined && { error: body.error }),
      ...(body.steps !== undefined && { steps: body.steps }),
      ...(body.metadata !== undefined && { metadata: body.metadata }),
    });

    const response = successResponse(updated);
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'tests:write');
    const { testId } = await params;

    const testCase = await getTestCase(testId);

    if (!testCase) {
      return Errors.notFound('Test case');
    }

    // Verify access
    const project = await getProject(testCase.projectId);
    if (!project || project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    await deleteTestCase(testId);

    const response = successResponse({ deleted: true });
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}
