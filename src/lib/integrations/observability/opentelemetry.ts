// OpenTelemetry Integration (Self-hosted)
// License: Apache 2.0
// Website: https://opentelemetry.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface OTelSpan {
  traceId: string;
  spanId: string;
  operationName: string;
  serviceName: string;
  duration: number; // microseconds
  startTime: number;
  status: { code: number; message?: string };
  tags?: Record<string, string>;
  logs?: Array<{ timestamp: number; fields: Record<string, string> }>;
}

interface OTelMetric {
  name: string;
  description?: string;
  unit?: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  dataPoints: Array<{
    timestamp: number;
    value: number;
    labels?: Record<string, string>;
  }>;
}

interface OTelServiceHealth {
  serviceName: string;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  throughput: number;
  spanCount: number;
}

export class OpenTelemetryIntegration implements ToolIntegration {
  name = 'OpenTelemetry';
  category = 'observability' as const;
  description = 'Distributed tracing and metrics analysis for observability';
  website = 'https://opentelemetry.io';

  async isAvailable(): Promise<boolean> {
    // Check for common OpenTelemetry backends
    return !!(
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      process.env.JAEGER_URL ||
      process.env.TEMPO_URL
    );
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.JAEGER_URL,
        lookbackMinutes: 60,
        latencyThresholdMs: 1000,
        errorRateThreshold: 0.01,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    const endpoint = config?.options?.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    if (!endpoint) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'OpenTelemetry endpoint not configured',
      };
    }

    try {
      const lookbackMinutes = config?.options?.lookbackMinutes || 60;
      const latencyThreshold = config?.options?.latencyThresholdMs || 1000;
      const errorRateThreshold = config?.options?.errorRateThreshold || 0.01;

      // Query trace data (implementation depends on backend - Jaeger, Tempo, etc.)
      const serviceHealth = await this.queryServiceHealth(endpoint, lookbackMinutes);

      for (const service of serviceHealth) {
        findings.push(...this.analyzeService(service, latencyThreshold, errorRateThreshold));
      }

      // Check for error traces
      const errorTraces = await this.queryErrorTraces(endpoint, lookbackMinutes);
      findings.push(...this.analyzeErrorTraces(errorTraces));

      return this.createResult(findings, Date.now() - startTime, serviceHealth);
    } catch (error) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async queryServiceHealth(endpoint: string, lookbackMinutes: number): Promise<OTelServiceHealth[]> {
    // This would query the tracing backend (Jaeger, Tempo, etc.)
    // For now, return empty - actual implementation depends on backend API
    try {
      // Try Jaeger API format
      const response = await fetch(`${endpoint}/api/services`);
      if (!response.ok) return [];

      const data = await response.json() as { data: string[] };
      const services: OTelServiceHealth[] = [];

      for (const serviceName of data.data || []) {
        // Query traces for this service
        const tracesResponse = await fetch(
          `${endpoint}/api/traces?service=${serviceName}&lookback=${lookbackMinutes}m&limit=1000`
        );

        if (tracesResponse.ok) {
          const traces = await tracesResponse.json() as { data: Array<{ spans: OTelSpan[] }> };
          const health = this.calculateServiceHealth(serviceName, traces.data);
          services.push(health);
        }
      }

      return services;
    } catch {
      return [];
    }
  }

  private calculateServiceHealth(serviceName: string, traces: Array<{ spans: OTelSpan[] }>): OTelServiceHealth {
    const durations: number[] = [];
    let errorCount = 0;

    for (const trace of traces) {
      for (const span of trace.spans) {
        const durationMs = span.duration / 1000;
        durations.push(durationMs);
        if (span.status?.code === 2) { // ERROR status
          errorCount++;
        }
      }
    }

    durations.sort((a, b) => a - b);

    return {
      serviceName,
      avgLatency: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      p95Latency: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
      p99Latency: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
      errorRate: durations.length > 0 ? errorCount / durations.length : 0,
      throughput: durations.length / 60, // per minute
      spanCount: durations.length,
    };
  }

  private async queryErrorTraces(endpoint: string, lookbackMinutes: number): Promise<OTelSpan[]> {
    try {
      const response = await fetch(
        `${endpoint}/api/traces?tags=error:true&lookback=${lookbackMinutes}m&limit=100`
      );

      if (!response.ok) return [];

      const data = await response.json() as { data: Array<{ spans: OTelSpan[] }> };
      const errors: OTelSpan[] = [];

      for (const trace of data.data || []) {
        for (const span of trace.spans) {
          if (span.status?.code === 2) {
            errors.push(span);
          }
        }
      }

      return errors;
    } catch {
      return [];
    }
  }

  private analyzeService(
    service: OTelServiceHealth,
    latencyThreshold: number,
    errorRateThreshold: number
  ): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // High latency
    if (service.p95Latency > latencyThreshold) {
      findings.push({
        id: `otel-latency-${service.serviceName}`,
        tool: this.name,
        category: this.category,
        severity: service.p95Latency > latencyThreshold * 2 ? 'high' : 'medium',
        title: `OpenTelemetry: High Latency - ${service.serviceName}`,
        description: `P95 latency is ${service.p95Latency.toFixed(0)}ms (threshold: ${latencyThreshold}ms)`,
        explanation: `Service "${service.serviceName}" is experiencing high latency. P99: ${service.p99Latency.toFixed(0)}ms, avg: ${service.avgLatency.toFixed(0)}ms.`,
        impact: 'High latency affects user experience and may indicate performance issues.',
        recommendation: 'Investigate slow operations and optimize performance.',
        documentationUrl: 'https://opentelemetry.io/docs/',
        aiPrompt: {
          short: `Optimize ${service.serviceName} latency`,
          detailed: `
Reduce latency for service: ${service.serviceName}

Current Latency:
- P95: ${service.p95Latency.toFixed(0)}ms
- P99: ${service.p99Latency.toFixed(0)}ms
- Average: ${service.avgLatency.toFixed(0)}ms
- Threshold: ${latencyThreshold}ms

Throughput: ${service.throughput.toFixed(2)} ops/min

Investigate slow traces and optimize the hot paths.
          `.trim(),
          steps: [
            'Review slow traces in tracing UI',
            'Identify slow operations',
            'Optimize database queries, external calls',
            'Add caching where appropriate',
            'Monitor improvement',
          ],
        },
        ruleId: 'high-latency',
        tags: ['opentelemetry', 'latency', 'performance', service.serviceName],
        effort: 'hard',
      });
    }

    // High error rate
    if (service.errorRate > errorRateThreshold) {
      findings.push({
        id: `otel-errors-${service.serviceName}`,
        tool: this.name,
        category: this.category,
        severity: service.errorRate > errorRateThreshold * 5 ? 'critical' : 'high',
        title: `OpenTelemetry: High Error Rate - ${service.serviceName}`,
        description: `Error rate is ${(service.errorRate * 100).toFixed(2)}% (threshold: ${(errorRateThreshold * 100).toFixed(2)}%)`,
        explanation: `Service "${service.serviceName}" is experiencing high error rate across ${service.spanCount} spans.`,
        impact: 'High error rate indicates reliability issues affecting users.',
        recommendation: 'Investigate and fix the root cause of errors.',
        documentationUrl: 'https://opentelemetry.io/docs/',
        aiPrompt: {
          short: `Fix ${service.serviceName} error rate`,
          detailed: `
Reduce error rate for service: ${service.serviceName}

Current: ${(service.errorRate * 100).toFixed(2)}%
Target: < ${(errorRateThreshold * 100).toFixed(2)}%

Review error traces to identify root causes.
          `.trim(),
          steps: [
            'Review error traces',
            'Identify error patterns',
            'Fix root causes',
            'Add error handling',
            'Monitor improvement',
          ],
        },
        ruleId: 'high-error-rate',
        tags: ['opentelemetry', 'errors', 'reliability', service.serviceName],
        effort: 'hard',
      });
    }

    return findings;
  }

  private analyzeErrorTraces(errors: OTelSpan[]): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Group errors by operation
    const byOperation = new Map<string, OTelSpan[]>();
    for (const error of errors) {
      const key = `${error.serviceName}:${error.operationName}`;
      if (!byOperation.has(key)) {
        byOperation.set(key, []);
      }
      byOperation.get(key)!.push(error);
    }

    for (const [key, spans] of byOperation.entries()) {
      if (spans.length >= 3) {
        const [serviceName, operationName] = key.split(':');
        const errorMessage = spans[0].status?.message || 'Unknown error';

        findings.push({
          id: `otel-op-error-${key}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity: spans.length > 10 ? 'high' : 'medium',
          title: `OpenTelemetry: Recurring Operation Error`,
          description: `Operation "${operationName}" in "${serviceName}" has ${spans.length} errors`,
          explanation: `Error: ${errorMessage}`,
          impact: 'Recurring errors indicate a systematic issue.',
          recommendation: 'Investigate and fix the root cause.',
          documentationUrl: 'https://opentelemetry.io/docs/',
          aiPrompt: {
            short: `Fix recurring error in ${operationName}`,
            detailed: `Fix recurring error in ${serviceName}:${operationName} (${spans.length} occurrences)`,
            steps: ['Review traces', 'Identify root cause', 'Fix and monitor'],
          },
          ruleId: 'recurring-error',
          tags: ['opentelemetry', 'errors', serviceName, operationName],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    services: OTelServiceHealth[]
  ): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: findings.length === 0 ? 1 : 0,
        failed: findings.length,
      },
      metadata: {
        servicesAnalyzed: services.length,
        services: services.map(s => ({
          name: s.serviceName,
          p95Latency: s.p95Latency,
          errorRate: s.errorRate,
        })),
      },
    };
  }
}
