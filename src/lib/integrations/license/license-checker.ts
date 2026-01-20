// License Checker Integration - npm License Auditing
// License: BSD-3-Clause
// Website: https://github.com/davglass/license-checker

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface LicenseInfo {
  licenses: string;
  repository?: string;
  publisher?: string;
  email?: string;
  path: string;
  licenseFile?: string;
}

type LicenseCheckerOutput = Record<string, LicenseInfo>;

const PROBLEMATIC_LICENSES = ['GPL', 'AGPL', 'LGPL', 'SSPL', 'CPAL', 'OSL', 'RPL', 'Sleepycat', 'Watcom'];
const UNKNOWN_LICENSES = ['UNKNOWN', 'UNLICENSED', 'SEE LICENSE IN', 'Custom'];

export class LicenseCheckerIntegration implements ToolIntegration {
  name = 'license-checker';
  category = 'security' as const;
  description = 'Checks npm dependencies for license compliance';
  website = 'https://github.com/davglass/license-checker';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx license-checker --version', { stdio: 'ignore', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: true, options: { production: true, failOn: 'GPL;AGPL' } };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const production = config?.options?.production !== false ? '--production' : '';

      const result = execSync(`npx license-checker --json ${production}`, { cwd: targetDir, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
      const licenses: LicenseCheckerOutput = JSON.parse(result);

      for (const [pkg, info] of Object.entries(licenses)) {
        const license = info.licenses;

        // Check for problematic licenses
        if (PROBLEMATIC_LICENSES.some(l => license.toUpperCase().includes(l))) {
          findings.push(this.createFinding(pkg, info, 'high', 'copyleft'));
        }
        // Check for unknown licenses
        else if (UNKNOWN_LICENSES.some(l => license.toUpperCase().includes(l))) {
          findings.push(this.createFinding(pkg, info, 'medium', 'unknown'));
        }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      return { tool: this.name, category: this.category, success: false, duration: Date.now() - startTime, findings: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 }, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private createFinding(pkg: string, info: LicenseInfo, severity: Severity, type: 'copyleft' | 'unknown'): AuditFinding {
    const [name, version] = pkg.split('@').filter(Boolean);

    return {
      id: `license-${pkg}`,
      tool: this.name, category: this.category, severity,
      title: type === 'copyleft'
        ? `Copyleft License: ${name} (${info.licenses})`
        : `Unknown License: ${name} (${info.licenses})`,
      description: type === 'copyleft'
        ? `Package ${name}@${version} uses ${info.licenses} which may require your code to be open-sourced.`
        : `Package ${name}@${version} has an unknown or custom license that needs review.`,
      explanation: type === 'copyleft'
        ? 'Copyleft licenses like GPL/AGPL require derivative works to be distributed under the same license. This may conflict with proprietary software distribution.'
        : 'Unknown licenses need manual review to ensure compliance with your organization\'s policies.',
      impact: type === 'copyleft'
        ? 'May require open-sourcing your code if this dependency is included.'
        : 'Legal risk from using software with unclear licensing terms.',
      recommendation: type === 'copyleft'
        ? `Review if ${info.licenses} is acceptable. Consider finding an alternative with a permissive license.`
        : `Review the license at ${info.licenseFile || info.path} and get legal approval.`,
      documentationUrl: info.repository,
      aiPrompt: {
        short: `Review ${name} license: ${info.licenses}`,
        detailed: `License review needed:\n\nPackage: ${name}@${version}\nLicense: ${info.licenses}\nRepository: ${info.repository || 'N/A'}\n\n${type === 'copyleft' ? 'This is a copyleft license.' : 'License needs verification.'}`,
        steps: ['Review license terms', 'Check with legal if needed', 'Find alternative or get approval']
      },
      ruleId: type === 'copyleft' ? 'copyleft-license' : 'unknown-license',
      tags: ['license', type, info.licenses.toLowerCase().replace(/[^a-z0-9]/g, '-')],
      effort: 'moderate',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);
    return { tool: this.name, category: this.category, success: true, duration, findings, summary: { total: findings.length, bySeverity, passed: 0, failed: findings.length } };
  }
}
