import { NextResponse } from 'next/server';
import { LEARNING_CONTENT } from '@/lib/learning/content';
import { logger } from '@/lib/logger';

/**
 * GET /api/v1/learning
 *
 * Get all available learning topics.
 */
export async function GET() {
  try {
    const topics = Object.entries(LEARNING_CONTENT).map(([key, content]) => ({
      type: key,
      findingType: content.findingType,
      summary: content.whyItMatters.substring(0, 200) + '...',
      hasQuiz: !!content.quiz,
      resourceCount: content.resources?.length || 0,
    }));

    return NextResponse.json({
      count: topics.length,
      topics,
    });
  } catch (error) {
    logger.error('Error fetching learning topics', { error });
    return NextResponse.json({ error: 'Failed to fetch learning topics' }, { status: 500 });
  }
}
