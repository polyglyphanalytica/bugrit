/**
 * POST /api/contact
 *
 * Creates a support ticket. Two sources:
 * 1. Public contact form (no auth required)
 * 2. Sensei escalation (auth required, includes transcript)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateId, getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';

const CATEGORIES = ['general', 'sales', 'support', 'enterprise', 'security', 'billing', 'escalation'] as const;
type TicketCategory = (typeof CATEGORIES)[number];

export interface SupportTicket {
  id: string;
  // Submitter info
  userId?: string;             // Bugrit user ID (if authenticated)
  name: string;
  email: string;
  company?: string | null;
  // Ticket content
  category: TicketCategory;
  subject: string;
  message: string;
  source: 'contact_form' | 'sensei_escalation' | 'api';
  channel?: 'web' | 'slack' | 'whatsapp';
  // Sensei escalation data
  transcript?: Array<{ role: 'user' | 'assistant'; text: string; timestamp?: string }>;
  // Status and management
  status: 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string | null;
  // Responses
  responses: Array<{
    id: string;
    author: string;         // admin user ID or email
    authorName: string;
    message: string;
    createdAt: string;
    internal: boolean;      // internal notes not visible to customer
  }>;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name?.trim() || !body.email?.trim() || !body.subject?.trim() || !body.message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 },
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate category
    const category: TicketCategory = CATEGORIES.includes(body.category)
      ? body.category
      : 'general';

    const ticketId = generateId('tkt');
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      userId: body.userId || null,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      company: body.company?.trim() || null,
      category,
      subject: body.subject.trim(),
      message: body.message.trim(),
      source: body.source || 'contact_form',
      channel: body.channel || 'web',
      transcript: body.transcript || undefined,
      status: 'open',
      priority: category === 'escalation' ? 'high' : 'normal',
      assignedTo: null,
      responses: [],
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };

    const db = getDb();
    if (db) {
      await db.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).set(ticket);
    }

    logger.info('Support ticket created', {
      ticketId,
      category,
      source: ticket.source,
      email: ticket.email,
    });

    return NextResponse.json(
      { ticketId, message: 'Your message has been received. We\'ll get back to you shortly.' },
      { status: 201 },
    );
  } catch (error) {
    logger.error('Contact form error', { error });
    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 },
    );
  }
}
