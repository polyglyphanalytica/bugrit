// Slack Notification Service using Webhooks

import {
  NotificationPayload,
  NotificationResult,
  SlackMessage,
  SlackBlock,
  SlackAttachment,
  TestResultNotification,
  UptimeNotification,
} from './types';
import { devConsole } from '@/lib/console';

export class SlackNotificationService {
  async send(
    webhookUrl: string,
    payload: NotificationPayload,
    channel?: string
  ): Promise<NotificationResult> {
    if (!webhookUrl) {
      return {
        channel: 'slack',
        success: false,
        error: 'Slack webhook URL not configured',
      };
    }

    try {
      const message = this.buildMessage(payload, channel);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Slack webhook failed: ${error}`);
      }

      return {
        channel: 'slack',
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      devConsole.error('Slack notification error:', errorMessage);

      return {
        channel: 'slack',
        success: false,
        error: errorMessage,
      };
    }
  }

  private buildMessage(payload: NotificationPayload, channel?: string): SlackMessage {
    switch (payload.type) {
      case 'test_result':
        return this.buildTestResultMessage(payload, channel);
      case 'uptime':
        return this.buildUptimeMessage(payload, channel);
      default:
        return this.buildGenericMessage(payload, channel);
    }
  }

  private buildTestResultMessage(payload: NotificationPayload, channel?: string): SlackMessage {
    const data = payload.data as TestResultNotification;
    const isSuccess = data.status === 'passed';
    const statusEmoji = isSuccess ? ':white_check_mark:' : data.status === 'partial' ? ':warning:' : ':x:';
    const color = isSuccess ? '#22c55e' : data.status === 'partial' ? '#eab308' : '#dc2626';

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Test Results: ${payload.applicationName}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Total Tests:*\n${data.summary.total}`,
          },
          {
            type: 'mrkdwn',
            text: `*Passed:*\n${data.summary.passed} :white_check_mark:`,
          },
          {
            type: 'mrkdwn',
            text: `*Failed:*\n${data.summary.failed} :x:`,
          },
          {
            type: 'mrkdwn',
            text: `*Skipped:*\n${data.summary.skipped} :fast_forward:`,
          },
        ],
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Duration:*\n${(data.summary.duration / 1000).toFixed(2)}s`,
          },
          {
            type: 'mrkdwn',
            text: `*Pass Rate:*\n${((data.summary.passed / data.summary.total) * 100).toFixed(1)}%`,
          },
        ],
      },
    ];

    // Add platform info if available
    if (data.browser || data.platform) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: [
              data.browser ? `Browser: ${data.browser}` : null,
              data.platform ? `Platform: ${data.platform}` : null,
              data.branch ? `Branch: ${data.branch}` : null,
            ]
              .filter(Boolean)
              .join(' | '),
          },
        ],
      });
    }

    // Add failed tests if any
    const attachments: SlackAttachment[] = [];
    if (data.failedTests?.length) {
      attachments.push({
        color,
        fallback: `${data.failedTests.length} test(s) failed`,
        title: 'Failed Tests',
        fields: data.failedTests.slice(0, 5).map((t) => ({
          title: t.name,
          value: t.error.substring(0, 100) + (t.error.length > 100 ? '...' : ''),
          short: false,
        })),
        footer:
          data.failedTests.length > 5
            ? `And ${data.failedTests.length - 5} more...`
            : undefined,
      });
    }

    // Add report link if available
    if (data.reportUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Report',
              emoji: true,
            },
            url: data.reportUrl,
            style: 'primary',
          },
        ],
      });
    }

    return {
      channel,
      text: `Test Results: ${data.status === 'passed' ? 'All tests passed' : `${data.summary.failed} test(s) failed`}`,
      blocks,
      attachments,
    };
  }

  private buildUptimeMessage(payload: NotificationPayload, channel?: string): SlackMessage {
    const data = payload.data as UptimeNotification;
    const isUp = data.status === 'up';
    const statusEmoji = isUp ? ':large_green_circle:' : data.status === 'degraded' ? ':large_yellow_circle:' : ':red_circle:';
    const statusText = isUp ? 'Back Online' : data.status === 'degraded' ? 'Degraded' : 'Down';
    const color = isUp ? '#22c55e' : data.status === 'degraded' ? '#eab308' : '#dc2626';

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} ${data.endpointName} is ${statusText}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*URL:* ${data.endpointUrl}`,
        },
      },
    ];

    const fields = [];
    if (data.responseTime) {
      fields.push({
        type: 'mrkdwn' as const,
        text: `*Response Time:*\n${data.responseTime}ms`,
      });
    }
    if (data.statusCode) {
      fields.push({
        type: 'mrkdwn' as const,
        text: `*Status Code:*\n${data.statusCode}`,
      });
    }

    if (fields.length > 0) {
      blocks.push({
        type: 'section',
        fields,
      });
    }

    if (data.error) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:* ${data.error}`,
        },
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Application: ${payload.applicationName} | ${payload.timestamp.toISOString()}`,
        },
      ],
    });

    return {
      channel,
      text: `${data.endpointName} is ${statusText}`,
      blocks,
      attachments: [
        {
          color,
          fallback: `${data.endpointName} is ${statusText}`,
        },
      ],
    };
  }

  private buildGenericMessage(payload: NotificationPayload, channel?: string): SlackMessage {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Notification: ${payload.type}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Application:* ${payload.applicationName}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${JSON.stringify(payload.data, null, 2)}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: payload.timestamp.toISOString(),
          },
        ],
      },
    ];

    return {
      channel,
      text: `${payload.type} notification for ${payload.applicationName}`,
      blocks,
    };
  }
}
