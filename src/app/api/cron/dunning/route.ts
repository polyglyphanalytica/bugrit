/**
 * Dunning Cron Job
 *
 * Processes subscription dunning tasks:
 * 1. Send scheduled reminders to users in grace period
 * 2. Process expired grace periods and cancel subscriptions
 *
 * This endpoint should be called by a cron scheduler (e.g., Vercel Cron, Cloud Scheduler)
 * Recommended schedule: Every hour or every 3 hours
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  processExpiredGracePeriods,
  sendScheduledReminders,
} from '@/lib/billing/dunning';
import { logger } from '@/lib/logger';

/**
 * Verify the cron request is authorized
 */
function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    return true;
  }

  if (!cronSecret) {
    logger.warn('CRON_SECRET not configured');
    return false;
  }

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check x-cron-secret header (alternative)
  const cronHeader = request.headers.get('x-cron-secret');
  if (cronHeader === cronSecret) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/dunning
 * Process dunning tasks (send reminders, expire grace periods)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization
    if (!verifyCronAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting dunning cron job');

    // Send scheduled reminders to users in grace period
    const remindersSent = await sendScheduledReminders();

    // Process expired grace periods (cancel subscriptions)
    const expiredProcessed = await processExpiredGracePeriods();

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      remindersSent,
      expiredProcessed,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };

    logger.info('Dunning cron job completed', result);

    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Dunning cron job failed', {
      error,
      durationMs: duration,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Dunning cron job failed',
        durationMs: duration,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/dunning
 * Alternative method for cron systems that prefer POST
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
