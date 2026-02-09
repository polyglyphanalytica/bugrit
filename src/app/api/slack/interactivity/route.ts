/**
 * POST /api/slack/interactivity
 *
 * Handles Slack interactive component payloads (button clicks, etc.).
 * Currently acknowledges all interactions — can be extended for
 * interactive Sensei flows (e.g., confirming scan start).
 */

import { NextRequest, NextResponse } from 'next/server';
import { SlackAdapter } from '@/lib/sensei/channels/slack';
import { logger } from '@/lib/logger';

const adapter = new SlackAdapter();

export async function POST(request: NextRequest) {
  const isValid = await adapter.verifyWebhook(request);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Slack sends interactivity payloads as URL-encoded form data
  const formData = await request.formData();
  const payloadStr = formData.get('payload') as string;

  if (!payloadStr) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  try {
    const payload = JSON.parse(payloadStr);
    logger.info('Slack interactivity event', {
      type: payload.type,
      userId: payload.user?.id,
      actionId: payload.actions?.[0]?.action_id,
    });

    // Currently just acknowledge — future: handle button actions
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Failed to parse Slack interactivity payload', { error });
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
