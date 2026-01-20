// OWASP ZAP Integration (Dynamic Application Security Testing)
// License: Apache 2.0
// Website: https://www.zaproxy.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface ZAPAlert {
  pluginId: string;
  alertRef: string;
  alert: string;
  name: string;
  riskcode: string;
  confidence: string;
  riskdesc: string;
  desc: string;
  count: string;
  solution: string;
  otherinfo: string;
  reference: string;
  cweid: string;
  wascid: string;
  sourceid: string;
  instances: Array<{
    uri: string;
    method: string;
    param: string;
    attack: string;
    evidence: string;
  }>;
}

interface ZAPReport {
  '@version': string;
  '@generated': string;
  site: Array<{
    '@name': string;
    '@host': string;
    alerts: ZAPAlert[];
  }>;
}

export class OWASPZAPIntegration implements ToolIntegration {
  name = 'OWASP ZAP';
  category = 'security' as const;
  description = 'World\'s most widely used web app scanner for finding security vulnerabilities';
  website = 'https://www.zaproxy.org';

  private zapUrl: string;
  private apiKey: string;

  constructor(config?: { zapUrl?: string; apiKey?: string }) {
    this.zapUrl = config?.zapUrl || process.env.ZAP_URL || 'http://localhost:8080';
    this.apiKey = config?.apiKey || process.env.ZAP_API_KEY || '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.zapUrl}/JSON/core/view/version/`);
      return response.ok;
    } catch {
      // Try Docker-based ZAP
      try {
        const { execSync } = await import('child_process');
        execSync('docker images owasp/zap2docker-stable -q', { encoding: 'utf-8' });
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
        scanType: 'baseline', // 'baseline', 'full', 'api'
        ajax: false,
        timeout: 300,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.url) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'URL target is required for OWASP ZAP scanning',
      };
    }

    try {
      const scanType = (config?.options?.scanType as string) || 'baseline';
      const alerts = await this.runDockerScan(target.url, scanType);

      for (const alert of alerts) {
        findings.push(this.convertToFinding(alert, target.url));
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

  private async runDockerScan(targetUrl: string, scanType: string): Promise<ZAPAlert[]> {
    const { execSync } = await import('child_process');

    const scriptMap: Record<string, string> = {
      baseline: 'zap-baseline.py',
      full: 'zap-full-scan.py',
      api: 'zap-api-scan.py',
    };

    const script = scriptMap[scanType] || 'zap-baseline.py';

    try {
      const result = execSync(
        `docker run --rm -t owasp/zap2docker-stable ${script} -t ${targetUrl} -J report.json 2>&1 || true`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
      );

      // Parse JSON from output
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const report: ZAPReport = JSON.parse(jsonMatch[0]);
        return report.site?.[0]?.alerts || [];
      }

      return [];
    } catch {
      return [];
    }
  }

  private convertToFinding(alert: ZAPAlert, targetUrl: string): AuditFinding {
    const riskMap: Record<string, Severity> = {
      '3': 'critical',
      '2': 'high',
      '1': 'medium',
      '0': 'low',
    };

    const severity = riskMap[alert.riskcode] || 'medium';
    const instance = alert.instances?.[0];

    return {
      id: `zap-${alert.pluginId}-${alert.alertRef}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `ZAP: ${alert.name}`,
      description: alert.desc.replace(/<[^>]*>/g, ''),
      explanation: `Risk: ${alert.riskdesc}. Confidence: ${alert.confidence}. ${alert.otherinfo || ''}`,
      impact: this.getImpact(severity, alert.name),
      url: instance?.uri || targetUrl,
      recommendation: alert.solution.replace(/<[^>]*>/g, ''),
      documentationUrl: alert.reference?.split('\n')?.[0] || 'https://www.zaproxy.org/docs/alerts/',
      aiPrompt: {
        short: `Fix ZAP security issue: ${alert.name} at ${instance?.uri || targetUrl}`,
        detailed: `
Fix the security vulnerability found by OWASP ZAP dynamic scanning.

Alert: ${alert.name}
Risk Level: ${alert.riskdesc}
Confidence: ${alert.confidence}
URL: ${instance?.uri || targetUrl}
${instance?.method ? `Method: ${instance.method}` : ''}
${instance?.param ? `Parameter: ${instance.param}` : ''}
${instance?.evidence ? `Evidence: ${instance.evidence}` : ''}

Description:
${alert.desc.replace(/<[^>]*>/g, '')}

${alert.cweid ? `CWE-${alert.cweid}` : ''}
${alert.wascid ? `WASC-${alert.wascid}` : ''}

Solution:
${alert.solution.replace(/<[^>]*>/g, '')}

Please implement the recommended fix to address this vulnerability.
        `.trim(),
        steps: [
          'Understand the vulnerability and how it was detected',
          'Locate the affected code or configuration',
          'Implement the recommended solution',
          'Re-run ZAP scan to verify the fix',
        ],
      },
      ruleId: alert.pluginId,
      tags: ['zap', 'owasp', 'dast', 'security', `cwe-${alert.cweid}`],
      effort: this.estimateEffort(severity),
    };
  }

  private getImpact(severity: Severity, alertName: string): string {
    const impacts: Record<Severity, string> = {
      critical: `This is a critical security vulnerability (${alertName}) that could lead to complete system compromise.`,
      high: `This is a high-severity vulnerability (${alertName}) that could lead to significant data exposure or system access.`,
      medium: `This is a medium-severity vulnerability (${alertName}) that could be exploited under certain conditions.`,
      low: `This is a low-severity vulnerability (${alertName}) with limited impact.`,
      info: `This is an informational finding (${alertName}) that may indicate potential issues.`,
    };
    return impacts[severity];
  }

  private estimateEffort(severity: Severity): AuditFinding['effort'] {
    const effortMap: Record<Severity, AuditFinding['effort']> = {
      critical: 'hard',
      high: 'moderate',
      medium: 'moderate',
      low: 'easy',
      info: 'trivial',
    };
    return effortMap[severity];
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
