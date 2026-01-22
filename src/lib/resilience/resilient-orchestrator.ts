/**
 * Resilient Audit Orchestrator
 *
 * Wraps the standard orchestrator with production-grade resilience:
 * - Circuit breakers per tool
 * - Retry with exponential backoff
 * - Bulkhead isolation per category
 * - Health tracking and alerting
 * - Graceful degradation
 */

import { ToolIntegration, AuditTarget, AuditResult, ToolCategory } from '@/lib/integrations/types';
import {
  AuditOrchestrator,
  OrchestratorConfig,
  AuditReport,
} from '@/lib/integrations/orchestrator';
import { circuitRegistry, CircuitOpenError } from './circuit-breaker';
import { withRetry, getRetryConfigForTool } from './retry';
import { bulkheadRegistry } from './bulkhead';
import { healthMonitor } from './health';
import { logger } from '@/lib/logger';

export interface ResilientOrchestratorConfig extends OrchestratorConfig {
  /** Skip tools with open circuits */
  skipOpenCircuits?: boolean;
  /** Enable retry on failure */
  enableRetry?: boolean;
  /** Enable bulkhead isolation */
  enableBulkhead?: boolean;
  /** Fail fast if too many tools fail */
  failFastThreshold?: number;
  /** Continue on partial failure */
  continueOnPartialFailure?: boolean;
}

export interface ResilientAuditReport extends AuditReport {
  resilience: {
    retriedTools: string[];
    skippedCircuits: string[];
    bulkheadOverloads: string[];
    totalRetries: number;
    gracefulDegradation: boolean;
  };
}

/**
 * Resilient wrapper around the standard orchestrator
 */
export class ResilientOrchestrator {
  private baseOrchestrator: AuditOrchestrator;

  constructor() {
    this.baseOrchestrator = new AuditOrchestrator();
  }

  /**
   * Get all available integrations
   */
  getAllIntegrations(): ToolIntegration[] {
    return this.baseOrchestrator.getAllIntegrations();
  }

  /**
   * Run audit with full resilience patterns
   */
  async runAudit(
    target: AuditTarget,
    config: ResilientOrchestratorConfig = {}
  ): Promise<ResilientAuditReport> {
    const startTime = Date.now();
    const reportId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const resilience = {
      retriedTools: [] as string[],
      skippedCircuits: [] as string[],
      bulkheadOverloads: [] as string[],
      totalRetries: 0,
      gracefulDegradation: false,
    };

    // Get tools to run
    const allTools = this.selectTools(config);
    const toolsToRun: ToolIntegration[] = [];
    const skippedTools: string[] = [];
    const failedTools: string[] = [];

    // Filter by circuit breaker state
    for (const tool of allTools) {
      const circuit = circuitRegistry.getCircuit(tool.name);

      if (!circuit.isAvailable()) {
        if (config.skipOpenCircuits !== false) {
          skippedTools.push(tool.name);
          resilience.skippedCircuits.push(tool.name);
          logger.info('Skipping tool with open circuit', { tool: tool.name });
          continue;
        }
      }

      toolsToRun.push(tool);
    }

    // Check availability
    const availability = await this.checkAvailability(toolsToRun);
    const availableTools = toolsToRun.filter(t => availability.get(t.name));
    const unavailableTools = toolsToRun.filter(t => !availability.get(t.name)).map(t => t.name);
    skippedTools.push(...unavailableTools);

    if (config.dryRun) {
      return this.createEmptyReport(reportId, startTime, target, config, skippedTools, resilience);
    }

    // Run tools with resilience patterns
    const results: AuditResult[] = [];
    let consecutiveFailures = 0;
    const failFastThreshold = config.failFastThreshold || 10;

    // Group tools by category for bulkhead execution
    const toolsByCategory = this.groupByCategory(availableTools);

    for (const [category, categoryTools] of Object.entries(toolsByCategory)) {
      // Check fail-fast threshold
      if (consecutiveFailures >= failFastThreshold && !config.continueOnPartialFailure) {
        logger.error('Fail-fast threshold reached, aborting remaining tools', {
          consecutiveFailures,
          threshold: failFastThreshold,
          remainingTools: categoryTools.map(t => t.name),
        });
        resilience.gracefulDegradation = true;
        categoryTools.forEach(t => failedTools.push(t.name));
        break;
      }

      // Run category tools
      const categoryResults = await this.runCategoryTools(
        category as ToolCategory,
        categoryTools,
        target,
        config,
        resilience
      );

      for (const { tool, result, retried } of categoryResults) {
        if (result.success) {
          consecutiveFailures = 0;
          results.push(result);
        } else {
          consecutiveFailures++;
          failedTools.push(tool.name);
          results.push(result);
        }

        if (retried) {
          resilience.retriedTools.push(tool.name);
        }
      }
    }

    // Generate summary
    const summary = this.generateSummary(results, skippedTools, failedTools);

    // Generate intelligence report if enabled
    let intelligence;
    if (config.enableIntelligence !== false && results.length > 0) {
      const { FindingIntelligence } = await import('@/lib/integrations/ai');
      const intelligenceEngine = new FindingIntelligence(results);
      intelligence = intelligenceEngine.generateReport();
    }

    const report: ResilientAuditReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      target,
      config,
      results,
      intelligence,
      summary,
      resilience,
    };

    // Record health metrics
    this.recordHealthMetrics(results);

    logger.info('Resilient audit completed', {
      reportId,
      duration: report.duration,
      toolsRun: summary.toolsRun.length,
      toolsFailed: summary.toolsFailed.length,
      toolsSkipped: summary.toolsSkipped.length,
      totalFindings: summary.totalFindings,
      retriedTools: resilience.retriedTools.length,
      skippedCircuits: resilience.skippedCircuits.length,
      gracefulDegradation: resilience.gracefulDegradation,
    });

    return report;
  }

  /**
   * Run tools for a single category with bulkhead
   */
  private async runCategoryTools(
    category: ToolCategory,
    tools: ToolIntegration[],
    target: AuditTarget,
    config: ResilientOrchestratorConfig,
    resilience: ResilientAuditReport['resilience']
  ): Promise<Array<{ tool: ToolIntegration; result: AuditResult; retried: boolean }>> {
    const results: Array<{ tool: ToolIntegration; result: AuditResult; retried: boolean }> = [];
    const bulkhead = bulkheadRegistry.getBulkhead(category);
    const maxConcurrent = config.maxConcurrent || 5;

    // Chunk tools for parallel execution
    const chunks = this.chunkArray(tools, maxConcurrent);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (tool) => {
        let retried = false;

        try {
          // Execute within bulkhead
          const result = await bulkhead.execute(async () => {
            return this.runSingleTool(tool, target, config, resilience);
          });

          retried = resilience.retriedTools.includes(tool.name);
          return { tool, result: result.result, retried };
        } catch (error) {
          if (error instanceof Error && error.message.includes('Bulkhead')) {
            resilience.bulkheadOverloads.push(tool.name);
            logger.warn('Tool rejected by bulkhead', {
              tool: tool.name,
              category,
              error: error.message,
            });
          }

          return {
            tool,
            result: this.createFailureResult(tool, error),
            retried,
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Run a single tool with circuit breaker and retry
   */
  private async runSingleTool(
    tool: ToolIntegration,
    target: AuditTarget,
    config: ResilientOrchestratorConfig,
    resilience: ResilientAuditReport['resilience']
  ): Promise<{ result: AuditResult; retried: boolean }> {
    const circuit = circuitRegistry.getCircuit(tool.name);
    const toolConfig = config.toolConfigs?.[tool.name];
    const timeout = config.timeout || 300000;
    let retried = false;

    const executeWithTimeout = async (): Promise<AuditResult> => {
      return Promise.race([
        tool.run(target, toolConfig),
        new Promise<AuditResult>((_, reject) =>
          setTimeout(() => reject(new Error('Tool timeout')), timeout)
        ),
      ]);
    };

    try {
      // Execute through circuit breaker
      const result = await circuit.execute(async () => {
        // Apply retry if enabled
        if (config.enableRetry !== false) {
          const retryConfig = getRetryConfigForTool(tool.name);
          const retryResult = await withRetry(
            executeWithTimeout,
            retryConfig,
            { toolName: tool.name }
          );

          if (retryResult.attempts > 1) {
            retried = true;
            resilience.totalRetries += retryResult.attempts - 1;
          }

          if (!retryResult.success) {
            throw retryResult.error;
          }

          return retryResult.result!;
        }

        return executeWithTimeout();
      });

      return { result, retried };
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        logger.warn('Tool skipped due to open circuit', {
          tool: tool.name,
          circuitStats: error.stats,
        });
      }

      return {
        result: this.createFailureResult(tool, error),
        retried,
      };
    }
  }

  /**
   * Create failure result for a tool
   */
  private createFailureResult(tool: ToolIntegration, error: unknown): AuditResult {
    return {
      tool: tool.name,
      category: tool.category,
      success: false,
      duration: 0,
      findings: [],
      summary: {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        passed: 0,
        failed: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  /**
   * Record health metrics for all executed tools
   */
  private recordHealthMetrics(results: AuditResult[]): void {
    for (const result of results) {
      healthMonitor.recordExecution(
        result.tool,
        result.category,
        result.success,
        result.duration,
        result.error
      );
    }
  }

  /**
   * Check availability of tools
   */
  private async checkAvailability(tools: ToolIntegration[]): Promise<Map<string, boolean>> {
    const availability = new Map<string, boolean>();

    await Promise.all(
      tools.map(async (tool) => {
        try {
          const isAvailable = await tool.isAvailable();
          availability.set(tool.name, isAvailable);
        } catch {
          availability.set(tool.name, false);
        }
      })
    );

    return availability;
  }

  /**
   * Select tools based on config
   */
  private selectTools(config: ResilientOrchestratorConfig): ToolIntegration[] {
    let tools = this.getAllIntegrations();

    if (config.tools && config.tools.length > 0) {
      const toolNames = config.tools.map(t => t.toLowerCase());
      tools = tools.filter(t => toolNames.includes(t.name.toLowerCase()));
    } else if (config.categories && config.categories.length > 0) {
      tools = tools.filter(t => config.categories!.includes(t.category));
    }

    if (config.excludeTools && config.excludeTools.length > 0) {
      const excludeNames = config.excludeTools.map(t => t.toLowerCase());
      tools = tools.filter(t => !excludeNames.includes(t.name.toLowerCase()));
    }

    return tools;
  }

  /**
   * Group tools by category
   */
  private groupByCategory(tools: ToolIntegration[]): Record<string, ToolIntegration[]> {
    const groups: Record<string, ToolIntegration[]> = {};

    for (const tool of tools) {
      if (!groups[tool.category]) {
        groups[tool.category] = [];
      }
      groups[tool.category].push(tool);
    }

    return groups;
  }

  /**
   * Generate summary from results
   */
  private generateSummary(
    results: AuditResult[],
    skippedTools: string[],
    failedTools: string[]
  ): AuditReport['summary'] {
    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const byCategory: Record<string, number> = {};
    let totalFindings = 0;

    for (const result of results) {
      if (result.success) {
        totalFindings += result.findings.length;

        for (const finding of result.findings) {
          bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
          byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
        }
      }
    }

    return {
      totalFindings,
      bySeverity,
      byCategory,
      toolsRun: results.filter(r => r.success).map(r => r.tool),
      toolsSkipped: skippedTools,
      toolsFailed: failedTools,
    };
  }

  /**
   * Create empty report for dry run
   */
  private createEmptyReport(
    reportId: string,
    startTime: number,
    target: AuditTarget,
    config: ResilientOrchestratorConfig,
    skippedTools: string[],
    resilience: ResilientAuditReport['resilience']
  ): ResilientAuditReport {
    return {
      id: reportId,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      target,
      config,
      results: [],
      summary: {
        totalFindings: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        byCategory: {},
        toolsRun: [],
        toolsSkipped: skippedTools,
        toolsFailed: [],
      },
      resilience,
    };
  }

  /**
   * Chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get system health status
   */
  async getHealth() {
    return healthMonitor.getSystemHealth();
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuits(): void {
    circuitRegistry.resetAll();
  }

  /**
   * Reset specific circuit breaker
   */
  resetCircuit(toolName: string): boolean {
    return circuitRegistry.resetCircuit(toolName);
  }
}

// Export singleton instance
export const resilientOrchestrator = new ResilientOrchestrator();
