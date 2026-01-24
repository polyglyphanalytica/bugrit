// kube-bench Integration - CIS Kubernetes Benchmark
// License: Apache 2.0
// Website: https://github.com/aquasecurity/kube-bench

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface KubeBenchTest {
  section: string;
  type: string;
  pass: number;
  fail: number;
  warn: number;
  info: number;
  desc: string;
  results: KubeBenchResult[];
}

interface KubeBenchResult {
  test_number: string;
  test_desc: string;
  audit: string;
  AuditEnv: string;
  AuditConfig: string;
  type: string;
  remediation: string;
  test_info: string[];
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO';
  actual_value: string;
  scored: boolean;
  IsMultiple: boolean;
  expected_result: string;
  reason: string;
}

interface KubeBenchOutput {
  Controls: KubeBenchTest[];
  Totals: {
    total_pass: number;
    total_fail: number;
    total_warn: number;
    total_info: number;
  };
}

export class KubeBenchIntegration implements ToolIntegration {
  name = 'kube-bench';
  category = 'iac-security' as const;
  description = 'Checks Kubernetes clusters against CIS Kubernetes Benchmark security recommendations';
  website = 'https://github.com/aquasecurity/kube-bench';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('kube-bench version', { stdio: 'ignore' });
      return true;
    } catch {
      // Also check for docker
      try {
        const { execSync } = await import('child_process');
        execSync('docker images aquasec/kube-bench -q', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        benchmark: 'cis-1.8',  // CIS benchmark version
        targets: ['master', 'node', 'etcd', 'policies'],
        scored: true,         // Only show scored tests
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const glob = safeRequire<typeof import('glob')>('glob');
      const fs = await import('fs');
      const targetDir = target.directory || '.';

      // Check if we have Kubernetes manifests to analyze statically
      const k8sManifests = await glob.glob('**/*.{yaml,yml}', {
        cwd: targetDir,
        ignore: ['**/node_modules/**', '**/charts/**'],
        absolute: true,
      });

      // Filter for likely K8s manifests
      const kubeManifests = [];
      for (const file of k8sManifests) {
        const content = fs.readFileSync(file, 'utf-8');
        if (this.isKubernetesManifest(content)) {
          kubeManifests.push(file);
        }
      }

      // If no K8s manifests found, try running kube-bench against cluster
      if (kubeManifests.length === 0) {
        return this.runClusterScan(config, startTime);
      }

      // For static analysis of manifests, check common security issues
      for (const file of kubeManifests) {
        const content = fs.readFileSync(file, 'utf-8');
        const issues = this.analyzeManifest(content, file);
        findings.push(...issues);
      }

      return this.createResult(findings, Date.now() - startTime, kubeManifests.length);
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

  private isKubernetesManifest(content: string): boolean {
    // Check for common K8s resource indicators
    return /apiVersion:\s*['"']?[\w\/\.]+['"']?/i.test(content) &&
           /kind:\s*['"']?\w+['"']?/i.test(content);
  }

  private async runClusterScan(config: ToolConfig | undefined, startTime: number): Promise<AuditResult> {
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targets = (config?.options?.targets as string[]) || ['master', 'node'];

      for (const target of targets) {
        try {
          const result = execSync(
            `kube-bench run --targets ${target} --json`,
            { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024, timeout: 300000 }
          );

          const output: KubeBenchOutput = JSON.parse(result);

          for (const control of output.Controls) {
            for (const test of control.results) {
              if (test.status === 'FAIL' || test.status === 'WARN') {
                findings.push(this.createClusterFinding(control, test));
              }
            }
          }
        } catch {
          // Target might not be applicable
        }
      }

      return this.createResult(findings, Date.now() - startTime, targets.length);
    } catch (error) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'No Kubernetes manifests found and cluster scan failed. Ensure kube-bench can access the cluster.',
      };
    }
  }

  private analyzeManifest(content: string, file: string): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lines = content.split('\n');

    // Check for privileged containers
    if (/privileged:\s*true/i.test(content)) {
      const line = this.findLineNumber(lines, 'privileged: true');
      findings.push(this.createManifestFinding(file, line, 'privileged-container', 'critical',
        'Container running as privileged', 'Privileged containers have root-level access to the host.'));
    }

    // Check for root user
    if (/runAsUser:\s*0/i.test(content) || /runAsNonRoot:\s*false/i.test(content)) {
      const line = this.findLineNumber(lines, 'runAsUser: 0') || this.findLineNumber(lines, 'runAsNonRoot: false');
      findings.push(this.createManifestFinding(file, line, 'root-user', 'high',
        'Container running as root', 'Running as root increases the impact of container breakout.'));
    }

    // Check for missing resource limits
    if (!/resources:/i.test(content) || (!/limits:/i.test(content) && /containers:/i.test(content))) {
      findings.push(this.createManifestFinding(file, 1, 'no-resource-limits', 'medium',
        'No resource limits defined', 'Missing resource limits can lead to resource exhaustion.'));
    }

    // Check for hostNetwork
    if (/hostNetwork:\s*true/i.test(content)) {
      const line = this.findLineNumber(lines, 'hostNetwork: true');
      findings.push(this.createManifestFinding(file, line, 'host-network', 'high',
        'Using host network', 'Host network access bypasses network policies.'));
    }

    // Check for hostPID
    if (/hostPID:\s*true/i.test(content)) {
      const line = this.findLineNumber(lines, 'hostPID: true');
      findings.push(this.createManifestFinding(file, line, 'host-pid', 'high',
        'Using host PID namespace', 'Access to host PID namespace can be used to escalate privileges.'));
    }

    // Check for missing readOnlyRootFilesystem
    if (/containers:/i.test(content) && !/readOnlyRootFilesystem:\s*true/i.test(content)) {
      findings.push(this.createManifestFinding(file, 1, 'writable-root-filesystem', 'medium',
        'Root filesystem is writable', 'Writable root filesystem increases attack surface.'));
    }

    // Check for allowPrivilegeEscalation
    if (/allowPrivilegeEscalation:\s*true/i.test(content)) {
      const line = this.findLineNumber(lines, 'allowPrivilegeEscalation: true');
      findings.push(this.createManifestFinding(file, line, 'privilege-escalation', 'high',
        'Privilege escalation allowed', 'Container can escalate to root privileges.'));
    }

    // Check for capabilities
    if (/capabilities:/i.test(content) && /add:/i.test(content)) {
      if (/SYS_ADMIN|ALL|NET_ADMIN|SYS_PTRACE/i.test(content)) {
        const line = this.findLineNumber(lines, 'add:');
        findings.push(this.createManifestFinding(file, line, 'dangerous-capabilities', 'high',
          'Dangerous capabilities added', 'These capabilities can be used for privilege escalation.'));
      }
    }

    // Check for latest tag
    if (/image:\s*[\w\/\.\-]+:latest/i.test(content) || /image:\s*[\w\/\.\-]+[^:]/i.test(content)) {
      findings.push(this.createManifestFinding(file, 1, 'latest-tag', 'low',
        'Using latest or no image tag', 'Untagged images make deployments non-reproducible.'));
    }

    return findings;
  }

  private findLineNumber(lines: string[], search: string): number {
    const index = lines.findIndex(line => line.toLowerCase().includes(search.toLowerCase()));
    return index >= 0 ? index + 1 : 1;
  }

  private createManifestFinding(
    file: string,
    line: number,
    ruleId: string,
    severity: Severity,
    title: string,
    description: string
  ): AuditFinding {
    return {
      id: `kube-bench-${ruleId}-${file}-${line}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `K8s Security: ${title}`,
      description,
      explanation: this.getExplanation(ruleId),
      impact: this.getImpact(ruleId),
      file,
      line,
      recommendation: this.getRemediation(ruleId),
      documentationUrl: 'https://www.cisecurity.org/benchmark/kubernetes',
      aiPrompt: {
        short: `Fix K8s security issue: ${title}`,
        detailed: `Kubernetes security issue in manifest:\n\nFile: ${file}\nLine: ${line}\nIssue: ${title}\n\n${description}\n\nRemediation: ${this.getRemediation(ruleId)}`,
        steps: ['Review the manifest', 'Apply security fix', 'Test deployment', 'Verify fix'],
      },
      ruleId,
      tags: ['kube-bench', 'kubernetes', 'cis', 'security', ruleId],
      effort: 'easy',
    };
  }

  private createClusterFinding(control: KubeBenchTest, test: KubeBenchResult): AuditFinding {
    const severity: Severity = test.status === 'FAIL' && test.scored ? 'high' : 'medium';

    return {
      id: `kube-bench-${test.test_number}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `CIS ${test.test_number}: ${test.test_desc}`,
      description: test.test_info?.join(' ') || test.test_desc,
      explanation: `CIS Kubernetes Benchmark check ${test.test_number} from section "${control.desc}".`,
      impact: `${test.status === 'FAIL' ? 'Security control failed' : 'Security warning'}. ${test.reason || ''}`,
      recommendation: test.remediation,
      documentationUrl: 'https://www.cisecurity.org/benchmark/kubernetes',
      aiPrompt: {
        short: `Fix CIS ${test.test_number}`,
        detailed: `CIS Kubernetes Benchmark failure:\n\nTest: ${test.test_number}\nDescription: ${test.test_desc}\nStatus: ${test.status}\n\nRemediation:\n${test.remediation}`,
        steps: ['Review the failing check', 'Apply remediation', 'Re-run kube-bench', 'Verify fix'],
      },
      ruleId: test.test_number,
      tags: ['kube-bench', 'kubernetes', 'cis', control.type, test.status.toLowerCase()],
      effort: 'moderate',
    };
  }

  private getExplanation(ruleId: string): string {
    const explanations: Record<string, string> = {
      'privileged-container': 'Privileged containers remove most security boundaries between the container and host.',
      'root-user': 'Running as root in a container increases the impact if an attacker escapes the container.',
      'no-resource-limits': 'Without limits, a container can consume all node resources, causing denial of service.',
      'host-network': 'Host network gives the container full access to the node network stack.',
      'host-pid': 'Host PID namespace allows seeing and signaling host processes.',
      'writable-root-filesystem': 'A writable filesystem allows attackers to modify binaries or add malware.',
      'privilege-escalation': 'Allows a process to gain more privileges than its parent.',
      'dangerous-capabilities': 'These Linux capabilities provide near-root access to the host.',
      'latest-tag': 'The :latest tag changes unpredictably, making deployments non-reproducible.',
    };
    return explanations[ruleId] || 'This configuration weakens container security.';
  }

  private getImpact(ruleId: string): string {
    const impacts: Record<string, string> = {
      'privileged-container': 'Container escape leads to full host compromise.',
      'root-user': 'Increased impact of any container vulnerability.',
      'no-resource-limits': 'Possible denial of service through resource exhaustion.',
      'host-network': 'Network policies ineffective, possible network attacks.',
      'host-pid': 'Can inspect and kill host processes.',
      'writable-root-filesystem': 'Persistent malware installation possible.',
      'privilege-escalation': 'Container processes can become root.',
      'dangerous-capabilities': 'Near-root access to the host system.',
      'latest-tag': 'Unpredictable deployments, difficult rollbacks.',
    };
    return impacts[ruleId] || 'Reduced security posture.';
  }

  private getRemediation(ruleId: string): string {
    const remediations: Record<string, string> = {
      'privileged-container': 'Remove "privileged: true" and use specific capabilities instead.',
      'root-user': 'Set "runAsNonRoot: true" and "runAsUser" to a non-zero UID.',
      'no-resource-limits': 'Add "resources.limits" for cpu and memory.',
      'host-network': 'Remove "hostNetwork: true" and use Kubernetes networking.',
      'host-pid': 'Remove "hostPID: true" unless absolutely required.',
      'writable-root-filesystem': 'Set "readOnlyRootFilesystem: true" in securityContext.',
      'privilege-escalation': 'Set "allowPrivilegeEscalation: false" in securityContext.',
      'dangerous-capabilities': 'Remove dangerous capabilities and use minimum required set.',
      'latest-tag': 'Use specific image tags (e.g., v1.2.3) for reproducibility.',
    };
    return remediations[ruleId] || 'Review and fix the security configuration.';
  }

  private createResult(findings: AuditFinding[], duration: number, targetsScanned: number): AuditResult {
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
        passed: targetsScanned - findings.length,
        failed: findings.length,
      },
      metadata: { targetsScanned },
    };
  }
}
