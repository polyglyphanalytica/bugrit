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

const VALID_SOURCES = ['contact_form', 'sensei_escalation', 'api'] as const;
const VALID_CHANNELS = ['web', 'slack', 'whatsapp'] as const;

// Input length limits to prevent abuse
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 320; // RFC 5321 max
const MAX_SUBJECT_LENGTH = 500;
const MAX_MESSAGE_LENGTH = 10000;
const MAX_COMPANY_LENGTH = 200;
const MAX_TRANSCRIPT_ENTRIES = 50;

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

    // Enforce input length limits
    const name = body.name.trim().slice(0, MAX_NAME_LENGTH);
    const email = body.email.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
    const subject = body.subject.trim().slice(0, MAX_SUBJECT_LENGTH);
    const message = body.message.trim().slice(0, MAX_MESSAGE_LENGTH);
    const company = body.company?.trim()?.slice(0, MAX_COMPANY_LENGTH) || null;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate category
    const category: TicketCategory = CATEGORIES.includes(body.category)
      ? body.category
      : 'general';

    // Validate source and channel against allowed values (prevent spoofing)
    const source = VALID_SOURCES.includes(body.source) ? body.source : 'contact_form';
    const channel = VALID_CHANNELS.includes(body.channel) ? body.channel : 'web';

    // Sanitize transcript if provided (limit size)
    let transcript: SupportTicket['transcript'] | undefined;
    if (Array.isArray(body.transcript)) {
      transcript = body.transcript.slice(0, MAX_TRANSCRIPT_ENTRIES).map((entry: Record<string, unknown>) => ({
        role: entry.role === 'assistant' ? 'assistant' as const : 'user' as const,
        text: typeof entry.text === 'string' ? entry.text.slice(0, 5000) : '',
        timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : undefined,
      }));
    }

    // SECURITY: Do NOT accept userId from the public request body.
    // Only the server-side Sensei escalation (executor.ts) should set userId
    // because it has already authenticated the user.
    // Public contact form tickets are linked by email, not userId.
    const ticketId = generateId('tkt');
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      // userId is intentionally omitted — only server-side code should set it
      name,
      email,
      company,
      category,
      subject,
      message,
      source,
      channel,
      transcript,
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
