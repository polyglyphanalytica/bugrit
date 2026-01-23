import { NextRequest, NextResponse } from 'next/server';
import { LEARNING_CONTENT, LearningTopic } from '@/lib/learning/content';

interface RouteParams {
  params: Promise<{ findingType: string }>;
}

/**
 * GET /api/v1/learning/{findingType}
 *
 * Get learning content for a specific finding type.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { findingType } = await params;

  // Normalize the finding type (handle different formats)
  const normalizedType = findingType
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');

  const content = LEARNING_CONTENT[normalizedType as keyof typeof LEARNING_CONTENT];

  if (!content) {
    // Try to find a partial match
    const partialMatch = Object.entries(LEARNING_CONTENT).find(([key]) =>
      key.includes(normalizedType) || normalizedType.includes(key)
    );

    if (partialMatch) {
      return NextResponse.json({
        type: partialMatch[0],
        ...partialMatch[1],
      });
    }

    return NextResponse.json(
      {
        error: 'Learning content not found',
        suggestion: 'Use GET /api/v1/learning to see available topics',
        availableTopics: Object.keys(LEARNING_CONTENT).slice(0, 10),
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    type: normalizedType,
    ...content,
  });
}
