/**
 * Channel Connections — Maps external channel users to Bugrit accounts
 *
 * When a user connects their Slack, WhatsApp, or Telegram to Bugrit, a mapping
 * is stored so incoming messages can be routed to the right user.
 */

import { db } from '@/lib/firebase/admin';
import type { SenseiChannel, ChannelConnection } from './channels/types';

const COLLECTION = 'channel_connections';

/** Build a unique document ID for a channel connection */
function connectionId(channel: SenseiChannel, channelUserId: string): string {
  return `${channel}_${channelUserId}`;
}

/** Look up the Bugrit user ID for a channel user */
export async function getBugritUser(
  channel: SenseiChannel,
  channelUserId: string,
): Promise<ChannelConnection | null> {
  const doc = await db.collection(COLLECTION).doc(connectionId(channel, channelUserId)).get();
  if (!doc.exists) return null;
  return doc.data() as ChannelConnection;
}

/** Create or update a channel connection */
export async function linkChannel(
  userId: string,
  channel: SenseiChannel,
  channelUserId: string,
  displayName?: string,
  metadata?: Record<string, string>,
): Promise<void> {
  const connection: ChannelConnection = {
    userId,
    channel,
    channelUserId,
    displayName,
    connectedAt: new Date().toISOString(),
    metadata,
  };
  await db.collection(COLLECTION).doc(connectionId(channel, channelUserId)).set(connection);
}

/** Remove a channel connection */
export async function unlinkChannel(
  channel: SenseiChannel,
  channelUserId: string,
): Promise<void> {
  await db.collection(COLLECTION).doc(connectionId(channel, channelUserId)).delete();
}

/** Get all channel connections for a Bugrit user */
export async function getConnectionsForUser(userId: string): Promise<ChannelConnection[]> {
  const snapshot = await db
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .get();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return snapshot.docs.map((doc: any) => doc.data() as ChannelConnection);
}
