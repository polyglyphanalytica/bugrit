/**
 * Notification Dispatcher
 *
 * Central hub for sending notifications across all channels (email, in-app, push).
 * Respects user preferences and handles delivery failures gracefully.
 */

import { getDb, toTimestamp, generateId } from '../firestore';
import {
  getUserNotificationPreferences,
  shouldNotify,
  isInQuietHours,
  NotificationEventType,
  NotificationChannelType,
  TRANSACTIONAL_EVENTS,
} from './preferences';
import { sendEmail, buildScanCompletedEmail, buildScanFailedEmail, buildGenericEmail } from './email-service';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * In-app notification stored in Firestore
 */
export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationEventType;
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Notification event data
 */
export interface NotificationEvent {
  type: NotificationEventType;
  userId: string;
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  // For email
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
}

/**
 * Dispatch result
 */
export interface DispatchResult {
  success: boolean;
  channels: {
    email?: { sent: boolean; error?: string };
    inApp?: { sent: boolean; notificationId?: string; error?: string };
    push?: { sent: boolean; error?: string };
  };
}

// In-memory store for dev
const notificationStore = new Map<string, InAppNotification>();

/**
 * Dispatch a notification to all appropriate channels based on user preferences
 */
export async function dispatchNotification(event: NotificationEvent): Promise<DispatchResult> {
  const result: DispatchResult = {
    success: false,
    channels: {},
  };

  try {
    // Get user preferences
    const prefs = await getUserNotificationPreferences(event.userId);

    // Check quiet hours (but transactional events still go through)
    const inQuietHours = isInQuietHours(prefs);
    const isTransactional = TRANSACTIONAL_EVENTS.includes(event.type);

    // Determine which channels to use
    const channels: NotificationChannelType[] = ['email', 'in_app', 'push'];

    for (const channel of channels) {
      // Skip if quiet hours and not transactional
      if (inQuietHours && !isTransactional && channel !== 'in_app') {
        continue;
      }

      if (shouldNotify(prefs, event.type, channel)) {
        switch (channel) {
          case 'email':
            result.channels.email = await sendEmailNotification(event, prefs.channels.email.address);
            break;
          case 'in_app':
            result.channels.inApp = await sendInAppNotification(event);
            break;
          case 'push':
            result.channels.push = await sendPushNotification(event, prefs.channels.push.deviceTokens);
            break;
        }
      }
    }

    // Consider success if at least one channel delivered
    result.success = Object.values(result.channels).some(ch => ch?.sent);

  } catch (error) {
    console.error('Error dispatching notification:', error);
  }

  return result;
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  event: NotificationEvent,
  overrideEmail?: string
): Promise<{ sent: boolean; error?: string }> {
  try {
    // Get user email - in production, look up from user profile
    // For now, we'll use the metadata or override
    const recipientEmail = overrideEmail || (event.metadata?.email as string);

    if (!recipientEmail) {
      return { sent: false, error: 'No email address available' };
    }

    // Build email content
    let emailContent: { subject: string; html: string; text: string };

    if (event.emailSubject && event.emailHtml) {
      emailContent = {
        subject: event.emailSubject,
        html: event.emailHtml,
        text: event.emailText || event.message,
      };
    } else {
      // Use generic template
      emailContent = buildGenericEmail({
        title: event.title,
        message: event.message,
        actionUrl: event.actionUrl,
        actionLabel: event.actionLabel || 'View Details',
      });
    }

    const result = await sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return { sent: result.success, error: result.error };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : 'Email send failed' };
  }
}

/**
 * Send in-app notification (stored in Firestore)
 */
async function sendInAppNotification(
  event: NotificationEvent
): Promise<{ sent: boolean; notificationId?: string; error?: string }> {
  try {
    const notification: InAppNotification = {
      id: generateId('notif'),
      userId: event.userId,
      type: event.type,
      title: event.title,
      message: event.message,
      severity: event.severity || 'info',
      actionUrl: event.actionUrl,
      actionLabel: event.actionLabel,
      metadata: event.metadata,
      read: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    const db = getDb();

    if (!db) {
      notificationStore.set(notification.id, notification);
      return { sent: true, notificationId: notification.id };
    }

    await db.collection(NOTIFICATIONS_COLLECTION).doc(notification.id).set({
      ...notification,
      createdAt: toTimestamp(notification.createdAt),
      expiresAt: notification.expiresAt ? toTimestamp(notification.expiresAt) : null,
    });

    return { sent: true, notificationId: notification.id };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : 'In-app notification failed' };
  }
}

/**
 * Send push notification via Firebase Cloud Messaging
 */
async function sendPushNotification(
  event: NotificationEvent,
  deviceTokens: string[]
): Promise<{ sent: boolean; error?: string }> {
  if (!deviceTokens || deviceTokens.length === 0) {
    return { sent: false, error: 'No device tokens registered' };
  }

  try {
    // Firebase Admin SDK for sending push notifications
    // This requires firebase-admin to be configured
    const { getMessaging } = await import('firebase-admin/messaging');

    const message = {
      notification: {
        title: event.title,
        body: event.message,
      },
      data: {
        type: event.type,
        actionUrl: event.actionUrl || '',
        ...Object.fromEntries(
          Object.entries(event.metadata || {}).map(([k, v]) => [k, String(v)])
        ),
      },
      tokens: deviceTokens,
    };

    const response = await getMessaging().sendEachForMulticast(message);

    if (response.failureCount > 0) {
      console.warn('Some push notifications failed:', response.responses.filter(r => !r.success));
    }

    return {
      sent: response.successCount > 0,
      error: response.failureCount > 0 ? `${response.failureCount} of ${deviceTokens.length} failed` : undefined,
    };
  } catch (error) {
    // Push notifications may fail if FCM is not configured
    console.warn('Push notification failed:', error);
    return { sent: false, error: error instanceof Error ? error.message : 'Push failed' };
  }
}

// ============================================================================
// Convenience functions for specific notification types
// ============================================================================

/**
 * Notify user that a scan completed successfully
 */
export async function notifyScanCompleted(params: {
  userId: string;
  userEmail: string;
  scanId: string;
  applicationName: string;
  totalFindings: number;
  critical: number;
  high: number;
  vibeScore?: number;
  reportUrl: string;
}): Promise<DispatchResult> {
  const hasCriticalIssues = params.critical > 0;

  const email = buildScanCompletedEmail({
    applicationName: params.applicationName,
    totalFindings: params.totalFindings,
    critical: params.critical,
    high: params.high,
    vibeScore: params.vibeScore,
    reportUrl: params.reportUrl,
  });

  return dispatchNotification({
    type: 'scan_completed',
    userId: params.userId,
    title: hasCriticalIssues
      ? `Scan completed - ${params.critical} critical issues found`
      : `Scan completed - ${params.totalFindings} findings`,
    message: hasCriticalIssues
      ? `Your scan of ${params.applicationName} found ${params.critical} critical and ${params.high} high severity issues that need attention.`
      : `Your scan of ${params.applicationName} completed with ${params.totalFindings} findings.${params.vibeScore ? ` Vibe Score: ${params.vibeScore}/100` : ''}`,
    severity: hasCriticalIssues ? 'warning' : 'success',
    actionUrl: params.reportUrl,
    actionLabel: 'View Report',
    emailSubject: email.subject,
    emailHtml: email.html,
    emailText: email.text,
    metadata: {
      email: params.userEmail,
      scanId: params.scanId,
      totalFindings: params.totalFindings,
      critical: params.critical,
      high: params.high,
      vibeScore: params.vibeScore,
    },
  });
}

/**
 * Notify user that a scan failed
 */
export async function notifyScanFailed(params: {
  userId: string;
  userEmail: string;
  scanId: string;
  applicationName: string;
  error: string;
  scanUrl: string;
}): Promise<DispatchResult> {
  const email = buildScanFailedEmail({
    applicationName: params.applicationName,
    error: params.error,
    scanUrl: params.scanUrl,
  });

  return dispatchNotification({
    type: 'scan_failed',
    userId: params.userId,
    title: 'Scan failed',
    message: `Your scan of ${params.applicationName} failed: ${params.error}`,
    severity: 'error',
    actionUrl: params.scanUrl,
    actionLabel: 'View Details',
    emailSubject: email.subject,
    emailHtml: email.html,
    emailText: email.text,
    metadata: {
      email: params.userEmail,
      scanId: params.scanId,
      error: params.error,
    },
  });
}

/**
 * Notify user of a security alert (critical/high findings)
 */
export async function notifySecurityAlert(params: {
  userId: string;
  userEmail: string;
  scanId: string;
  applicationName: string;
  critical: number;
  high: number;
  topIssues: Array<{ title: string; severity: string }>;
  reportUrl: string;
}): Promise<DispatchResult> {
  const issueList = params.topIssues
    .slice(0, 3)
    .map(i => `• ${i.title} (${i.severity})`)
    .join('\n');

  return dispatchNotification({
    type: 'security_alert',
    userId: params.userId,
    title: `Security Alert: ${params.critical} critical issues`,
    message: `${params.applicationName} has ${params.critical} critical and ${params.high} high severity security issues:\n${issueList}`,
    severity: 'error',
    actionUrl: params.reportUrl,
    actionLabel: 'View Issues',
    metadata: {
      email: params.userEmail,
      scanId: params.scanId,
      critical: params.critical,
      high: params.high,
    },
  });
}

/**
 * Notify user that credits are running low
 */
export async function notifyCreditsLow(params: {
  userId: string;
  userEmail: string;
  creditsRemaining: number;
  percentRemaining: number;
  upgradeUrl: string;
}): Promise<DispatchResult> {
  return dispatchNotification({
    type: 'credit_low',
    userId: params.userId,
    title: 'Credits running low',
    message: `You have ${params.creditsRemaining} credits remaining (${params.percentRemaining}% of your monthly allowance). Consider upgrading to avoid interruption.`,
    severity: 'warning',
    actionUrl: params.upgradeUrl,
    actionLabel: 'Upgrade Plan',
    metadata: {
      email: params.userEmail,
      creditsRemaining: params.creditsRemaining,
      percentRemaining: params.percentRemaining,
    },
  });
}

/**
 * Notify user about fix branch being ready
 */
export async function notifyFixBranchReady(params: {
  userId: string;
  userEmail: string;
  scanId: string;
  applicationName: string;
  branchName: string;
  issuesFixed: number;
  prUrl?: string;
  reviewPromptUrl: string;
}): Promise<DispatchResult> {
  return dispatchNotification({
    type: 'fix_branch_ready',
    userId: params.userId,
    title: 'Fix branch ready for review',
    message: `A fix branch "${params.branchName}" has been created for ${params.applicationName} with ${params.issuesFixed} fixes. Review and merge when ready.`,
    severity: 'success',
    actionUrl: params.prUrl || params.reviewPromptUrl,
    actionLabel: params.prUrl ? 'View Pull Request' : 'Review Fixes',
    metadata: {
      email: params.userEmail,
      scanId: params.scanId,
      branchName: params.branchName,
      issuesFixed: params.issuesFixed,
    },
  });
}

/**
 * Notify user about team invite
 */
export async function notifyTeamInvite(params: {
  userId: string;
  userEmail: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
}): Promise<DispatchResult> {
  return dispatchNotification({
    type: 'team_invite',
    userId: params.userId,
    title: `You've been invited to ${params.teamName}`,
    message: `${params.inviterName} has invited you to join ${params.teamName} on Bugrit.`,
    severity: 'info',
    actionUrl: params.inviteUrl,
    actionLabel: 'Accept Invite',
    metadata: {
      email: params.userEmail,
      teamName: params.teamName,
      inviterName: params.inviterName,
    },
  });
}

/**
 * Notify user that a test run completed successfully
 */
export async function notifyTestCompleted(params: {
  userId: string;
  userEmail: string;
  testRunId: string;
  testName: string;
  duration: number;
  passed: boolean;
  testUrl: string;
}): Promise<DispatchResult> {
  const durationSec = (params.duration / 1000).toFixed(1);

  return dispatchNotification({
    type: 'test_completed',
    userId: params.userId,
    title: params.passed ? 'Test passed' : 'Test completed with failures',
    message: params.passed
      ? `Test "${params.testName}" passed in ${durationSec}s.`
      : `Test "${params.testName}" completed with failures after ${durationSec}s.`,
    severity: params.passed ? 'success' : 'warning',
    actionUrl: params.testUrl,
    actionLabel: 'View Results',
    metadata: {
      email: params.userEmail,
      testRunId: params.testRunId,
      testName: params.testName,
      duration: params.duration,
      passed: params.passed,
    },
  });
}

/**
 * Notify user that a test run failed
 */
export async function notifyTestFailed(params: {
  userId: string;
  userEmail: string;
  testRunId: string;
  testName: string;
  error: string;
  testUrl: string;
}): Promise<DispatchResult> {
  return dispatchNotification({
    type: 'test_failed',
    userId: params.userId,
    title: 'Test execution failed',
    message: `Test "${params.testName}" failed to execute: ${params.error}`,
    severity: 'error',
    actionUrl: params.testUrl,
    actionLabel: 'View Details',
    metadata: {
      email: params.userEmail,
      testRunId: params.testRunId,
      testName: params.testName,
      error: params.error,
    },
  });
}

/**
 * Notify user that their subscription was successfully renewed
 */
export async function notifySubscriptionRenewed(params: {
  userId: string;
  userEmail: string;
  tierName: string;
  creditsIncluded: number;
  nextRenewalDate: string;
}): Promise<DispatchResult> {
  return dispatchNotification({
    type: 'subscription_renewed',
    userId: params.userId,
    title: 'Subscription renewed',
    message: `Your ${params.tierName} plan has been renewed. ${params.creditsIncluded} credits have been added to your account. Next renewal: ${params.nextRenewalDate}.`,
    severity: 'success',
    actionUrl: '/settings',
    actionLabel: 'View Billing',
    metadata: {
      email: params.userEmail,
      tierName: params.tierName,
      creditsIncluded: params.creditsIncluded,
    },
  });
}

/**
 * Notify user that their subscription renewal payment failed
 */
export async function notifySubscriptionFailed(params: {
  userId: string;
  userEmail: string;
  tierName: string;
  reason: string;
}): Promise<DispatchResult> {
  return dispatchNotification({
    type: 'subscription_failed',
    userId: params.userId,
    title: 'Payment failed',
    message: `We couldn't process your ${params.tierName} plan renewal: ${params.reason}. Please update your payment method to avoid service interruption.`,
    severity: 'error',
    actionUrl: '/settings',
    actionLabel: 'Update Payment',
    metadata: {
      email: params.userEmail,
      tierName: params.tierName,
      reason: params.reason,
    },
  });
}
