/**
 * Admin Support Ticket Detail API
 *
 * GET    /api/admin/tickets/:ticketId — Get ticket details
 * PATCH  /api/admin/tickets/:ticketId — Update status/priority/assignment
 * POST   /api/admin/tickets/:ticketId — Add a response (pushes to user via Sensei notifications)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { generateId, getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';

async function requireAdmin(request: NextRequest): Promise<{ userId: string; email: string } | NextResponse> {
  const authResult = await requireAuthenticatedUser(request);
  if (authResult instanceof NextResponse) return authResult;

  const superadminEmail = process.env.PLATFORM_SUPERADMIN_EMAIL;
  if (!superadminEmail) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(authResult).get();
  const email = userDoc.data()?.email;

  if (email !== superadminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return { userId: authResult, email };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) return adminResult;

    const { ticketId } = await params;
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const doc = await db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ ticket: doc.data() });
  } catch (error) {
    logger.error('Failed to get ticket', { error });
    return NextResponse.json({ error: 'Failed to get ticket' }, { status: 500 });
  }
}

/** Update ticket status, priority, or assignment */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) return adminResult;

    const { ticketId } = await params;
    const body = await request.json();
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const doc = await db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
    if (body.status === 'resolved' || body.status === 'closed') {
      updates.resolvedAt = new Date().toISOString();
    }

    await db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).update(updates);

    logger.info('Ticket updated', { ticketId, updates: Object.keys(updates) });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to update ticket', { error });
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

/** Add a response to a ticket — pushes notification to user via Sensei */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) return adminResult;

    const { ticketId } = await params;
    const body = await request.json();

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const doc = await db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = doc.data()!;
    const now = new Date().toISOString();

    const response = {
      id: generateId('rsp'),
      author: adminResult.userId,
      authorName: adminResult.email,
      message: body.message.trim(),
      createdAt: now,
      internal: body.internal === true,
    };

    // Add response to ticket
    const responses = ticket.responses || [];
    responses.push(response);

    await db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).update({
      responses,
      status: body.internal ? ticket.status : 'waiting_on_customer',
      updatedAt: now,
    });

    // If not an internal note and user has a userId, push notification via Sensei
    if (!body.internal && ticket.userId) {
      try {
        const NOTIFICATIONS_COLLECTION = 'notifications';
        await db.collection(NOTIFICATIONS_COLLECTION).doc(generateId('ntf')).set({
          userId: ticket.userId,
          type: 'support_response',
          title: `Response to: ${ticket.subject}`,
          message: body.message.trim(),
          severity: 'info',
          actionUrl: `/support/${ticketId}`,
          actionLabel: 'View Response',
          metadata: { ticketId, responseId: response.id },
          read: false,
          createdAt: new Date(),
        });
        logger.info('Notification sent for ticket response', { ticketId, userId: ticket.userId });
      } catch (notifyErr) {
        logger.warn('Failed to send ticket response notification', { ticketId, error: notifyErr });
      }
    }

    logger.info('Ticket response added', { ticketId, internal: response.internal });

    return NextResponse.json({ responseId: response.id });
  } catch (error) {
    logger.error('Failed to respond to ticket', { error });
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 });
  }
}
