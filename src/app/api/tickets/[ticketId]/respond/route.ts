/**
 * POST /api/tickets/[ticketId]/respond
 *
 * Allows an authenticated user to respond to their own support ticket.
 * Used by Sensei chat to let users reply to admin messages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { getDb, generateId, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const authResult = await requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { ticketId } = await params;
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get the ticket and verify ownership
    const ticketRef = db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = ticketDoc.data()!;

    if (ticket.userId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 });
    }

    // Get user info for the response
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || userData?.name || 'User';

    const now = new Date().toISOString();
    const responseEntry = {
      id: generateId('resp'),
      author: userId,
      authorName: userName,
      message: message.trim(),
      createdAt: now,
      internal: false,
    };

    // Add response and update ticket status
    const existingResponses = ticket.responses || [];
    await ticketRef.update({
      responses: [...existingResponses, responseEntry],
      status: 'open', // Move back to open when user responds
      updatedAt: now,
    });

    // Notify the superadmin about the user response
    const superadminEmail = process.env.PLATFORM_SUPERADMIN_EMAIL;
    if (superadminEmail) {
      const adminSnapshot = await db.collection('users')
        .where('email', '==', superadminEmail)
        .limit(1)
        .get();

      if (!adminSnapshot.empty) {
        const adminUserId = adminSnapshot.docs[0].id;
        await db.collection('notifications').doc(generateId('ntf')).set({
          userId: adminUserId,
          type: 'support_ticket_new',
          title: `User responded: ${ticket.subject}`,
          message: `${userName} responded to ticket "${ticket.subject}": ${message.trim().slice(0, 100)}${message.length > 100 ? '...' : ''}`,
          severity: 'info',
          metadata: { ticketId },
          read: false,
          createdAt: new Date(),
        });
      }
    }

    logger.info('User responded to ticket', { ticketId, userId });

    return NextResponse.json({ success: true, response: responseEntry });
  } catch (error) {
    logger.error('Failed to respond to ticket', { error });
    return NextResponse.json(
      { error: 'Failed to add response' },
      { status: 500 },
    );
  }
}
