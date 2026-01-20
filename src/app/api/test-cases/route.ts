import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET /api/test-cases - Get all test cases
export async function GET() {
  try {
    const testCases = store.getAllTestCases();

    return NextResponse.json({
      testCases,
      count: testCases.length,
    });
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test cases' },
      { status: 500 }
    );
  }
}

// POST /api/test-cases - Create a new test case
export async function POST(request: NextRequest) {
  try {
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
      priority: priority || 'medium',
      status: status || 'draft',
      steps: steps || [],
      expectedResult: expectedResult || '',
    });

    return NextResponse.json(testCase, { status: 201 });
  } catch (error) {
    console.error('Error creating test case:', error);
    return NextResponse.json(
      { error: 'Failed to create test case' },
      { status: 500 }
    );
  }
}
