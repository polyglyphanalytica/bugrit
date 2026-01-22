/**
 * Streaming Audit Orchestrator
 *
 * Unlike the standard orchestrator that waits for all tools to complete,
 * this orchestrator writes each tool's report to Firestore immediately
 * upon completion. The frontend polls for updates.
 *
 * Key differences:
 * - No in-memory waiting for all results
 * - Each tool report stored immediately in Firestore
 * - Session-based tracking under user/session
 * - Real-time progress via polling
 */

import { ToolIntegration, AuditTarget, AuditResult, ToolCategory } from '@/lib/integrations/types';
import { AuditOrchestrator, OrchestratorConfig } from '@/lib/integrations/orchestrator';
import { FindingIntelligence } from '@/lib/integrations/ai';
import { circuitRegistry } from './circuit-breaker';
import { withRetry, getRetryConfigForTool } from './retry';
import { bulkheadRegistry } from './bulkhead';
import { healthMonitor } from './health';
import { sessionReportStore, SessionConfig, AggregatedReport, ToolReport } from './session-reports';
import { refundCreditsForFailedTools, ToolRefundInfo } from '@/lib/billing/scan-billing';
import { logger } from '@/lib/logger';

export interface StreamingOrchestratorConfig extends OrchestratorConfig {
  /** User ID for session tracking */
  userId: string;
  /** Organization ID for session tracking */
  organizationId?: string;
  /** Scan ID to link to */
  scanId?: string;
  /** Session expiration in hours (default 24) */
  sessionExpirationHours?: number;
  /** Skip tools with open circuits */
  skipOpenCircuits?: boolean;
  /** Enable retry on failure */
  enableRetry?: boolean;
  /** Enable bulkhead isolation */
  enableBulkhead?: boolean;
  /** Generate AI intelligence when complete */
  generateIntelligence?: boolean;
  /** Enable automatic credit refund for failed tools */
  enableCreditRefund?: boolean;
  /** Estimated lines of code (for refund calculation) */
  estimatedLinesOfCode?: number;
}

export interface StreamingAuditHandle {
  sessionId: string;
  /** Poll for current report state */
  poll: () => Promise<AggregatedReport | null>;
  /** Poll for progress only (lightweight) */
  pollProgress: () => Promise<{ status: string; progress: AggregatedReport['progress']; lastUpdated: Date } | null>;
  /** Get reports added since a timestamp */
  getNewReports: (since: Date) => Promise<ToolReport[]>;
  /** Wait for completion (not recommended - use polling) */
  waitForCompletion: (pollIntervalMs?: number, timeoutMs?: number) => Promise<AggregatedReport>;
}

/**
 * Streaming Orchestrator
 * Writes tool reports to Firestore as they complete for real-time polling
 */
export class StreamingOrchestrator {
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
   * Start a streaming audit
   * Returns immediately with a handle for polling
   */
  async startAudit(
    target: AuditTarget,
    config: StreamingOrchestratorConfig
  ): Promise<StreamingAuditHandle> {
    // Get tools to run
    const allTools = this.selectTools(config);

    // Filter by circuit breaker state
    const toolsToRun: ToolIntegration[] = [];
    const skippedTools: Array<{ name: string; reason: string }> = [];

    for (const tool of allTools) {
      const circuit = circuitRegistry.getCircuit(tool.name);

      if (!circuit.isAvailable()) {
        if (config.skipOpenCircuits !== false) {
          skippedTools.push({ name: tool.name, reason: 'Circuit breaker open' });
          continue;
        }
      }

      toolsToRun.push(tool);
    }

    // Create session
    const sessionConfig: SessionConfig = {
      userId: config.userId,
      organizationId: config.organizationId,
      scanId: config.scanId,
      target,
      toolsRequested: toolsToRun.map(t => t.name),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (config.sessionExpirationHours || 24) * 60 * 60 * 1000),
    };

    const sessionId = await sessionReportStore.createSession(sessionConfig);

    // Mark skipped tools
    for (const { name, reason } of skippedTools) {
      await sessionReportStore.markToolSkipped(sessionId, name, reason);
    }

    // Check availability and skip unavailable tools
    const availability = await this.checkAvailability(toolsToRun);
    const availableTools = toolsToRun.filter(t => availability.get(t.name));
    const unavailableTools = toolsToRun.filter(t => !availability.get(t.name));

    for (const tool of unavailableTools) {
      await sessionReportStore.markToolSkipped(sessionId, tool.name, 'Tool not available');
    }

    logger.info('Starting streaming audit', {
      sessionId,
      userId: config.userId,
      totalTools: allTools.length,
      availableTools: availableTools.length,
      skippedTools: skippedTools.length + unavailableTools.length,
    });

    // Start running tools in the background (fire and forget)
    this.runToolsInBackground(sessionId, availableTools, target, config);

    // Return handle for polling
    return {
      sessionId,
      poll: () => sessionReportStore.getAggregatedReport(sessionId),
      pollProgress: () => sessionReportStore.getProgress(sessionId),
      getNewReports: (since: Date) => sessionReportStore.getNewReports(sessionId, since),
      waitForCompletion: (pollIntervalMs = 2000, timeoutMs = 600000) =>
        this.waitForCompletion(sessionId, pollIntervalMs, timeoutMs),
    };
  }

  /**
   * Run tools in background, writing results to Firestore as they complete
   */
  private async runToolsInBackground(
    sessionId: string,
    tools: ToolIntegration[],
    target: AuditTarget,
    config: StreamingOrchestratorConfig
  ): Promise<void> {
    const maxConcurrent = config.maxConcurrent || 5;

    // Group tools by category for bulkhead execution
    const toolsByCategory = this.groupByCategory(tools);

    // Process each category
    for (const [category, categoryTools] of Object.entries(toolsByCategory)) {
      // Chunk for parallel execution within category
      const chunks = this.chunkArray(categoryTools, maxConcurrent);

      for (const chunk of chunks) {
        // Run chunk in parallel
        const promises = chunk.map(tool =>
          this.runSingleToolAndStore(sessionId, tool, target, config, category as ToolCategory)
        );

        await Promise.all(promises);
      }
    }

    // Generate intelligence report if enabled
    if (config.generateIntelligence !== false) {
      await this.generateAndStoreIntelligence(sessionId);
    }

    // Finalize session with credit refund for failures
    await this.finalizeSession(sessionId, config);

    logger.info('Streaming audit completed', { sessionId });
  }

  /**
   * Finalize session: mark complete and refund credits for failed tools
   */
  private async finalizeSession(
    sessionId: string,
    config: StreamingOrchestratorConfig
  ): Promise<void> {
    // Get final report state
    const report = await sessionReportStore.getAggregatedReport(sessionId);
    if (!report) return;

    // Collect failed/timed out/skipped tools for refund
    if (config.enableCreditRefund !== false) {
      const failedTools: ToolRefundInfo[] = [];

      for (const [, toolReport] of Object.entries(report.toolReports)) {
        if (toolReport.status === 'failed') {
          const isTimeout = toolReport.error?.toLowerCase().includes('timeout');
          failedTools.push({
            toolName: toolReport.toolName,
            category: toolReport.category,
            status: isTimeout ? 'timeout' : 'failed',
            reason: toolReport.error || 'Unknown error',
          });
        } else if (toolReport.status === 'skipped') {
          failedTools.push({
            toolName: toolReport.toolName,
            category: toolReport.category,
            status: 'skipped',
            reason: toolReport.error || 'Tool skipped',
          });
        }
      }

      // Process refund if there are failed tools
      if (failedTools.length > 0) {
        const refundResult = await refundCreditsForFailedTools(
          config.userId,
          sessionId,
          failedTools,
          config.estimatedLinesOfCode || 0
        );

        if (refundResult.success && refundResult.refundedCredits > 0) {
          logger.info('Credits refunded for session', {
            sessionId,
            userId: config.userId,
            refundedCredits: refundResult.refundedCredits,
            toolsRefunded: refundResult.toolsRefunded,
          });

          // Store refund info in session
          await sessionReportStore.storeRefundInfo(sessionId, {
            refundedCredits: refundResult.refundedCredits,
            toolsRefunded: refundResult.toolsRefunded,
            newBalance: refundResult.newBalance,
          });
        }
      }
    }

    // Mark session as completed
    await sessionReportStore.completeSession(sessionId);
  }

  /**
   * Run a single tool and store result immediately
   */
  private async runSingleToolAndStore(
    sessionId: string,
    tool: ToolIntegration,
    target: AuditTarget,
    config: StreamingOrchestratorConfig,
    category: ToolCategory
  ): Promise<void> {
    // Mark as started
    await sessionReportStore.markToolStarted(sessionId, tool.name, category);

    try {
      // Get bulkhead for category
      const bulkhead = config.enableBulkhead !== false
        ? bulkheadRegistry.getBulkhead(category)
        : null;

      // Execute within bulkhead (or directly)
      const executeWithBulkhead = async () => {
        if (bulkhead) {
          return bulkhead.execute(() => this.runToolWithResilience(tool, target, config));
        }
        return this.runToolWithResilience(tool, target, config);
      };

      const result = await executeWithBulkhead();

      // Store result immediately
      await sessionReportStore.storeToolReport(sessionId, tool.name, result);

      // Record health metrics
      healthMonitor.recordExecution(
        result.tool,
        result.category,
        result.success,
        result.duration,
        result.error
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Store failure
      await sessionReportStore.markToolFailed(sessionId, tool.name, errorMessage);

      // Record health metrics
      healthMonitor.recordExecution(tool.name, category, false, 0, errorMessage);

      logger.error('Tool execution failed', {
        sessionId,
        tool: tool.name,
        error: errorMessage,
      });
    }
  }

  /**
   * Run tool with circuit breaker and retry
   */
  private async runToolWithResilience(
    tool: ToolIntegration,
    target: AuditTarget,
    config: StreamingOrchestratorConfig
  ): Promise<AuditResult> {
    const circuit = circuitRegistry.getCircuit(tool.name);
    const toolConfig = config.toolConfigs?.[tool.name];
    const timeout = config.timeout || 300000;

    const executeWithTimeout = async (): Promise<AuditResult> => {
      return Promise.race([
        tool.run(target, toolConfig),
        new Promise<AuditResult>((_, reject) =>
          setTimeout(() => reject(new Error('Tool timeout')), timeout)
        ),
      ]);
    };

    // Execute through circuit breaker
    return circuit.execute(async () => {
      // Apply retry if enabled
      if (config.enableRetry !== false) {
        const retryConfig = getRetryConfigForTool(tool.name);
        const retryResult = await withRetry(
          executeWithTimeout,
          retryConfig,
          { toolName: tool.name }
        );

        if (!retryResult.success) {
          throw retryResult.error;
        }

        return retryResult.result!;
      }

      return executeWithTimeout();
    });
  }

  /**
   * Generate AI intelligence report from stored results
   */
  private async generateAndStoreIntelligence(sessionId: string): Promise<void> {
    const report = await sessionReportStore.getAggregatedReport(sessionId);
    if (!report) return;

    // Collect all successful results
    const results: AuditResult[] = [];
    for (const toolReport of Object.values(report.toolReports)) {
      if (toolReport.status === 'completed' && toolReport.result) {
        results.push(toolReport.result);
      }
    }

    if (results.length === 0) return;

    try {
      const intelligenceEngine = new FindingIntelligence(results);
      const intelligence = intelligenceEngine.generateReport();
      await sessionReportStore.storeIntelligence(sessionId, intelligence);
    } catch (error) {
      logger.error('Failed to generate intelligence report', { sessionId, error });
    }
  }

  /**
   * Wait for session completion (polling-based)
   */
  private async waitForCompletion(
    sessionId: string,
    pollIntervalMs: number,
    timeoutMs: number
  ): Promise<AggregatedReport> {
    const startTime = Date.now();

    while (true) {
      const report = await sessionReportStore.getAggregatedReport(sessionId);

      if (!report) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (report.status === 'completed' || report.status === 'partial' || report.status === 'failed') {
        return report;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for session ${sessionId} to complete`);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
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
  private selectTools(config: StreamingOrchestratorConfig): ToolIntegration[] {
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
   * Get existing session report
   */
  async getSessionReport(sessionId: string): Promise<AggregatedReport | null> {
    return sessionReportStore.getAggregatedReport(sessionId);
  }

  /**
   * Get user's recent sessions
   */
  async getUserSessions(userId: string, limit: number = 20) {
    return sessionReportStore.getUserSessions(userId, limit);
  }
}

// Export singleton instance
export const streamingOrchestrator = new StreamingOrchestrator();
