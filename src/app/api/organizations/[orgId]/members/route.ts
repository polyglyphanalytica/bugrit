import { NextRequest, NextResponse } from 'next/server';
import {
  getOrganizationMembers,
  removeMember,
  updateMemberRole,
  MemberRole,
} from '@/lib/organizations';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

/**
 * GET /api/organizations/[orgId]/members
 * List organization members
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { orgId } = await params;

    // Verify user is a member
    const members = await getOrganizationMembers(orgId);
    const isMember = members.some((m) => m.userId === userId);

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    return NextResponse.json({ members });
  } catch (error) {
    logger.error('Failed to fetch members', { error });
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[orgId]/members
 * Remove a member (pass userId in body)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const removerId = authResult;

    const { orgId } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await removeMember(orgId, userId, removerId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to remove member', { error });
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}

/**
 * PATCH /api/organizations/[orgId]/members
 * Update member role (pass userId and role in body)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const updaterId = authResult;

    const { orgId } = await params;
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const result = await updateMemberRole(orgId, userId, role as MemberRole, updaterId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to update member', { error });
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}
