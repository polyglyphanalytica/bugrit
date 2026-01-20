/**
 * Individual Scan API
 *
 * GET /api/v1/scans/:scanId - Get scan details
 * DELETE /api/v1/scans/:scanId - Cancel a scan
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  successResponse,
  handleError,
  Errors,
  getScan,
  getProject,
  cancelScan,
} from '@/lib/api';

interface RouteParams {
  params: Promise<{ scanId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const keyData = await authenticateRequest(request, 'scans:read');
    const { scanId } = await params;

    const scan = await getScan(scanId);

    if (!scan) {
      return Errors.notFound('Scan');
    }

    // Verify access via project
    const project = await getProject(scan.projectId);
    if (!project || project.organizationId !== keyData.organizationId) {
      return Errors.forbidden();
    }

    return successResponse(scan);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const keyData = await authenticateRequest(request, 'scans:write');
    const { scanId } = await params;

    const scan = await getScan(scanId);

    if (!scan) {
      return Errors.notFound('Scan');
    }

    // Verify access
    const project = await getProject(scan.projectId);
    if (!project || project.organizationId !== keyData.organizationId) {
      return Errors.forbidden();
    }

    // Can only cancel pending or running scans
    if (scan.status !== 'pending' && scan.status !== 'running') {
      return Errors.validationError('Cannot cancel a scan that has already completed');
    }

    // Update status to cancelled
    await cancelScan(scanId);

    return successResponse({ cancelled: true });
  } catch (error) {
    return handleError(error);
  }
}
