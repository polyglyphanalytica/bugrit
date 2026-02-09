/**
 * Sensei Conversation History — Firestore Store
 *
 * Persists conversation history per user+channel so Sensei
 * maintains context across messages on Slack/WhatsApp.
 */

import { db } from '@/lib/firebase/admin';
import type { SenseiMessage } from '@/ai/flows/sensei-chat';
import type { SenseiChannel } from './channels/types';

const COLLECTION = 'sensei_conversations';
const MAX_HISTORY = 20;

export interface ConversationDoc {
  userId: string;
  channel: SenseiChannel;
  threadId?: string;
  messages: SenseiMessage[];
  updatedAt: string;
}

/** Build a document ID from user + channel + optional thread */
function docId(userId: string, channel: SenseiChannel, threadId?: string): string {
  const base = `${userId}_${channel}`;
  return threadId ? `${base}_${threadId}` : base;
}

/** Load recent conversation history for a user+channel */
export async function getHistory(
  userId: string,
  channel: SenseiChannel,
  threadId?: string,
): Promise<SenseiMessage[]> {
  const doc = await db.collection(COLLECTION).doc(docId(userId, channel, threadId)).get();
  if (!doc.exists) return [];
  const data = doc.data() as ConversationDoc;
  return data.messages?.slice(-MAX_HISTORY) ?? [];
}

/** Append a user message and sensei response to history */
export async function appendToHistory(
  userId: string,
  channel: SenseiChannel,
  userMessage: string,
  senseiResponse: string,
  threadId?: string,
): Promise<void> {
  const id = docId(userId, channel, threadId);
  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();

  const existing: SenseiMessage[] = doc.exists
    ? ((doc.data() as ConversationDoc).messages ?? [])
    : [];

  existing.push(
    { role: 'user', content: userMessage },
    { role: 'sensei', content: senseiResponse },
  );

  // Keep only the most recent messages
  const trimmed = existing.slice(-MAX_HISTORY);

  await ref.set(
    {
      userId,
      channel,
      threadId: threadId ?? null,
      messages: trimmed,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
