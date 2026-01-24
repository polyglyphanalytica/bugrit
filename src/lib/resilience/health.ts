/**
 * Tool Health Aggregation and Monitoring
 *
 * Dynamically tracks health of all tools (currently 115),
 * aggregates metrics, and provides alerting capabilities.
 */

import { circuitRegistry, CircuitStats, CircuitState } from './circuit-breaker';
import { bulkheadRegistry, BulkheadStats } from './bulkhead';
import { jobQueue } from './job-queue';
import { logger } from '@/lib/logger';

export interface ToolHealth {
  name: string;
  category: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  circuit: CircuitStats | null;
  lastCheck: Date | null;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  successRate: number;
  avgLatency: number;
  recentErrors: string[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  uptime: number;

  tools: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };

  circuits: {
    total: number;
    closed: number;
    open: number;
    halfOpen: number;
  };

  bulkheads: {
    categories: number;
    overloaded: string[];
    healthy: string[];
  };

  queue: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    dlqSize: number;
  };

  alerts: Alert[];
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  message: string;
  timestamp: Date;
  toolName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tool execution metrics tracker
 */
class ToolMetrics {
  private executions: Array<{
    success: boolean;
    duration: number;
    timestamp: number;
    error?: string;
  }> = [];

  private readonly maxSamples = 100;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  constructor(
    public readonly name: string,
    public readonly category: string
  ) {}

  record(success: boolean, duration: number, error?: string): void {
    const now = Date.now();

    // Clean old samples
    this.executions = this.executions.filter(
      e => now - e.timestamp < this.windowMs
    );

    // Add new sample
    this.executions.push({
      success,
      duration,
      timestamp: now,
      error,
    });

    // Trim to max samples
    if (this.executions.length > this.maxSamples) {
      this.executions = this.executions.slice(-this.maxSamples);
    }
  }

  getSuccessRate(): number {
    if (this.executions.length === 0) return 1;
    const successes = this.executions.filter(e => e.success).length;
    return successes / this.executions.length;
  }

  getAvgLatency(): number {
    if (this.executions.length === 0) return 0;
    const total = this.executions.reduce((sum, e) => sum + e.duration, 0);
    return Math.round(total / this.executions.length);
  }

  getLastSuccess(): Date | null {
    const last = [...this.executions].reverse().find(e => e.success);
    return last ? new Date(last.timestamp) : null;
  }

  getLastFailure(): Date | null {
    const last = [...this.executions].reverse().find(e => !e.success);
    return last ? new Date(last.timestamp) : null;
  }

  getRecentErrors(limit: number = 5): string[] {
    return this.executions
      .filter(e => !e.success && e.error)
      .slice(-limit)
      .map(e => e.error!);
  }

  getStatus(): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    if (this.executions.length === 0) return 'unknown';

    const successRate = this.getSuccessRate();
    if (successRate >= 0.95) return 'healthy';
    if (successRate >= 0.7) return 'degraded';
    return 'unhealthy';
  }
}

/**
 * Health Monitor Service
 */
export class HealthMonitor {
  private toolMetrics: Map<string, ToolMetrics> = new Map();
  private alerts: Alert[] = [];
  private alertHandlers: Array<(alert: Alert) => void> = [];
  private startTime: Date = new Date();

  /**
   * Record tool execution result
   */
  recordExecution(
    toolName: string,
    category: string,
    success: boolean,
    duration: number,
    error?: string
  ): void {
    const key = toolName.toLowerCase();

    if (!this.toolMetrics.has(key)) {
      this.toolMetrics.set(key, new ToolMetrics(toolName, category));
    }

    const metrics = this.toolMetrics.get(key)!;
    metrics.record(success, duration, error);

    // Check for alert conditions
    if (!success) {
      const successRate = metrics.getSuccessRate();

      if (successRate < 0.5) {
        this.raiseAlert({
          level: 'error',
          category: 'tool-health',
          message: `Tool ${toolName} success rate dropped below 50%`,
          toolName,
          metadata: { successRate, lastError: error },
        });
      } else if (successRate < 0.8) {
        this.raiseAlert({
          level: 'warning',
          category: 'tool-health',
          message: `Tool ${toolName} success rate dropped below 80%`,
          toolName,
          metadata: { successRate, lastError: error },
        });
      }
    }
  }

  /**
   * Get health status for a specific tool
   */
  getToolHealth(toolName: string): ToolHealth | null {
    const key = toolName.toLowerCase();
    const metrics = this.toolMetrics.get(key);

    if (!metrics) {
      return null;
    }

    const circuit = circuitRegistry.getCircuit(toolName);

    return {
      name: toolName,
      category: metrics.category,
      status: this.determineToolStatus(metrics, circuit.getState()),
      circuit: circuit.getStats(),
      lastCheck: new Date(),
      lastSuccess: metrics.getLastSuccess(),
      lastFailure: metrics.getLastFailure(),
      successRate: metrics.getSuccessRate(),
      avgLatency: metrics.getAvgLatency(),
      recentErrors: metrics.getRecentErrors(),
    };
  }

  /**
   * Determine tool status combining metrics and circuit state
   */
  private determineToolStatus(
    metrics: ToolMetrics,
    circuitState: CircuitState
  ): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    // Circuit open = unhealthy
    if (circuitState === 'OPEN') return 'unhealthy';

    // Circuit half-open = degraded
    if (circuitState === 'HALF_OPEN') return 'degraded';

    // Use metrics-based status
    return metrics.getStatus();
  }

  /**
   * Get health status for all tools
   */
  getAllToolHealth(): Record<string, ToolHealth> {
    const health: Record<string, ToolHealth> = {};

    for (const [key, metrics] of this.toolMetrics) {
      const circuit = circuitRegistry.getCircuit(metrics.name);

      health[key] = {
        name: metrics.name,
        category: metrics.category,
        status: this.determineToolStatus(metrics, circuit.getState()),
        circuit: circuit.getStats(),
        lastCheck: new Date(),
        lastSuccess: metrics.getLastSuccess(),
        lastFailure: metrics.getLastFailure(),
        successRate: metrics.getSuccessRate(),
        avgLatency: metrics.getAvgLatency(),
        recentErrors: metrics.getRecentErrors(),
      };
    }

    return health;
  }

  /**
   * Get comprehensive system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const toolHealth = this.getAllToolHealth();
    const toolStatuses = Object.values(toolHealth);

    const circuitHealth = circuitRegistry.getHealthSummary();
    const bulkheadHealth = bulkheadRegistry.getHealthSummary();
    const queueStats = await jobQueue.getStats();

    // Count tool statuses
    const toolCounts = {
      total: toolStatuses.length,
      healthy: toolStatuses.filter(t => t.status === 'healthy').length,
      degraded: toolStatuses.filter(t => t.status === 'degraded').length,
      unhealthy: toolStatuses.filter(t => t.status === 'unhealthy').length,
      unknown: toolStatuses.filter(t => t.status === 'unknown').length,
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    if (circuitHealth.unhealthy > 5 || toolCounts.unhealthy > 10 || queueStats.dlqSize > 100) {
      status = 'critical';
    } else if (
      circuitHealth.unhealthy > 0 ||
      circuitHealth.recovering > 3 ||
      toolCounts.unhealthy > 0 ||
      toolCounts.degraded > 5 ||
      bulkheadHealth.overloaded.length > 0 ||
      queueStats.dlqSize > 10
    ) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),

      tools: toolCounts,

      circuits: {
        total: circuitHealth.total,
        closed: circuitHealth.healthy,
        open: circuitHealth.unhealthy,
        halfOpen: circuitHealth.recovering,
      },

      bulkheads: {
        categories: Object.keys(bulkheadHealth.categories).length,
        overloaded: bulkheadHealth.overloaded,
        healthy: bulkheadHealth.healthy,
      },

      queue: {
        pending: queueStats.pending,
        running: queueStats.running,
        completed: queueStats.completed,
        failed: queueStats.failed,
        dlqSize: queueStats.dlqSize,
      },

      alerts: this.getRecentAlerts(20),
    };
  }

  /**
   * Raise an alert
   */
  raiseAlert(params: Omit<Alert, 'id' | 'timestamp'>): void {
    // Generate cryptographically secure random ID
    const randomBytes = new Uint8Array(4);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      const nodeCrypto = require('crypto');
      const nodeRandom = nodeCrypto.randomBytes(4);
      randomBytes.set(nodeRandom);
    }
    const random = Array.from(randomBytes)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 5);

    const alert: Alert = {
      ...params,
      id: `alert-${Date.now()}-${random}`,
      timestamp: new Date(),
    };

    this.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Log the alert
    const logMethod = alert.level === 'critical' || alert.level === 'error' ? 'error' :
                      alert.level === 'warning' ? 'warn' : 'info';
    logger[logMethod](`Alert: ${alert.message}`, {
      alertId: alert.id,
      level: alert.level,
      category: alert.category,
      toolName: alert.toolName,
      ...alert.metadata,
    });

    // Notify handlers
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        logger.error('Alert handler failed', { error });
      }
    }
  }

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: Alert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50, level?: Alert['level']): Alert[] {
    let alerts = [...this.alerts].reverse();

    if (level) {
      alerts = alerts.filter(a => a.level === level);
    }

    return alerts.slice(0, limit);
  }

  /**
   * Get alerts for a specific tool
   */
  getToolAlerts(toolName: string, limit: number = 20): Alert[] {
    return this.alerts
      .filter(a => a.toolName?.toLowerCase() === toolName.toLowerCase())
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    const initialLength = this.alerts.length;
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > cutoff);
    return initialLength - this.alerts.length;
  }

  /**
   * Perform health check for all known tools
   */
  async runHealthCheck(): Promise<{
    healthy: string[];
    degraded: string[];
    unhealthy: string[];
    unknown: string[];
  }> {
    const health = this.getAllToolHealth();
    const result = {
      healthy: [] as string[],
      degraded: [] as string[],
      unhealthy: [] as string[],
      unknown: [] as string[],
    };

    for (const [, tool] of Object.entries(health)) {
      result[tool.status].push(tool.name);
    }

    // Raise alerts for critical issues
    if (result.unhealthy.length > 5) {
      this.raiseAlert({
        level: 'critical',
        category: 'system-health',
        message: `${result.unhealthy.length} tools are unhealthy`,
        metadata: { unhealthyTools: result.unhealthy },
      });
    } else if (result.unhealthy.length > 0) {
      this.raiseAlert({
        level: 'warning',
        category: 'system-health',
        message: `${result.unhealthy.length} tools are unhealthy`,
        metadata: { unhealthyTools: result.unhealthy },
      });
    }

    return result;
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor();
