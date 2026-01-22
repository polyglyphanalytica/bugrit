import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPermission } from '@/lib/admin/middleware';
import {
  runDataRetention,
  previewDataRetention,
  cleanupOrganizationData,
} from '@/lib/maintenance';
import { SubscriptionTier } from '@/lib/billing';

/**
 * GET /api/admin/maintenance
 * Preview what data would be deleted by retention policy
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminPermission(request, 'canViewAuditLogs');
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || undefined;

    const preview = await previewDataRetention(organizationId);

    return NextResponse.json({
      preview,
      message: 'This is a dry-run preview. Use POST to execute cleanup.',
    });
  } catch (error) {
    console.error('Failed to preview data retention:', error);
    return NextResponse.json(
      { error: 'Failed to preview data retention' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/maintenance
 * Run data retention cleanup
 *
 * Body options:
 * - action: 'data-retention' | 'data-retention-single'
 * - organizationId: (required for 'data-retention-single')
 * - tier: (optional override for 'data-retention-single')
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminPermission(request, 'canManageStripeConfig');
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const action = body.action || 'data-retention';

    switch (action) {
      case 'data-retention': {
        // Run retention for all organizations
        const summary = await runDataRetention();

        return NextResponse.json({
          success: true,
          action: 'data-retention',
          summary,
        });
      }

      case 'data-retention-single': {
        // Run retention for a single organization
        if (!body.organizationId) {
          return NextResponse.json(
            { error: 'organizationId is required for data-retention-single' },
            { status: 400 }
          );
        }

        const tier = (body.tier || 'free') as SubscriptionTier;
        const result = await cleanupOrganizationData(body.organizationId, tier);

        return NextResponse.json({
          success: true,
          action: 'data-retention-single',
          result,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Maintenance action failed:', error);
    return NextResponse.json(
      { error: 'Maintenance action failed' },
      { status: 500 }
    );
  }
}
