/**
 * Resilience Module
 *
 * Production-grade resilience patterns for tool orchestration:
 * - Circuit Breaker: Prevents cascading failures
 * - Retry with Backoff: Handles transient failures
 * - Bulkhead: Isolates tool categories
 * - Job Queue: Persistent job processing
 * - Health Monitoring: Tracks system health
 */

// Circuit Breaker
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitRegistry,
  CircuitOpenError,
  type CircuitState,
  type CircuitStats,
  type CircuitBreakerConfig,
} from './circuit-breaker';

// Retry
export {
  withRetry,
  makeRetryable,
  Retry,
  RetryPolicies,
  ToolRetryConfigs,
  getRetryConfigForTool,
  type RetryConfig,
  type RetryResult,
} from './retry';

// Bulkhead
export {
  Bulkhead,
  BulkheadRegistry,
  bulkheadRegistry,
  BulkheadRejectError,
  CATEGORY_CONFIGS,
  type BulkheadConfig,
  type BulkheadStats,
} from './bulkhead';

// Job Queue
export {
  JobQueue,
  jobQueue,
  type ScanJob,
  type DeadLetterJob,
  type JobStatus,
  type JobPriority,
} from './job-queue';

// Health Monitoring
export {
  HealthMonitor,
  healthMonitor,
  type ToolHealth,
  type SystemHealth,
  type Alert,
} from './health';

// Re-export resilient orchestrator
export { ResilientOrchestrator, resilientOrchestrator } from './resilient-orchestrator';

// Session-based reports (real-time polling)
export {
  SessionReportStore,
  sessionReportStore,
  type SessionConfig,
  type ToolReport,
  type AggregatedReport,
  type RefundInfo,
} from './session-reports';

// Streaming orchestrator (writes reports immediately)
export {
  StreamingOrchestrator,
  streamingOrchestrator,
  type StreamingOrchestratorConfig,
  type StreamingAuditHandle,
} from './streaming-orchestrator';
