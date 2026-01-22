// LitmusChaos Integration (Self-hosted)
// License: Apache 2.0
// Website: https://litmuschaos.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface LitmusExperiment {
  name: string;
  namespace: string;
  status: {
    phase: 'Running' | 'Completed' | 'Failed' | 'Stopped';
    verdict: 'Pass' | 'Fail' | 'Awaited' | 'Stopped';
  };
  spec: {
    chaosServiceAccount: string;
    experiments: Array<{
      name: string;
      spec: {
        components: {
          env: Array<{ name: string; value: string }>;
        };
      };
    }>;
  };
  result?: {
    failStep?: string;
    probeSuccessPercentage?: string;
    failedRuns?: number;
    passedRuns?: number;
  };
}

interface LitmusProbeResult {
  name: string;
  type: 'httpProbe' | 'cmdProbe' | 'k8sProbe' | 'promProbe';
  status: 'Passed' | 'Failed' | 'N/A';
  mode: 'SOT' | 'EOT' | 'Edge' | 'Continuous';
}

interface LitmusChaosResult {
  experiments: LitmusExperiment[];
  probeResults: LitmusProbeResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    stopped: number;
    running: number;
  };
}

export class LitmusChaosIntegration implements ToolIntegration {
  name = 'LitmusChaos';
  category = 'chaos' as const;
  description = 'Cloud-native chaos engineering framework for Kubernetes';
  website = 'https://litmuschaos.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      // Check if kubectl and litmus are available
      execSync('kubectl get crds chaosengines.litmuschaos.io', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        namespace: 'litmus',
        experimentTimeout: 300,
        chaosServiceAccount: 'litmus-admin',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const namespace = (config?.options?.namespace || 'litmus') as string;

      // Get chaos experiment results
      const chaosResults = this.getChaosResults(namespace);

      findings.push(...this.analyzeExperiments(chaosResults.experiments));
      findings.push(...this.analyzeProbes(chaosResults.probeResults));
      findings.push(...this.analyzeResilienceScore(chaosResults));

      return this.createResult(findings, Date.now() - startTime, chaosResults);
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

  private getChaosResults(namespace: string): LitmusChaosResult {
    const { execSync } = require('child_process');

    const experiments: LitmusExperiment[] = [];
    const probeResults: LitmusProbeResult[] = [];

    try {
      // Get chaos engine results
      const enginesJson = execSync(
        `kubectl get chaosengines -n ${namespace} -o json`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const engines = JSON.parse(enginesJson);

      for (const engine of engines.items || []) {
        experiments.push({
          name: engine.metadata?.name || 'unknown',
          namespace: engine.metadata?.namespace || namespace,
          status: {
            phase: engine.status?.engineStatus || 'Completed',
            verdict: engine.status?.experiments?.[0]?.verdict || 'Awaited',
          },
          spec: {
            chaosServiceAccount: engine.spec?.chaosServiceAccount || 'litmus-admin',
            experiments: engine.spec?.experiments || [],
          },
          result: {
            failStep: engine.status?.experiments?.[0]?.failStep,
            probeSuccessPercentage: engine.status?.experiments?.[0]?.probeSuccessPercentage,
          },
        });

        // Extract probe results
        const probes = engine.status?.experiments?.[0]?.probeStatuses || [];
        for (const probe of probes) {
          probeResults.push({
            name: probe.name || 'unknown',
            type: probe.type || 'cmdProbe',
            status: probe.status?.verdict || 'N/A',
            mode: probe.mode || 'SOT',
          });
        }
      }
    } catch {
      // Could not query Kubernetes
    }

    return {
      experiments,
      probeResults,
      summary: {
        total: experiments.length,
        passed: experiments.filter(e => e.status.verdict === 'Pass').length,
        failed: experiments.filter(e => e.status.verdict === 'Fail').length,
        stopped: experiments.filter(e => e.status.verdict === 'Stopped').length,
        running: experiments.filter(e => e.status.phase === 'Running').length,
      },
    };
  }

  private analyzeExperiments(experiments: LitmusExperiment[]): AuditFinding[] {
    const findings: AuditFinding[] = [];

    for (const exp of experiments) {
      if (exp.status.verdict === 'Fail') {
        findings.push({
          id: `litmus-${exp.name}`,
          tool: this.name,
          category: this.category,
          severity: 'high',
          title: `LitmusChaos: Experiment Failed - ${exp.name}`,
          description: `Chaos experiment "${exp.name}" failed`,
          explanation: this.getExperimentExplanation(exp),
          impact: 'System did not maintain resilience under chaos conditions.',
          recommendation: this.getExperimentRecommendation(exp),
          documentationUrl: 'https://litmuschaos.github.io/litmus/',
          aiPrompt: {
            short: `Fix resilience issue: ${exp.name}`,
            detailed: `
The chaos experiment "${exp.name}" failed, indicating a resilience issue.

Experiment: ${exp.name}
Namespace: ${exp.namespace}
Verdict: ${exp.status.verdict}
${exp.result?.failStep ? `Failed at: ${exp.result.failStep}` : ''}
${exp.result?.probeSuccessPercentage ? `Probe success: ${exp.result.probeSuccessPercentage}` : ''}

The system did not maintain expected behavior under chaos conditions.
Investigate and improve the resilience of the affected components.
            `.trim(),
            steps: [
              'Review the chaos experiment results',
              'Identify which component failed',
              'Implement retry logic, circuit breakers, or redundancy',
              'Re-run the chaos experiment to verify',
            ],
          },
          ruleId: 'chaos-experiment-failed',
          tags: ['litmus', 'chaos-engineering', 'resilience', exp.name],
          effort: 'hard',
        });
      }
    }

    return findings;
  }

  private analyzeProbes(probes: LitmusProbeResult[]): AuditFinding[] {
    const findings: AuditFinding[] = [];

    const failedProbes = probes.filter(p => p.status === 'Failed');

    if (failedProbes.length > 0) {
      findings.push({
        id: 'litmus-probes-failed',
        tool: this.name,
        category: this.category,
        severity: 'high',
        title: 'LitmusChaos: Resilience Probes Failed',
        description: `${failedProbes.length} chaos probes failed`,
        explanation: `Failed probes: ${failedProbes.map(p => p.name).join(', ')}`,
        impact: 'The system did not meet resilience requirements under chaos.',
        recommendation: 'Investigate why probes failed and improve system resilience.',
        documentationUrl: 'https://litmuschaos.github.io/litmus/',
        aiPrompt: {
          short: `Fix ${failedProbes.length} failed chaos probes`,
          detailed: `
Fix failing chaos probes:
${failedProbes.map(p => `- ${p.name} (${p.type}, ${p.mode})`).join('\n')}

Probes verify system behavior during chaos experiments.
Failing probes indicate the system is not resilient.
          `.trim(),
          steps: [
            'Review probe configurations',
            'Check what conditions are being tested',
            'Improve system to pass probes',
            'Re-run experiments',
          ],
        },
        ruleId: 'probes-failed',
        tags: ['litmus', 'chaos-engineering', 'probes'],
        effort: 'hard',
      });
    }

    return findings;
  }

  private analyzeResilienceScore(results: LitmusChaosResult): AuditFinding[] {
    const findings: AuditFinding[] = [];

    if (results.summary.total === 0) {
      findings.push({
        id: 'litmus-no-experiments',
        tool: this.name,
        category: this.category,
        severity: 'medium',
        title: 'LitmusChaos: No Chaos Experiments Configured',
        description: 'No chaos experiments are configured for this environment',
        explanation: 'Without chaos experiments, system resilience cannot be validated.',
        impact: 'Unknown resilience posture. System may fail under real-world conditions.',
        recommendation: 'Configure chaos experiments to test system resilience.',
        documentationUrl: 'https://litmuschaos.github.io/litmus/',
        aiPrompt: {
          short: 'Set up chaos experiments',
          detailed: `
Set up chaos engineering experiments using LitmusChaos.

Start with basic experiments:
- pod-delete: Test pod recovery
- pod-network-latency: Test network resilience
- pod-cpu-hog: Test under resource pressure

This will help validate system resilience.
          `.trim(),
          steps: [
            'Install LitmusChaos in your cluster',
            'Define chaos experiments',
            'Configure steady-state probes',
            'Run experiments and analyze results',
          ],
        },
        ruleId: 'no-experiments',
        tags: ['litmus', 'chaos-engineering', 'configuration'],
        effort: 'moderate',
      });
    } else {
      const resilienceScore = (results.summary.passed / results.summary.total) * 100;

      if (resilienceScore < 80) {
        findings.push({
          id: 'litmus-low-resilience',
          tool: this.name,
          category: this.category,
          severity: resilienceScore < 50 ? 'critical' : 'high',
          title: 'LitmusChaos: Low Resilience Score',
          description: `Resilience score is ${resilienceScore.toFixed(1)}% (${results.summary.passed}/${results.summary.total} experiments passed)`,
          explanation: `${results.summary.failed} experiments failed, indicating resilience gaps.`,
          impact: 'Low resilience score indicates the system may fail under adverse conditions.',
          recommendation: 'Investigate and fix failing experiments to improve resilience.',
          documentationUrl: 'https://litmuschaos.github.io/litmus/',
          aiPrompt: {
            short: `Improve resilience score from ${resilienceScore.toFixed(0)}%`,
            detailed: `
Improve system resilience score.

Current: ${resilienceScore.toFixed(1)}%
Passed: ${results.summary.passed}
Failed: ${results.summary.failed}

Fix failing experiments to achieve at least 80% resilience score.
            `.trim(),
            steps: [
              'Review failing experiments',
              'Implement resilience patterns',
              'Add redundancy and failover',
              'Re-run chaos experiments',
            ],
          },
          ruleId: 'low-resilience-score',
          tags: ['litmus', 'chaos-engineering', 'resilience'],
          effort: 'hard',
        });
      }
    }

    return findings;
  }

  private getExperimentExplanation(exp: LitmusExperiment): string {
    const parts: string[] = [];

    parts.push(`Experiment "${exp.name}" in namespace "${exp.namespace}" failed.`);

    if (exp.result?.failStep) {
      parts.push(`Failed at step: ${exp.result.failStep}.`);
    }

    if (exp.result?.probeSuccessPercentage) {
      parts.push(`Probe success rate: ${exp.result.probeSuccessPercentage}.`);
    }

    return parts.join(' ');
  }

  private getExperimentRecommendation(exp: LitmusExperiment): string {
    const experimentTypes: Record<string, string> = {
      'pod-delete': 'Implement proper pod redundancy and ensure deployments have multiple replicas.',
      'pod-network-latency': 'Add timeout handling and retry logic to handle network delays.',
      'pod-network-loss': 'Implement circuit breakers and fallback mechanisms.',
      'pod-cpu-hog': 'Set resource limits and implement graceful degradation.',
      'pod-memory-hog': 'Implement memory limits and OOM handling.',
      'node-drain': 'Ensure proper pod distribution across nodes.',
      'disk-fill': 'Implement disk monitoring and cleanup policies.',
    };

    const expName = exp.spec.experiments[0]?.name || '';
    return experimentTypes[expName] || 'Review the experiment results and implement appropriate resilience measures.';
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    results: LitmusChaosResult
  ): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    const resilienceScore = results.summary.total > 0
      ? (results.summary.passed / results.summary.total) * 100
      : 0;

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: results.summary.passed,
        failed: results.summary.failed,
      },
      metadata: {
        resilienceScore,
        totalExperiments: results.summary.total,
        passedExperiments: results.summary.passed,
        failedExperiments: results.summary.failed,
      },
    };
  }
}
