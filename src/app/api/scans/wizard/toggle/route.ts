import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import {
  toggleToolSelection,
  selectTools,
  deselectAllTools,
  resetToRecommended,
  SelectionState,
  ToolAdvisor,
  WizardInput,
} from '@/lib/wizard';
import { logger } from '@/lib/logger';

/**
 * POST /api/scans/wizard/toggle
 *
 * Toggle tool selection and return updated selection state with intelligent advisor feedback
 *
 * Body:
 * - action: 'toggle' | 'select' | 'deselectAll' | 'reset'
 * - toolId?: string (required for 'toggle')
 * - toolIds?: string[] (required for 'select')
 * - currentState: SelectionState
 * - context?: WizardInput (optional - provides better advice when included)
 *
 * Returns:
 * - selectionState: Updated SelectionState with recalculated credits/time
 * - summary: Quick stats about the selection
 * - advisor: Intelligent feedback including:
 *   - score: Overall selection quality (0-100)
 *   - messages: Warnings, recommendations, and tips
 *   - coverage: Analysis of what security categories are covered
 *   - redundancy: Analysis of overlapping/duplicate tools
 *   - topRecommendations: Suggested tools to add (bubbled to top)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    const { action, toolId, toolIds, currentState, context } = body;

    if (!currentState) {
      return NextResponse.json(
        { error: 'currentState is required' },
        { status: 400 }
      );
    }

    let newState: SelectionState;
    let toggleAdvice: ReturnType<typeof ToolAdvisor.getToggleAdvice> = [];

    switch (action) {
      case 'toggle':
        if (!toolId) {
          return NextResponse.json(
            { error: 'toolId is required for toggle action' },
            { status: 400 }
          );
        }
        // Check if we're adding or removing
        const isAdding = !currentState.selectedTools.some((t: { id: string }) => t.id === toolId);
        // Get advice before toggling
        toggleAdvice = ToolAdvisor.getToggleAdvice(toolId, isAdding, currentState, context);
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

    // Run full advisor analysis on new state
    const advisorResult = ToolAdvisor.analyze(newState, context as WizardInput | undefined);

    // Get top recommendations for tools to add
    const topRecommendations = ToolAdvisor.getTopRecommendations(newState, context, 5);

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
      // Intelligent advisor feedback
      advisor: {
        score: advisorResult.score,
        scoreLabel: advisorResult.scoreLabel,
        verdict: advisorResult.summary.verdict,
        // Immediate feedback for the toggle action
        toggleAdvice,
        // All advisor messages (coverage gaps, redundancy warnings, etc.)
        messages: advisorResult.messages,
        // Coverage analysis
        coverage: {
          percentage: advisorResult.coverage.coveragePercentage,
          covered: advisorResult.coverage.coveredCategories,
          missing: advisorResult.coverage.missingCategories,
          criticalGaps: advisorResult.coverage.criticalGaps.filter(g => g.severity === 'critical'),
        },
        // Redundancy analysis
        redundancy: {
          groups: advisorResult.redundancy.redundantGroups,
          wastedCredits: advisorResult.redundancy.totalWastedCredits,
          optimizationPotential: advisorResult.redundancy.optimizationPotential,
        },
        // Top tools to consider adding (bubbled to top)
        topRecommendations: topRecommendations.map(pt => ({
          toolId: pt.tool.id,
          toolName: pt.tool.name,
          category: pt.tool.category,
          priority: pt.priority,
          reasons: pt.reasons,
          isEssential: pt.isEssential,
          credits: pt.tool.credits,
        })),
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
