/**
 * WhatsApp Cloud API Webhook
 *
 * GET  /api/whatsapp/webhook — Verification challenge (Meta setup)
 * POST /api/whatsapp/webhook — Incoming messages from WhatsApp
 */

import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppAdapter } from '@/lib/sensei/channels/whatsapp';
import { routeMessage } from '@/lib/sensei/channels/router';
import { logger } from '@/lib/logger';

const adapter = new WhatsAppAdapter();

/**
 * GET — Webhook verification (Meta sends this during app setup)
 * Must respond with hub.challenge to confirm the endpoint.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    logger.info('WhatsApp webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST — Incoming messages from WhatsApp Cloud API
 */
export async function POST(request: NextRequest) {
  // Verify webhook signature
  const isValid = await adapter.verifyWebhook(request);
  if (!isValid) {
    logger.warn('Invalid WhatsApp webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
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
    // Process asynchronously
    processMessageInBackground(message).catch((error) => {
      logger.error('Background WhatsApp message processing failed', { error });
    });
  }

  // WhatsApp expects a 200 acknowledgment
  return NextResponse.json({ ok: true });
}

async function processMessageInBackground(
  message: Awaited<ReturnType<typeof adapter.parseInbound>>,
) {
  if (!message) return;

  try {
    await routeMessage(adapter, message);
  } catch (error) {
    logger.error('Failed to route WhatsApp message', {
      channelUserId: message.channelUserId,
      error,
    });
  }
}
