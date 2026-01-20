import { NextRequest, NextResponse } from 'next/server';
import {
  getApplicationsByOwner,
  createApplication,
  getAllApplications,
} from '@/lib/db/applications';
import { CreateApplicationRequest } from '@/lib/types';
import { requireAuthenticatedUser } from '@/lib/api-auth';

// GET /api/applications - Get all applications for the current user
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    const applications = await getApplicationsByOwner(userId);

    return NextResponse.json({
      applications,
      count: applications.length,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create a new application
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const body: CreateApplicationRequest = await request.json();

    const { name, description, type} = body;

    if (!name || !description || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, type' },
        { status: 400 }
      );
    }

    const application = await createApplication(body, userId);

    return NextResponse.json(
      {
        id: application.id,
        message: 'Application created successfully',
        application,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
