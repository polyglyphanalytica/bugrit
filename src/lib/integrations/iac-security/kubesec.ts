// Kubesec Integration - Kubernetes Security Analysis
// License: Apache 2.0
// Website: https://kubesec.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface KubesecResult {
  object: string;
  valid: boolean;
  fileName: string;
  message: string;
  score: number;
  scoring: {
    critical: KubesecRule[];
    passed: KubesecRule[];
    advise: KubesecRule[];
  };
}

interface KubesecRule {
  id: string;
  selector: string;
  reason: string;
  points: number;
}

export class KubesecIntegration implements ToolIntegration {
  name = 'kubesec';
  category = 'iac-security' as const;
  description = 'Security risk analysis for Kubernetes resources and manifests';
  website = 'https://kubesec.io/';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('kubesec version', { stdio: 'ignore' });
      return true;
    } catch {
      // Check for docker
      try {
        const { execSync } = await import('child_process');
        execSync('docker images kubesec/kubesec -q', { stdio: 'ignore' });
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
        minScore: 0,  // Minimum acceptable score
        format: 'json',
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

      // Find Kubernetes manifest files
      const yamlFiles = await glob.glob('**/*.{yaml,yml}', {
        cwd: targetDir,
        ignore: ['**/node_modules/**', '**/charts/**', '**/.helm/**'],
        absolute: true,
      });

      const minScore = (config?.options?.minScore as number) || 0;
      let filesScanned = 0;

      for (const file of yamlFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Skip non-K8s files
        if (!this.isKubernetesManifest(content)) continue;

        filesScanned++;

        try {
          // kubesec scan returns JSON array
          const result = execSync(
            `kubesec scan "${file}"`,
            { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
          );

          const results: KubesecResult[] = JSON.parse(result);

          for (const scanResult of results) {
            // Add findings for critical issues
            for (const rule of scanResult.scoring?.critical || []) {
              findings.push(this.createFinding(file, rule, 'critical', scanResult.score));
            }

            // Add findings for advise items (things to improve)
            for (const rule of scanResult.scoring?.advise || []) {
              findings.push(this.createFinding(file, rule, 'medium', scanResult.score));
            }

            // Check if score is below minimum
            if (scanResult.score < minScore) {
              findings.push({
                id: `kubesec-low-score-${file}`,
                tool: this.name,
                category: this.category,
                severity: 'high',
                title: `Low Security Score: ${scanResult.score}`,
                description: `The Kubernetes manifest has a security score of ${scanResult.score}, below the minimum of ${minScore}.`,
                explanation: 'Kubesec assigns a score based on security best practices. Higher scores indicate better security posture.',
                impact: 'Potentially insecure deployment configuration.',
                file,
                recommendation: 'Address the security issues listed in the scan results to improve the score.',
                documentationUrl: 'https://kubesec.io/',
                aiPrompt: {
                  short: `Improve Kubesec score for ${file}`,
                  detailed: `Low Kubesec security score:\n\nFile: ${file}\nScore: ${scanResult.score}\nMinimum: ${minScore}\n\nReview and fix the security issues identified.`,
                  steps: ['Review critical issues', 'Apply security fixes', 'Re-scan with kubesec', 'Verify score improvement'],
                },
                ruleId: 'low-score',
                tags: ['kubesec', 'kubernetes', 'security-score'],
                effort: 'moderate',
              });
            }
          }
        } catch (error) {
          // kubesec might fail on invalid manifests
          if (error instanceof Error && 'stdout' in error) {
            const stdout = (error as { stdout: string }).stdout;
            if (stdout) {
              try {
                const results: KubesecResult[] = JSON.parse(stdout);
                for (const scanResult of results) {
                  for (const rule of scanResult.scoring?.critical || []) {
                    findings.push(this.createFinding(file, rule, 'critical', scanResult.score));
                  }
                  for (const rule of scanResult.scoring?.advise || []) {
                    findings.push(this.createFinding(file, rule, 'medium', scanResult.score));
                  }
                }
              } catch { /* Parse error */ }
            }
          }
        }
      }

      return this.createResult(findings, Date.now() - startTime, filesScanned);
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
    // Check for Deployment, Pod, DaemonSet, StatefulSet, etc.
    const k8sKinds = ['Deployment', 'Pod', 'DaemonSet', 'StatefulSet', 'ReplicaSet', 'Job', 'CronJob'];
    return /apiVersion:\s*['"']?[\w\/\.]+['"']?/i.test(content) &&
           k8sKinds.some(kind => new RegExp(`kind:\\s*['"]?${kind}['"]?`, 'i').test(content));
  }

  private createFinding(file: string, rule: KubesecRule, baseSeverity: Severity, score: number): AuditFinding {
    // Adjust severity based on points (negative points are critical)
    let severity: Severity = baseSeverity;
    if (rule.points <= -10) severity = 'critical';
    else if (rule.points <= -5) severity = 'high';
    else if (rule.points < 0) severity = 'medium';
    else if (rule.points > 0) severity = 'info'; // Positive points are suggestions

    return {
      id: `kubesec-${rule.id}-${file}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `K8s Security: ${rule.id}`,
      description: rule.reason,
      explanation: `Kubesec detected a security issue. Selector: ${rule.selector}. This affects the security score by ${rule.points} points.`,
      impact: this.getImpact(rule.id),
      file,
      recommendation: this.getRemediation(rule.id),
      documentationUrl: `https://kubesec.io/basics/${rule.id.toLowerCase()}/`,
      aiPrompt: {
        short: `Fix kubesec ${rule.id}`,
        detailed: `Kubesec security issue:

File: ${file}
Rule: ${rule.id}
Reason: ${rule.reason}
Selector: ${rule.selector}
Points: ${rule.points}
Overall Score: ${score}

Apply the remediation to improve the security posture.`,
        steps: [
          `Open ${file}`,
          `Find: ${rule.selector}`,
          'Apply the security fix',
          'Re-scan with kubesec',
        ],
      },
      ruleId: rule.id,
      tags: ['kubesec', 'kubernetes', 'security', rule.id.toLowerCase()],
      effort: 'easy',
    };
  }

  private getImpact(ruleId: string): string {
    const impacts: Record<string, string> = {
      'Privileged': 'Container has full root access to the host system.',
      'RunAsRoot': 'Container runs as root, increasing impact of vulnerabilities.',
      'RunAsNonRoot': 'Security improvement: container cannot run as root.',
      'ReadOnlyRootFilesystem': 'Security improvement: prevents filesystem modifications.',
      'CapSysAdmin': 'Container has SYS_ADMIN capability, nearly equivalent to root.',
      'AllowPrivilegeEscalation': 'Container can escalate to root privileges.',
      'HostNetwork': 'Container shares the host network, bypassing network policies.',
      'HostPID': 'Container can see and interact with host processes.',
      'HostIPC': 'Container can access host inter-process communication.',
      'ServiceAccountName': 'Using non-default service account improves security.',
      'LimitsCPU': 'Setting CPU limits prevents resource exhaustion.',
      'LimitsMemory': 'Setting memory limits prevents OOM issues.',
      'RequestsCPU': 'Setting CPU requests ensures resource allocation.',
      'RequestsMemory': 'Setting memory requests ensures resource allocation.',
    };
    return impacts[ruleId] || 'Affects the security posture of the deployment.';
  }

  private getRemediation(ruleId: string): string {
    const remediations: Record<string, string> = {
      'Privileged': 'Remove "privileged: true" from securityContext.',
      'RunAsRoot': 'Set "runAsNonRoot: true" and "runAsUser" to a non-zero value.',
      'RunAsNonRoot': 'Set "runAsNonRoot: true" in securityContext.',
      'ReadOnlyRootFilesystem': 'Set "readOnlyRootFilesystem: true" in securityContext.',
      'CapSysAdmin': 'Remove SYS_ADMIN from capabilities.add.',
      'AllowPrivilegeEscalation': 'Set "allowPrivilegeEscalation: false" in securityContext.',
      'HostNetwork': 'Remove "hostNetwork: true" unless absolutely required.',
      'HostPID': 'Remove "hostPID: true" unless absolutely required.',
      'HostIPC': 'Remove "hostIPC: true" unless absolutely required.',
      'ServiceAccountName': 'Use a dedicated service account instead of default.',
      'LimitsCPU': 'Add "resources.limits.cpu" to container spec.',
      'LimitsMemory': 'Add "resources.limits.memory" to container spec.',
      'RequestsCPU': 'Add "resources.requests.cpu" to container spec.',
      'RequestsMemory': 'Add "resources.requests.memory" to container spec.',
    };
    return remediations[ruleId] || 'Review and fix the security configuration.';
  }

  private createResult(findings: AuditFinding[], duration: number, filesScanned: number): AuditResult {
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
        passed: filesScanned - new Set(findings.map(f => f.file)).size,
        failed: new Set(findings.map(f => f.file)).size,
      },
      metadata: { filesScanned },
    };
  }
}
