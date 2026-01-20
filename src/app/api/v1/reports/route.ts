/**
 * Reports API
 *
 * GET /api/v1/reports - List reports for a project
 * POST /api/v1/reports - Generate a report for a scan
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  successResponse,
  handleError,
  Errors,
  projectStore,
  scanStore,
  reportStore,
  generateReport,
  getReportsByProject,
} from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const keyData = await authenticateRequest(request, 'reports:read');

    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20'), 100);

    if (!projectId) {
      return Errors.missingField('project_id');
    }

    // Verify access
    const project = projectStore.get(projectId);
    if (!project || project.organizationId !== keyData.organizationId) {
      return Errors.forbidden();
    }

    let reports = getReportsByProject(projectId);

    // Sort by generation date (newest first)
    reports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    // Paginate
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedReports = reports.slice(start, end);

    return successResponse(paginatedReports, 200, {
      page,
      perPage,
      total: reports.length,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const keyData = await authenticateRequest(request, 'reports:read');

    const body = await request.json();

    if (!body.scanId) {
      return Errors.missingField('scanId');
    }

    // Get scan
    const scan = scanStore.get(body.scanId);
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
      return Errors.validationError('Cannot generate report for incomplete scan', {
        scanStatus: scan.status,
      });
    }

    // Check if report already exists
    const existingReport = reportStore.list((r) => r.scanId === body.scanId)[0];
    if (existingReport) {
      return successResponse(existingReport);
    }

    // Generate report
    const report = generateReport(body.scanId);
    if (!report) {
      return Errors.internalError();
    }

    return successResponse(report, 201);
  } catch (error) {
    return handleError(error);
  }
}
