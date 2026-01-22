/**
 * Billing system types
 */

import { SubscriptionTier, AIFeature, ScanConfig, CreditEstimate } from './credits';
import { ToolCategory } from '../tools/registry';

// User's billing account
export interface BillingAccount {
  userId: string;
  organizationId?: string;

  // Current subscription
  subscription: {
    tier: SubscriptionTier;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };

  // Credit balance
  credits: {
    included: number;      // Credits included in plan
    used: number;          // Credits used this period
    remaining: number;     // Credits remaining
    rollover: number;      // Rolled over from last period
    overage: number;       // Overage credits used (billable)
  };

  // Stripe references
  stripe?: {
    customerId: string;
    subscriptionId: string;
    paymentMethodId?: string;
  };
}

// Credit transaction record
export interface CreditTransaction {
  id: string;
  accountId: string;
  timestamp: Date;

  // Transaction type
  type: 'scan' | 'refund' | 'adjustment' | 'rollover' | 'reset';

  // Credit change (negative for consumption)
  amount: number;

  // Balance after transaction
  balanceAfter: number;

  // Details
  details: {
    scanId?: string;
    breakdown?: CreditEstimate['breakdown'];
    note?: string;
  };
}

// Usage summary for a period
export interface UsageSummary {
  periodStart: Date;
  periodEnd: Date;

  // Totals
  totalScans: number;
  totalCreditsUsed: number;
  totalLinesScanned: number;
  totalIssuesFound: number;

  // By category
  byCategory: Record<ToolCategory, {
    scans: number;
    credits: number;
    issues: number;
  }>;

  // By AI feature
  byAIFeature: Record<AIFeature, {
    uses: number;
    credits: number;
  }>;

  // Top projects
  topProjects: Array<{
    projectId: string;
    projectName: string;
    scans: number;
    credits: number;
  }>;
}

// API request to estimate scan cost
export interface ScanEstimateRequest {
  // Repository info
  repoUrl?: string;
  projectId?: string;

  // Or provide estimated size directly
  estimatedLines?: number;

  // Scan configuration
  config: ScanConfig;
}

// API response for scan estimate
export interface ScanEstimateResponse {
  estimate: CreditEstimate;
  canAfford: boolean;
  currentBalance: number;
  overageAmount?: number;
  overageCost?: number;
  warnings: string[];
}

// API request to run a scan
export interface RunScanRequest {
  projectId: string;
  config: ScanConfig;

  // Confirm overage if needed
  confirmOverage?: boolean;
}

// Billing status for embedding in apps
export interface BillingStatus {
  tier: SubscriptionTier;
  tierName: string;

  credits: {
    remaining: number;
    included: number;
    used: number;
    rollover: number;
    percentUsed: number;
  };

  subscription: {
    status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'none';
    renewsAt: Date | null;
    cancelAtPeriodEnd: boolean;
  };

  limits: {
    maxProjects: number;
    maxRepoSize: number;
    aiFeatures: string[];
  };

  // Quick check helpers
  canScan: boolean;
  needsUpgrade: boolean;
  overageEnabled: boolean;
}
