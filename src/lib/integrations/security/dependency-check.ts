// OWASP Dependency-Check Integration
// License: Apache 2.0
// Website: https://owasp.org/www-project-dependency-check/

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface DependencyCheckVuln {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cvssv3?: { baseScore: number; attackVector: string };
  cvssv2?: { score: number };
  cwes?: string[];
  description: string;
  references: Array<{ url: string; name: string }>;
}

interface DependencyCheckDependency {
  fileName: string;
  filePath: string;
  packages?: Array<{ id: string }>;
  vulnerabilities?: DependencyCheckVuln[];
}

interface DependencyCheckReport {
  dependencies: DependencyCheckDependency[];
}

export class DependencyCheckIntegration implements ToolIntegration {
  name = 'OWASP Dependency-Check';
  category = 'security' as const;
  description = 'Software Composition Analysis tool that identifies project dependencies with known vulnerabilities';
  website = 'https://owasp.org/www-project-dependency-check/';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('dependency-check --version', { stdio: 'ignore' });
      return true;
    } catch {
      // Try via Docker
      try {
        const { execSync } = await import('child_process');
        execSync('docker images owasp/dependency-check -q', { encoding: 'utf-8' });
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
        failOnCVSS: 7,
        format: 'JSON',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const outputDir = '/tmp/dependency-check-report';

      // Run via Docker
      execSync(
        `docker run --rm -v "${targetDir}:/src" -v "${outputDir}:/report" owasp/dependency-check --scan /src --format JSON --out /report --prettyPrint 2>&1 || true`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 600000 }
      );

      // Read report
      const fs = await import('fs');
      const reportPath = `${outputDir}/dependency-check-report.json`;

      if (fs.existsSync(reportPath)) {
        const report: DependencyCheckReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

        for (const dep of report.dependencies) {
          if (dep.vulnerabilities) {
            for (const vuln of dep.vulnerabilities) {
              findings.push(this.convertToFinding(vuln, dep));
            }
          }
        }
      }

      return this.createResult(findings, Date.now() - startTime);
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

  private convertToFinding(vuln: DependencyCheckVuln, dep: DependencyCheckDependency): AuditFinding {
    const severityMap: Record<string, Severity> = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };

    const severity = severityMap[vuln.severity] || 'medium';
    const cvssScore = vuln.cvssv3?.baseScore || vuln.cvssv2?.score;

    return {
      id: `dependency-check-${vuln.name}-${dep.fileName}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Dependency-Check: ${vuln.name} in ${dep.fileName}`,
      description: vuln.description,
      explanation: `${vuln.description}${cvssScore ? ` CVSS Score: ${cvssScore}` : ''}${vuln.cwes?.length ? ` CWE: ${vuln.cwes.join(', ')}` : ''}`,
      impact: this.getImpact(severity, dep.fileName, vuln.name),
      file: dep.filePath,
      recommendation: 'Update the vulnerable dependency to a patched version or find an alternative library.',
      documentationUrl: vuln.references?.[0]?.url || `https://nvd.nist.gov/vuln/detail/${vuln.name}`,
      aiPrompt: {
        short: `Fix ${vuln.name} vulnerability in ${dep.fileName}`,
        detailed: `
Fix the vulnerability found by OWASP Dependency-Check.

Vulnerability: ${vuln.name}
Severity: ${vuln.severity}
${cvssScore ? `CVSS Score: ${cvssScore}` : ''}
${vuln.cvssv3?.attackVector ? `Attack Vector: ${vuln.cvssv3.attackVector}` : ''}

Affected Dependency: ${dep.fileName}
Path: ${dep.filePath}
${dep.packages?.length ? `Package: ${dep.packages[0].id}` : ''}

Description:
${vuln.description}

${vuln.cwes?.length ? `CWE: ${vuln.cwes.join(', ')}` : ''}

Steps to fix:
1. Identify the fixed version of this dependency
2. Update your package manager configuration
3. Run dependency update
4. Test your application
5. Re-run dependency-check to verify
        `.trim(),
        steps: [
          'Check NVD for the vulnerability details and fixed versions',
          'Update dependency version in package configuration',
          'Run dependency update command',
          'Test application thoroughly',
          'Re-scan with dependency-check',
        ],
      },
      ruleId: vuln.name,
      tags: ['dependency-check', 'owasp', 'sca', vuln.name, ...(vuln.cwes || [])],
      effort: 'moderate',
    };
  }

  private getImpact(severity: Severity, fileName: string, vulnName: string): string {
    return `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity vulnerability ${vulnName} found in ${fileName}. This could potentially be exploited by attackers.`;
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
