// Generic Webhook Notification Service

import crypto from 'crypto';
import { NotificationPayload, NotificationResult } from './types';
import { devConsole } from '@/lib/console';

export class WebhookNotificationService {
  /**
   * Send notification to a generic webhook endpoint
   */
  async send(
    webhookUrl: string,
    payload: NotificationPayload,
    options?: {
      secret?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<NotificationResult> {
    if (!webhookUrl) {
      return {
        channel: 'webhook',
        success: false,
        error: 'Webhook URL not configured',
      };
    }

    try {
      const body = JSON.stringify({
        event: payload.type,
        application: {
          id: payload.applicationId,
          name: payload.applicationName,
        },
        timestamp: payload.timestamp.toISOString(),
        data: payload.data,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Bugrit-Webhook/1.0',
        'X-Bugrit-Event': payload.type,
        'X-Bugrit-Timestamp': payload.timestamp.toISOString(),
        ...options?.headers,
      };

      // Add signature if secret is provided
      if (options?.secret) {
        const signature = this.createSignature(body, options.secret);
        headers['X-Bugrit-Signature'] = signature;
        headers['X-Bugrit-Signature-256'] = `sha256=${signature}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        options?.timeout || 30000
      );

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Webhook request failed (${response.status}): ${error}`);
      }

      return {
        channel: 'webhook',
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      devConsole.error('Webhook notification error:', errorMessage);

      return {
        channel: 'webhook',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Create HMAC signature for webhook payload
   */
  private createSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  /**
   * Verify incoming webhook signature (for receiving webhooks)
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }
}

/**
 * Example webhook payload structure for external integrations
 */
export const WEBHOOK_PAYLOAD_EXAMPLE = {
  event: 'test_result',
  application: {
    id: 'app_123',
    name: 'My Application',
  },
  timestamp: '2024-01-15T10:30:00.000Z',
  data: {
    executionId: 'exec_456',
    status: 'passed',
    summary: {
      total: 50,
      passed: 48,
      failed: 1,
      skipped: 1,
      duration: 45000,
    },
    failedTests: [
      {
        name: 'Login form validation',
        error: 'Expected button to be visible',
        duration: 5000,
      },
    ],
    browser: 'chromium',
    platform: 'web',
    buildId: 'build_789',
    commitSha: 'abc123',
    branch: 'main',
    reportUrl: 'https://app.buggered.io/reports/exec_456',
  },
};
