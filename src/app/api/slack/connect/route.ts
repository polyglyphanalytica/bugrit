/**
 * POST /api/slack/connect
 *
 * Links a Slack user to a Bugrit account. Called from the Bugrit web UI
 * after the user authenticates and provides their Slack user ID.
 *
 * DELETE /api/slack/connect
 * Unlinks a Slack user from their Bugrit account.
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

    const { slackUserId, slackTeamId, displayName } = await request.json();

    if (!slackUserId) {
      return NextResponse.json({ error: 'slackUserId is required' }, { status: 400 });
    }

    await linkChannel(userId, 'slack', slackUserId, displayName, {
      slackTeam: slackTeamId || '',
    });

    logger.info('Slack account linked', { userId, slackUserId });
    return NextResponse.json({ success: true, message: 'Slack account connected.' });
  } catch (error) {
    logger.error('Failed to connect Slack', { error });
    return NextResponse.json({ error: 'Failed to connect Slack' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { slackUserId } = await request.json();

    if (!slackUserId) {
      return NextResponse.json({ error: 'slackUserId is required' }, { status: 400 });
    }

    await unlinkChannel('slack', slackUserId);
    logger.info('Slack account unlinked', { userId, slackUserId });
    return NextResponse.json({ success: true, message: 'Slack account disconnected.' });
  } catch (error) {
    logger.error('Failed to disconnect Slack', { error });
    return NextResponse.json({ error: 'Failed to disconnect Slack' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const connections = await getConnectionsForUser(userId);
    const slackConnections = connections.filter((c) => c.channel === 'slack');

    return NextResponse.json({
      connected: slackConnections.length > 0,
      connections: slackConnections,
    });
  } catch (error) {
    logger.error('Failed to check Slack connection', { error });
    return NextResponse.json({ error: 'Failed to check connection' }, { status: 500 });
  }
}
