/**
 * Billing module exports
 */

// Core credit system
export {
  CREDIT_COSTS,
  SUBSCRIPTION_TIERS,
  calculateCredits,
  getDefaultScanConfig,
  canAffordScan,
  type ScanConfig,
  type CreditEstimate,
  type SubscriptionTier,
  type AIFeature,
} from './credits';

// Types
export type {
  BillingAccount,
  CreditTransaction,
  UsageSummary,
  ScanEstimateRequest,
  ScanEstimateResponse,
  RunScanRequest,
  BillingStatus,
} from './types';

// Client SDK
export {
  BugritClient,
  BugritError,
  createBugritHook,
  type BugritClientConfig,
  type QuoteRequest,
  type QuoteResponse,
  type BalanceResponse,
} from './client';

// Auto top-up
export {
  checkAndTriggerAutoTopup,
  deductCreditsWithAutoTopup,
} from './auto-topup';

// Scan billing integration
export {
  getBillingAccount,
  countLinesOfCode,
  checkScanAffordability,
  checkRepoSizeLimit,
  billForCompletedScan,
  reserveCreditsForScan,
  finalizeReservation,
  releaseReservation,
  type PreScanCheck,
  type PostScanBilling,
} from './scan-billing';
