// npm audit Integration
// License: Built into npm
// Website: https://docs.npmjs.com/cli/v8/commands/npm-audit

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface NPMAuditVuln {
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  isDirect: boolean;
  via: Array<{
    source: number;
    name: string;
    dependency: string;
    title: string;
    url: string;
    severity: string;
    cwe: string[];
    cvss: { score: number; vectorString: string };
    range: string;
  }> | string[];
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | {
    name: string;
    version: string;
    isSemVerMajor: boolean;
  };
}

interface NPMAuditOutput {
  auditReportVersion: number;
  vulnerabilities: Record<string, NPMAuditVuln>;
  metadata: {
    vulnerabilities: {
      total: number;
      critical: number;
      high: number;
      moderate: number;
      low: number;
      info: number;
    };
    dependencies: {
      total: number;
      prod: number;
      dev: number;
    };
  };
}

export class NPMAuditIntegration implements ToolIntegration {
  name = 'npm audit';
  category = 'security' as const;
  description = 'Built-in npm security audit that checks for known vulnerabilities in dependencies';
  website = 'https://docs.npmjs.com/cli/v8/commands/npm-audit';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npm --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        production: false,
        level: 'low', // minimum severity
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const prodOnly = config?.options?.production ? '--omit=dev' : '';

      const result = execSync(
        `cd "${targetDir}" && npm audit --json ${prodOnly}`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const output: NPMAuditOutput = JSON.parse(result);

      for (const [pkgName, vuln] of Object.entries(output.vulnerabilities)) {
        findings.push(this.convertToFinding(pkgName, vuln, targetDir));
      }

      return this.createResult(findings, Date.now() - startTime, output.metadata);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: NPMAuditOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const [pkgName, vuln] of Object.entries(output.vulnerabilities)) {
            findings.push(this.convertToFinding(pkgName, vuln, target.directory || '.'));
          }
          return this.createResult(findings, Date.now() - startTime, output.metadata);
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

  private convertToFinding(pkgName: string, vuln: NPMAuditVuln, targetDir: string): AuditFinding {
    const severityMap: Record<string, Severity> = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low',
      info: 'info',
    };

    const severity = severityMap[vuln.severity] || 'medium';
    const viaInfo = vuln.via.find(v => typeof v !== 'string') as {
      title: string;
      url: string;
      cwe: string[];
      cvss: { score: number };
    } | undefined;

    const fixInfo = typeof vuln.fixAvailable === 'object' ? vuln.fixAvailable : null;

    return {
      id: `npm-audit-${pkgName}-${vuln.range}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `npm audit: ${viaInfo?.title || `Vulnerability in ${pkgName}`}`,
      description: `${pkgName} (${vuln.range}) has ${vuln.severity} severity vulnerability${vuln.isDirect ? ' (direct dependency)' : ' (transitive dependency)'}`,
      explanation: this.buildExplanation(vuln, viaInfo),
      impact: this.getImpact(severity, pkgName, vuln.isDirect),
      file: `${targetDir}/package.json`,
      recommendation: this.getRecommendation(pkgName, vuln, fixInfo),
      documentationUrl: viaInfo?.url || `https://www.npmjs.com/advisories`,
      aiPrompt: {
        short: `Fix npm audit ${vuln.severity} vulnerability in ${pkgName}`,
        detailed: `
Fix the npm dependency vulnerability.

Package: ${pkgName}
Affected Versions: ${vuln.range}
Severity: ${vuln.severity}
${vuln.isDirect ? 'This is a direct dependency' : `This is a transitive dependency (via ${vuln.effects.join(', ')})`}
${viaInfo?.cvss ? `CVSS Score: ${viaInfo.cvss.score}` : ''}
${viaInfo?.cwe?.length ? `CWE: ${viaInfo.cwe.join(', ')}` : ''}

${viaInfo?.title || 'Vulnerability details available at the advisory URL'}

${fixInfo ? `
Fix available:
- Update ${fixInfo.name} to ${fixInfo.version}
- ${fixInfo.isSemVerMajor ? 'WARNING: This is a major version update that may have breaking changes' : 'This is a compatible update'}
` : 'No automatic fix available. Manual review required.'}

To fix:
${fixInfo ? `
1. Run: npm audit fix ${fixInfo.isSemVerMajor ? '--force' : ''}
2. Test your application
3. Re-run npm audit
` : `
1. Check if a newer version of ${pkgName} fixes this issue
2. If not, consider alternative packages
3. If neither is possible, document and monitor the risk
`}
        `.trim(),
        steps: fixInfo
          ? [
              `Run: npm audit fix${fixInfo.isSemVerMajor ? ' --force (breaking changes possible)' : ''}`,
              'Review package-lock.json changes',
              'Run tests to ensure nothing broke',
              'Re-run npm audit to verify',
            ]
          : [
              `Check for newer versions of ${pkgName}`,
              'Consider alternative packages',
              'If no fix exists, document the accepted risk',
              'Monitor for future security updates',
            ],
      },
      ruleId: viaInfo?.cwe?.[0] || 'npm-advisory',
      tags: ['npm-audit', 'dependency', pkgName, vuln.severity, ...(viaInfo?.cwe || [])],
      effort: fixInfo ? (fixInfo.isSemVerMajor ? 'moderate' : 'easy') : 'hard',
    };
  }

  private buildExplanation(
    vuln: NPMAuditVuln,
    viaInfo?: { cvss: { score: number }; cwe: string[] }
  ): string {
    const parts: string[] = [];

    if (vuln.isDirect) {
      parts.push('This is a direct dependency in your package.json.');
    } else {
      parts.push(`This is a transitive dependency brought in by: ${vuln.effects.join(', ')}.`);
    }

    if (viaInfo?.cvss) {
      parts.push(`CVSS Score: ${viaInfo.cvss.score}.`);
    }

    if (viaInfo?.cwe?.length) {
      parts.push(`CWE: ${viaInfo.cwe.join(', ')}.`);
    }

    return parts.join(' ');
  }

  private getImpact(severity: Severity, pkgName: string, isDirect: boolean): string {
    const dependencyType = isDirect ? 'direct' : 'transitive';
    return `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity vulnerability in ${dependencyType} dependency ${pkgName}. Attackers may be able to exploit this vulnerability.`;
  }

  private getRecommendation(
    pkgName: string,
    vuln: NPMAuditVuln,
    fixInfo: { name: string; version: string; isSemVerMajor: boolean } | null
  ): string {
    if (fixInfo) {
      if (fixInfo.isSemVerMajor) {
        return `Run 'npm audit fix --force' to update ${fixInfo.name} to ${fixInfo.version}. Warning: This is a major version change and may include breaking changes.`;
      }
      return `Run 'npm audit fix' to automatically update ${fixInfo.name} to ${fixInfo.version}.`;
    }
    return `No automatic fix available for ${pkgName}. Consider updating parent dependencies (${vuln.effects.join(', ')}) or finding an alternative package.`;
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    metadata?: NPMAuditOutput['metadata']
  ): AuditResult {
    const bySeverity = {
      critical: metadata?.vulnerabilities.critical || 0,
      high: metadata?.vulnerabilities.high || 0,
      medium: metadata?.vulnerabilities.moderate || 0,
      low: metadata?.vulnerabilities.low || 0,
      info: metadata?.vulnerabilities.info || 0,
    };

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: metadata?.vulnerabilities.total || findings.length,
        bySeverity,
        passed: 0,
        failed: findings.length,
      },
      metadata: metadata ? {
        totalDependencies: metadata.dependencies.total,
        prodDependencies: metadata.dependencies.prod,
        devDependencies: metadata.dependencies.dev,
      } : undefined,
    };
  }
}
