// Nuclei Integration - Template-based Vulnerability Scanner
// License: MIT
// Website: https://nuclei.projectdiscovery.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface NucleiResult {
  'template-id': string;
  'template-path': string;
  info: {
    name: string;
    author: string[];
    tags: string[];
    description: string;
    reference: string[];
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    classification?: {
      'cve-id'?: string[];
      'cwe-id'?: string[];
      'cvss-metrics'?: string;
      'cvss-score'?: number;
    };
  };
  type: string;
  host: string;
  matched: string;
  'matched-at': string;
  'extracted-results'?: string[];
  timestamp: string;
  'curl-command'?: string;
}

export class NucleiIntegration implements ToolIntegration {
  name = 'Nuclei';
  category = 'security' as const;
  description = 'Fast and customizable vulnerability scanner based on templates';
  website = 'https://nuclei.projectdiscovery.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('nuclei -version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        templates: 'cves,vulnerabilities,misconfigurations',
        severity: 'low,medium,high,critical',
        rateLimit: 150,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetUrl = target.url;

      if (!targetUrl) {
        return {
          tool: this.name,
          category: this.category,
          success: false,
          duration: Date.now() - startTime,
          findings: [],
          summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
          error: 'URL target is required for Nuclei scanning',
        };
      }

      const severity = (config?.options?.severity as string) || 'low,medium,high,critical';
      const rateLimit = (config?.options?.rateLimit as number) || 150;

      const result = execSync(
        `nuclei -u "${targetUrl}" -severity ${severity} -rate-limit ${rateLimit} -json -silent`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 300000 }
      );

      const lines = result.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const finding: NucleiResult = JSON.parse(line);
          findings.push(this.convertToFinding(finding));
        } catch {
          // Skip invalid JSON lines
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

  private convertToFinding(result: NucleiResult): AuditFinding {
    const severityMap: Record<string, Severity> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
      info: 'info',
    };

    const severity = severityMap[result.info.severity] || 'medium';
    const classification = result.info.classification;

    return {
      id: `nuclei-${result['template-id']}-${result.host}`,
      tool: this.name,
      category: this.category,
      severity,
      title: result.info.name,
      description: result.info.description || `Vulnerability detected: ${result.info.name}`,
      explanation: `Nuclei detected a ${result.info.severity} severity vulnerability using template "${result['template-id']}". ${result.info.description || ''}`,
      impact: this.getImpactDescription(severity, classification),
      file: result['matched-at'],
      recommendation: `Review and remediate the vulnerability. ${result.info.reference?.length ? 'See references for remediation guidance.' : ''}`,
      documentationUrl: result.info.reference?.[0] || `https://github.com/projectdiscovery/nuclei-templates/blob/main/${result['template-path']}`,
      aiPrompt: {
        short: `Fix ${result.info.name} vulnerability`,
        detailed: `A vulnerability was detected by Nuclei.

Vulnerability: ${result.info.name}
Severity: ${result.info.severity}
Host: ${result.host}
Matched at: ${result['matched-at']}
Template: ${result['template-id']}

${result.info.description || ''}

${classification?.['cve-id']?.length ? `CVE: ${classification['cve-id'].join(', ')}` : ''}
${classification?.['cwe-id']?.length ? `CWE: ${classification['cwe-id'].join(', ')}` : ''}
${classification?.['cvss-score'] ? `CVSS Score: ${classification['cvss-score']}` : ''}

References:
${result.info.reference?.map(r => `- ${r}`).join('\n') || 'None provided'}

Please investigate and remediate this vulnerability.`,
        steps: [
          'Verify the vulnerability is not a false positive',
          'Review the matched endpoint and vulnerable component',
          'Apply patches or configuration changes as needed',
          'Implement additional security controls if necessary',
          'Re-scan to verify remediation',
        ],
      },
      ruleId: result['template-id'],
      tags: ['nuclei', 'vulnerability', result.info.severity, ...result.info.tags, ...(classification?.['cve-id'] || [])],
      effort: severity === 'critical' || severity === 'high' ? 'high' : 'moderate',
    };
  }

  private getImpactDescription(severity: Severity, classification?: NucleiResult['info']['classification']): string {
    const cvss = classification?.['cvss-score'];
    const cve = classification?.['cve-id']?.join(', ');

    let impact = '';
    switch (severity) {
      case 'critical':
        impact = 'This critical vulnerability could allow complete system compromise, data theft, or remote code execution.';
        break;
      case 'high':
        impact = 'This high severity vulnerability could lead to significant security breaches or data exposure.';
        break;
      case 'medium':
        impact = 'This medium severity vulnerability may allow partial system access or information disclosure.';
        break;
      case 'low':
        impact = 'This low severity vulnerability presents limited risk but should still be addressed.';
        break;
      default:
        impact = 'This informational finding may indicate a potential security concern.';
    }

    if (cvss) impact += ` CVSS Score: ${cvss}.`;
    if (cve) impact += ` Related CVE: ${cve}.`;

    return impact;
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
