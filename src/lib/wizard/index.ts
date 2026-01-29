/**
 * Scan Recommendation Wizard
 *
 * Simple wizard to help vibe coders select the right scans.
 */

export {
  ScanRecommendationEngine,
  detectStack,
  WIZARD_STEPS,
  TOOL_DATABASE,
  SENSITIVITY_PROFILES,
  AI_AGENT_PROFILES,
  CATEGORY_INFO,
  // Selection state helpers
  toggleToolSelection,
  selectTools,
  deselectAllTools,
  resetToRecommended,
  getAllToolsFlat,
} from './recommendation-engine';

export type {
  AppType,
  AppSensitivity,
  AICodingAgent,
  DeveloperConcern,
  WizardInput,
  WizardOutput,
  ScanRecommendation,
  ScanPackage,
  WizardStep,
  DetectedStack,
  // UI-friendly selection types
  ToolCategory,
  SelectableTool,
  ToolCategoryGroup,
  SelectionState,
} from './recommendation-engine';

// ============================================================
// Intelligent Tool Advisor
// ============================================================

export {
  ToolAdvisor,
  TOOL_OVERLAP_GROUPS,
  getCategoryRequirements,
} from './tool-advisor';

export type {
  AdvisorSeverity,
  AdvisorMessage,
  CoverageAnalysis,
  CoverageGap,
  RedundancyAnalysis,
  RedundantToolGroup,
  ToolAdvisorResult,
  PrioritizedTool,
} from './tool-advisor';

// ============================================================
// Simple API Functions
// ============================================================

import {
  ScanRecommendationEngine,
  detectStack,
  WizardInput,
  WizardOutput,
  AppType,
  AppSensitivity,
  AICodingAgent,
  DeveloperConcern,
  DetectedStack,
  SelectionState,
  toggleToolSelection as _toggleToolSelection,
} from './recommendation-engine';

/**
 * Quick recommendation for vibe coders who just want sensible defaults
 */
export function getQuickRecommendation(
  appType: AppType,
  sensitivity: AppSensitivity = 'personal'
): WizardOutput {
  return ScanRecommendationEngine.recommend({
    appType,
    sensitivity,
  });
}

/**
 * Get recommendations with AI agent consideration
 */
export function getAIAwareRecommendation(
  appType: AppType,
  sensitivity: AppSensitivity,
  aiAgent: AICodingAgent
): WizardOutput {
  return ScanRecommendationEngine.recommend({
    appType,
    sensitivity,
    aiAgent,
  });
}

/**
 * Full wizard recommendation with all inputs
 */
export function getFullRecommendation(input: WizardInput): WizardOutput {
  return ScanRecommendationEngine.recommend(input);
}

/**
 * Auto-detect stack and get recommendations
 */
export async function getAutoRecommendation(
  projectPath: string,
  sensitivity: AppSensitivity,
  aiAgent?: AICodingAgent
): Promise<{ stack: DetectedStack; recommendations: WizardOutput }> {
  const stack = await detectStack(projectPath);

  // Infer app type from stack
  let appType: AppType = 'web';
  if (stack.frameworks.some(f => ['nextjs', 'nuxt', 'angular', 'vue', 'svelte'].includes(f))) {
    appType = 'web';
  } else if (stack.frameworks.some(f => ['express', 'fastify', 'koa', 'django', 'flask', 'rails'].includes(f))) {
    appType = 'api';
  } else if (stack.languages.includes('swift') || stack.languages.includes('kotlin')) {
    appType = 'mobile-native';
  }

  const recommendations = ScanRecommendationEngine.recommend({
    appType,
    sensitivity,
    languages: stack.languages,
    frameworks: stack.frameworks,
    aiAgent,
  });

  return { stack, recommendations };
}

// ============================================================
// Preset Configurations for Common Scenarios
// ============================================================

export const PRESETS = {
  /**
   * For a typical React/Next.js app built with AI assistance
   */
  vibeCodedWebApp: (aiAgent: AICodingAgent = 'cursor'): WizardOutput =>
    ScanRecommendationEngine.recommend({
      appType: 'web',
      sensitivity: 'social',
      languages: ['typescript', 'javascript'],
      frameworks: ['nextjs'],
      aiAgent,
      concerns: ['security-vulnerabilities', 'ai-generated-bugs', 'secrets-exposure'],
    }),

  /**
   * For a SaaS API backend
   */
  saasApi: (): WizardOutput =>
    ScanRecommendationEngine.recommend({
      appType: 'api',
      sensitivity: 'enterprise',
      concerns: ['security-vulnerabilities', 'dependency-risks', 'performance'],
    }),

  /**
   * For a fintech/payments app
   */
  fintechApp: (): WizardOutput =>
    ScanRecommendationEngine.recommend({
      appType: 'web',
      sensitivity: 'financial',
      concerns: ['security-vulnerabilities', 'compliance', 'secrets-exposure'],
    }),

  /**
   * For a side project / learning
   */
  sideProject: (aiAgent: AICodingAgent = 'copilot'): WizardOutput =>
    ScanRecommendationEngine.recommend({
      appType: 'web',
      sensitivity: 'personal',
      aiAgent,
      concerns: ['not-sure'],
    }),

  /**
   * Pre-launch security audit
   */
  preLaunchAudit: (appType: AppType, sensitivity: AppSensitivity): WizardOutput =>
    ScanRecommendationEngine.recommend({
      appType,
      sensitivity,
      concerns: [
        'security-vulnerabilities',
        'secrets-exposure',
        'dependency-risks',
        'performance',
        'accessibility',
      ],
    }),
};

// ============================================================
// Human-Friendly Descriptions
// ============================================================

export const SENSITIVITY_DESCRIPTIONS: Record<AppSensitivity, string> = {
  financial: "Banking, payments, trading - the highest security standards",
  healthcare: "Medical data requires HIPAA-level protection",
  government: "Compliance-heavy with strict audit requirements",
  enterprise: "B2B tools need solid security for customer trust",
  ecommerce: "Payment data and customer info need protection",
  social: "User data and content moderation concerns",
  entertainment: "Focus on performance and user experience",
  education: "Student data protection and accessibility",
  iot: "Device security and firmware protection",
  'developer-tool': "Supply chain security for dev tools",
  personal: "Basic security for learning and hobby projects",
};

export const AI_AGENT_DESCRIPTIONS: Record<AICodingAgent, string> = {
  cursor: "Popular AI-first IDE with Claude/GPT integration",
  copilot: "GitHub's AI pair programmer",
  'claude-code': "Anthropic's Claude for coding assistance",
  codeium: "Free AI coding assistant",
  tabnine: "AI code completion tool",
  'amazon-q': "AWS's AI assistant for developers",
  'gemini-code': "Google's Gemini for code",
  'other-ai': "Other AI coding tools",
  none: "Traditional human-only development",
};
