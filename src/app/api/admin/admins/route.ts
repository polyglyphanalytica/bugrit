import { NextRequest, NextResponse } from 'next/server';
import { verifySuperadmin } from '@/lib/admin/middleware';
import { getAllPlatformAdmins, addPlatformAdmin, removePlatformAdmin } from '@/lib/admin/service';

/**
 * GET /api/admin/admins
 * Get all platform admins
 */
export async function GET(request: NextRequest) {
  const auth = await verifySuperadmin(request);
  if (!auth.success) return auth.response;

  try {
    const admins = await getAllPlatformAdmins();
    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Failed to get admins:', error);
    return NextResponse.json({ error: 'Failed to get admins' }, { status: 500 });
  }
}

/**
 * POST /api/admin/admins
 * Add a new platform admin
 */
export async function POST(request: NextRequest) {
  const auth = await verifySuperadmin(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { userId, email, role, displayName } = body;

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
    }

    if (role && !['superadmin', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be "superadmin" or "admin"' }, { status: 400 });
    }

    const admin = await addPlatformAdmin(
      userId,
      email,
      role || 'admin',
      auth.context.userId,
      displayName
    );

    return NextResponse.json({ success: true, admin }, { status: 201 });
  } catch (error) {
    console.error('Failed to add admin:', error);
    return NextResponse.json({ error: 'Failed to add admin' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/admins
 * Remove a platform admin
 */
export async function DELETE(request: NextRequest) {
  const auth = await verifySuperadmin(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent self-removal
    if (userId === auth.context.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    await removePlatformAdmin(userId, auth.context.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes('last superadmin')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Failed to remove admin:', error);
    return NextResponse.json({ error: 'Failed to remove admin' }, { status: 500 });
  }
}
