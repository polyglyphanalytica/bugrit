// TruffleHog Integration - Secret Scanner
// License: AGPL-3.0
// Website: https://trufflesecurity.com/trufflehog

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface TruffleHogResult {
  SourceMetadata: {
    Data: {
      Filesystem?: { file: string; line: number };
      Git?: { commit: string; file: string; line: number; email: string };
    };
  };
  SourceID: number;
  SourceType: number;
  SourceName: string;
  DetectorType: number;
  DetectorName: string;
  DecoderName: string;
  Verified: boolean;
  Raw: string;
  RawV2: string;
  Redacted: string;
  ExtraData: Record<string, string>;
  StructuredData: unknown;
}

export class TrufflehogIntegration implements ToolIntegration {
  name = 'TruffleHog';
  category = 'security' as const;
  description = 'Scans for secrets in git history and filesystems';
  website = 'https://trufflesecurity.com/trufflehog';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('trufflehog --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: true, options: { verified: false } };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const verifiedOnly = config?.options?.verified ? '--only-verified' : '';

      const result = execSync(
        `trufflehog filesystem "${targetDir}" --json ${verifiedOnly} 2>/dev/null || true`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 }
      );

      const lines = result.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const finding: TruffleHogResult = JSON.parse(line);
          findings.push(this.convertToFinding(finding));
        } catch { /* Skip invalid lines */ }
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      return { tool: this.name, category: this.category, success: false, duration: Date.now() - startTime, findings: [], summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 }, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private convertToFinding(result: TruffleHogResult): AuditFinding {
    const severity: Severity = result.Verified ? 'critical' : 'high';
    const fileData = result.SourceMetadata.Data.Filesystem || result.SourceMetadata.Data.Git;
    const file = fileData?.file || 'unknown';
    const line = fileData?.line;

    return {
      id: `trufflehog-${result.DetectorName}-${file}-${line || 0}`,
      tool: this.name, category: this.category, severity,
      title: `Secret Found: ${result.DetectorName}${result.Verified ? ' (VERIFIED)' : ''}`,
      description: `${result.DetectorName} secret detected${result.Verified ? ' and verified as active' : ''}.`,
      explanation: result.Verified
        ? 'TruffleHog found AND VERIFIED this secret is active. It must be rotated immediately.'
        : 'TruffleHog found a potential secret. Verify if it is active and rotate if necessary.',
      impact: result.Verified
        ? 'CRITICAL: This verified secret is currently active and could be used by attackers.'
        : 'Exposed secrets can lead to unauthorized access.',
      file,
      line,
      codeSnippet: result.Redacted,
      recommendation: '1. Rotate the secret immediately\n2. Remove from source code\n3. Use environment variables or secrets manager\n4. Check git history for exposure',
      aiPrompt: {
        short: `Rotate ${result.DetectorName} secret`,
        detailed: `${result.Verified ? 'VERIFIED ' : ''}Secret detected:\n\nType: ${result.DetectorName}\nFile: ${file}${line ? `\nLine: ${line}` : ''}\nVerified: ${result.Verified}\n\nRedacted: ${result.Redacted}\n\n1. Rotate this credential immediately\n2. Remove from source code\n3. Use secrets manager`,
        steps: ['Rotate the credential', 'Remove from code', 'Add to secrets manager', 'Check git history']
      },
      ruleId: result.DetectorName,
      tags: ['trufflehog', 'secrets', result.DetectorName.toLowerCase(), result.Verified ? 'verified' : 'unverified'],
      effort: 'low',
    };
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);
    return { tool: this.name, category: this.category, success: true, duration, findings, summary: { total: findings.length, bySeverity, passed: 0, failed: findings.length } };
  }
}
