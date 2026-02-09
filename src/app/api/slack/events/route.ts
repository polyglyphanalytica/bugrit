/**
 * POST /api/slack/events
 *
 * Handles Slack Events API webhooks. This is the main entry point
 * for interactive Sensei conversations on Slack.
 *
 * Slack sends:
 * - url_verification: One-time challenge during app setup
 * - event_callback: User messages, mentions, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SlackAdapter } from '@/lib/sensei/channels/slack';
import { routeMessage } from '@/lib/sensei/channels/router';
import { logger } from '@/lib/logger';

const adapter = new SlackAdapter();

export async function POST(request: NextRequest) {
  // Verify Slack signature
  const isValid = await adapter.verifyWebhook(request);
  if (!isValid) {
    logger.warn('Invalid Slack webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = await request.json();

  // Handle Slack URL verification challenge (one-time setup)
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle event callbacks
  if (body.type === 'event_callback') {
    // Parse the inbound message
    // We need to reconstruct a Request for the adapter since we already consumed the body
    const syntheticRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(body),
    });

    const message = await adapter.parseInbound(syntheticRequest);

    if (message) {
      // Process asynchronously — Slack requires a 200 within 3 seconds
      // Use waitUntil-style pattern: respond immediately, process in background
      processMessageInBackground(message).catch((error) => {
        logger.error('Background Slack message processing failed', { error });
      });
    }

    // Acknowledge immediately (Slack retries if no 200 within 3s)
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function processMessageInBackground(
  message: Awaited<ReturnType<typeof adapter.parseInbound>>,
) {
  if (!message) return;

  try {
    await routeMessage(adapter, message);
  } catch (error) {
    logger.error('Failed to route Slack message', {
      channelUserId: message.channelUserId,
      error,
    });
  }
}
