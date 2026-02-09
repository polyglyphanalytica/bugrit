import { NotificationChannel } from '@/types/notification';

export interface DeliveryPayload {
  title: string;
  body: string;
  metadata: Record<string, string | number>;
}

export async function scheduleDelivery(channel: NotificationChannel, payload: DeliveryPayload) {
  // Placeholder for channel-specific dispatch.
  console.log(`Dispatching ${channel} notification`, payload);
  return Promise.resolve(true);
}
