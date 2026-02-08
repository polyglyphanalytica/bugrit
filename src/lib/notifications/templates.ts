import { NotificationChannel, NotificationType } from '@/types/notification';

interface NotificationTemplate {
  render: (body: string, metadata: Record<string, string | number>) => string;
}

const templates: Record<NotificationChannel, NotificationTemplate> = {
  email: { render: (body) => `Email update:\n${body}` },
  slack: { render: (body) => `Slack alert: ${body}` },
  whatsapp: { render: (body) => `WhatsApp message: ${body}` },
  inApp: { render: (body) => `In-App: ${body}` },
  push: { render: (body) => `Push notification: ${body}` },
};

export function getNotificationTemplate(channel: NotificationChannel, type: NotificationType): NotificationTemplate {
  return templates[channel] ?? templates.email;
}
