import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { logger } from '@/lib/logger';
import { requireAuthenticatedUser } from '@/lib/api-auth';

// GET /api/test-cases - Get user's test cases
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const testCases = store.getUserTestCases(userId);

    return NextResponse.json({
      testCases,
      count: testCases.length,
    });
  } catch (error) {
    logger.error('Error fetching test cases', { error });
    return NextResponse.json(
      { error: 'Failed to fetch test cases' },
      { status: 500 }
    );
  }
}

// POST /api/test-cases - Create a new test case
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();

    const { name, description, category, priority, status, steps, expectedResult } = body;

    if (!name || !description || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, category' },
        { status: 400 }
      );
    }

    const testCase = store.createTestCase({
      name,
      description,
      category,
      userId,
      priority: priority || 'medium',
      status: status || 'draft',
      steps: steps || [],
      expectedResult: expectedResult || '',
    });

    return NextResponse.json(testCase, { status: 201 });
  } catch (error) {
    logger.error('Error creating test case', { error });
    return NextResponse.json(
      { error: 'Failed to create test case' },
      { status: 500 }
    );
  }
}
