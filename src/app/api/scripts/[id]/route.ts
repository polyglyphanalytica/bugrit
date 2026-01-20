import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requirePermission } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/scripts/[id] - Get a specific script
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = requirePermission(request, 'scripts:read');
  if (authError) return authError;

  try {
    const { id } = await params;
    const script = store.getTestScript(id);

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error fetching script:', error);
    return NextResponse.json(
      { error: 'Failed to fetch script' },
      { status: 500 }
    );
  }
}

// DELETE /api/scripts/[id] - Delete a script
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authError = requirePermission(request, 'scripts:submit');
  if (authError) return authError;

  try {
    const { id } = await params;
    const deleted = store.deleteTestScript(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Error deleting script:', error);
    return NextResponse.json(
      { error: 'Failed to delete script' },
      { status: 500 }
    );
  }
}
