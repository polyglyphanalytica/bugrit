// Notification Services
// Supports Email (Resend), Slack (Webhooks), Discord, Teams, PagerDuty, and generic Webhooks

export { EmailNotificationService } from './email-service';
export { SlackNotificationService } from './slack-service';
export { WebhookNotificationService } from './webhook-service';
export { DiscordNotificationService } from './discord-service';
export { TeamsNotificationService } from './teams-service';
export { PagerDutyNotificationService } from './pagerduty-service';
export { NotificationManager } from './notification-manager';
export type {
  NotificationPayload,
  TestResultNotification,
  UptimeNotification,
  ScanNotification,
  NotificationChannel,
  NotificationConfig,
} from './types';
