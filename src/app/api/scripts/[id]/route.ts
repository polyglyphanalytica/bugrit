import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/scripts/[id] - Get a specific script (owned by user)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;
    const script = store.getTestScript(id);

    if (!script || script.userId !== userId) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    return NextResponse.json(script);
  } catch (error) {
    logger.error('Error fetching script', { error });
    return NextResponse.json(
      { error: 'Failed to fetch script' },
      { status: 500 }
    );
  }
}

// DELETE /api/scripts/[id] - Delete a script (owned by user)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;
    const script = store.getTestScript(id);

    // Verify ownership before deletion
    if (!script || script.userId !== userId) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    store.deleteTestScript(id);

    return NextResponse.json({ message: 'Script deleted successfully' });
  } catch (error) {
    logger.error('Error deleting script', { error });
    return NextResponse.json(
      { error: 'Failed to delete script' },
      { status: 500 }
    );
  }
}
