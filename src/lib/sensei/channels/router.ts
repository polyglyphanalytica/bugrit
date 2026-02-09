/**
 * Sensei Channel Router
 *
 * Orchestrates the full message flow for non-web channels:
 * 1. Look up Bugrit user from channel user
 * 2. Load conversation history
 * 3. Build user context (apps, scans, credits)
 * 4. Call generateSenseiResponse()
 * 5. Execute any server-side actions
 * 6. Save history
 * 7. Send response back through channel adapter
 */

import { generateSenseiResponse, type SenseiContext } from '@/ai/flows/sensei-chat';
import { getBugritUser } from '../connections';
import { getHistory, appendToHistory } from '../history';
import { executeAction, type ActionResult } from '../actions/executor';
import type { ChannelAdapter, InboundMessage, OutboundMessage } from './types';
import { db } from '@/lib/firebase/admin';
import { getApplicationsByOwner } from '@/lib/db/applications';
import { logger } from '@/lib/logger';

/**
 * Route an inbound channel message through the full Sensei pipeline.
 * Returns true if the message was handled, false if the user is not connected.
 */
export async function routeMessage(
  adapter: ChannelAdapter,
  message: InboundMessage,
): Promise<boolean> {
  const log = logger.child({ channel: message.channel, channelUserId: message.channelUserId });

  // 1. Look up the Bugrit user
  const connection = await getBugritUser(message.channel, message.channelUserId);
  if (!connection) {
    // User hasn't connected their account — send a connect prompt
    await adapter.sendResponse(message.channelUserId, {
      text: 'You haven\'t connected your Bugrit account yet. Visit your Bugrit settings to link this channel.',
      actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bugrit.com'}/settings/integrations`,
      threadId: message.threadId,
    }, message.metadata);
    return false;
  }

  const userId = connection.userId;
  log.info('Routing channel message', { userId, messageLength: message.text.length });

  try {
    // 2. Load conversation history
    const history = await getHistory(userId, message.channel, message.threadId);

    // 3. Build user context
    const context = await buildUserContext(userId);

    // 4. Generate Sensei response
    const senseiResponse = await generateSenseiResponse({
      message: message.text,
      history: history.length > 0 ? history : undefined,
      context,
    });

    // 5. Execute server-side action (if any)
    let actionResult: ActionResult | null = null;
    if (senseiResponse.actionType !== 'none') {
      actionResult = await executeAction(userId, senseiResponse);
    }

    // 6. Save conversation history
    const fullResponse = actionResult?.message
      ? `${senseiResponse.message}\n\n${actionResult.message}`
      : senseiResponse.message;

    await appendToHistory(userId, message.channel, message.text, fullResponse, message.threadId);

    // 7. Send response back through the channel
    const outbound: OutboundMessage = {
      text: senseiResponse.message,
      actionResult: actionResult?.message,
      suggestedQuestions: senseiResponse.suggestedQuestions,
      actionUrl: actionResult?.url,
      threadId: message.threadId,
    };

    await adapter.sendResponse(message.channelUserId, outbound, message.metadata);
    return true;
  } catch (error) {
    log.error('Failed to process channel message', { userId, error });
    await adapter.sendResponse(message.channelUserId, {
      text: 'I ran into an issue processing your message. Please try again in a moment.',
      threadId: message.threadId,
    }, message.metadata);
    return false;
  }
}

/** Build SenseiContext from Firestore for a given user */
async function buildUserContext(userId: string): Promise<SenseiContext> {
  const context: SenseiContext = {};

  try {
    // User info
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      context.userName = data?.displayName || data?.email?.split('@')[0];
    }

    // Applications
    const apps = await getApplicationsByOwner(userId);
    if (apps.length > 0) {
      context.apps = apps.slice(0, 10).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type || 'web',
      }));
    }

    // Recent scans
    const scansSnap = await db
      .collection('scans')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    if (!scansSnap.empty) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context.recentScans = scansSnap.docs.map((doc: any) => {
        const d = doc.data();
        return {
          id: d.id || doc.id,
          status: d.status,
          appName: d.applicationId,
          findings: d.summary?.totalFindings,
          repoUrl: d.source?.repoUrl,
        };
      });
    }

    // Credits / billing
    let billingData = null;
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();
    if (billingDoc.exists) {
      billingData = billingDoc.data();
    } else {
      const legacyDoc = await db.collection('billingAccounts').doc(userId).get();
      if (legacyDoc.exists) billingData = legacyDoc.data();
    }

    if (billingData?.credits) {
      context.credits = {
        remaining: billingData.credits.remaining ?? 10,
        included: billingData.credits.included ?? 10,
        tier: billingData.subscription?.tier || userDoc.data()?.tier || 'free',
      };
    } else {
      context.credits = { remaining: 10, included: 10, tier: 'free' };
    }
  } catch (error) {
    logger.warn('Failed to build full user context for channel', { userId, error });
  }

  return context;
}
