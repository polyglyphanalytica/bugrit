/**
 * Bugrit Billing Client
 *
 * A lightweight client for integrating Bugrit billing into your app.
 * Use this to show users their balance and scan costs before submitting.
 *
 * Example usage:
 *
 * ```typescript
 * import { BugritClient } from '@bugrit/client';
 *
 * const client = new BugritClient({
 *   apiKey: process.env.BUGRIT_API_KEY,
 * });
 *
 * // Get current balance
 * const balance = await client.getBalance();
 * console.log(`Credits remaining: ${balance.remaining}`);
 *
 * // Get quote before running scan
 * const quote = await client.getQuote({
 *   estimatedLines: 50000,
 *   config: {
 *     categories: ['linting', 'security'],
 *     aiFeatures: ['summary'],
 *   },
 * });
 *
 * // Show user the cost
 * console.log(`This scan will cost ${quote.estimate.total} credits`);
 *
 * // Run the scan if user confirms
 * if (userConfirmed) {
 *   const scan = await client.runScan({
 *     projectId: 'my-project',
 *     config: quote.config,
 *   });
 * }
 * ```
 */

import { ToolCategory } from '../tools/registry';

export interface BugritClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface QuoteConfig {
  categories: ToolCategory[];
  aiFeatures: string[];
}

export interface QuoteRequest {
  projectId?: string;
  repoUrl?: string;
  estimatedLines?: number;
  estimatedIssues?: number;
  config?: Partial<QuoteConfig>;
}

export interface BalanceResponse {
  remaining: number;
  included: number;
  used: number;
  percentUsed: number;
}

export interface QuoteResponse {
  options: {
    categories: Array<{
      id: string;
      name: string;
      description: string;
      tools: string[];
      creditCost: number;
      included: boolean;
    }>;
    aiFeatures: Array<{
      id: string;
      name: string;
      description: string;
      creditCost: number;
      perIssue: boolean;
      available: boolean;
    }>;
    linesCostPer10K: number;
    baseScanCost: number;
  };
  balance: BalanceResponse;
  estimate?: {
    breakdown: {
      base: number;
      lines: number;
      tools: Record<string, number>;
      ai: Record<string, number>;
    };
    total: number;
    warnings: string[];
  };
  canAfford: boolean;
  overage?: {
    credits: number;
    cost: number;
    rate: number;
  };
}

export interface BillingStatus {
  tier: string;
  tierName: string;
  credits: BalanceResponse;
  subscription: {
    status: string;
    renewsAt: string;
    cancelAtPeriodEnd: boolean;
  };
  limits: {
    maxProjects: number;
    maxRepoSize: number;
    aiFeatures: string[];
  };
  canScan: boolean;
  needsUpgrade: boolean;
}

export interface ScanResult {
  scanId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  creditsCharged: number;
  estimatedCompletion?: string;
}

/**
 * Bugrit API Client
 */
export class BugritClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: BugritClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://bugrit.dev/api';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new BugritError(error.message || 'Request failed', response.status, error);
    }

    return response.json();
  }

  /**
   * Get current billing status including balance and subscription info
   */
  async getStatus(): Promise<BillingStatus> {
    return this.request<BillingStatus>('/billing/status');
  }

  /**
   * Get current credit balance (quick check)
   */
  async getBalance(): Promise<BalanceResponse & { tier: string; overageEnabled: boolean }> {
    return this.request('/billing/quote');
  }

  /**
   * Get a detailed quote for a scan configuration
   * Returns all available options and calculated cost
   */
  async getQuote(request: QuoteRequest = {}): Promise<QuoteResponse> {
    return this.request<QuoteResponse>('/billing/quote', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Calculate the cost of a specific configuration
   * (Convenience method that calls getQuote with config)
   */
  async calculateCost(
    categories: ToolCategory[],
    aiFeatures: string[] = [],
    estimatedLines?: number
  ): Promise<{ total: number; breakdown: QuoteResponse['estimate']; canAfford: boolean }> {
    const quote = await this.getQuote({
      estimatedLines,
      config: { categories, aiFeatures },
    });

    return {
      total: quote.estimate?.total || 0,
      breakdown: quote.estimate,
      canAfford: quote.canAfford,
    };
  }

  /**
   * Run a scan with the given configuration
   */
  async runScan(request: {
    projectId: string;
    config: QuoteConfig;
    confirmOverage?: boolean;
  }): Promise<ScanResult> {
    return this.request<ScanResult>('/v1/scans', {
      method: 'POST',
      body: JSON.stringify({
        projectId: request.projectId,
        toolCategories: request.config.categories,
        aiFeatures: request.config.aiFeatures,
        confirmOverage: request.confirmOverage,
      }),
    });
  }

  /**
   * Get usage summary for current or previous period
   */
  async getUsage(period: 'current' | 'previous' = 'current') {
    return this.request(`/billing/usage?period=${period}&include=summary`);
  }

  /**
   * Get transaction history
   */
  async getTransactions(limit: number = 50) {
    return this.request(`/billing/usage?include=transactions&limit=${limit}`);
  }
}

/**
 * Error class for Bugrit API errors
 */
export class BugritError extends Error {
  public statusCode: number;
  public details: Record<string, unknown>;

  constructor(message: string, statusCode: number, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'BugritError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * React hook for Bugrit billing (if using React)
 *
 * Example:
 * ```tsx
 * function ScanButton({ projectId }) {
 *   const { balance, quote, isLoading, error, getQuote, runScan } = useBugrit(apiKey);
 *
 *   useEffect(() => {
 *     getQuote({ config: { categories: ['linting', 'security'] } });
 *   }, []);
 *
 *   return (
 *     <div>
 *       <p>Balance: {balance?.remaining} credits</p>
 *       <p>This scan: {quote?.estimate?.total} credits</p>
 *       <button onClick={() => runScan(projectId, quote.config)}>
 *         Run Scan
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function createBugritHook(apiKey: string) {
  const client = new BugritClient({ apiKey });

  return function useBugrit() {
    // This would be implemented with React state
    // Leaving as a placeholder for the SDK
    return {
      client,
      // These would be React state values
      balance: null as BalanceResponse | null,
      quote: null as QuoteResponse | null,
      isLoading: false,
      error: null as Error | null,
      // Methods
      getBalance: () => client.getBalance(),
      getQuote: (req: QuoteRequest) => client.getQuote(req),
      getStatus: () => client.getStatus(),
    };
  };
}
