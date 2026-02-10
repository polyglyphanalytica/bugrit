/**
 * Telegram Bot API Webhook
 *
 * POST /api/telegram/webhook — Incoming updates from Telegram
 *
 * Register this webhook with the Telegram Bot API:
 *   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -H "Content-Type: application/json" \
 *     -d '{"url":"https://bugrit.com/api/telegram/webhook","secret_token":"<SECRET>"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { TelegramAdapter } from '@/lib/sensei/channels/telegram';
import { routeMessage } from '@/lib/sensei/channels/router';
import { logger } from '@/lib/logger';

const adapter = new TelegramAdapter();

/**
 * POST — Incoming message/update from Telegram
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret
  const isValid = await adapter.verifyWebhook(request);
  if (!isValid) {
    logger.warn('Invalid Telegram webhook secret');
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const body = await request.json();

  // Parse inbound message
  const syntheticRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  });

  const message = await adapter.parseInbound(syntheticRequest);

  if (message) {
    // Process asynchronously — Telegram expects a fast 200
    processMessageInBackground(message).catch((error) => {
      logger.error('Background Telegram message processing failed', { error });
    });
  }

  // Telegram expects a 200 acknowledgment
  return NextResponse.json({ ok: true });
}

async function processMessageInBackground(
  message: Awaited<ReturnType<typeof adapter.parseInbound>>,
) {
  if (!message) return;

  try {
    await routeMessage(adapter, message);
  } catch (error) {
    logger.error('Failed to route Telegram message', {
      channelUserId: message.channelUserId,
      error,
    });
  }
}
