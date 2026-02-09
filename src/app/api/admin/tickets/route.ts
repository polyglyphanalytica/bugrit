/**
 * Admin Support Tickets API
 *
 * GET  /api/admin/tickets         — List all tickets (with filters)
 * POST /api/admin/tickets         — Create a system-generated ticket (telemetry/errors)
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { generateId, getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';
import type { SupportTicket } from '@/app/api/contact/route';

async function requireAdmin(request: NextRequest): Promise<string | NextResponse> {
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

  return authResult;
}

export async function GET(request: NextRequest) {
  try {
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) return adminResult;

    const db = getDb();
    if (!db) {
      return NextResponse.json({ tickets: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    let query = db.collection(COLLECTIONS.SUPPORT_TICKETS)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.limit(limit).get();
    const tickets = snapshot.docs.map(doc => doc.data());

    return NextResponse.json({ tickets });
  } catch (error) {
    logger.error('Failed to list tickets', { error });
    return NextResponse.json({ error: 'Failed to list tickets' }, { status: 500 });
  }
}

/**
 * POST /api/admin/tickets — Create a system-generated ticket
 * Used by telemetry, error handlers, and automated monitoring.
 * Requires admin API key (ADMIN_API_KEY) or admin session.
 */
export async function POST(request: NextRequest) {
  try {
    // Allow admin API key OR admin session
    const apiKey = request.headers.get('x-admin-api-key');
    const expectedKey = process.env.ADMIN_API_KEY;

    // Use constant-time comparison to prevent timing attacks
    const keyMatch = apiKey && expectedKey && apiKey.length === expectedKey.length &&
      timingSafeEqual(Buffer.from(apiKey, 'utf8'), Buffer.from(expectedKey, 'utf8'));

    if (keyMatch) {
      // Authenticated via API key — proceed
    } else {
      const adminResult = await requireAdmin(request);
      if (adminResult instanceof NextResponse) return adminResult;
    }

    const body = await request.json();

    if (!body.subject?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: 'Subject and message required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const ticketId = generateId('tkt');
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      userId: body.userId || null,
      name: body.name || 'System',
      email: body.email || 'system@bugrit.com',
      category: body.category || 'support',
      subject: body.subject.trim(),
      message: body.message.trim(),
      source: body.source || 'api',
      channel: body.channel || 'web',
      transcript: body.transcript || undefined,
      status: 'open',
      priority: body.priority || 'normal',
      assignedTo: null,
      responses: [],
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };

    await db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).set(ticket);

    logger.info('System ticket created', { ticketId, source: ticket.source, category: ticket.category });

    return NextResponse.json({ ticketId }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create system ticket', { error });
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
