/**
 * Scan Report API
 *
 * GET /api/v1/scans/:scanId/report - Get or generate report for a scan
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  successResponse,
  handleError,
  Errors,
  projectStore,
  scanStore,
  generateReport,
  getReportByScan,
} from '@/lib/api';

interface RouteParams {
  params: Promise<{ scanId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const keyData = await authenticateRequest(request, 'reports:read');
    const { scanId } = await params;

    const scan = scanStore.get(scanId);

    if (!scan) {
      return Errors.notFound('Scan');
    }

    // Verify access
    const project = projectStore.get(scan.projectId);
    if (!project || project.organizationId !== keyData.organizationId) {
      return Errors.forbidden();
    }

    // Check scan is completed
    if (scan.status !== 'completed') {
      return Errors.validationError('Report not available - scan not completed', {
        scanStatus: scan.status,
      });
    }

    // Check if report exists
    let report = getReportByScan(scanId);

    // Generate if not exists
    if (!report) {
      report = generateReport(scanId);
    }

    if (!report) {
      return Errors.internalError();
    }

    return successResponse(report);
  } catch (error) {
    return handleError(error);
  }
}
