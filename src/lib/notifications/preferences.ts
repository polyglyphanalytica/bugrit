/**
 * User Notification Preferences
 *
 * Manages per-user notification settings including channel preferences,
 * event types, and opt-in/opt-out status.
 */

import { getDb, toDate, toTimestamp, generateId } from '../firestore';

const COLLECTION = 'notificationPreferences';

/**
 * Notification event types that users can subscribe to
 */
export type NotificationEventType =
  | 'scan_completed'
  | 'scan_failed'
  | 'test_completed'
  | 'test_failed'
  | 'fix_branch_ready'
  | 'weekly_summary'
  | 'security_alert'        // Critical/high severity findings
  | 'credit_low'            // Credits running low
  | 'subscription_update'   // Billing/subscription changes
  | 'subscription_renewed'  // Plan successfully renewed
  | 'subscription_failed'   // Renewal payment failed
  | 'team_invite'           // Team invitations
  | 'support_ticket_created'  // Support ticket opened on user's behalf
  | 'support_ticket_new'      // Admin: new ticket received
  | 'support_response';       // Admin responded to a support ticket

/**
 * Notification channels
 */
export type NotificationChannelType = 'email' | 'in_app' | 'push';

/**
 * User notification preferences
 */
export interface UserNotificationPreferences {
  id: string;
  userId: string;

  // Global settings
  globalEnabled: boolean;           // Master switch
  quietHoursEnabled: boolean;
  quietHoursStart?: string;         // "22:00"
  quietHoursEnd?: string;           // "08:00"
  timezone?: string;                // "America/New_York"

  // Channel settings
  channels: {
    email: {
      enabled: boolean;
      address?: string;             // Override email if different from account
      digestMode: 'immediate' | 'daily' | 'weekly';
    };
    inApp: {
      enabled: boolean;
      showBadge: boolean;
      playSound: boolean;
    };
    push: {
      enabled: boolean;
      deviceTokens: string[];       // FCM tokens
    };
  };

  // Per-event preferences (which events to receive)
  events: {
    [K in NotificationEventType]: {
      enabled: boolean;
      channels: NotificationChannelType[];  // Which channels for this event
    };
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  optInCompletedAt?: Date;          // When user completed opt-in flow
}

/**
 * Default notification preferences for new users
 * Transactional notifications (security alerts, billing) are always on for email
 */
export function getDefaultPreferences(userId: string): UserNotificationPreferences {
  return {
    id: generateId('npref'),
    userId,
    globalEnabled: true,
    quietHoursEnabled: false,

    channels: {
      email: {
        enabled: true,              // Email on by default
        digestMode: 'immediate',
      },
      inApp: {
        enabled: true,              // In-app on by default
        showBadge: true,
        playSound: false,
      },
      push: {
        enabled: false,             // Push requires explicit opt-in
        deviceTokens: [],
      },
    },

    events: {
      // Scan events - default on
      scan_completed: {
        enabled: true,
        channels: ['email', 'in_app'],
      },
      scan_failed: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Test events - default on
      test_completed: {
        enabled: true,
        channels: ['in_app'],       // In-app only by default
      },
      test_failed: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Fix branch ready - default on
      fix_branch_ready: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Weekly summary - default on
      weekly_summary: {
        enabled: true,
        channels: ['email'],
      },

      // Security alerts - ALWAYS on for email (transactional)
      security_alert: {
        enabled: true,
        channels: ['email', 'in_app', 'push'],
      },

      // Credit low - ALWAYS on for email (transactional)
      credit_low: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Subscription updates - ALWAYS on for email (transactional)
      subscription_update: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Subscription renewed - ALWAYS on for email (transactional)
      subscription_renewed: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Subscription failed - ALWAYS on for email (transactional)
      subscription_failed: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Team invites - ALWAYS on for email (transactional)
      team_invite: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Support ticket created on user's behalf - ALWAYS on (transactional)
      support_ticket_created: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Admin: new ticket received
      support_ticket_new: {
        enabled: true,
        channels: ['email', 'in_app'],
      },

      // Admin responded to a support ticket - ALWAYS on (transactional)
      support_response: {
        enabled: true,
        channels: ['email', 'in_app'],
      },
    },

    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Transactional event types that cannot be fully disabled
 * At least email must remain on for these
 */
export const TRANSACTIONAL_EVENTS: NotificationEventType[] = [
  'security_alert',
  'credit_low',
  'subscription_update',
  'subscription_renewed',
  'subscription_failed',
  'team_invite',
  'support_ticket_created',
  'support_response',
];

// In-memory fallback
const preferencesStore = new Map<string, UserNotificationPreferences>();

/**
 * Get user notification preferences, creating defaults if none exist
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<UserNotificationPreferences> {
  const db = getDb();

  if (!db) {
    const existing = Array.from(preferencesStore.values()).find(p => p.userId === userId);
    if (existing) return existing;

    const defaults = getDefaultPreferences(userId);
    preferencesStore.set(defaults.id, defaults);
    return defaults;
  }

  const snapshot = await db
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    // Create default preferences
    const defaults = getDefaultPreferences(userId);
    await db.collection(COLLECTION).doc(defaults.id).set({
      ...defaults,
      createdAt: toTimestamp(defaults.createdAt),
      updatedAt: toTimestamp(defaults.updatedAt),
    });
    return defaults;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    userId: data.userId,
    globalEnabled: data.globalEnabled,
    quietHoursEnabled: data.quietHoursEnabled,
    quietHoursStart: data.quietHoursStart,
    quietHoursEnd: data.quietHoursEnd,
    timezone: data.timezone,
    channels: data.channels,
    events: data.events,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    optInCompletedAt: data.optInCompletedAt ? toDate(data.optInCompletedAt) : undefined,
  };
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  updates: Partial<Omit<UserNotificationPreferences, 'id' | 'userId' | 'createdAt'>>
): Promise<UserNotificationPreferences> {
  const current = await getUserNotificationPreferences(userId);
  const db = getDb();

  // Enforce transactional events always have email enabled
  if (updates.events) {
    for (const eventType of TRANSACTIONAL_EVENTS) {
      if (updates.events[eventType]) {
        // Ensure email is always in channels for transactional events
        if (!updates.events[eventType].channels.includes('email')) {
          updates.events[eventType].channels.push('email');
        }
        // Ensure transactional events can't be fully disabled
        updates.events[eventType].enabled = true;
      }
    }
  }

  const updated: UserNotificationPreferences = {
    ...current,
    ...updates,
    updatedAt: new Date(),
  };

  if (!db) {
    preferencesStore.set(current.id, updated);
    return updated;
  }

  await db.collection(COLLECTION).doc(current.id).update({
    ...updates,
    updatedAt: toTimestamp(updated.updatedAt),
  });

  return updated;
}

/**
 * Mark opt-in as completed (during signup or later)
 */
export async function markOptInCompleted(userId: string): Promise<void> {
  await updateUserNotificationPreferences(userId, {
    optInCompletedAt: new Date(),
  });
}

/**
 * Register a push notification device token
 */
export async function registerPushToken(userId: string, token: string): Promise<void> {
  const prefs = await getUserNotificationPreferences(userId);

  if (!prefs.channels.push.deviceTokens.includes(token)) {
    await updateUserNotificationPreferences(userId, {
      channels: {
        ...prefs.channels,
        push: {
          ...prefs.channels.push,
          enabled: true,
          deviceTokens: [...prefs.channels.push.deviceTokens, token],
        },
      },
    });
  }
}

/**
 * Remove a push notification device token
 */
export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  const prefs = await getUserNotificationPreferences(userId);

  await updateUserNotificationPreferences(userId, {
    channels: {
      ...prefs.channels,
      push: {
        ...prefs.channels.push,
        deviceTokens: prefs.channels.push.deviceTokens.filter(t => t !== token),
      },
    },
  });
}

/**
 * Check if user should receive notification for a specific event and channel
 */
export function shouldNotify(
  prefs: UserNotificationPreferences,
  eventType: NotificationEventType,
  channel: NotificationChannelType
): boolean {
  // Check global enabled
  if (!prefs.globalEnabled) {
    // Transactional events bypass global disable for email
    if (TRANSACTIONAL_EVENTS.includes(eventType) && channel === 'email') {
      return true;
    }
    return false;
  }

  // Check channel enabled
  const channelConfig = prefs.channels[channel === 'in_app' ? 'inApp' : channel];
  if (!channelConfig.enabled) {
    // Transactional events bypass channel disable for email
    if (TRANSACTIONAL_EVENTS.includes(eventType) && channel === 'email') {
      return true;
    }
    return false;
  }

  // Check event preferences
  const eventConfig = prefs.events[eventType];
  if (!eventConfig.enabled) {
    return false;
  }

  // Check if channel is enabled for this event
  return eventConfig.channels.includes(channel);
}

/**
 * Check if we're in quiet hours
 */
export function isInQuietHours(prefs: UserNotificationPreferences): boolean {
  if (!prefs.quietHoursEnabled || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  // Simple check - doesn't handle timezone perfectly
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = prefs.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = prefs.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}
