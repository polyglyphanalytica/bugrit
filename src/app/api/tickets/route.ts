/**
 * GET /api/tickets
 *
 * Returns the authenticated user's support tickets.
 * Used by Sensei to show ticket context and allow responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(req);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ tickets: [] });
    }

    // Get user's open/in-progress tickets with recent admin responses
    const status = req.nextUrl.searchParams.get('status') || 'open';
    const statuses = status === 'active'
      ? ['open', 'in_progress', 'waiting_on_customer']
      : [status];

    const snapshot = await db.collection(COLLECTIONS.SUPPORT_TICKETS)
      .where('userId', '==', userId)
      .where('status', 'in', statuses)
      .orderBy('updatedAt', 'desc')
      .limit(10)
      .get();

    const tickets = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        subject: data.subject,
        status: data.status,
        category: data.category,
        message: data.message,
        responses: (data.responses || []).map((r: Record<string, unknown>) => ({
          id: r.id,
          authorName: r.authorName,
          message: r.message,
          createdAt: r.createdAt,
          internal: r.internal,
        })).filter((r: { internal: boolean }) => !r.internal), // Hide internal notes from users
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    logger.error('Failed to fetch user tickets', { error });
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 },
    );
  }
}
