// Notification Manager - Coordinates all notification channels

import { ApplicationSettings } from '../types';
import { EmailNotificationService } from './email-service';
import { SlackNotificationService } from './slack-service';
import { WebhookNotificationService } from './webhook-service';
import {
  NotificationPayload,
  NotificationResult,
  NotificationConfig,
  TestResultNotification,
  UptimeNotification,
} from './types';

export class NotificationManager {
  private emailService: EmailNotificationService;
  private slackService: SlackNotificationService;
  private webhookService: WebhookNotificationService;

  constructor() {
    this.emailService = new EmailNotificationService();
    this.slackService = new SlackNotificationService();
    this.webhookService = new WebhookNotificationService();
  }

  /**
   * Send notifications based on application settings
   */
  async sendNotifications(
    payload: NotificationPayload,
    settings: ApplicationSettings
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Determine if we should notify based on status
    const isSuccess = this.isSuccessNotification(payload);

    // Send email notifications
    if (settings.emailEnabled && settings.emailRecipients.length > 0) {
      const shouldSendEmail =
        (isSuccess && settings.emailNotifyOnSuccess) ||
        (!isSuccess && settings.emailNotifyOnFailure);

      if (shouldSendEmail) {
        const result = await this.emailService.send(settings.emailRecipients, payload);
        results.push(result);
      }
    }

    // Send Slack notifications
    if (settings.slackEnabled && settings.slackWebhookUrl) {
      const shouldSendSlack =
        (isSuccess && settings.slackNotifyOnSuccess) ||
        (!isSuccess && settings.slackNotifyOnFailure);

      if (shouldSendSlack) {
        const result = await this.slackService.send(
          settings.slackWebhookUrl,
          payload,
          settings.slackChannel
        );
        results.push(result);
      }
    }

    // Send webhook notifications
    if (settings.webhookEnabled && settings.webhookUrl) {
      const result = await this.webhookService.send(settings.webhookUrl, payload, {
        secret: settings.webhookSecret,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Send test result notification
   */
  async notifyTestResult(
    applicationId: string,
    applicationName: string,
    result: TestResultNotification,
    settings: ApplicationSettings
  ): Promise<NotificationResult[]> {
    const payload: NotificationPayload = {
      type: 'test_result',
      applicationId,
      applicationName,
      timestamp: new Date(),
      data: result,
    };

    return this.sendNotifications(payload, settings);
  }

  /**
   * Send uptime notification
   */
  async notifyUptime(
    applicationId: string,
    applicationName: string,
    status: UptimeNotification,
    settings: ApplicationSettings
  ): Promise<NotificationResult[]> {
    const payload: NotificationPayload = {
      type: 'uptime',
      applicationId,
      applicationName,
      timestamp: new Date(),
      data: status,
    };

    // For uptime, always notify on status changes
    const shouldNotify =
      status.status !== status.previousStatus ||
      status.status === 'down';

    if (!shouldNotify) {
      return [];
    }

    return this.sendNotifications(payload, settings);
  }

  /**
   * Send notification to specific channels
   */
  async sendToChannels(
    payload: NotificationPayload,
    config: NotificationConfig
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    if (config.email?.enabled && config.email.recipients.length > 0) {
      const result = await this.emailService.send(config.email.recipients, payload);
      results.push(result);
    }

    if (config.slack?.enabled && config.slack.webhookUrl) {
      const result = await this.slackService.send(
        config.slack.webhookUrl,
        payload,
        config.slack.channel
      );
      results.push(result);
    }

    if (config.webhook?.enabled && config.webhook.url) {
      const result = await this.webhookService.send(config.webhook.url, payload, {
        secret: config.webhook.secret,
        headers: config.webhook.headers,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Check if email service is configured
   */
  isEmailConfigured(): boolean {
    return this.emailService.isConfigured();
  }

  /**
   * Determine if notification is for success status
   */
  private isSuccessNotification(payload: NotificationPayload): boolean {
    switch (payload.type) {
      case 'test_result': {
        const data = payload.data as TestResultNotification;
        return data.status === 'passed';
      }
      case 'uptime': {
        const data = payload.data as UptimeNotification;
        return data.status === 'up';
      }
      default:
        return true;
    }
  }
}

// Singleton instance
let notificationManagerInstance: NotificationManager | null = null;

export function getNotificationManager(): NotificationManager {
  if (!notificationManagerInstance) {
    notificationManagerInstance = new NotificationManager();
  }
  return notificationManagerInstance;
}
