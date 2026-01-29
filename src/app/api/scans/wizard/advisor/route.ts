import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import {
  ToolAdvisor,
  SelectionState,
  WizardInput,
  TOOL_DATABASE,
  CATEGORY_INFO,
} from '@/lib/wizard';
import { logger } from '@/lib/logger';

/**
 * POST /api/scans/wizard/advisor
 *
 * Get intelligent module recommendations and analysis
 *
 * This endpoint provides conversational AI-style recommendations that:
 * 1. Analyze the app type and sensitivity to suggest appropriate modules
 * 2. Review previous findings to recommend follow-up modules
 * 3. Consider new commits/changes to suggest relevant scans
 *
 * Body:
 * - selectionState: Current SelectionState (required)
 * - context: WizardInput (optional but recommended)
 * - previousFindings?: Array of previous scan findings
 * - recentChanges?: { files: string[], commits: number, languages: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { selectionState, context, previousFindings, recentChanges } = body;

    if (!selectionState) {
      return NextResponse.json(
        { error: 'selectionState is required' },
        { status: 400 }
      );
    }

    // Get base advisor analysis
    const advisorResult = ToolAdvisor.analyze(selectionState, context);

    // Generate conversational recommendations
    const conversation = generateConversationalAdvice(
      selectionState,
      context,
      previousFindings,
      recentChanges,
      advisorResult
    );

    // Get smart module bubbling (prioritized recommendations)
    const bubbledTools = ToolAdvisor.getTopRecommendations(selectionState, context, 10);

    return NextResponse.json({
      // Full advisor analysis
      analysis: advisorResult,

      // Conversational AI-style advice
      conversation,

      // Modules bubbled to top (most important first)
      bubbledModules: bubbledTools.map(pt => ({
        toolId: pt.tool.id,
        toolName: pt.tool.name,
        category: pt.tool.category,
        description: pt.tool.description,
        priority: pt.priority,
        reasons: pt.reasons,
        isEssential: pt.isEssential,
        credits: pt.tool.credits,
        timeEstimate: pt.tool.timeEstimate,
      })),

      // Quick action suggestions
      quickActions: generateQuickActions(advisorResult, selectionState),
    });
  } catch (error) {
    logger.error('Advisor error', { error });
    return NextResponse.json(
      { error: 'Failed to generate advisor recommendations' },
      { status: 500 }
    );
  }
}

// ============================================================
// Conversational Advice Generation
// ============================================================

interface ConversationMessage {
  type: 'greeting' | 'analysis' | 'recommendation' | 'warning' | 'tip';
  title: string;
  content: string;
  tools?: string[];
  action?: {
    label: string;
    toolIds: string[];
  };
}

function generateConversationalAdvice(
  selectionState: SelectionState,
  context: WizardInput | undefined,
  previousFindings: PreviousFinding[] | undefined,
  recentChanges: RecentChanges | undefined,
  advisorResult: ReturnType<typeof ToolAdvisor.analyze>
): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  const selectedCount = selectionState.selectedTools.length;

  // Opening greeting based on context
  if (context) {
    messages.push({
      type: 'greeting',
      title: getGreetingTitle(context),
      content: getGreetingContent(context),
    });
  } else if (selectedCount === 0) {
    messages.push({
      type: 'greeting',
      title: "Let's set up your scan",
      content: "I'll help you choose the right modules for your project. Tell me about your app, or I can suggest some essentials to start.",
    });
  }

  // Analysis based on previous findings
  if (previousFindings && previousFindings.length > 0) {
    const findingAnalysis = analyzePreviousFindings(previousFindings);
    if (findingAnalysis.recommendations.length > 0) {
      messages.push({
        type: 'analysis',
        title: 'Based on your previous scans',
        content: findingAnalysis.summary,
        tools: findingAnalysis.recommendations,
        action: {
          label: 'Add recommended follow-up modules',
          toolIds: findingAnalysis.recommendations,
        },
      });
    }
  }

  // Analysis based on recent changes
  if (recentChanges && (recentChanges.commits > 0 || recentChanges.files.length > 0)) {
    const changeAnalysis = analyzeRecentChanges(recentChanges);
    if (changeAnalysis.recommendations.length > 0) {
      messages.push({
        type: 'analysis',
        title: 'For your recent changes',
        content: changeAnalysis.summary,
        tools: changeAnalysis.recommendations,
        action: {
          label: 'Add modules for changed areas',
          toolIds: changeAnalysis.recommendations,
        },
      });
    }
  }

  // Coverage recommendations
  const criticalGaps = advisorResult.coverage.criticalGaps.filter(g => g.severity === 'critical');
  if (criticalGaps.length > 0) {
    const gap = criticalGaps[0];
    const categoryInfo = CATEGORY_INFO[gap.category];
    messages.push({
      type: 'warning',
      title: `You're missing ${categoryInfo.displayName} coverage`,
      content: gap.reason,
      tools: gap.suggestedTools.slice(0, 2),
      action: {
        label: `Add ${TOOL_DATABASE.find(t => t.id === gap.suggestedTools[0])?.name}`,
        toolIds: gap.suggestedTools.slice(0, 1),
      },
    });
  }

  // Redundancy warnings
  if (advisorResult.redundancy.redundantGroups.length > 0) {
    const group = advisorResult.redundancy.redundantGroups[0];
    messages.push({
      type: 'warning',
      title: `Overlapping modules detected`,
      content: `You've selected multiple modules for ${group.purpose}. ${group.recommendation}`,
      tools: group.tools,
      action: {
        label: `Keep ${TOOL_DATABASE.find(t => t.id === group.keepTool)?.name}, remove others`,
        toolIds: group.removableTools,
      },
    });
  }

  // Smart recommendations based on context
  if (context && selectedCount < 5) {
    const smartRecs = getSmartRecommendations(context, selectionState);
    if (smartRecs.tools.length > 0) {
      messages.push({
        type: 'recommendation',
        title: smartRecs.title,
        content: smartRecs.content,
        tools: smartRecs.tools,
        action: {
          label: 'Add these modules',
          toolIds: smartRecs.tools,
        },
      });
    }
  }

  // Success message if well-covered
  if (advisorResult.score >= 75 && selectedCount >= 3) {
    messages.push({
      type: 'tip',
      title: 'Looking good!',
      content: advisorResult.summary.verdict,
    });
  }

  // Tips for optimization
  if (selectionState.credits.selected > 30) {
    messages.push({
      type: 'tip',
      title: 'Pro tip',
      content: 'For large scans, consider running security modules first, then code quality. This lets you prioritize fixing critical issues.',
    });
  }

  return messages;
}

function getGreetingTitle(context: WizardInput): string {
  const appTypeNames: Record<string, string> = {
    web: 'web app',
    pwa: 'progressive web app',
    api: 'API',
    'mobile-native': 'mobile app',
    'desktop-native': 'desktop app',
    cli: 'CLI tool',
    library: 'library',
  };

  const sensitivityNames: Record<string, string> = {
    financial: 'financial',
    healthcare: 'healthcare',
    government: 'government',
    enterprise: 'enterprise',
    ecommerce: 'e-commerce',
    social: 'social',
    entertainment: 'entertainment',
    education: 'education',
    iot: 'IoT',
    'developer-tool': 'developer tool',
    personal: 'personal',
  };

  const appType = appTypeNames[context.appType] || context.appType;
  const sensitivity = sensitivityNames[context.sensitivity] || context.sensitivity;

  return `Setting up scans for your ${sensitivity} ${appType}`;
}

function getGreetingContent(context: WizardInput): string {
  const highSecurity = ['financial', 'healthcare', 'government', 'enterprise'];

  if (highSecurity.includes(context.sensitivity)) {
    return `${context.sensitivity.charAt(0).toUpperCase() + context.sensitivity.slice(1)} applications require comprehensive security coverage. I've prioritized essential security modules for you.`;
  }

  if (context.aiAgent && context.aiAgent !== 'none') {
    return `Since you're using ${context.aiAgent}, I've included modules that catch common AI-generated code issues alongside standard security checks.`;
  }

  return "I've analyzed your project type and selected modules that match your needs. You can customize the selection below.";
}

// ============================================================
// Previous Findings Analysis
// ============================================================

interface PreviousFinding {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  tool: string;
  count: number;
}

function analyzePreviousFindings(findings: PreviousFinding[]): {
  summary: string;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  const criticalCount = findings.filter(f => f.severity === 'critical' || f.severity === 'high').length;

  // If previous scans found security issues, recommend deeper security tools
  const securityFindings = findings.filter(f =>
    f.category === 'security' && (f.severity === 'critical' || f.severity === 'high')
  );
  if (securityFindings.length > 0) {
    recommendations.push('owasp-zap', 'nuclei');
  }

  // If dependency issues were found, add more dep scanning
  const depFindings = findings.filter(f => f.category === 'dependencies');
  if (depFindings.length > 0) {
    recommendations.push('dependency-check', 'osv-scanner');
  }

  // If secrets were found, add more secret detection
  const secretFindings = findings.filter(f =>
    f.tool === 'gitleaks' || f.tool === 'secretlint'
  );
  if (secretFindings.length > 0 && secretFindings.some(f => f.count > 0)) {
    recommendations.push('secretlint');
  }

  // Build summary
  let summary = '';
  if (criticalCount > 0) {
    summary = `Your last scan found ${criticalCount} critical/high severity issues. I recommend running deeper analysis modules to ensure they're fully resolved.`;
  } else if (findings.length > 0) {
    summary = 'Your previous scans found some issues. These additional modules can help verify fixes and catch related problems.';
  }

  return {
    summary,
    recommendations: [...new Set(recommendations)].slice(0, 3),
  };
}

// ============================================================
// Recent Changes Analysis
// ============================================================

interface RecentChanges {
  files: string[];
  commits: number;
  languages: string[];
}

function analyzeRecentChanges(changes: RecentChanges): {
  summary: string;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  const fileTypes = new Set<string>();

  // Analyze file extensions
  for (const file of changes.files) {
    const ext = file.split('.').pop()?.toLowerCase();
    if (ext) fileTypes.add(ext);
  }

  // Recommend tools based on changed file types
  if (fileTypes.has('ts') || fileTypes.has('tsx') || fileTypes.has('js') || fileTypes.has('jsx')) {
    recommendations.push('eslint', 'semgrep');
  }
  if (fileTypes.has('py')) {
    recommendations.push('bandit', 'pip-audit');
  }
  if (fileTypes.has('go')) {
    recommendations.push('gosec');
  }
  if (fileTypes.has('rb')) {
    recommendations.push('brakeman', 'rubocop');
  }
  if (fileTypes.has('php')) {
    recommendations.push('phpstan');
  }
  if (fileTypes.has('java') || fileTypes.has('kt')) {
    recommendations.push('spotbugs');
  }
  if (fileTypes.has('tf') || fileTypes.has('hcl')) {
    recommendations.push('checkov', 'tfsec');
  }
  if (fileTypes.has('yml') || fileTypes.has('yaml')) {
    // Could be K8s, CI, or other config
    if (changes.files.some(f => f.includes('k8s') || f.includes('kubernetes') || f.includes('deploy'))) {
      recommendations.push('kubesec', 'polaris');
    }
  }
  if (changes.files.some(f => f.toLowerCase().includes('dockerfile'))) {
    recommendations.push('trivy', 'dockle');
  }
  if (changes.files.some(f => f.includes('package.json') || f.includes('package-lock'))) {
    recommendations.push('npm-audit', 'osv-scanner');
  }

  // Build summary
  let summary = '';
  if (changes.commits > 10) {
    summary = `You have ${changes.commits} new commits since your last scan. I recommend a comprehensive scan to catch any issues introduced.`;
  } else if (changes.commits > 0) {
    summary = `${changes.commits} commit${changes.commits > 1 ? 's' : ''} since last scan. These modules are relevant to your changed files.`;
  } else {
    summary = 'Based on the files you\'ve modified, these modules would be most relevant.';
  }

  return {
    summary,
    recommendations: [...new Set(recommendations)].slice(0, 4),
  };
}

// ============================================================
// Smart Recommendations
// ============================================================

function getSmartRecommendations(
  context: WizardInput,
  selectionState: SelectionState
): { title: string; content: string; tools: string[] } {
  const selectedIds = new Set(selectionState.selectedTools.map(t => t.id));
  const recommendations: string[] = [];

  // Essential modules everyone should have
  const essentials = ['semgrep', 'gitleaks', 'osv-scanner'];
  for (const tool of essentials) {
    if (!selectedIds.has(tool)) {
      recommendations.push(tool);
    }
  }

  // App-type specific recommendations
  if (context.appType === 'api' && !selectedIds.has('spectral')) {
    recommendations.push('spectral');
  }
  if (['web', 'pwa'].includes(context.appType) && !selectedIds.has('lighthouse')) {
    recommendations.push('lighthouse');
  }
  if (context.appType === 'mobile-native' && !selectedIds.has('mobsf')) {
    recommendations.push('mobsf');
  }

  // AI agent specific
  if (context.aiAgent && context.aiAgent !== 'none' && !selectedIds.has('eslint')) {
    recommendations.push('eslint');
  }

  // Limit to top 3
  const finalRecs = recommendations.slice(0, 3);

  if (finalRecs.length === 0) {
    return { title: '', content: '', tools: [] };
  }

  return {
    title: 'Recommended for your stack',
    content: `Based on your ${context.appType} ${context.sensitivity} app, these modules provide essential coverage.`,
    tools: finalRecs,
  };
}

// ============================================================
// Quick Actions
// ============================================================

interface QuickAction {
  id: string;
  label: string;
  description: string;
  toolIds: string[];
  credits: number;
}

function generateQuickActions(
  advisorResult: ReturnType<typeof ToolAdvisor.analyze>,
  selectionState: SelectionState
): QuickAction[] {
  const actions: QuickAction[] = [];
  const selectedIds = new Set(selectionState.selectedTools.map(t => t.id));

  // Add essentials if missing
  const essentials = ['semgrep', 'gitleaks', 'osv-scanner'].filter(t => !selectedIds.has(t));
  if (essentials.length > 0) {
    const credits = essentials.reduce((sum, id) => {
      const tool = TOOL_DATABASE.find(t => t.id === id);
      return sum + (tool?.credits || 0);
    }, 0);
    actions.push({
      id: 'add-essentials',
      label: 'Add Security Essentials',
      description: 'Semgrep, Gitleaks, and OSV Scanner for baseline security',
      toolIds: essentials,
      credits,
    });
  }

  // Fix critical gaps
  for (const gap of advisorResult.coverage.criticalGaps.filter(g => g.severity === 'critical')) {
    const toolsToAdd = gap.suggestedTools.filter(t => !selectedIds.has(t)).slice(0, 2);
    if (toolsToAdd.length > 0) {
      const categoryInfo = CATEGORY_INFO[gap.category];
      const credits = toolsToAdd.reduce((sum, id) => {
        const tool = TOOL_DATABASE.find(t => t.id === id);
        return sum + (tool?.credits || 0);
      }, 0);
      actions.push({
        id: `fix-${gap.category}`,
        label: `Add ${categoryInfo.displayName}`,
        description: gap.reason,
        toolIds: toolsToAdd,
        credits,
      });
    }
  }

  // Remove redundancies
  for (const group of advisorResult.redundancy.redundantGroups) {
    actions.push({
      id: `remove-redundant-${group.purpose.toLowerCase().replace(/\s+/g, '-')}`,
      label: `Optimize ${group.purpose}`,
      description: `Keep ${TOOL_DATABASE.find(t => t.id === group.keepTool)?.name}, remove duplicates to save ${group.creditsSaved} credits`,
      toolIds: group.removableTools,
      credits: -group.creditsSaved,
    });
  }

  return actions.slice(0, 5);
}
