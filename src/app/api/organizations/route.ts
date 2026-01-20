import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createOrganization, getUserOrganizations } from '@/lib/organizations';

/**
 * GET /api/organizations
 * List user's organizations
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Replace with your auth method
    const userId = 'mock-user-id';

    const organizations = await getUserOrganizations(userId);

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Replace with your auth method
    const userId = 'mock-user-id';
    const userEmail = 'user@example.com';

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const organization = await createOrganization(userId, userEmail, name.trim());

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    console.error('Failed to create organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
