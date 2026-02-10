/**
 * Telegram Channel Adapter
 *
 * Handles Telegram-specific message formatting and delivery via the
 * Telegram Bot API. Verifies webhook authenticity using the secret_token
 * header set during webhook registration.
 *
 * Setup:
 * 1. Create a bot with @BotFather → save the token as TELEGRAM_BOT_TOKEN
 * 2. Generate a random secret → save as TELEGRAM_WEBHOOK_SECRET
 * 3. Register the webhook:
 *    curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *      -H "Content-Type: application/json" \
 *      -d '{"url":"https://bugrit.com/api/telegram/webhook","secret_token":"<SECRET>"}'
 */

import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { getTelegramBotToken, getTelegramWebhookSecret } from './config';
import type { ChannelAdapter, InboundMessage, OutboundMessage } from './types';

/** Subset of Telegram Update object we care about */
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
    };
    date: number;
    text?: string;
    reply_to_message?: { message_id: number };
  };
}

export class TelegramAdapter implements ChannelAdapter {
  readonly channel = 'telegram' as const;

  private get botToken(): string {
    return getTelegramBotToken() || '';
  }

  private get webhookSecret(): string {
    return getTelegramWebhookSecret() || '';
  }

  /**
   * Verify the Telegram webhook using the X-Telegram-Bot-Api-Secret-Token header.
   * This header is sent by Telegram when a secret_token was set during setWebhook.
   */
  async verifyWebhook(request: Request): Promise<boolean> {
    if (!this.webhookSecret) {
      logger.warn('TELEGRAM_WEBHOOK_SECRET not configured');
      return false;
    }

    const secretHeader = request.headers.get('x-telegram-bot-api-secret-token');
    if (!secretHeader) return false;

    try {
      const expected = Buffer.from(this.webhookSecret);
      const received = Buffer.from(secretHeader);
      if (expected.length !== received.length) return false;
      return timingSafeEqual(expected, received);
    } catch {
      return false;
    }
  }

  /** Parse a Telegram Bot API Update into an InboundMessage */
  async parseInbound(request: Request): Promise<InboundMessage | null> {
    const update: TelegramUpdate = await request.clone().json();

    // Only handle text messages (not edits, photos, stickers, etc.)
    if (!update.message?.text || update.message.from.is_bot) {
      return null;
    }

    const msg = update.message;

    // Strip /start and /help bot commands — pass just the text
    let text = msg.text!.trim();
    if (text === '/start' || text === '/help') {
      text = 'Hi, what can you do?';
    } else if (text.startsWith('/')) {
      // Strip leading slash for other commands (e.g., /scan → scan)
      text = text.slice(1);
    }

    if (!text) return null;

    return {
      channel: 'telegram',
      channelUserId: String(msg.from.id),
      text,
      threadId: msg.reply_to_message
        ? String(msg.reply_to_message.message_id)
        : undefined,
      metadata: {
        chatId: String(msg.chat.id),
        messageId: String(msg.message_id),
        username: msg.from.username || '',
        firstName: msg.from.first_name,
      },
    };
  }

  /** Send a response back via Telegram Bot API */
  async sendResponse(
    channelUserId: string,
    message: OutboundMessage,
    metadata?: Record<string, string>,
  ): Promise<void> {
    if (!this.botToken) {
      logger.error('TELEGRAM_BOT_TOKEN not configured — cannot send message');
      return;
    }

    const chatId = metadata?.chatId || channelUserId;

    // Build the message text with Telegram MarkdownV2 formatting
    let text = this.toTelegramMarkdown(message.text);

    if (message.actionResult) {
      text += `\n\n${this.toTelegramMarkdown(message.actionResult)}`;
    }

    if (message.actionUrl) {
      text += `\n\n[Open in Bugrit](${this.escapeMarkdownV2Url(message.actionUrl)})`;
    }

    if (message.suggestedQuestions?.length) {
      text += '\n\n_Try asking:_';
      for (const q of message.suggestedQuestions) {
        text += `\n> ${this.escapeMarkdownV2(q)}`;
      }
    }

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: !message.actionUrl,
    };

    // Reply to specific message if thread context exists
    if (message.threadId) {
      payload.reply_to_message_id = parseInt(message.threadId, 10);
    }

    const res = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      logger.error('Telegram API error', { error, chatId });

      // Retry without MarkdownV2 if parsing fails
      if (error.includes("can't parse")) {
        await this.sendPlainText(chatId, message, metadata);
      }
    }
  }

  /** Fallback: send as plain text if MarkdownV2 parsing fails */
  private async sendPlainText(
    chatId: string,
    message: OutboundMessage,
    _metadata?: Record<string, string>,
  ): Promise<void> {
    let text = message.text;
    if (message.actionResult) text += `\n\n${message.actionResult}`;
    if (message.actionUrl) text += `\n\n${message.actionUrl}`;
    if (message.suggestedQuestions?.length) {
      text += '\n\nTry asking:';
      for (const q of message.suggestedQuestions) {
        text += `\n- ${q}`;
      }
    }

    const res = await fetch(
      `https://api.telegram.org/bot${this.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );

    if (!res.ok) {
      const error = await res.text();
      logger.error('Telegram plain text fallback failed', { error, chatId });
    }
  }

  /**
   * Escape special characters for Telegram MarkdownV2.
   * Telegram requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
   */
  private escapeMarkdownV2(text: string): string {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
  }

  /** Escape only the characters that break URLs in MarkdownV2 */
  private escapeMarkdownV2Url(url: string): string {
    return url.replace(/([)\\])/g, '\\$1');
  }

  /** Convert standard markdown to Telegram MarkdownV2 */
  private toTelegramMarkdown(text: string): string {
    // First, protect existing markdown constructs
    // Replace **bold** → *bold*
    let result = text.replace(/\*\*(.*?)\*\*/g, '§BOLD_START§$1§BOLD_END§');
    // Replace __italic__ → _italic_
    result = result.replace(/__(.*?)__/g, '§ITALIC_START§$1§ITALIC_END§');
    // Replace [text](url) → [text](url) (preserve links)
    result = result.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '§LINK_START§$1§LINK_MID§$2§LINK_END§',
    );
    // Replace `code` → `code` (preserve inline code)
    result = result.replace(/`([^`]+)`/g, '§CODE_START§$1§CODE_END§');

    // Escape all special characters in plain text
    result = this.escapeMarkdownV2(result);

    // Restore markdown constructs (unescaped)
    result = result.replace(/§BOLD_START§/g, '*').replace(/§BOLD_END§/g, '*');
    result = result.replace(/§ITALIC_START§/g, '_').replace(/§ITALIC_END§/g, '_');
    result = result.replace(/§CODE_START§/g, '`').replace(/§CODE_END§/g, '`');
    result = result.replace(
      /§LINK_START§(.*?)§LINK_MID§(.*?)§LINK_END§/g,
      (_, linkText, url) => `[${linkText}](${this.escapeMarkdownV2Url(url)})`,
    );

    return result;
  }
}
