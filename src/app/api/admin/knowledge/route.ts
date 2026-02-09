/**
 * Sensei Knowledge Base API
 *
 * GET  /api/admin/knowledge — List knowledge base entries
 * POST /api/admin/knowledge — Add a new entry (from ticket responses)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { generateId, getDb, COLLECTIONS } from '@/lib/firestore';
import { logger } from '@/lib/logger';

const KNOWLEDGE_COLLECTION = 'sensei_knowledge';

export interface KnowledgeEntry {
  id: string;
  /** The question/topic this entry addresses */
  question: string;
  /** The answer/response to use */
  answer: string;
  /** Category for organization */
  category: string;
  /** Keywords for matching */
  keywords: string[];
  /** Source ticket ID (if created from a ticket response) */
  sourceTicketId?: string;
  /** Who created this entry */
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
}

async function requireAdmin(request: NextRequest): Promise<string | NextResponse> {
  const authResult = await requireAuthenticatedUser(request);
  if (authResult instanceof NextResponse) return authResult;

  const superadminEmail = process.env.PLATFORM_SUPERADMIN_EMAIL;
  const db = getDb();
  if (!superadminEmail || !db) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(authResult).get();
  if (userDoc.data()?.email !== superadminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return authResult;
}

export async function GET(request: NextRequest) {
  try {
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) return adminResult;

    const db = getDb();
    if (!db) return NextResponse.json({ entries: [] });

    const snapshot = await db.collection(KNOWLEDGE_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const entries = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ entries });
  } catch (error) {
    logger.error('Failed to list knowledge entries', { error });
    return NextResponse.json({ error: 'Failed to list entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await requireAdmin(request);
    if (adminResult instanceof NextResponse) return adminResult;

    const body = await request.json();

    if (!body.question?.trim() || !body.answer?.trim()) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const entryId = generateId('kb');
    const now = new Date().toISOString();

    const entry: KnowledgeEntry = {
      id: entryId,
      question: body.question.trim(),
      answer: body.answer.trim(),
      category: body.category || 'general',
      keywords: body.keywords || [],
      sourceTicketId: body.sourceTicketId || undefined,
      createdBy: adminResult as string,
      createdAt: now,
      updatedAt: now,
      enabled: true,
    };

    await db.collection(KNOWLEDGE_COLLECTION).doc(entryId).set(entry);

    logger.info('Knowledge entry created', { entryId, sourceTicketId: entry.sourceTicketId });

    return NextResponse.json({ entryId }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create knowledge entry', { error });
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
