// Grype Integration - Container Image Vulnerability Scanner
// License: Apache 2.0
// Website: https://github.com/anchore/grype

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface GrypeVulnerability {
  id: string;
  dataSource: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Negligible' | 'Unknown';
  urls: string[];
  description: string;
  cvss: Array<{ source: string; type: string; version: string; vector: string; metrics: { baseScore: number } }>;
  fix: { versions: string[]; state: string };
  advisories: Array<{ id: string; link: string }>;
}

interface GrypeMatch {
  vulnerability: GrypeVulnerability;
  artifact: {
    name: string;
    version: string;
    type: string;
    locations: Array<{ path: string }>;
  };
}

interface GrypeOutput {
  matches: GrypeMatch[];
  source: { type: string; target: string };
}

export class GrypeIntegration implements ToolIntegration {
  name = 'Grype';
  category = 'security' as const;
  description = 'Container image and filesystem vulnerability scanner';
  website = 'https://github.com/anchore/grype';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('grype version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        failOnSeverity: 'high',
        scope: 'all-layers',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetPath = target.image || target.directory || '.';

      const result = execSync(
        `grype ${targetPath} -o json --quiet`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
      );

      const output: GrypeOutput = JSON.parse(result);

      for (const match of output.matches) {
        findings.push(this.convertToFinding(match));
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: GrypeOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const match of output.matches) {
            findings.push(this.convertToFinding(match));
          }
          return this.createResult(findings, Date.now() - startTime);
        } catch { /* Parse error */ }
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

  private convertToFinding(match: GrypeMatch): AuditFinding {
    const severityMap: Record<string, Severity> = {
      Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low', Negligible: 'info', Unknown: 'info',
    };
    const severity = severityMap[match.vulnerability.severity] || 'medium';
    const cvssScore = match.vulnerability.cvss?.[0]?.metrics?.baseScore;

    return {
      id: `grype-${match.vulnerability.id}-${match.artifact.name}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `${match.vulnerability.id}: ${match.artifact.name}@${match.artifact.version}`,
      description: match.vulnerability.description || `Vulnerability in ${match.artifact.name}`,
      explanation: `Grype found a ${match.vulnerability.severity} vulnerability (${match.vulnerability.id}) in ${match.artifact.name} version ${match.artifact.version}.`,
      impact: cvssScore ? `CVSS Score: ${cvssScore}. ${this.getImpactDescription(severity)}` : this.getImpactDescription(severity),
      file: match.artifact.locations?.[0]?.path,
      recommendation: match.vulnerability.fix?.versions?.length
        ? `Upgrade to version ${match.vulnerability.fix.versions.join(' or ')}`
        : 'No fix available yet. Consider alternative packages or implement compensating controls.',
      documentationUrl: match.vulnerability.urls?.[0] || match.vulnerability.advisories?.[0]?.link,
      aiPrompt: {
        short: `Fix ${match.vulnerability.id} in ${match.artifact.name}`,
        detailed: `Vulnerability found by Grype:\n\nPackage: ${match.artifact.name}@${match.artifact.version}\nVulnerability: ${match.vulnerability.id}\nSeverity: ${match.vulnerability.severity}${cvssScore ? `\nCVSS: ${cvssScore}` : ''}\n\n${match.vulnerability.description}\n\n${match.vulnerability.fix?.versions?.length ? `Fix: Upgrade to ${match.vulnerability.fix.versions.join(' or ')}` : 'No fix available.'}`,
        steps: [
          'Review the vulnerability details',
          match.vulnerability.fix?.versions?.length ? `Upgrade ${match.artifact.name} to ${match.vulnerability.fix.versions[0]}` : 'Check for alternative packages',
          'Test the application after upgrade',
          'Rescan with Grype to verify fix',
        ],
      },
      ruleId: match.vulnerability.id,
      tags: ['grype', 'container', 'vulnerability', match.vulnerability.id, match.artifact.type],
      effort: match.vulnerability.fix?.versions?.length ? 'low' : 'high',
    };
  }

  private getImpactDescription(severity: Severity): string {
    const impacts: Record<Severity, string> = {
      critical: 'Critical vulnerability that could lead to system compromise.',
      high: 'High severity vulnerability requiring prompt attention.',
      medium: 'Medium severity issue that should be addressed soon.',
      low: 'Low severity issue with limited impact.',
      info: 'Informational finding.',
    };
    return impacts[severity];
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);
    return { tool: this.name, category: this.category, success: true, duration, findings, summary: { total: findings.length, bySeverity, passed: 0, failed: findings.length } };
  }
}
