import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requirePermission } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/scripts/[id]/promote - Promote script to regression suite
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authError = requirePermission(request, 'scripts:submit');
  if (authError) return authError;

  try {
    const { id } = await params;
    const script = store.promoteToRegression(id);

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Script promoted to regression suite',
      script,
    });
  } catch (error) {
    console.error('Error promoting script:', error);
    return NextResponse.json(
      { error: 'Failed to promote script' },
      { status: 500 }
    );
  }
}
