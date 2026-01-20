// Retire.js Integration
// License: Apache 2.0
// Website: https://retirejs.github.io/retire.js/

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface RetireVulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low';
  identifiers: {
    CVE?: string[];
    bug?: string;
    issue?: string;
    summary?: string;
  };
  info: string[];
}

interface RetireResult {
  file: string;
  results: Array<{
    component: string;
    version: string;
    vulnerabilities: RetireVulnerability[];
  }>;
}

export class RetireJSIntegration implements ToolIntegration {
  name = 'Retire.js';
  category = 'security' as const;
  description = 'Scanner detecting the use of JavaScript libraries with known vulnerabilities';
  website = 'https://retirejs.github.io/retire.js/';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx retire --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        severity: 'low',
        ignorePaths: ['node_modules', '.git'],
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const ignorePaths = (config?.options?.ignorePaths as string[]) || ['node_modules'];
      const ignoreArgs = ignorePaths.map(p => `--ignore "${p}"`).join(' ');

      const result = execSync(
        `npx retire --path "${targetDir}" --outputformat json ${ignoreArgs}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const retireResults: RetireResult[] = JSON.parse(result);

      for (const fileResult of retireResults) {
        for (const componentResult of fileResult.results) {
          for (const vuln of componentResult.vulnerabilities) {
            findings.push(this.convertToFinding(fileResult.file, componentResult, vuln));
          }
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const retireResults: RetireResult[] = JSON.parse((error as { stdout: string }).stdout);
          for (const fileResult of retireResults) {
            for (const componentResult of fileResult.results) {
              for (const vuln of componentResult.vulnerabilities) {
                findings.push(this.convertToFinding(fileResult.file, componentResult, vuln));
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

  private convertToFinding(
    filePath: string,
    component: { component: string; version: string },
    vuln: RetireVulnerability
  ): AuditFinding {
    const cves = vuln.identifiers.CVE || [];
    const vulnId = cves[0] || vuln.identifiers.bug || vuln.identifiers.issue || 'unknown';

    return {
      id: `retirejs-${component.component}-${component.version}-${vulnId}`,
      tool: this.name,
      category: this.category,
      severity: vuln.severity as Severity,
      title: `Retire.js: Vulnerable ${component.component}@${component.version}`,
      description: vuln.identifiers.summary || `${component.component} version ${component.version} has known vulnerabilities`,
      explanation: `This JavaScript library has known security vulnerabilities. ${cves.length ? `CVE(s): ${cves.join(', ')}` : ''}`,
      impact: this.getImpact(vuln.severity, component.component),
      file: filePath,
      recommendation: `Update ${component.component} to the latest secure version.`,
      documentationUrl: vuln.info?.[0] || `https://nvd.nist.gov/vuln/detail/${cves[0] || ''}`,
      aiPrompt: {
        short: `Update vulnerable ${component.component}@${component.version} in ${filePath}`,
        detailed: `
Fix the JavaScript library vulnerability found by Retire.js.

Library: ${component.component}
Vulnerable Version: ${component.version}
Severity: ${vuln.severity}
${cves.length ? `CVE(s): ${cves.join(', ')}` : ''}
File: ${filePath}

${vuln.identifiers.summary || 'This version has known security vulnerabilities.'}

More info:
${vuln.info?.join('\n') || 'See NVD or library documentation'}

Steps to fix:
1. Check the library's release notes for the fix version
2. Update your package.json or directly update the script reference
3. Test your application thoroughly
4. Re-run Retire.js to confirm the fix
        `.trim(),
        steps: [
          `Identify the latest secure version of ${component.component}`,
          'Update the library in your package.json or HTML script tags',
          'Run npm install or update your CDN references',
          'Test all functionality that uses this library',
          'Re-scan with Retire.js',
        ],
      },
      ruleId: vulnId,
      tags: ['retirejs', 'javascript', component.component, ...cves],
      effort: 'easy',
    };
  }

  private getImpact(severity: string, component: string): string {
    const impacts: Record<string, string> = {
      critical: `Critical vulnerability in ${component} could allow remote code execution or complete application compromise.`,
      high: `High-severity vulnerability in ${component} could lead to significant security breaches.`,
      medium: `Medium-severity vulnerability in ${component} could be exploited under certain conditions.`,
      low: `Low-severity vulnerability in ${component} has limited security impact.`,
    };
    return impacts[severity] || `Vulnerability found in ${component}.`;
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
