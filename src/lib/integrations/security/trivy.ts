// Trivy Integration (Container and Dependency Scanning)
// License: Apache 2.0
// Website: https://trivy.dev

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface TrivyVulnerability {
  VulnerabilityID: string;
  PkgID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion: string;
  Severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  Title: string;
  Description: string;
  References: string[];
  PrimaryURL: string;
  CVSS?: Record<string, { V3Score: number }>;
}

interface TrivyResult {
  Target: string;
  Class: string;
  Type: string;
  Vulnerabilities: TrivyVulnerability[] | null;
}

interface TrivyOutput {
  SchemaVersion: number;
  Results: TrivyResult[];
}

export class TrivyIntegration implements ToolIntegration {
  name = 'Trivy';
  category = 'security' as const;
  description = 'Comprehensive security scanner for vulnerabilities in containers, filesystems, and git repositories';
  website = 'https://trivy.dev';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('trivy --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        scanType: 'fs', // 'fs', 'image', 'repo'
        severity: ['CRITICAL', 'HIGH', 'MEDIUM'],
        ignoreUnfixed: false,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const scanType = (config?.options?.scanType as string) || 'fs';
      const severities = (config?.options?.severity as string[]) || ['CRITICAL', 'HIGH', 'MEDIUM'];
      const ignoreUnfixed = config?.options?.ignoreUnfixed ? '--ignore-unfixed' : '';

      let scanTarget: string;
      let command: string;

      if (target.image) {
        command = `trivy image --format json --severity ${severities.join(',')} ${ignoreUnfixed} ${target.image}`;
      } else {
        scanTarget = target.directory || '.';
        command = `trivy fs --format json --severity ${severities.join(',')} ${ignoreUnfixed} "${scanTarget}"`;
      }

      const result = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 100 * 1024 * 1024,
      });

      const output: TrivyOutput = JSON.parse(result);

      for (const scanResult of output.Results) {
        if (scanResult.Vulnerabilities) {
          for (const vuln of scanResult.Vulnerabilities) {
            findings.push(this.convertToFinding(vuln, scanResult.Target, scanResult.Type));
          }
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: TrivyOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const scanResult of output.Results) {
            if (scanResult.Vulnerabilities) {
              for (const vuln of scanResult.Vulnerabilities) {
                findings.push(this.convertToFinding(vuln, scanResult.Target, scanResult.Type));
              }
            }
          }
          return this.createResult(findings, Date.now() - startTime);
        } catch {
          // Parse error
        }
      }

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

  private convertToFinding(vuln: TrivyVulnerability, target: string, pkgType: string): AuditFinding {
    const severityMap: Record<string, Severity> = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
      UNKNOWN: 'info',
    };

    const severity = severityMap[vuln.Severity] || 'medium';
    const cvssScore = Object.values(vuln.CVSS || {})[0]?.V3Score;

    return {
      id: `trivy-${vuln.VulnerabilityID}-${vuln.PkgName}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Trivy: ${vuln.VulnerabilityID} in ${vuln.PkgName}`,
      description: vuln.Title || vuln.Description,
      explanation: `${vuln.Description}${cvssScore ? ` CVSS Score: ${cvssScore}` : ''}`,
      impact: this.getImpact(severity, vuln.PkgName, vuln.VulnerabilityID),
      file: target,
      recommendation: vuln.FixedVersion
        ? `Update ${vuln.PkgName} from ${vuln.InstalledVersion} to ${vuln.FixedVersion}`
        : `No fix available yet. Consider using an alternative package or implementing mitigating controls.`,
      documentationUrl: vuln.PrimaryURL || vuln.References?.[0] || `https://nvd.nist.gov/vuln/detail/${vuln.VulnerabilityID}`,
      aiPrompt: {
        short: `Fix ${vuln.VulnerabilityID} vulnerability in ${vuln.PkgName}`,
        detailed: `
Fix the security vulnerability found by Trivy.

Vulnerability: ${vuln.VulnerabilityID}
Package: ${vuln.PkgName}
Package Type: ${pkgType}
Installed Version: ${vuln.InstalledVersion}
Fixed Version: ${vuln.FixedVersion || 'No fix available'}
Severity: ${vuln.Severity}
${cvssScore ? `CVSS Score: ${cvssScore}` : ''}

Title: ${vuln.Title}

Description:
${vuln.Description}

${vuln.FixedVersion ? `
To fix this vulnerability:
1. Update ${vuln.PkgName} to version ${vuln.FixedVersion} or later
2. Run your dependency manager's update command
3. Test that the application still works correctly
4. Re-run Trivy to verify the fix
` : `
No fix is currently available. Consider:
1. Monitoring for updates to this package
2. Evaluating alternative packages
3. Implementing additional security controls to mitigate the risk
`}
        `.trim(),
        steps: vuln.FixedVersion
          ? [
              `Update ${vuln.PkgName} to version ${vuln.FixedVersion}`,
              'Run dependency update (npm update, pip install --upgrade, etc.)',
              'Test application functionality',
              'Run Trivy scan again to verify',
            ]
          : [
              'Monitor for security updates to this package',
              'Consider alternative packages',
              'Implement compensating controls',
              'Document accepted risk if applicable',
            ],
      },
      ruleId: vuln.VulnerabilityID,
      tags: ['trivy', 'vulnerability', pkgType, vuln.VulnerabilityID],
      effort: vuln.FixedVersion ? 'easy' : 'hard',
    };
  }

  private getImpact(severity: Severity, pkgName: string, vulnId: string): string {
    const impacts: Record<Severity, string> = {
      critical: `Critical vulnerability ${vulnId} in ${pkgName} could allow remote code execution or complete system compromise.`,
      high: `High-severity vulnerability ${vulnId} in ${pkgName} could lead to significant security breaches.`,
      medium: `Medium-severity vulnerability ${vulnId} in ${pkgName} could be exploited under certain conditions.`,
      low: `Low-severity vulnerability ${vulnId} in ${pkgName} has limited security impact.`,
      info: `Informational finding about ${vulnId} in ${pkgName}.`,
    };
    return impacts[severity];
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
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
        passed: 0,
        failed: findings.length,
      },
    };
  }
}
