import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { generateSenseiResponse } from '@/ai/flows/sensei-chat';
import { logger } from '@/lib/logger';

/**
 * POST /api/sensei/chat
 *
 * Send a message to Sensei and get a response with optional action.
 *
 * Body:
 * - message: string (required) — the user's message
 * - history: Array<{role, content}> (optional) — conversation history
 * - context: object (optional) — user context (apps, scans, credits, page)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = authResult;
    const body = await request.json();
    const { message, history, context } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    logger.info('Sensei chat request', { userId, messageLength: message.length });

    const response = await generateSenseiResponse({
      message: message.trim(),
      history: Array.isArray(history) ? history.slice(-10) : undefined,
      context: context || undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Sensei chat error', { error });
    return NextResponse.json(
      { error: 'Failed to generate response. Please try again.' },
      { status: 500 }
    );
  }
}
