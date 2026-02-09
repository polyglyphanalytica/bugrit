/**
 * Slack Channel Adapter
 *
 * Handles Slack-specific message formatting (Block Kit) and delivery
 * via the Slack Web API. Verifies requests using Slack signing secrets.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { getSlackSigningSecret, getSlackBotToken } from './config';
import type { ChannelAdapter, InboundMessage, OutboundMessage } from './types';

interface SlackEventPayload {
  type: string;
  challenge?: string;
  event?: {
    type: string;
    user: string;
    text: string;
    channel: string;
    ts: string;
    thread_ts?: string;
    bot_id?: string;
  };
  team_id?: string;
}

export class SlackAdapter implements ChannelAdapter {
  readonly channel = 'slack' as const;

  private get signingSecret(): string {
    return getSlackSigningSecret() || '';
  }

  private get botToken(): string {
    return getSlackBotToken() || '';
  }

  /** Verify Slack request signature (v0 signing) */
  async verifyWebhook(request: Request): Promise<boolean> {
    if (!this.signingSecret) {
      logger.warn('SLACK_SIGNING_SECRET not configured');
      return false;
    }

    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signature = request.headers.get('x-slack-signature');

    if (!timestamp || !signature) return false;

    // Reject requests older than 5 minutes (replay protection)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

    // Clone request to read body without consuming it
    const body = await request.clone().text();
    const baseString = `v0:${timestamp}:${body}`;
    const hmac = createHmac('sha256', this.signingSecret).update(baseString).digest('hex');
    const expected = `v0=${hmac}`;

    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /** Parse a Slack Events API payload into an InboundMessage */
  async parseInbound(request: Request): Promise<InboundMessage | null> {
    const body: SlackEventPayload = await request.clone().json();

    // Ignore bot messages to prevent loops
    if (body.event?.bot_id) return null;

    // Only handle message events
    if (body.type !== 'event_callback' || body.event?.type !== 'message') {
      return null;
    }

    const event = body.event;
    if (!event.text || !event.user) return null;

    // Strip bot mention from the message text (e.g., "<@U12345> scan my repo")
    const text = event.text.replace(/<@[A-Z0-9]+>\s*/g, '').trim();
    if (!text) return null;

    return {
      channel: 'slack',
      channelUserId: event.user,
      text,
      threadId: event.thread_ts || event.ts,
      metadata: {
        slackChannel: event.channel,
        slackTeam: body.team_id || '',
        messageTs: event.ts,
      },
    };
  }

  /** Send a response back to Slack using Block Kit */
  async sendResponse(
    channelUserId: string,
    message: OutboundMessage,
    metadata?: Record<string, string>,
  ): Promise<void> {
    if (!this.botToken) {
      logger.error('SLACK_BOT_TOKEN not configured — cannot send Slack message');
      return;
    }

    const slackChannel = metadata?.slackChannel;
    if (!slackChannel) {
      logger.error('No Slack channel in metadata — cannot send message');
      return;
    }

    // Build Block Kit blocks
    const blocks: Record<string, unknown>[] = [];

    // Main response text
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: this.toSlackMarkdown(message.text) },
    });

    // Action result (if any)
    if (message.actionResult) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: this.toSlackMarkdown(message.actionResult) },
      });
    }

    // Action URL button
    if (message.actionUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Open in Bugrit', emoji: true },
            url: message.actionUrl,
            style: 'primary',
          },
        ],
      });
    }

    // Suggested follow-up questions
    if (message.suggestedQuestions?.length) {
      const suggestions = message.suggestedQuestions.map((q) => `> ${q}`).join('\n');
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*Try asking:*\n${suggestions}` },
        ],
      });
    }

    const payload: Record<string, unknown> = {
      channel: slackChannel,
      blocks,
      text: message.text, // Fallback for notifications
    };

    // Reply in thread if we have a thread_ts
    if (message.threadId) {
      payload.thread_ts = message.threadId;
    }

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.botToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      logger.error('Slack API error', { error: data.error, channel: slackChannel });
    }
  }

  /** Convert standard markdown to Slack mrkdwn */
  private toSlackMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // **bold** → *bold*
      .replace(/__(.*?)__/g, '*$1*')       // __bold__ → *bold*
      .replace(/\[(.*?)\]\((.*?)\)/g, '<$2|$1>'); // [text](url) → <url|text>
  }
}
