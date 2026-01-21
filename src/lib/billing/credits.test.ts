import { describe, it, expect } from 'vitest';
import {
  calculateCredits,
  canAffordScan,
  getDefaultScanConfig,
  CREDIT_COSTS,
  SUBSCRIPTION_TIERS,
  type ScanConfig,
  type SubscriptionTier,
} from './credits';

describe('calculateCredits', () => {
  it('should include base scan cost', () => {
    const config: ScanConfig = {
      categories: [],
      aiFeatures: [],
    };

    const result = calculateCredits(config);

    expect(result.breakdown.base).toBe(CREDIT_COSTS.BASE_SCAN);
    expect(result.total).toBe(1);
  });

  it('should calculate lines of code cost correctly', () => {
    const config: ScanConfig = {
      categories: [],
      aiFeatures: [],
      estimatedLines: 25000, // 2.5 batches of 10K, rounds up to 3
    };

    const result = calculateCredits(config);

    expect(result.breakdown.lines).toBe(3);
    expect(result.total).toBe(4); // 1 base + 3 lines
  });

  it('should calculate tool category costs', () => {
    const config: ScanConfig = {
      categories: ['linting', 'security', 'accessibility', 'performance'],
      aiFeatures: [],
    };

    const result = calculateCredits(config);

    expect(result.breakdown.tools.linting).toBe(0);
    expect(result.breakdown.tools.security).toBe(1);
    expect(result.breakdown.tools.accessibility).toBe(2);
    expect(result.breakdown.tools.performance).toBe(3);
    expect(result.total).toBe(7); // 1 base + 0 + 1 + 2 + 3 tools
  });

  it('should calculate AI feature costs', () => {
    const config: ScanConfig = {
      categories: [],
      aiFeatures: ['summary', 'priority_scoring'],
    };

    const result = calculateCredits(config);

    expect(result.breakdown.ai.summary).toBe(1);
    expect(result.breakdown.ai.priority_scoring).toBe(1);
    expect(result.total).toBe(3); // 1 base + 1 + 1 AI
  });

  it('should calculate issue-based AI features with default estimate', () => {
    const config: ScanConfig = {
      categories: [],
      aiFeatures: ['issue_explanations'],
    };

    const result = calculateCredits(config);

    // Default 50 issues = 1 batch
    expect(result.breakdown.ai.issue_explanations).toBe(2);
    expect(result.warnings).toContain(
      'AI issue_explanations cost estimated for ~50 issues. Actual cost may vary.'
    );
  });

  it('should calculate issue-based AI features with provided estimate', () => {
    const config: ScanConfig = {
      categories: [],
      aiFeatures: ['issue_explanations'],
      estimatedIssues: 120, // 3 batches of 50
    };

    const result = calculateCredits(config);

    // 120 issues = 3 batches * 2 credits = 6
    expect(result.breakdown.ai.issue_explanations).toBe(6);
    expect(result.warnings).toHaveLength(0);
  });

  it('should calculate fix_suggestions with batching', () => {
    const config: ScanConfig = {
      categories: [],
      aiFeatures: ['fix_suggestions'],
      estimatedIssues: 100, // 2 batches of 50
    };

    const result = calculateCredits(config);

    // 2 batches * 3 credits = 6
    expect(result.breakdown.ai.fix_suggestions).toBe(6);
  });

  it('should calculate complete scan correctly', () => {
    const config: ScanConfig = {
      categories: ['linting', 'security', 'accessibility'],
      aiFeatures: ['summary', 'issue_explanations'],
      estimatedLines: 50000,
      estimatedIssues: 100,
    };

    const result = calculateCredits(config);

    // Base: 1
    // Lines: 5 (50K lines = 5 batches of 10K)
    // Tools: 0 + 1 + 2 = 3
    // AI: 1 (summary) + 4 (2 batches * 2) = 5
    // Total: 1 + 5 + 3 + 5 = 14
    expect(result.total).toBe(14);
  });
});

describe('canAffordScan', () => {
  const mockEstimate = {
    breakdown: {
      base: 1,
      lines: 2,
      tools: { security: 1 } as Record<string, number>,
      ai: { summary: 1 } as Record<string, number>,
    },
    total: 5,
    warnings: [],
  };

  it('should allow scan when user has enough credits', () => {
    const result = canAffordScan(10, mockEstimate, 'pro');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should allow scan with overage when credits are insufficient but tier allows it', () => {
    const result = canAffordScan(3, mockEstimate, 'pro'); // Pro has overage rate

    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('overage credits');
    expect(result.reason).toContain('$0.25/credit');
  });

  it('should deny scan when credits insufficient and no overage allowed', () => {
    const result = canAffordScan(3, mockEstimate, 'free');

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Insufficient credits');
    expect(result.reason).toContain('Need 5, have 3');
  });

  it('should always allow scan for enterprise (unlimited)', () => {
    const result = canAffordScan(0, mockEstimate, 'enterprise');

    expect(result.allowed).toBe(true);
  });

  it('should use correct overage rate for each tier', () => {
    const starterResult = canAffordScan(0, mockEstimate, 'starter');
    const proResult = canAffordScan(0, mockEstimate, 'pro');
    const businessResult = canAffordScan(0, mockEstimate, 'business');

    expect(starterResult.reason).toContain('$0.35/credit');
    expect(proResult.reason).toContain('$0.25/credit');
    expect(businessResult.reason).toContain('$0.15/credit');
  });
});

describe('getDefaultScanConfig', () => {
  it('should return limited categories for free tier', () => {
    const config = getDefaultScanConfig('free');

    expect(config.categories).toContain('linting');
    expect(config.categories).toContain('dependencies');
    expect(config.categories).not.toContain('security');
    expect(config.categories).not.toContain('performance');
    expect(config.aiFeatures).toHaveLength(0);
  });

  it('should return all categories for paid tiers', () => {
    const config = getDefaultScanConfig('pro');

    expect(config.categories).toContain('linting');
    expect(config.categories).toContain('security');
    expect(config.categories).toContain('accessibility');
    expect(config.categories).toContain('performance');
  });

  it('should include correct AI features for each tier', () => {
    const starterConfig = getDefaultScanConfig('starter');
    const proConfig = getDefaultScanConfig('pro');
    const businessConfig = getDefaultScanConfig('business');

    expect(starterConfig.aiFeatures).toEqual(['summary']);
    expect(proConfig.aiFeatures).toContain('summary');
    expect(proConfig.aiFeatures).toContain('issue_explanations');
    expect(proConfig.aiFeatures).not.toContain('fix_suggestions');
    expect(businessConfig.aiFeatures).toContain('fix_suggestions');
  });
});

describe('SUBSCRIPTION_TIERS', () => {
  it('should have correct credit allocations', () => {
    expect(SUBSCRIPTION_TIERS.free.credits).toBe(10);
    expect(SUBSCRIPTION_TIERS.starter.credits).toBe(50);
    expect(SUBSCRIPTION_TIERS.pro.credits).toBe(200);
    expect(SUBSCRIPTION_TIERS.business.credits).toBe(600);
    expect(SUBSCRIPTION_TIERS.enterprise.credits).toBe(-1); // Unlimited
  });

  it('should have decreasing overage rates for higher tiers', () => {
    expect(SUBSCRIPTION_TIERS.free.overageRate).toBeNull();
    expect(SUBSCRIPTION_TIERS.starter.overageRate).toBe(0.35);
    expect(SUBSCRIPTION_TIERS.pro.overageRate).toBe(0.25);
    expect(SUBSCRIPTION_TIERS.business.overageRate).toBe(0.15);
  });

  it('should have increasing features for higher tiers', () => {
    expect(SUBSCRIPTION_TIERS.free.features.maxProjects).toBe(1);
    expect(SUBSCRIPTION_TIERS.starter.features.maxProjects).toBe(3);
    expect(SUBSCRIPTION_TIERS.pro.features.maxProjects).toBe(10);
    expect(SUBSCRIPTION_TIERS.business.features.maxProjects).toBe(-1); // Unlimited
  });
});

describe('CREDIT_COSTS', () => {
  it('should have free categories cost zero', () => {
    expect(CREDIT_COSTS.TOOLS.linting).toBe(0);
    expect(CREDIT_COSTS.TOOLS.dependencies).toBe(0);
    expect(CREDIT_COSTS.TOOLS.quality).toBe(0);
    expect(CREDIT_COSTS.TOOLS.documentation).toBe(0);
    expect(CREDIT_COSTS.TOOLS.git).toBe(0);
  });

  it('should have resource-intensive categories cost more', () => {
    expect(CREDIT_COSTS.TOOLS.security).toBe(1);
    expect(CREDIT_COSTS.TOOLS.accessibility).toBe(2);
    expect(CREDIT_COSTS.TOOLS.performance).toBe(3);
  });
});
