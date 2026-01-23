import { NextResponse } from 'next/server';
import { LEARNING_CONTENT, LearningTopic } from '@/lib/learning/content';

/**
 * GET /api/v1/learning
 *
 * Get all available learning topics.
 */
export async function GET() {
  const topics = Object.entries(LEARNING_CONTENT).map(([key, content]) => ({
    type: key,
    title: content.title,
    severity: content.severity,
    category: content.category,
    summary: content.whatItIs.substring(0, 200) + '...',
  }));

  return NextResponse.json({
    count: topics.length,
    topics,
    categories: [...new Set(topics.map(t => t.category))],
  });
}
