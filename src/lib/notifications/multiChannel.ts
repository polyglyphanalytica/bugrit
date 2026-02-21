// Notification orchestration for Sensei results across multi-channel surfaces.
import { NotificationChannel, NotificationType } from '@/types/notification';
import { getNotificationTemplate } from './templates';
import { scheduleDelivery } from './delivery';

const TRANSACTIONAL_CHANNELS: NotificationChannel[] = ['email', 'slack', 'telegram'];
const MARKETING_CHANNELS: NotificationChannel[] = ['inApp', 'push'];

export interface NotificationPayload {
  title: string;
  body: string;
  metadata: Record<string, string | number>;
  channel?: NotificationChannel[];
  type: NotificationType;
}

export async function sendSenseiNotification(payload: NotificationPayload) {
  const channels = payload.channel ??
    (payload.type === 'transactional' ? TRANSACTIONAL_CHANNELS : MARKETING_CHANNELS);

  for (const channel of channels) {
    const template = getNotificationTemplate(channel, payload.type);
    await scheduleDelivery(channel, {
      title: payload.title,
      body: template.render(payload.body, payload.metadata),
      metadata: payload.metadata,
    });
  }
}
