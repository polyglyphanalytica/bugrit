/**
 * Channel Adapter Types for Multi-Channel Sensei
 *
 * Defines the interface that all channel adapters (Slack, WhatsApp, web, etc.)
 * must implement to enable Sensei conversations across platforms.
 */

import type { SenseiResponse, SenseiContext, SenseiMessage } from '@/ai/flows/sensei-chat';

/** Supported messaging channels */
export type SenseiChannel = 'web' | 'slack' | 'whatsapp';

/** Inbound message from a channel */
export interface InboundMessage {
  /** Channel this message came from */
  channel: SenseiChannel;
  /** Channel-specific user identifier (Slack user ID, WhatsApp phone, etc.) */
  channelUserId: string;
  /** Raw text content of the message */
  text: string;
  /** Channel-specific thread/conversation identifier */
  threadId?: string;
  /** Channel-specific metadata (team ID, channel ID, etc.) */
  metadata?: Record<string, string>;
}

/** Outbound message to send to a channel */
export interface OutboundMessage {
  /** Text response (markdown) */
  text: string;
  /** Optional action result message (appended after main text) */
  actionResult?: string;
  /** Suggested follow-up questions */
  suggestedQuestions?: string[];
  /** Optional URL to include (for navigate/checkout actions) */
  actionUrl?: string;
  /** Channel-specific thread to reply in */
  threadId?: string;
}

/** Linked Bugrit user for a channel connection */
export interface ChannelConnection {
  /** Bugrit Firebase UID */
  userId: string;
  /** Channel type */
  channel: SenseiChannel;
  /** Channel-specific user ID */
  channelUserId: string;
  /** Display name from channel */
  displayName?: string;
  /** When the connection was established */
  connectedAt: string;
  /** Channel-specific metadata (Slack team ID, etc.) */
  metadata?: Record<string, string>;
}

/**
 * Channel Adapter Interface
 *
 * Each channel (Slack, WhatsApp) implements this to handle
 * platform-specific message formatting and delivery.
 */
export interface ChannelAdapter {
  /** Channel identifier */
  readonly channel: SenseiChannel;

  /** Send a formatted response back to the channel */
  sendResponse(
    channelUserId: string,
    message: OutboundMessage,
    metadata?: Record<string, string>,
  ): Promise<void>;

  /** Verify the authenticity of an incoming webhook request */
  verifyWebhook(request: Request): Promise<boolean>;

  /** Parse a raw webhook payload into an InboundMessage */
  parseInbound(request: Request): Promise<InboundMessage | null>;
}
