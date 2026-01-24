import { NextRequest, NextResponse } from 'next/server';
import {
  toggleToolSelection,
  selectTools,
  deselectAllTools,
  resetToRecommended,
  SelectionState,
} from '@/lib/wizard';
import { logger } from '@/lib/logger';

/**
 * POST /api/scans/wizard/toggle
 *
 * Toggle tool selection and return updated selection state
 *
 * Body:
 * - action: 'toggle' | 'select' | 'deselectAll' | 'reset'
 * - toolId?: string (required for 'toggle')
 * - toolIds?: string[] (required for 'select')
 * - currentState: SelectionState
 *
 * Returns: Updated SelectionState with recalculated credits/time
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { action, toolId, toolIds, currentState } = body;

    if (!currentState) {
      return NextResponse.json(
        { error: 'currentState is required' },
        { status: 400 }
      );
    }

    let newState: SelectionState;

    switch (action) {
      case 'toggle':
        if (!toolId) {
          return NextResponse.json(
            { error: 'toolId is required for toggle action' },
            { status: 400 }
          );
        }
        newState = toggleToolSelection(currentState, toolId);
        break;

      case 'select':
        if (!toolIds || !Array.isArray(toolIds)) {
          return NextResponse.json(
            { error: 'toolIds array is required for select action' },
            { status: 400 }
          );
        }
        newState = selectTools(currentState, toolIds);
        break;

      case 'deselectAll':
        newState = deselectAllTools(currentState);
        break;

      case 'reset':
        newState = resetToRecommended(currentState);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use 'toggle', 'select', 'deselectAll', or 'reset'` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      selectionState: newState,
      summary: {
        selectedCount: newState.selectedTools.length,
        availableCount: newState.availableByCategory.reduce(
          (sum, cat) => sum + cat.tools.length,
          0
        ),
        totalCredits: newState.credits.selected,
        estimatedTime: newState.estimatedTime,
      },
    });
  } catch (error) {
    logger.error('Toggle error', { error });
    return NextResponse.json(
      { error: 'Failed to process selection change' },
      { status: 500 }
    );
  }
}
