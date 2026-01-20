'use client';

import { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import {
  CREDIT_COSTS,
  calculateCredits,
  ScanConfig,
  AIFeature,
  SubscriptionTier,
  SUBSCRIPTION_TIERS,
} from '@/lib/billing/credits';
import { TOOL_REGISTRY, CATEGORY_LABELS, ToolCategory } from '@/lib/tools/registry';

interface ScanConfigProps {
  projectId: string;
  projectName: string;
  estimatedLines?: number;
  tier: SubscriptionTier;
  creditsRemaining: number;
  onRunScan: (config: ScanConfig) => void;
  isLoading?: boolean;
}

const CATEGORY_ICONS: Record<ToolCategory, string> = {
  linting: '📝',
  security: '🔒',
  dependencies: '📦',
  accessibility: '♿',
  quality: '✨',
  documentation: '📚',
  git: '🔀',
  performance: '⚡',
  container: '🐳',
  sbom: '📋',
};

const AI_FEATURE_LABELS: Record<AIFeature, { name: string; description: string }> = {
  summary: {
    name: 'Scan Summary',
    description: 'AI-generated overview of findings',
  },
  issue_explanations: {
    name: 'Issue Explanations',
    description: 'Detailed explanation for each issue',
  },
  fix_suggestions: {
    name: 'Fix Suggestions',
    description: 'AI-generated code fixes',
  },
  priority_scoring: {
    name: 'Priority Scoring',
    description: 'AI-ranked issue importance',
  },
};

export function ScanConfigPanel({
  projectId,
  projectName,
  estimatedLines,
  tier,
  creditsRemaining,
  onRunScan,
  isLoading = false,
}: ScanConfigProps) {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  const availableAIFeatures = tierConfig.features.aiFeatures as AIFeature[];

  // State for selected options
  const [selectedCategories, setSelectedCategories] = useState<ToolCategory[]>([
    'linting',
    'security',
    'dependencies',
    'quality',
    'documentation',
    'git',
  ]);
  const [selectedAIFeatures, setSelectedAIFeatures] = useState<AIFeature[]>(
    availableAIFeatures.includes('summary') ? ['summary'] : []
  );
  const [estimatedIssues, setEstimatedIssues] = useState<number>(50);

  // Calculate credits
  const config: ScanConfig = useMemo(
    () => ({
      categories: selectedCategories,
      aiFeatures: selectedAIFeatures,
      estimatedLines,
      estimatedIssues,
    }),
    [selectedCategories, selectedAIFeatures, estimatedLines, estimatedIssues]
  );

  const estimate = useMemo(() => calculateCredits(config), [config]);

  const canAfford = creditsRemaining >= estimate.total || tierConfig.overageRate !== null;
  const willUseOverage = estimate.total > creditsRemaining;
  const overageCredits = willUseOverage ? estimate.total - creditsRemaining : 0;
  const overageCost = overageCredits * (tierConfig.overageRate || 0);

  // Toggle category
  const toggleCategory = (category: ToolCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Toggle AI feature
  const toggleAIFeature = (feature: AIFeature) => {
    if (!availableAIFeatures.includes(feature)) return;

    setSelectedAIFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  // Get tools for a category
  const getToolsForCategory = (category: ToolCategory) =>
    TOOL_REGISTRY.filter((t) => t.category === category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Configure Scan</h2>
        <p className="text-muted-foreground">
          Select tools and features for <span className="font-medium">{projectName}</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tool Categories */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold">Tool Categories</h3>

          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(CATEGORY_LABELS) as ToolCategory[]).map((category) => {
              const isSelected = selectedCategories.includes(category);
              const cost = CREDIT_COSTS.TOOLS[category];
              const tools = getToolsForCategory(category);

              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{CATEGORY_ICONS[category]}</span>
                      <span className="font-medium">{CATEGORY_LABELS[category]}</span>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        cost === 0
                          ? 'bg-green-900 text-green-200'
                          : 'bg-orange-900 text-orange-200'
                      }`}
                    >
                      {cost === 0 ? 'Free' : `+${cost} credits`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tools.map((t) => t.name).join(', ')}
                  </p>
                </button>
              );
            })}
          </div>

          {/* AI Features */}
          <h3 className="text-lg font-semibold mt-6">AI Features</h3>

          <div className="grid sm:grid-cols-2 gap-3">
            {(Object.keys(AI_FEATURE_LABELS) as AIFeature[]).map((feature) => {
              const isAvailable = availableAIFeatures.includes(feature);
              const isSelected = selectedAIFeatures.includes(feature);
              const cost = CREDIT_COSTS.AI[feature];
              const { name, description } = AI_FEATURE_LABELS[feature];

              const isPerIssue =
                feature === 'issue_explanations' || feature === 'fix_suggestions';

              return (
                <button
                  key={feature}
                  onClick={() => toggleAIFeature(feature)}
                  disabled={!isAvailable}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    !isAvailable
                      ? 'border-border/50 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{name}</span>
                    {isAvailable ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-900 text-blue-200">
                        +{cost} {isPerIssue ? 'per 50 issues' : 'credits'}
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-700 text-gray-200">
                        Upgrade required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="space-y-4">
          <GlassCard className="p-6 sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Credit Estimate</h3>

            {/* Breakdown */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base scan</span>
                <span>{estimate.breakdown.base} credits</span>
              </div>

              {estimatedLines && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    ~{(estimatedLines / 1000).toFixed(0)}K lines
                  </span>
                  <span>{estimate.breakdown.lines} credits</span>
                </div>
              )}

              {Object.entries(estimate.breakdown.tools).map(([cat, cost]) =>
                cost > 0 ? (
                  <div key={cat} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {CATEGORY_ICONS[cat as ToolCategory]} {CATEGORY_LABELS[cat as ToolCategory]}
                    </span>
                    <span>{cost} credits</span>
                  </div>
                ) : null
              )}

              {Object.entries(estimate.breakdown.ai).map(([feature, cost]) =>
                cost > 0 ? (
                  <div key={feature} className="flex justify-between">
                    <span className="text-muted-foreground">
                      🤖 {AI_FEATURE_LABELS[feature as AIFeature].name}
                    </span>
                    <span>{cost} credits</span>
                  </div>
                ) : null
              )}

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{estimate.total} credits</span>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm mb-2">
                <span>Your balance</span>
                <span
                  className={
                    creditsRemaining < estimate.total ? 'text-orange-400' : 'text-green-400'
                  }
                >
                  {creditsRemaining} credits
                </span>
              </div>

              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    creditsRemaining < estimate.total ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min((creditsRemaining / (tierConfig.credits || 100)) * 100, 100)}%`,
                  }}
                />
              </div>

              {willUseOverage && tierConfig.overageRate && (
                <p className="text-xs text-orange-400 mt-2">
                  ⚠️ Will use {overageCredits} overage credits (${overageCost.toFixed(2)})
                </p>
              )}
            </div>

            {/* Warnings */}
            {estimate.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                {estimate.warnings.map((warning, i) => (
                  <p key={i} className="text-xs text-yellow-400">
                    ⚠️ {warning}
                  </p>
                ))}
              </div>
            )}

            {/* Run Button */}
            <GradientButton
              className="w-full mt-6"
              disabled={!canAfford || selectedCategories.length === 0 || isLoading}
              onClick={() => onRunScan(config)}
              glow
            >
              {isLoading ? (
                'Running Scan...'
              ) : !canAfford ? (
                'Insufficient Credits'
              ) : (
                <>
                  Run Scan
                  <span className="ml-2 text-sm opacity-75">({estimate.total} credits)</span>
                </>
              )}
            </GradientButton>

            {!canAfford && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                <a href="/pricing" className="text-primary hover:underline">
                  Upgrade your plan
                </a>{' '}
                for more credits
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
