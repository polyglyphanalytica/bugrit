import { NotificationChannel } from '@/types/notification';
import { devConsole } from '@/lib/console';

export interface DeliveryPayload {
  title: string;
  body: string;
  metadata: Record<string, string | number>;
}

export async function scheduleDelivery(channel: NotificationChannel, payload: DeliveryPayload) {
  // Placeholder for channel-specific dispatch.
  devConsole.log(`Dispatching ${channel} notification`, payload);
  return Promise.resolve(true);
}
