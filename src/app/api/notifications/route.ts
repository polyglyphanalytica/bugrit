/**
 * Notifications API
 *
 * GET /api/notifications - Get user's notifications
 * POST /api/notifications/mark-read - Mark notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, toDate, toTimestamp } from '@/lib/firestore';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/api-auth';

const COLLECTION = 'notifications';

/**
 * Get notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

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
      let createdAt: string;
      try {
        createdAt = data.createdAt ? toDate(data.createdAt).toISOString() : new Date().toISOString();
      } catch {
        createdAt = new Date().toISOString();
      }
      return {
        id: doc.id,
        type: data.type,
        title: data.title,
        message: data.message,
        severity: data.severity,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        read: data.read ?? false,
        createdAt,
      };
    });

    // Get unread count (wrapped in try/catch as it may require composite index)
    let unreadCount = 0;
    try {
      const unreadSnapshot = await db
        .collection(COLLECTION)
        .where('userId', '==', userId)
        .where('read', '==', false)
        .count()
        .get();
      unreadCount = unreadSnapshot.data()?.count ?? 0;
    } catch (countError) {
      // Fallback: count from already fetched notifications
      unreadCount = notifications.filter(n => !n.read).length;
      logger.warn('Failed to get unread count from Firestore, using fallback', { countError });
    }

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    logger.error('Error fetching notifications', { error });
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * Mark notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

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
      // Mark specific notifications as read - fetch all at once to avoid N+1 queries
      const batch = db.batch();

      // Limit batch size to prevent abuse
      const idsToProcess = notificationIds.slice(0, 100);

      // Fetch all documents in a single batch read
      const refs = idsToProcess.map(id => db.collection(COLLECTION).doc(id));
      const docs = await db.getAll(...refs);

      let markedCount = 0;
      for (const doc of docs) {
        // Verify ownership before updating
        if (doc.exists && doc.data()?.userId === userId) {
          batch.update(doc.ref, { read: true });
          markedCount++;
        }
      }

      await batch.commit();

      return NextResponse.json({ success: true, marked: markedCount });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    logger.error('Error marking notifications', { error });
    return NextResponse.json({ error: 'Failed to mark notifications' }, { status: 500 });
  }
}

/**
 * Delete old notifications (called by cron)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Require CRON_SECRET to be configured — reject all requests if unset
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('CRON_SECRET not configured, denying notification cleanup request');
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    // Constant-time comparison to prevent timing attacks
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token || token.length !== cronSecret.length) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const { timingSafeEqual } = require('crypto');
      if (!timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch {
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
    logger.error('Error cleaning notifications', { error });
    return NextResponse.json({ error: 'Failed to clean notifications' }, { status: 500 });
  }
}
