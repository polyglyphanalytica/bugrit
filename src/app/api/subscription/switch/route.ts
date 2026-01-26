import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

/**
 * POST /api/subscription/switch - Switch active organization context
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // For now, this is a session-level preference.
    // The subscription context on the frontend will re-fetch subscription data
    // based on the new organization context.
    return NextResponse.json({
      success: true,
      organizationId,
    });
  } catch (error) {
    logger.error('Error switching organization', { error });
    return NextResponse.json(
      { error: 'Failed to switch organization' },
      { status: 500 }
    );
  }
}
