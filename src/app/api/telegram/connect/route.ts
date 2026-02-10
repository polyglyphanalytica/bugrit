/**
 * POST /api/telegram/connect
 *
 * Links a Telegram user ID to a Bugrit account.
 * Called from the Bugrit web UI after the user provides their Telegram username.
 *
 * DELETE /api/telegram/connect
 * Unlinks a Telegram user from their Bugrit account.
 *
 * GET /api/telegram/connect
 * Check if the current user has a Telegram connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { linkChannel, unlinkChannel, getConnectionsForUser } from '@/lib/sensei/connections';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { telegramUserId, username, displayName } = await request.json();

    if (!telegramUserId) {
      return NextResponse.json(
        { error: 'telegramUserId is required. Send /start to the Bugrit bot to get your user ID.' },
        { status: 400 },
      );
    }

    // Telegram user IDs are numeric
    const normalizedId = String(telegramUserId).trim();
    if (!/^\d+$/.test(normalizedId)) {
      return NextResponse.json(
        { error: 'Invalid Telegram user ID format. Must be a numeric ID.' },
        { status: 400 },
      );
    }

    await linkChannel(userId, 'telegram', normalizedId, displayName || username, {
      ...(username ? { username } : {}),
    });

    logger.info('Telegram account linked', { userId, telegramUserId: normalizedId });
    return NextResponse.json({ success: true, message: 'Telegram connected.' });
  } catch (error) {
    logger.error('Failed to connect Telegram', { error });
    return NextResponse.json({ error: 'Failed to connect Telegram' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { telegramUserId } = await request.json();

    if (!telegramUserId) {
      return NextResponse.json({ error: 'telegramUserId is required' }, { status: 400 });
    }

    const normalizedId = String(telegramUserId).trim();
    await unlinkChannel('telegram', normalizedId);

    logger.info('Telegram account unlinked', { userId, telegramUserId: normalizedId });
    return NextResponse.json({ success: true, message: 'Telegram disconnected.' });
  } catch (error) {
    logger.error('Failed to disconnect Telegram', { error });
    return NextResponse.json({ error: 'Failed to disconnect Telegram' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const connections = await getConnectionsForUser(userId);
    const telegramConnections = connections.filter((c) => c.channel === 'telegram');

    return NextResponse.json({
      connected: telegramConnections.length > 0,
      connections: telegramConnections,
    });
  } catch (error) {
    logger.error('Failed to check Telegram connection', { error });
    return NextResponse.json({ error: 'Failed to check connection' }, { status: 500 });
  }
}
