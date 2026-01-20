// Notification Services
// Supports Email (Resend), Slack (Webhooks), and generic Webhooks

export { EmailNotificationService } from './email-service';
export { SlackNotificationService } from './slack-service';
export { WebhookNotificationService } from './webhook-service';
export { NotificationManager } from './notification-manager';
export type {
  NotificationPayload,
  TestResultNotification,
  UptimeNotification,
  NotificationChannel,
  NotificationConfig,
} from './types';
