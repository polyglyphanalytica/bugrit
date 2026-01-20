/**
 * Individual Report API
 *
 * GET /api/v1/reports/:reportId - Get report details
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  successResponse,
  handleError,
  Errors,
  projectStore,
  reportStore,
} from '@/lib/api';

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const keyData = await authenticateRequest(request, 'reports:read');
    const { reportId } = await params;

    const report = reportStore.get(reportId);

    if (!report) {
      return Errors.notFound('Report');
    }

    // Verify access
    const project = projectStore.get(report.projectId);
    if (!project || project.organizationId !== keyData.organizationId) {
      return Errors.forbidden();
    }

    return successResponse(report);
  } catch (error) {
    return handleError(error);
  }
}
