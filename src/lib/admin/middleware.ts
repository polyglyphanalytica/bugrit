import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { getPlatformAdmin, hasAdminPermission, updateAdminLastLogin } from './service';
import { AdminPermission, PlatformAdmin } from './types';

export interface AdminContext {
  admin: PlatformAdmin;
  userId: string;
}

/**
 * Verify Firebase session cookie and extract user ID
 */
async function verifySessionCookie(sessionCookie: string): Promise<string | null> {
  // Check if Firebase Admin is initialized
  if (getApps().length === 0) {
    console.error('Firebase Admin not initialized');
    return null;
  }

  try {
    const auth = getAuth();
    // Verify the session cookie and check if it's been revoked
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return decodedClaims.uid;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

/**
 * Verify the request is from a platform admin
 */
export async function verifyAdmin(
  request: NextRequest
): Promise<{ success: true; context: AdminContext } | { success: false; response: NextResponse }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
      };
    }

    // Verify the Firebase session cookie and extract userId
    const userId = await verifySessionCookie(sessionCookie);

    if (!userId) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }),
      };
    }

    const admin = await getPlatformAdmin(userId);

    if (!admin) {
      return {
        success: false,
        response: NextResponse.json({ error: 'Not authorized - admin access required' }, { status: 403 }),
      };
    }

    // Update last login
    await updateAdminLastLogin(userId);

    return {
      success: true,
      context: { admin, userId },
    };
  } catch (error) {
    console.error('Admin verification failed:', error);
    return {
      success: false,
      response: NextResponse.json({ error: 'Authentication failed' }, { status: 500 }),
    };
  }
}

/**
 * Verify the request is from an admin with a specific permission
 */
export async function verifyAdminPermission(
  request: NextRequest,
  permission: AdminPermission
): Promise<{ success: true; context: AdminContext } | { success: false; response: NextResponse }> {
  const result = await verifyAdmin(request);

  if (!result.success) {
    return result;
  }

  if (!hasAdminPermission(result.context.admin.role, permission)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: `Permission denied: requires ${permission}` },
        { status: 403 }
      ),
    };
  }

  return result;
}

/**
 * Require superadmin role
 */
export async function verifySuperadmin(
  request: NextRequest
): Promise<{ success: true; context: AdminContext } | { success: false; response: NextResponse }> {
  const result = await verifyAdmin(request);

  if (!result.success) {
    return result;
  }

  if (result.context.admin.role !== 'superadmin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Superadmin access required' },
        { status: 403 }
      ),
    };
  }

  return result;
}
