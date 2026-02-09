/**
 * Server-Side Action Executor for Sensei
 *
 * Replicates the client-side executeAction logic from sensei-context.tsx
 * for use in non-web channels (Slack, WhatsApp) where there is no browser.
 *
 * For browser-only actions (navigate, checkout), returns a link instead.
 */

import { db } from '@/lib/firebase/admin';
import { createApplication, getApplicationsByOwner } from '@/lib/db/applications';
import {
  checkScanAffordability,
  reserveCreditsForScan,
} from '@/lib/billing';
import { generateId, getDb, COLLECTIONS } from '@/lib/firestore';
import { getAccessTokenForUser } from '@/lib/github/connections';
import { logger } from '@/lib/logger';
import type { SenseiResponse } from '@/ai/flows/sensei-chat';
import type { ToolCategory } from '@/lib/tools/registry';

export interface ActionResult {
  /** Human-readable result message */
  message: string;
  /** Optional URL for the user to visit (for navigate/checkout) */
  url?: string;
}

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://bugrit.com';

/**
 * Execute a Sensei action server-side on behalf of a user.
 * Returns a human-readable result message.
 */
export interface ExecuteActionOptions {
  /** Conversation history for escalation transcript */
  history?: Array<{ role: 'user' | 'sensei'; content: string }>;
  /** Channel the user is on */
  channel?: 'web' | 'slack' | 'whatsapp';
}

export async function executeAction(
  userId: string,
  response: SenseiResponse,
  options?: ExecuteActionOptions,
): Promise<ActionResult | null> {
  if (response.actionType === 'none') return null;

  switch (response.actionType) {
    case 'create_app':
      return executeCreateApp(userId, response);
    case 'start_scan':
      return executeStartScan(userId, response);
    case 'navigate':
      return executeNavigate(response);
    case 'checkout':
      return executeCheckout(response);
    case 'show_billing':
      return executeShowBilling(userId);
    case 'escalate_to_human':
      return executeEscalateToHuman(userId, response, options);
    case 'reply_to_ticket':
      return executeReplyToTicket(userId, response);
    default:
      return null;
  }
}

async function executeCreateApp(
  userId: string,
  response: SenseiResponse,
): Promise<ActionResult> {
  if (!response.appName || !response.appType) {
    return { message: 'I need a name and type to create an app. Could you provide those?' };
  }

  try {
    const app = await createApplication(
      {
        name: response.appName,
        type: response.appType as 'web' | 'mobile' | 'desktop',
        description: response.appDescription || '',
        targetUrl: response.targetUrl || '',
      },
      userId,
    );
    return {
      message: `Created *${app.name}*. You can now scan it or configure settings.`,
      url: `${baseUrl()}/applications/${app.id}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { message: `Could not create the app: ${msg}` };
  }
}

async function executeStartScan(
  userId: string,
  response: SenseiResponse,
): Promise<ActionResult> {
  if (!response.repoUrl) {
    return { message: 'I need a GitHub URL to start a scan. What repo would you like to scan?' };
  }

  try {
    let appId = response.applicationId;

    // If no app specified, use first app or auto-create
    if (!appId) {
      const apps = await getApplicationsByOwner(userId);
      if (apps.length > 0) {
        appId = apps[0].id;
      } else {
        const repoName = response.repoUrl.split('/').pop()?.replace('.git', '') || 'my-app';
        const newApp = await createApplication(
          { name: repoName, type: 'web', description: `Auto-created for ${response.repoUrl}` },
          userId,
        );
        appId = newApp.id;
      }
    }

    // Check affordability
    const defaultCategories: ToolCategory[] = ['linting', 'security', 'accessibility'];
    const affordCheck = await checkScanAffordability(userId, {
      categories: defaultCategories,
      aiFeatures: ['summary'],
      estimatedLines: 50000,
    });

    if (!affordCheck.allowed) {
      return {
        message: `You don't have enough credits for this scan (need ~${affordCheck.estimate.total}, have ${affordCheck.currentBalance}). Would you like to upgrade your plan?`,
        url: `${baseUrl()}/pricing`,
      };
    }

    // Create scan record
    const scanId = generateId('scn');
    const reservation = await reserveCreditsForScan(userId, scanId, affordCheck.estimate.total);
    if (!reservation.success) {
      return { message: `Failed to reserve credits: ${reservation.error}` };
    }

    // Auto-inject GitHub token for private repos
    let accessToken: string | undefined;
    try {
      const storedToken = await getAccessTokenForUser(userId);
      if (storedToken) accessToken = storedToken;
    } catch {
      // Continue without token
    }

    const now = new Date().toISOString();
    const scanDoc = {
      id: scanId,
      applicationId: appId,
      userId,
      sourceType: 'github',
      status: 'pending',
      source: {
        type: 'github',
        repoUrl: response.repoUrl,
        branch: response.branch || 'main',
      },
      createdAt: now,
      toolsCompleted: 0,
      toolsTotal: 0,
      billing: {
        estimatedCredits: affordCheck.estimate.total,
      },
    };

    const firestoreDb = getDb();
    if (firestoreDb) {
      await firestoreDb.collection(COLLECTIONS.SCANS).doc(scanId).set(scanDoc);
    }

    // The scan worker picks up pending scans asynchronously.
    // In production, a Cloud Function or cron triggers the actual scan execution.
    logger.info('Scan created via channel action', { scanId, userId, repoUrl: response.repoUrl });

    return {
      message: `Scan started on *${response.repoUrl}* (branch: ${response.branch || 'main'}). This usually takes 1-2 minutes. ~${affordCheck.estimate.total} credits reserved.`,
      url: `${baseUrl()}/scans/${scanId}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { message: `Could not start the scan: ${msg}` };
  }
}

function executeNavigate(response: SenseiResponse): ActionResult {
  const path = response.path || '/dashboard';
  return {
    message: `Here's the link:`,
    url: `${baseUrl()}${path}`,
  };
}

function executeCheckout(response: SenseiResponse): ActionResult {
  if (!response.tier) {
    return { message: 'Which plan would you like? Solo ($19/mo), Scale ($49/mo), or Business ($99/mo)?' };
  }
  const interval = response.interval || 'month';
  return {
    message: `Here's your checkout link for the *${response.tier}* plan (${interval}ly):`,
    url: `${baseUrl()}/pricing?tier=${response.tier}&interval=${interval}`,
  };
}

async function executeEscalateToHuman(
  userId: string,
  response: SenseiResponse,
  options?: ExecuteActionOptions,
): Promise<ActionResult> {
  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      return { message: 'Could not create support ticket right now. Please try again.' };
    }

    // Get user info for the ticket
    const userDoc = await firestoreDb.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || userData?.name || 'User';
    const userEmail = userData?.email || userId;

    const ticketId = generateId('tkt');
    const now = new Date().toISOString();

    // Build transcript from conversation history
    const transcript = options?.history?.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      text: msg.content,
      timestamp: now,
    })) || [];

    const ticket = {
      id: ticketId,
      userId,
      name: userName,
      email: userEmail,
      category: 'escalation',
      subject: response.ticketSubject || 'Sensei escalation',
      message: response.ticketSummary || response.message,
      source: 'sensei_escalation',
      channel: options?.channel || 'web',
      transcript,
      status: 'open',
      priority: 'high',
      assignedTo: null,
      responses: [],
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };

    await firestoreDb.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId).set(ticket);

    // Notify the user that their ticket was created
    await firestoreDb.collection('notifications').doc(generateId('ntf')).set({
      userId,
      type: 'support_ticket_created',
      title: 'Support ticket created',
      message: `Your issue has been escalated to our support team: "${response.ticketSubject || 'Support request'}". We'll get back to you shortly.`,
      severity: 'info',
      actionUrl: `/support/${ticketId}`,
      actionLabel: 'View Ticket',
      metadata: { ticketId },
      read: false,
      createdAt: new Date(),
    });

    // Notify the superadmin about the new ticket
    const superadminEmail = process.env.PLATFORM_SUPERADMIN_EMAIL;
    if (superadminEmail) {
      // Find superadmin user by email
      const adminSnapshot = await firestoreDb.collection('users')
        .where('email', '==', superadminEmail)
        .limit(1)
        .get();

      if (!adminSnapshot.empty) {
        const adminUserId = adminSnapshot.docs[0].id;
        await firestoreDb.collection('notifications').doc(generateId('ntf')).set({
          userId: adminUserId,
          type: 'support_ticket_new',
          title: `New escalation from ${userName}`,
          message: response.ticketSummary || `User escalated: ${response.ticketSubject}`,
          severity: 'warning',
          metadata: { ticketId, userEmail, channel: options?.channel },
          read: false,
          createdAt: new Date(),
        });
      }
    }

    logger.info('Sensei escalation ticket created', { ticketId, userId, channel: options?.channel });

    return {
      message: `I've created a support ticket (${ticketId}). Our team will review the conversation and get back to you. You'll receive a notification when they respond.`,
    };
  } catch (error) {
    logger.error('Failed to create escalation ticket', { userId, error });
    return { message: 'Sorry, I couldn\'t create the support ticket right now. Please try again or contact hello@bugrit.com.' };
  }
}

async function executeReplyToTicket(
  userId: string,
  response: SenseiResponse,
): Promise<ActionResult> {
  if (!response.ticketId || !response.ticketReply) {
    return { message: 'I need to know which ticket to reply to and what you want to say.' };
  }

  try {
    const firestoreDb = getDb();
    if (!firestoreDb) {
      return { message: 'Could not send your response right now. Please try again.' };
    }

    // Verify ticket exists and belongs to user
    const ticketRef = firestoreDb.collection(COLLECTIONS.SUPPORT_TICKETS).doc(response.ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      return { message: 'I couldn\'t find that ticket. It may have been resolved.' };
    }

    const ticket = ticketDoc.data()!;
    if (ticket.userId !== userId) {
      return { message: 'That ticket doesn\'t belong to your account.' };
    }

    if (ticket.status === 'closed') {
      return { message: 'That ticket is already closed. Would you like me to open a new one?' };
    }

    // Get user info
    const userDoc = await firestoreDb.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || userData?.name || 'User';

    const now = new Date().toISOString();
    const responseEntry = {
      id: generateId('resp'),
      author: userId,
      authorName: userName,
      message: response.ticketReply.trim(),
      createdAt: now,
      internal: false,
    };

    const existingResponses = ticket.responses || [];
    await ticketRef.update({
      responses: [...existingResponses, responseEntry],
      status: 'open',
      updatedAt: now,
    });

    // Notify superadmin
    const superadminEmail = process.env.PLATFORM_SUPERADMIN_EMAIL;
    if (superadminEmail) {
      const adminSnapshot = await firestoreDb.collection('users')
        .where('email', '==', superadminEmail)
        .limit(1)
        .get();

      if (!adminSnapshot.empty) {
        const adminUserId = adminSnapshot.docs[0].id;
        await firestoreDb.collection('notifications').doc(generateId('ntf')).set({
          userId: adminUserId,
          type: 'support_ticket_new',
          title: `User responded: ${ticket.subject}`,
          message: `${userName} responded: ${response.ticketReply.trim().slice(0, 100)}`,
          severity: 'info',
          metadata: { ticketId: response.ticketId },
          read: false,
          createdAt: new Date(),
        });
      }
    }

    logger.info('User replied to ticket via Sensei', { ticketId: response.ticketId, userId });

    return {
      message: `Your response has been sent to the support team for ticket "${ticket.subject}". You'll be notified when they reply.`,
    };
  } catch (error) {
    logger.error('Failed to reply to ticket', { userId, ticketId: response.ticketId, error });
    return { message: 'Sorry, I couldn\'t send your response. Please try again.' };
  }
}

async function executeShowBilling(userId: string): Promise<ActionResult> {
  try {
    // Read billing data directly from Firestore
    const billingDoc = await db.collection('billing_accounts').doc(userId).get();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!billingDoc.exists) {
      // Try legacy collection
      const legacyDoc = await db.collection('billingAccounts').doc(userId).get();
      if (!legacyDoc.exists) {
        return { message: 'No billing account found. You may be on the Free plan with 10 credits.' };
      }
    }

    const data = billingDoc.exists ? billingDoc.data() : null;
    const userData = userDoc.exists ? userDoc.data() : null;

    const tier = userData?.tier || data?.subscription?.tier || 'free';
    const credits = data?.credits || { remaining: 10, included: 10, used: 0 };
    const subscription = data?.subscription;

    let info = `*${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan* - ${credits.remaining} of ${credits.included} credits remaining (${credits.used} used)`;

    if (subscription?.renewsAt) {
      const renewDate = new Date(subscription.renewsAt).toLocaleDateString();
      info += `\nRenews ${renewDate}`;
    }
    if (subscription?.status === 'past_due') {
      info += '\n*Warning:* Your payment is past due. Update your payment method in settings.';
    }

    return {
      message: info,
      url: `${baseUrl()}/settings`,
    };
  } catch (error) {
    logger.error('Failed to fetch billing for channel action', { userId, error });
    return { message: 'Could not fetch billing info right now. Try again in a moment.' };
  }
}
