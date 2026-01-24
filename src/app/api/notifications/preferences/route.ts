/**
 * Notification Preferences API
 *
 * GET /api/notifications/preferences - Get user notification preferences
 * PATCH /api/notifications/preferences - Update user notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  TRANSACTIONAL_EVENTS,
  type NotificationEventType,
} from '@/lib/notifications/preferences';
import { logger } from '@/lib/logger';

async function getUserFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  return sessionCookie?.value || null;
}

/**
 * Get user notification preferences
 */
export async function GET() {
  try {
    const userId = await getUserFromSession();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getUserNotificationPreferences(userId);

    // Return preferences without internal fields
    return NextResponse.json({
      globalEnabled: preferences.globalEnabled,
      quietHoursEnabled: preferences.quietHoursEnabled,
      quietHoursStart: preferences.quietHoursStart,
      quietHoursEnd: preferences.quietHoursEnd,
      timezone: preferences.timezone,
      channels: preferences.channels,
      events: preferences.events,
    });
  } catch (error) {
    logger.error('Error fetching notification preferences', { error });
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * Update user notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserFromSession();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate and sanitize input
    const updates: Record<string, unknown> = {};

    if (typeof body.globalEnabled === 'boolean') {
      updates.globalEnabled = body.globalEnabled;
    }

    if (typeof body.quietHoursEnabled === 'boolean') {
      updates.quietHoursEnabled = body.quietHoursEnabled;
    }

    if (typeof body.quietHoursStart === 'string') {
      // Validate time format HH:MM
      if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(body.quietHoursStart)) {
        updates.quietHoursStart = body.quietHoursStart;
      }
    }

    if (typeof body.quietHoursEnd === 'string') {
      if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(body.quietHoursEnd)) {
        updates.quietHoursEnd = body.quietHoursEnd;
      }
    }

    if (typeof body.timezone === 'string') {
      updates.timezone = body.timezone;
    }

    // Update channel settings
    if (body.channels && typeof body.channels === 'object') {
      const channels: Record<string, unknown> = {};

      if (body.channels.email && typeof body.channels.email === 'object') {
        channels.email = {
          enabled: Boolean(body.channels.email.enabled),
          digestMode: ['immediate', 'daily', 'weekly'].includes(body.channels.email.digestMode)
            ? body.channels.email.digestMode
            : 'immediate',
          address: body.channels.email.address,
        };
      }

      if (body.channels.inApp && typeof body.channels.inApp === 'object') {
        channels.inApp = {
          enabled: Boolean(body.channels.inApp.enabled),
          showBadge: Boolean(body.channels.inApp.showBadge),
          playSound: Boolean(body.channels.inApp.playSound),
        };
      }

      if (body.channels.push && typeof body.channels.push === 'object') {
        channels.push = {
          enabled: Boolean(body.channels.push.enabled),
          deviceTokens: Array.isArray(body.channels.push.deviceTokens)
            ? body.channels.push.deviceTokens.filter((t: unknown) => typeof t === 'string')
            : [],
        };
      }

      if (Object.keys(channels).length > 0) {
        updates.channels = channels;
      }
    }

    // Update event preferences
    if (body.events && typeof body.events === 'object') {
      const events: Record<string, unknown> = {};
      const validEventTypes = [
        'scan_completed',
        'scan_failed',
        'test_completed',
        'test_failed',
        'fix_branch_ready',
        'weekly_summary',
        'security_alert',
        'credit_low',
        'subscription_update',
        'team_invite',
      ];

      for (const eventType of validEventTypes) {
        if (body.events[eventType] && typeof body.events[eventType] === 'object') {
          const eventConfig = body.events[eventType];
          const isTransactional = TRANSACTIONAL_EVENTS.includes(eventType as NotificationEventType);

          let channels = Array.isArray(eventConfig.channels)
            ? eventConfig.channels.filter((c: unknown) =>
                typeof c === 'string' && ['email', 'in_app', 'push'].includes(c)
              )
            : [];

          // Enforce email for transactional events
          if (isTransactional && !channels.includes('email')) {
            channels.push('email');
          }

          events[eventType] = {
            // Transactional events are always enabled
            enabled: isTransactional ? true : Boolean(eventConfig.enabled),
            channels,
          };
        }
      }

      if (Object.keys(events).length > 0) {
        updates.events = events;
      }
    }

    // Apply updates
    const updatedPreferences = await updateUserNotificationPreferences(userId, updates);

    return NextResponse.json({
      success: true,
      globalEnabled: updatedPreferences.globalEnabled,
      quietHoursEnabled: updatedPreferences.quietHoursEnabled,
      quietHoursStart: updatedPreferences.quietHoursStart,
      quietHoursEnd: updatedPreferences.quietHoursEnd,
      timezone: updatedPreferences.timezone,
      channels: updatedPreferences.channels,
      events: updatedPreferences.events,
    });
  } catch (error) {
    logger.error('Error updating notification preferences', { error });
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
