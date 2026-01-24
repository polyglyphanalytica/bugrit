/**
 * Initialize Notification Preferences (During Signup)
 *
 * POST /api/notifications/preferences/init - Initialize preferences for new user
 *
 * This endpoint uses Firebase Auth token (not session cookie) since it's called
 * during signup before the session is established.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  markOptInCompleted,
} from '@/lib/notifications/preferences';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Get Firebase Auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const body = await request.json();

    // Get or create default preferences
    const prefs = await getUserNotificationPreferences(userId);

    // Update based on signup choices
    const updates: Record<string, unknown> = {
      channels: {
        ...prefs.channels,
        email: {
          ...prefs.channels.email,
          enabled: body.emailEnabled !== false, // Default to true
        },
        push: {
          ...prefs.channels.push,
          enabled: body.pushEnabled === true, // Default to false
        },
      },
    };

    await updateUserNotificationPreferences(userId, updates);
    await markOptInCompleted(userId);

    return NextResponse.json({
      success: true,
      message: 'Notification preferences initialized',
    });
  } catch (error) {
    logger.error('Error initializing notification preferences', { error });
    return NextResponse.json(
      { error: 'Failed to initialize notification preferences' },
      { status: 500 }
    );
  }
}
