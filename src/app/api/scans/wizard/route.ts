import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import {
  ScanRecommendationEngine,
  WIZARD_STEPS,
  PRESETS,
  SENSITIVITY_DESCRIPTIONS,
  AI_AGENT_DESCRIPTIONS,
  CATEGORY_INFO,
  WizardInput,
  AppType,
  AppSensitivity,
  AICodingAgent,
  ToolAdvisor,
} from '@/lib/wizard';
import { logger } from '@/lib/logger';

/**
 * GET /api/scans/wizard
 *
 * Get wizard steps and options
 */
export async function GET() {
  try {
    return NextResponse.json({
      steps: WIZARD_STEPS,
      sensitivityDescriptions: SENSITIVITY_DESCRIPTIONS,
      aiAgentDescriptions: AI_AGENT_DESCRIPTIONS,
      categoryInfo: CATEGORY_INFO,
      presets: Object.keys(PRESETS),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch wizard configuration' }, { status: 500 });
  }
}

/**
 * POST /api/scans/wizard
 *
 * Get scan recommendations based on wizard input
 *
 * Body:
 * - appType: 'web' | 'pwa' | 'api' | 'mobile-native' | 'desktop-native' | 'cli' | 'library'
 * - sensitivity: 'financial' | 'healthcare' | ... | 'personal'
 * - languages?: string[]
 * - frameworks?: string[]
 * - aiAgent?: 'cursor' | 'copilot' | 'claude-code' | ...
 * - concerns?: string[]
 * - preset?: 'vibeCodedWebApp' | 'saasApi' | 'fintechApp' | 'sideProject' | 'preLaunchAudit'
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    // Handle preset requests
    if (body.preset) {
      const preset = body.preset as keyof typeof PRESETS;

      if (!(preset in PRESETS)) {
        return NextResponse.json(
          { error: `Unknown preset: ${preset}` },
          { status: 400 }
        );
      }

      let recommendations;

      switch (preset) {
        case 'vibeCodedWebApp':
          recommendations = PRESETS.vibeCodedWebApp(body.aiAgent || 'cursor');
          break;
        case 'saasApi':
          recommendations = PRESETS.saasApi();
          break;
        case 'fintechApp':
          recommendations = PRESETS.fintechApp();
          break;
        case 'sideProject':
          recommendations = PRESETS.sideProject(body.aiAgent || 'copilot');
          break;
        case 'preLaunchAudit':
          if (!body.appType || !body.sensitivity) {
            return NextResponse.json(
              { error: 'preLaunchAudit preset requires appType and sensitivity' },
              { status: 400 }
            );
          }
          recommendations = PRESETS.preLaunchAudit(body.appType, body.sensitivity);
          break;
        default:
          return NextResponse.json(
            { error: `Unknown preset: ${preset}` },
            { status: 400 }
          );
      }

      return NextResponse.json({
        preset,
        selectionState: recommendations.selectionState,
        recommendations,
      });
    }

    // Validate required fields
    if (!body.appType || !body.sensitivity) {
      return NextResponse.json(
        { error: 'appType and sensitivity are required' },
        { status: 400 }
      );
    }

    // Build wizard input
    const input: WizardInput = {
      appType: body.appType as AppType,
      sensitivity: body.sensitivity as AppSensitivity,
      languages: body.languages,
      frameworks: body.frameworks,
      aiAgent: body.aiAgent as AICodingAgent | undefined,
      concerns: body.concerns,
      hasExistingTests: body.hasExistingTests,
      deploymentTarget: body.deploymentTarget,
      teamSize: body.teamSize,
    };

    // Get recommendations
    const recommendations = ScanRecommendationEngine.recommend(input);

    // Run advisor analysis on the recommended selection
    const advisorResult = ToolAdvisor.analyze(recommendations.selectionState, input);

    // Get top recommendations for bubbling
    const topRecommendations = ToolAdvisor.getTopRecommendations(
      recommendations.selectionState,
      input,
      10
    );

    return NextResponse.json({
      input,
      // UI-ready selection state with all tools
      // - selectedTools: pre-selected recommendations (bubble to top)
      // - availableByCategory: remaining tools grouped by category
      // - credits: selected total and per-tool breakdown
      selectionState: recommendations.selectionState,
      // Full recommendations (includes selectionState as well)
      recommendations,
      // Intelligent advisor feedback
      advisor: {
        score: advisorResult.score,
        scoreLabel: advisorResult.scoreLabel,
        verdict: advisorResult.summary.verdict,
        messages: advisorResult.messages,
        coverage: {
          percentage: advisorResult.coverage.coveragePercentage,
          covered: advisorResult.coverage.coveredCategories,
          missing: advisorResult.coverage.missingCategories,
          criticalGaps: advisorResult.coverage.criticalGaps,
        },
        redundancy: advisorResult.redundancy,
        // Tools bubbled to top - most important unselected tools
        bubbledRecommendations: topRecommendations.map(pt => ({
          toolId: pt.tool.id,
          toolName: pt.tool.name,
          category: pt.tool.category,
          description: pt.tool.description,
          priority: pt.priority,
          reasons: pt.reasons,
          isEssential: pt.isEssential,
          credits: pt.tool.credits,
        })),
      },
    });
  } catch (error) {
    logger.error('Wizard error', { error });
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
