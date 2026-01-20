// NPM Audit Pure JS Runner
// Uses npm registry API directly

import { AuditFinding, AuditResult, Severity } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';

interface NpmAuditVulnerability {
  name: string;
  severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
  via: Array<string | { name: string; title: string; url: string; severity: string; cwe: string[] }>;
  effects: string[];
  range: string;
  fixAvailable: boolean | { name: string; version: string; isSemVerMajor: boolean };
}

export async function runNpmAudit(
  targetDir: string,
  _options: Record<string, unknown> = {}
): Promise<AuditResult> {
  const startTime = Date.now();
  const findings: AuditFinding[] = [];

  try {
    // Read package-lock.json
    const lockfilePath = path.join(targetDir, 'package-lock.json');
    const lockfileContent = await fs.readFile(lockfilePath, 'utf-8');
    const lockfile = JSON.parse(lockfileContent);

    // Use npm registry bulk advisory API
    const packages: Record<string, string[]> = {};

    // Extract dependencies from lockfile
    if (lockfile.packages) {
      for (const [pkgPath, pkgInfo] of Object.entries(lockfile.packages)) {
        if (pkgPath && pkgPath !== '' && (pkgInfo as { version?: string }).version) {
          const name = pkgPath.replace(/^node_modules\//, '').replace(/^.*node_modules\//, '');
          if (name && !name.startsWith('.')) {
            if (!packages[name]) packages[name] = [];
            packages[name].push((pkgInfo as { version: string }).version);
          }
        }
      }
    }

    // Query npm registry for advisories
    const response = await fetch('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packages),
    });

    if (response.ok) {
      const advisories = await response.json() as Record<string, NpmAuditVulnerability>;

      for (const [pkgName, vuln] of Object.entries(advisories)) {
        findings.push(convertToFinding(pkgName, vuln));
      }
    }

    return createResult(findings, Date.now() - startTime);
  } catch (error) {
    return {
      tool: 'npm audit',
      category: 'security',
      success: false,
      duration: Date.now() - startTime,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error: error instanceof Error ? error.message : 'Failed to run npm audit',
    };
  }
}

function convertToFinding(pkgName: string, vuln: NpmAuditVulnerability): AuditFinding {
  const severityMap: Record<string, Severity> = {
    critical: 'critical',
    high: 'high',
    moderate: 'medium',
    low: 'low',
    info: 'info',
  };

  const severity = severityMap[vuln.severity] || 'medium';
  const viaInfo = vuln.via.find(v => typeof v === 'object') as { title?: string; url?: string; cwe?: string[] } | undefined;

  return {
    id: `npm-audit-${pkgName}-${vuln.range}`,
    tool: 'npm audit',
    category: 'security',
    severity,
    title: `Vulnerable dependency: ${pkgName}`,
    description: viaInfo?.title || `Security vulnerability in ${pkgName} (${vuln.range})`,
    explanation: `The package ${pkgName} has a known security vulnerability. ${vuln.effects.length > 0 ? `This affects: ${vuln.effects.join(', ')}.` : ''}`,
    impact: `This ${vuln.severity} severity vulnerability could potentially be exploited if the affected code path is reachable.`,
    recommendation: vuln.fixAvailable
      ? typeof vuln.fixAvailable === 'object'
        ? `Update to ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}${vuln.fixAvailable.isSemVerMajor ? ' (major version change)' : ''}`
        : 'Run npm audit fix to automatically fix this vulnerability'
      : 'No fix available. Consider finding an alternative package or implementing mitigations.',
    documentationUrl: viaInfo?.url,
    aiPrompt: {
      short: `Fix npm vulnerability in ${pkgName}`,
      detailed: `Fix the security vulnerability in ${pkgName}.

Severity: ${vuln.severity}
Affected versions: ${vuln.range}
${viaInfo?.title ? `Issue: ${viaInfo.title}` : ''}
${viaInfo?.cwe ? `CWE: ${viaInfo.cwe.join(', ')}` : ''}

${vuln.fixAvailable ? 'A fix is available via npm audit fix.' : 'No automatic fix available.'}

Affected dependencies: ${vuln.effects.join(', ') || 'direct dependency'}`,
      steps: [
        'Run npm audit to see full details',
        vuln.fixAvailable ? 'Run npm audit fix to apply automatic fix' : 'Manually update the package or find alternative',
        'Test that the application still works',
        'Run npm audit again to verify the fix',
      ],
    },
    ruleId: `npm-vuln-${pkgName}`,
    tags: ['npm', 'security', 'dependency', vuln.severity, ...(viaInfo?.cwe || [])],
    effort: vuln.fixAvailable ? 'low' : 'moderate',
    autoFixable: !!vuln.fixAvailable,
  };
}

function createResult(findings: AuditFinding[], duration: number): AuditResult {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => bySeverity[f.severity]++);

  return {
    tool: 'npm audit',
    category: 'security',
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
