import { NextRequest, NextResponse } from 'next/server';
import {
  getQuickRecommendation,
  getAIAwareRecommendation,
  AppType,
  AppSensitivity,
  AICodingAgent,
} from '@/lib/wizard';

/**
 * GET /api/scans/wizard/quick
 *
 * Quick recommendations for vibe coders
 *
 * Query params:
 * - type: 'web' | 'api' | 'mobile' (defaults to 'web')
 * - ai: 'cursor' | 'copilot' | 'claude' | 'none' (optional)
 * - level: 'chill' | 'startup' | 'serious' | 'paranoid' (defaults to 'startup')
 *
 * Examples:
 * - /api/scans/wizard/quick?type=web&ai=cursor
 * - /api/scans/wizard/quick?type=api&level=serious
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse simple type param
  const typeParam = searchParams.get('type') || 'web';
  const appType: AppType =
    typeParam === 'api' ? 'api' :
    typeParam === 'mobile' ? 'mobile-native' :
    typeParam === 'desktop' ? 'desktop-native' :
    typeParam === 'cli' ? 'cli' :
    typeParam === 'library' ? 'library' :
    typeParam === 'pwa' ? 'pwa' :
    'web';

  // Parse simple level param (translate to sensitivity)
  const levelParam = searchParams.get('level') || 'startup';
  const sensitivity: AppSensitivity =
    levelParam === 'chill' ? 'personal' :
    levelParam === 'startup' ? 'social' :
    levelParam === 'serious' ? 'enterprise' :
    levelParam === 'paranoid' ? 'financial' :
    'social';

  // Parse AI param
  const aiParam = searchParams.get('ai');
  const aiAgent: AICodingAgent | undefined =
    aiParam === 'cursor' ? 'cursor' :
    aiParam === 'copilot' ? 'copilot' :
    aiParam === 'claude' ? 'claude-code' :
    aiParam === 'codeium' ? 'codeium' :
    aiParam === 'none' ? 'none' :
    aiParam ? 'other-ai' :
    undefined;

  // Get recommendations
  const recommendations = aiAgent
    ? getAIAwareRecommendation(appType, sensitivity, aiAgent)
    : getQuickRecommendation(appType, sensitivity);

  // Return simplified response
  return NextResponse.json({
    // Summary in plain English
    summary: {
      message: getSummaryMessage(recommendations.summary.essentialScans, sensitivity),
      scans: recommendations.summary.totalScans,
      essentialScans: recommendations.summary.essentialScans,
      credits: recommendations.summary.estimatedCredits,
      time: recommendations.summary.estimatedTime,
    },

    // Just the scan IDs for quick use
    quickStart: recommendations.recommendations
      .filter(r => r.priority === 'essential')
      .map(r => r.toolId),

    // Packages for easy selection
    packages: recommendations.packages.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      credits: p.credits,
      scans: p.scans.length,
    })),

    // Full recommendations if needed
    full: recommendations,
  });
}

function getSummaryMessage(essentialScans: number, sensitivity: AppSensitivity): string {
  const levelMessages: Record<AppSensitivity, string> = {
    personal: `Looking good! ${essentialScans} quick scans will catch the basics.`,
    entertainment: `${essentialScans} scans to keep your app running smooth.`,
    education: `${essentialScans} scans for safe and accessible learning.`,
    social: `${essentialScans} scans to protect your users' data.`,
    ecommerce: `${essentialScans} scans for secure shopping.`,
    enterprise: `${essentialScans} scans for enterprise-grade security.`,
    government: `${essentialScans} compliance-ready scans.`,
    healthcare: `${essentialScans} HIPAA-ready security scans.`,
    financial: `${essentialScans} bank-grade security scans.`,
    iot: `${essentialScans} device security scans.`,
    'developer-tool': `${essentialScans} supply chain security scans.`,
  };

  return levelMessages[sensitivity] || `${essentialScans} recommended scans.`;
}
