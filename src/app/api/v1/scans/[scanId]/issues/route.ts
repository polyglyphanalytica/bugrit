/**
 * Scan Issues API
 *
 * GET /api/v1/scans/:scanId/issues - Get issues from a scan
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  successResponse,
  handleError,
  Errors,
  projectStore,
  scanStore,
  getIssuesByScan,
  Severity,
} from '@/lib/api';
import type { ScanIssue } from '@/lib/db/v1-api';

interface RouteParams {
  params: Promise<{ scanId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const keyData = await authenticateRequest(request, 'scans:read');
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

    // Get query params
    const url = new URL(request.url);
    const severityParam = url.searchParams.get('severity');
    const tool = url.searchParams.get('tool');
    const file = url.searchParams.get('file');
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '50'), 100);

    let issues = await getIssuesByScan(scanId);

    // Filter by severity
    if (severityParam) {
      const severities = severityParam.split(',') as Severity[];
      issues = issues.filter((i: ScanIssue) => severities.includes(i.severity));
    }

    // Filter by tool
    if (tool) {
      issues = issues.filter((i: ScanIssue) => i.tool === tool);
    }

    // Filter by file
    if (file) {
      issues = issues.filter((i: ScanIssue) => i.file?.includes(file));
    }

    // Sort by severity (critical first) then by file
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4,
    };
    issues.sort((a: ScanIssue, b: ScanIssue) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return (a.file || '').localeCompare(b.file || '');
    });

    // Paginate
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedIssues = issues.slice(start, end);

    return successResponse(paginatedIssues, 200, {
      page,
      perPage,
      total: issues.length,
    });
  } catch (error) {
    return handleError(error);
  }
}
