/**
 * WhatsApp Channel Adapter
 *
 * Handles WhatsApp-specific message formatting and delivery via the
 * Meta Cloud API (WhatsApp Business Platform). Verifies webhook
 * signatures using the app secret.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import {
  getWhatsAppAccessToken,
  getWhatsAppAppSecret,
  getWhatsAppPhoneNumberId,
} from './config';
import type { ChannelAdapter, InboundMessage, OutboundMessage } from './types';

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { phone_number_id: string; display_phone_number: string };
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        text?: { body: string };
        type: string;
      }>;
      statuses?: Array<unknown>;
    };
    field: string;
  }>;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = 'whatsapp' as const;

  private get appSecret(): string {
    return getWhatsAppAppSecret() || '';
  }

  private get accessToken(): string {
    return getWhatsAppAccessToken() || '';
  }

  private get phoneNumberId(): string {
    return getWhatsAppPhoneNumberId() || '';
  }

  /** Verify the Meta webhook signature */
  async verifyWebhook(request: Request): Promise<boolean> {
    if (!this.appSecret) {
      logger.warn('WHATSAPP_APP_SECRET not configured');
      return false;
    }

    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) return false;

    const body = await request.clone().text();
    const hmac = createHmac('sha256', this.appSecret).update(body).digest('hex');
    const expected = `sha256=${hmac}`;

    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /** Parse a WhatsApp Cloud API webhook into an InboundMessage */
  async parseInbound(request: Request): Promise<InboundMessage | null> {
    const payload: WhatsAppWebhookPayload = await request.clone().json();

    if (payload.object !== 'whatsapp_business_account') return null;

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const messages = change.value.messages;
        if (!messages?.length) continue;

        const msg = messages[0];
        if (msg.type !== 'text' || !msg.text?.body) continue;

        return {
          channel: 'whatsapp',
          channelUserId: msg.from,
          text: msg.text.body.trim(),
          metadata: {
            phoneNumberId: change.value.metadata.phone_number_id,
            messageId: msg.id,
          },
        };
      }
    }

    return null;
  }

  /** Send a response back via WhatsApp Cloud API */
  async sendResponse(
    channelUserId: string,
    message: OutboundMessage,
    metadata?: Record<string, string>,
  ): Promise<void> {
    if (!this.accessToken || !this.phoneNumberId) {
      logger.error('WhatsApp credentials not configured — cannot send message');
      return;
    }

    // WhatsApp doesn't support markdown natively — convert to plain text with light formatting
    let text = this.toWhatsAppText(message.text);

    if (message.actionResult) {
      text += `\n\n${this.toWhatsAppText(message.actionResult)}`;
    }

    if (message.actionUrl) {
      text += `\n\n${message.actionUrl}`;
    }

    if (message.suggestedQuestions?.length) {
      text += '\n\n_Try asking:_';
      for (const q of message.suggestedQuestions) {
        text += `\n> ${q}`;
      }
    }

    const phoneId = metadata?.phoneNumberId || this.phoneNumberId;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: channelUserId,
          type: 'text',
          text: { preview_url: !!message.actionUrl, body: text },
        }),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      logger.error('WhatsApp API error', { error, to: channelUserId });
    }
  }

  /** Convert markdown to WhatsApp-compatible formatting */
  private toWhatsAppText(text: string): string {
    // WhatsApp supports *bold*, _italic_, ~strikethrough~, ```code```
    return text
      .replace(/\*\*(.*?)\*\*/g, '*$1*')     // **bold** → *bold*
      .replace(/__(.*?)__/g, '_$1_')           // __italic__ → _italic_
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1: $2'); // [text](url) → text: url
  }
}
