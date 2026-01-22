/**
 * Bulkhead Pattern Implementation
 *
 * Isolates tool categories to prevent cascading failures.
 * Each category has its own resource pool and failure boundary.
 */

import { ToolCategory } from '@/lib/integrations/types';
import { logger } from '@/lib/logger';

export interface BulkheadConfig {
  /** Maximum concurrent executions in this bulkhead */
  maxConcurrent: number;
  /** Maximum queue size for waiting requests */
  maxQueueSize: number;
  /** Queue timeout in ms */
  queueTimeout: number;
}

export interface BulkheadStats {
  active: number;
  queued: number;
  totalAccepted: number;
  totalRejected: number;
  totalCompleted: number;
  totalFailed: number;
  avgExecutionTime: number;
}

interface QueuedItem {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  enqueuedAt: number;
}

const DEFAULT_CONFIG: BulkheadConfig = {
  maxConcurrent: 5,
  maxQueueSize: 100,
  queueTimeout: 60000, // 1 minute
};

/**
 * Category-specific configurations based on resource requirements
 */
export const CATEGORY_CONFIGS: Partial<Record<ToolCategory, Partial<BulkheadConfig>>> = {
  // Security tools - moderate concurrency
  security: {
    maxConcurrent: 8,
    maxQueueSize: 50,
    queueTimeout: 120000,
  },

  // Code quality - high concurrency (typically fast)
  'code-quality': {
    maxConcurrent: 15,
    maxQueueSize: 100,
    queueTimeout: 60000,
  },

  // Performance testing - low concurrency (resource intensive)
  performance: {
    maxConcurrent: 2,
    maxQueueSize: 20,
    queueTimeout: 300000, // 5 minutes
  },

  // Accessibility - moderate concurrency (browser-based)
  accessibility: {
    maxConcurrent: 4,
    maxQueueSize: 30,
    queueTimeout: 120000,
  },

  // API testing - moderate concurrency
  'api-testing': {
    maxConcurrent: 6,
    maxQueueSize: 40,
    queueTimeout: 120000,
  },

  // Visual testing - low concurrency (screenshot heavy)
  visual: {
    maxConcurrent: 3,
    maxQueueSize: 20,
    queueTimeout: 180000,
  },

  // Coverage - moderate concurrency
  coverage: {
    maxConcurrent: 5,
    maxQueueSize: 30,
    queueTimeout: 120000,
  },

  // Observability - low concurrency (external services)
  observability: {
    maxConcurrent: 3,
    maxQueueSize: 20,
    queueTimeout: 60000,
  },

  // Chaos testing - very low concurrency (disruptive)
  chaos: {
    maxConcurrent: 1,
    maxQueueSize: 5,
    queueTimeout: 300000,
  },
};

/**
 * Bulkhead implementation for a single category
 */
export class Bulkhead {
  private active: number = 0;
  private queue: QueuedItem[] = [];
  private totalAccepted: number = 0;
  private totalRejected: number = 0;
  private totalCompleted: number = 0;
  private totalFailed: number = 0;
  private executionTimes: number[] = [];
  private readonly maxExecutionSamples = 100;

  constructor(
    private readonly name: string,
    private readonly config: BulkheadConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Execute a function within the bulkhead
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Try to acquire a slot
    if (!this.tryAcquire()) {
      // No immediate slot available, queue the request
      await this.waitForSlot();
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Try to acquire an execution slot
   */
  private tryAcquire(): boolean {
    if (this.active < this.config.maxConcurrent) {
      this.active++;
      this.totalAccepted++;
      return true;
    }
    return false;
  }

  /**
   * Wait for a slot to become available
   */
  private waitForSlot(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check queue capacity
      if (this.queue.length >= this.config.maxQueueSize) {
        this.totalRejected++;
        logger.warn('Bulkhead queue full, rejecting request', {
          bulkhead: this.name,
          queueSize: this.queue.length,
          maxQueueSize: this.config.maxQueueSize,
        });
        reject(new BulkheadRejectError(this.name, 'Queue full'));
        return;
      }

      // Create timeout
      const timeout = setTimeout(() => {
        // Remove from queue
        const index = this.queue.findIndex(item => item.timeout === timeout);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }

        this.totalRejected++;
        logger.warn('Bulkhead queue timeout', {
          bulkhead: this.name,
          queueTimeout: this.config.queueTimeout,
        });
        reject(new BulkheadRejectError(this.name, 'Queue timeout'));
      }, this.config.queueTimeout);

      const item: QueuedItem = {
        resolve: () => {
          clearTimeout(timeout);
          this.active++;
          this.totalAccepted++;
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
        enqueuedAt: Date.now(),
      };

      this.queue.push(item);

      logger.debug('Request queued in bulkhead', {
        bulkhead: this.name,
        queuePosition: this.queue.length,
      });
    });
  }

  /**
   * Handle successful execution
   */
  private onSuccess(executionTime: number): void {
    this.release();
    this.totalCompleted++;

    // Track execution time for metrics
    this.executionTimes.push(executionTime);
    if (this.executionTimes.length > this.maxExecutionSamples) {
      this.executionTimes.shift();
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.release();
    this.totalFailed++;
  }

  /**
   * Release an execution slot
   */
  private release(): void {
    this.active--;

    // Process next queued item if any
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next.resolve();
    }
  }

  /**
   * Get current statistics
   */
  getStats(): BulkheadStats {
    const avgExecutionTime =
      this.executionTimes.length > 0
        ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
        : 0;

    return {
      active: this.active,
      queued: this.queue.length,
      totalAccepted: this.totalAccepted,
      totalRejected: this.totalRejected,
      totalCompleted: this.totalCompleted,
      totalFailed: this.totalFailed,
      avgExecutionTime: Math.round(avgExecutionTime),
    };
  }

  /**
   * Check if bulkhead has capacity
   */
  hasCapacity(): boolean {
    return (
      this.active < this.config.maxConcurrent ||
      this.queue.length < this.config.maxQueueSize
    );
  }

  /**
   * Get current load percentage
   */
  getLoadPercentage(): number {
    const activeLoad = (this.active / this.config.maxConcurrent) * 100;
    const queueLoad = (this.queue.length / this.config.maxQueueSize) * 100;
    return Math.max(activeLoad, queueLoad);
  }

  /**
   * Drain the queue (reject all waiting requests)
   */
  drain(): number {
    const drained = this.queue.length;
    for (const item of this.queue) {
      item.reject(new BulkheadRejectError(this.name, 'Bulkhead drained'));
    }
    this.queue = [];
    return drained;
  }
}

/**
 * Error thrown when bulkhead rejects a request
 */
export class BulkheadRejectError extends Error {
  constructor(
    public readonly bulkheadName: string,
    public readonly reason: string
  ) {
    super(`Bulkhead '${bulkheadName}' rejected request: ${reason}`);
    this.name = 'BulkheadRejectError';
  }
}

/**
 * Bulkhead Registry
 * Manages bulkheads for all tool categories
 */
export class BulkheadRegistry {
  private bulkheads: Map<string, Bulkhead> = new Map();

  /**
   * Get or create a bulkhead for a category
   */
  getBulkhead(
    category: ToolCategory | string,
    config?: Partial<BulkheadConfig>
  ): Bulkhead {
    if (!this.bulkheads.has(category)) {
      const categoryConfig = CATEGORY_CONFIGS[category as ToolCategory] || {};
      const mergedConfig = { ...DEFAULT_CONFIG, ...categoryConfig, ...config };
      this.bulkheads.set(category, new Bulkhead(category, mergedConfig));
    }
    return this.bulkheads.get(category)!;
  }

  /**
   * Execute within appropriate bulkhead
   */
  async executeInCategory<T>(
    category: ToolCategory | string,
    fn: () => Promise<T>
  ): Promise<T> {
    const bulkhead = this.getBulkhead(category);
    return bulkhead.execute(fn);
  }

  /**
   * Get all bulkhead statistics
   */
  getAllStats(): Record<string, BulkheadStats> {
    const stats: Record<string, BulkheadStats> = {};
    for (const [name, bulkhead] of this.bulkheads) {
      stats[name] = bulkhead.getStats();
    }
    return stats;
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    categories: Record<string, { healthy: boolean; load: number; stats: BulkheadStats }>;
    overloaded: string[];
    healthy: string[];
  } {
    const categories: Record<string, { healthy: boolean; load: number; stats: BulkheadStats }> = {};
    const overloaded: string[] = [];
    const healthy: string[] = [];

    for (const [name, bulkhead] of this.bulkheads) {
      const load = bulkhead.getLoadPercentage();
      const stats = bulkhead.getStats();
      const isHealthy = load < 80; // 80% threshold

      categories[name] = {
        healthy: isHealthy,
        load,
        stats,
      };

      if (isHealthy) {
        healthy.push(name);
      } else {
        overloaded.push(name);
      }
    }

    return {
      categories,
      overloaded,
      healthy,
    };
  }

  /**
   * Drain all bulkheads
   */
  drainAll(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [name, bulkhead] of this.bulkheads) {
      result[name] = bulkhead.drain();
    }
    return result;
  }
}

// Export singleton registry
export const bulkheadRegistry = new BulkheadRegistry();
