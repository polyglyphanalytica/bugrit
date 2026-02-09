/**
 * POST /api/whatsapp/connect
 *
 * Links a WhatsApp phone number to a Bugrit account.
 * Called from the Bugrit web UI after the user provides their phone number.
 *
 * DELETE /api/whatsapp/connect
 * Unlinks a WhatsApp number from their Bugrit account.
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

    const { phoneNumber, displayName } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 });
    }

    // Normalize phone number (strip spaces, dashes, ensure leading +)
    const normalized = phoneNumber.replace(/[\s\-()]/g, '');
    if (!/^\+?\d{10,15}$/.test(normalized)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use international format: +1234567890' },
        { status: 400 },
      );
    }

    const phone = normalized.startsWith('+') ? normalized.slice(1) : normalized;

    await linkChannel(userId, 'whatsapp', phone, displayName);

    logger.info('WhatsApp account linked', { userId, phone });
    return NextResponse.json({ success: true, message: 'WhatsApp connected.' });
  } catch (error) {
    logger.error('Failed to connect WhatsApp', { error });
    return NextResponse.json({ error: 'Failed to connect WhatsApp' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 });
    }

    const phone = phoneNumber.replace(/[\s\-()]/g, '').replace(/^\+/, '');

    await unlinkChannel('whatsapp', phone);
    logger.info('WhatsApp account unlinked', { userId, phone });
    return NextResponse.json({ success: true, message: 'WhatsApp disconnected.' });
  } catch (error) {
    logger.error('Failed to disconnect WhatsApp', { error });
    return NextResponse.json({ error: 'Failed to disconnect WhatsApp' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const connections = await getConnectionsForUser(userId);
    const whatsappConnections = connections.filter((c) => c.channel === 'whatsapp');

    return NextResponse.json({
      connected: whatsappConnections.length > 0,
      connections: whatsappConnections,
    });
  } catch (error) {
    logger.error('Failed to check WhatsApp connection', { error });
    return NextResponse.json({ error: 'Failed to check connection' }, { status: 500 });
  }
}
