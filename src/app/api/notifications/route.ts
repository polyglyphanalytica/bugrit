/**
 * Notifications API
 *
 * GET /api/notifications - Get user's notifications
 * POST /api/notifications/mark-read - Mark notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, toDate, toTimestamp } from '@/lib/firestore';

const COLLECTION = 'notifications';

async function getUserFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  return sessionCookie?.value || null;
}

/**
 * Get notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromSession();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const db = getDb();

    if (!db) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    // Build query
    let query = db
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (unreadOnly) {
      query = query.where('read', '==', false);
    }

    const snapshot = await query.get();

    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        title: data.title,
        message: data.message,
        severity: data.severity,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        read: data.read,
        createdAt: toDate(data.createdAt).toISOString(),
      };
    });

    // Get unread count
    const unreadSnapshot = await db
      .collection(COLLECTION)
      .where('userId', '==', userId)
      .where('read', '==', false)
      .count()
      .get();

    const unreadCount = unreadSnapshot.data().count;

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * Mark notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromSession();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAll } = body;

    const db = getDb();

    if (!db) {
      return NextResponse.json({ success: true });
    }

    if (markAll) {
      // Mark all unread notifications as read
      const snapshot = await db
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();

      return NextResponse.json({ success: true, marked: snapshot.docs.length });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const batch = db.batch();

      for (const id of notificationIds) {
        const ref = db.collection(COLLECTION).doc(id);
        // Verify ownership
        const doc = await ref.get();
        if (doc.exists && doc.data()?.userId === userId) {
          batch.update(ref, { read: true });
        }
      }

      await batch.commit();

      return NextResponse.json({ success: true, marked: notificationIds.length });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error marking notifications:', error);
    return NextResponse.json({ error: 'Failed to mark notifications' }, { status: 500 });
  }
}

/**
 * Delete old notifications (called by cron)
 */
export async function DELETE(request: NextRequest) {
  try {
    // This should be protected by a cron secret in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();

    if (!db) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete notifications older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const snapshot = await db
      .collection(COLLECTION)
      .where('createdAt', '<', toTimestamp(thirtyDaysAgo))
      .limit(500) // Process in batches
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return NextResponse.json({ deleted: snapshot.docs.length });
  } catch (error) {
    console.error('Error cleaning notifications:', error);
    return NextResponse.json({ error: 'Failed to clean notifications' }, { status: 500 });
  }
}
