import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import { getAuditLogs } from '@/lib/admin/service';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/audit
 * Get audit logs
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminPermission(request, 'canViewAuditLogs');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);

    const options: {
      limit?: number;
      adminId?: string;
      resource?: string;
      startDate?: Date;
      endDate?: Date;
    } = {};

    const limit = searchParams.get('limit');
    if (limit) options.limit = Math.min(parseInt(limit, 10) || 100, 500);

    const adminId = searchParams.get('adminId');
    if (adminId) options.adminId = adminId;

    const resource = searchParams.get('resource');
    if (resource) options.resource = resource;

    const startDate = searchParams.get('startDate');
    if (startDate) options.startDate = new Date(startDate);

    const endDate = searchParams.get('endDate');
    if (endDate) options.endDate = new Date(endDate);

    const logs = await getAuditLogs(options);

    return NextResponse.json({ logs });
  } catch (error) {
    logger.error('Failed to get audit logs', { error });
    return NextResponse.json({ error: 'Failed to get audit logs' }, { status: 500 });
  }
}
