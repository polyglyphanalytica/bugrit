// ScanCode Integration - License and Copyright Scanner
// License: Apache 2.0
// Website: https://scancode-toolkit.readthedocs.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface ScanCodeFile {
  path: string;
  type: string;
  licenses: ScanCodeLicense[];
  copyrights: ScanCodeCopyright[];
  packages: ScanCodePackage[];
  scan_errors: string[];
}

interface ScanCodeLicense {
  key: string;
  name: string;
  category: string;
  spdx_license_key: string;
  score: number;
  owner: string;
  is_exception: boolean;
  is_unknown: boolean;
  start_line: number;
  end_line: number;
  matched_rule: {
    identifier: string;
    license_expression: string;
  };
}

interface ScanCodeCopyright {
  copyright: string;
  start_line: number;
  end_line: number;
}

interface ScanCodePackage {
  type: string;
  name: string;
  version: string;
  license_expression: string;
  declared_license: string;
}

interface ScanCodeOutput {
  headers: { tool_version: string };
  files: ScanCodeFile[];
  packages: ScanCodePackage[];
}

export class ScanCodeIntegration implements ToolIntegration {
  name = 'scancode';
  category = 'license' as const;
  description = 'Scans code for licenses, copyrights, and dependencies with high accuracy';
  website = 'https://scancode-toolkit.readthedocs.io/';

  // License categories that may require attention
  private readonly restrictiveLicenses = [
    'GPL-3.0', 'GPL-2.0', 'AGPL-3.0', 'LGPL-3.0', 'LGPL-2.1',
    'copyleft', 'strong-copyleft', 'network-copyleft',
  ];

  private readonly problematicLicenses = [
    'SSPL-1.0', 'Commons-Clause', 'BUSL-1.1',
    'proprietary', 'commercial', 'unknown',
  ];

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('scancode --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        license: true,
        copyright: true,
        package: true,
        classify: true,
        timeout: 120,
        allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'Unlicense', 'CC0-1.0'],
        flagRestrictive: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const targetDir = target.directory || '.';

      const timeout = (config?.options?.timeout as number) || 120;
      const allowedLicenses = (config?.options?.allowedLicenses as string[]) || [];
      const flagRestrictive = config?.options?.flagRestrictive !== false;

      // Build scancode command flags
      const flags: string[] = ['--json-pp', '-'];
      if (config?.options?.license !== false) flags.push('--license');
      if (config?.options?.copyright !== false) flags.push('--copyright');
      if (config?.options?.package !== false) flags.push('--package');
      if (config?.options?.classify !== false) flags.push('--classify');
      flags.push(`--timeout`, `${timeout}`);
      flags.push('--processes', '4');  // Parallel processing

      // Create a temp output file for large scans
      const tempFile = path.join(targetDir, `.scancode-output-${Date.now()}.json`);
      flags[flags.indexOf('-')] = tempFile;

      try {
        execSync(
          `scancode ${flags.join(' ')} "${targetDir}"`,
          { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: timeout * 1000 * 2 }
        );

        const output: ScanCodeOutput = JSON.parse(fs.readFileSync(tempFile, 'utf-8'));

        // Analyze licenses
        for (const file of output.files || []) {
          for (const license of file.licenses || []) {
            const finding = this.analyzeLicense(file.path, license, allowedLicenses, flagRestrictive);
            if (finding) findings.push(finding);
          }

          // Check for scan errors
          for (const error of file.scan_errors || []) {
            findings.push(this.createScanErrorFinding(file.path, error));
          }
        }

        // Analyze package-level licenses
        for (const pkg of output.packages || []) {
          const finding = this.analyzePackageLicense(pkg, allowedLicenses, flagRestrictive);
          if (finding) findings.push(finding);
        }

        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch { /* Ignore cleanup errors */ }

        return this.createResult(findings, Date.now() - startTime, output.files?.length || 0);
      } catch (error) {
        // Clean up temp file on error
        try {
          fs.unlinkSync(tempFile);
        } catch { /* Ignore */ }
        throw error;
      }
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

  private analyzeLicense(
    filePath: string,
    license: ScanCodeLicense,
    allowedLicenses: string[],
    flagRestrictive: boolean
  ): AuditFinding | null {
    // Unknown or low-confidence licenses
    if (license.is_unknown || license.score < 50) {
      return this.createUnknownLicenseFinding(filePath, license);
    }

    const spdxKey = license.spdx_license_key || license.key;

    // Check against allowed list
    if (allowedLicenses.length > 0 && !this.isLicenseAllowed(spdxKey, allowedLicenses)) {
      // Check if it's problematic
      if (this.problematicLicenses.some(l => spdxKey.includes(l) || license.category.includes(l))) {
        return this.createProblematicLicenseFinding(filePath, license);
      }

      // Check if it's restrictive (copyleft)
      if (flagRestrictive && this.restrictiveLicenses.some(l => spdxKey.includes(l) || license.category.includes('copyleft'))) {
        return this.createRestrictiveLicenseFinding(filePath, license);
      }

      // Not on allowed list
      return this.createUnapprovedLicenseFinding(filePath, license);
    }

    return null;
  }

  private isLicenseAllowed(spdxKey: string, allowedLicenses: string[]): boolean {
    return allowedLicenses.some(allowed =>
      spdxKey.toLowerCase().includes(allowed.toLowerCase()) ||
      allowed.toLowerCase().includes(spdxKey.toLowerCase())
    );
  }

  private analyzePackageLicense(
    pkg: ScanCodePackage,
    allowedLicenses: string[],
    flagRestrictive: boolean
  ): AuditFinding | null {
    const license = pkg.license_expression || pkg.declared_license;
    if (!license) return null;

    // Check against allowed list
    if (allowedLicenses.length > 0 && !this.isLicenseAllowed(license, allowedLicenses)) {
      if (this.problematicLicenses.some(l => license.includes(l))) {
        return {
          id: `scancode-pkg-problematic-${pkg.name}-${pkg.version}`,
          tool: this.name,
          category: this.category,
          severity: 'high',
          title: `Problematic Package License: ${pkg.name}`,
          description: `Package ${pkg.name}@${pkg.version} uses license: ${license}`,
          explanation: 'This license has terms that may be incompatible with commercial use or create legal obligations.',
          impact: 'May require source code disclosure or restrict commercial use.',
          recommendation: 'Review license terms with legal counsel. Consider alternative packages.',
          aiPrompt: {
            short: `Review ${pkg.name} license`,
            detailed: `Package with potentially problematic license:\n\nPackage: ${pkg.name}@${pkg.version}\nLicense: ${license}\nType: ${pkg.type}\n\nReview license terms and consider alternatives.`,
            steps: ['Review license terms', 'Assess legal implications', 'Consider alternatives', 'Document decision'],
          },
          ruleId: 'problematic-package-license',
          tags: ['scancode', 'license', 'package', pkg.type, 'problematic'],
          effort: 'moderate',
        };
      }

      if (flagRestrictive && this.restrictiveLicenses.some(l => license.includes(l))) {
        return {
          id: `scancode-pkg-restrictive-${pkg.name}-${pkg.version}`,
          tool: this.name,
          category: this.category,
          severity: 'medium',
          title: `Restrictive Package License: ${pkg.name}`,
          description: `Package ${pkg.name}@${pkg.version} uses copyleft license: ${license}`,
          explanation: 'Copyleft licenses require derivative works to be released under the same license.',
          impact: 'May require disclosure of your source code if the package is modified or linked.',
          recommendation: 'Understand the license obligations or find an alternative with a permissive license.',
          aiPrompt: {
            short: `Review ${pkg.name} copyleft license`,
            detailed: `Package with copyleft license:\n\nPackage: ${pkg.name}@${pkg.version}\nLicense: ${license}\nType: ${pkg.type}\n\nReview copyleft obligations.`,
            steps: ['Understand copyleft requirements', 'Determine if modifications are needed', 'Ensure compliance', 'Document usage'],
          },
          ruleId: 'restrictive-package-license',
          tags: ['scancode', 'license', 'package', pkg.type, 'copyleft'],
          effort: 'moderate',
        };
      }
    }

    return null;
  }

  private createUnknownLicenseFinding(filePath: string, license: ScanCodeLicense): AuditFinding {
    return {
      id: `scancode-unknown-${filePath}-${license.start_line}`,
      tool: this.name,
      category: this.category,
      severity: 'medium',
      title: `Unknown License: ${filePath}`,
      description: `File contains an unknown or low-confidence license (score: ${license.score}%).`,
      explanation: 'ScanCode could not confidently identify this license. Manual review is required.',
      impact: 'Unknown legal obligations may exist.',
      file: filePath,
      line: license.start_line,
      endLine: license.end_line,
      recommendation: 'Manually review the license text and determine its terms.',
      aiPrompt: {
        short: `Identify license in ${filePath}`,
        detailed: `Unknown license detected:\n\nFile: ${filePath}\nLines: ${license.start_line}-${license.end_line}\nBest guess: ${license.name || 'Unknown'}\nConfidence: ${license.score}%\n\nManually review and identify the license.`,
        steps: ['Review the license text', 'Identify the license', 'Add to allowed list if acceptable', 'Document the decision'],
      },
      ruleId: 'unknown-license',
      tags: ['scancode', 'license', 'unknown', 'manual-review'],
      effort: 'moderate',
    };
  }

  private createProblematicLicenseFinding(filePath: string, license: ScanCodeLicense): AuditFinding {
    return {
      id: `scancode-problematic-${filePath}-${license.start_line}`,
      tool: this.name,
      category: this.category,
      severity: 'high',
      title: `Problematic License: ${license.name}`,
      description: `File ${filePath} uses license "${license.name}" (${license.spdx_license_key || license.key}) which may have restrictive or uncommon terms.`,
      explanation: 'This license type may have terms that are incompatible with commercial use, require special permissions, or create unexpected legal obligations.',
      impact: 'May prevent commercial distribution or create legal liability.',
      file: filePath,
      line: license.start_line,
      endLine: license.end_line,
      recommendation: 'Consult with legal counsel. Consider removing or replacing this code.',
      documentationUrl: `https://spdx.org/licenses/${license.spdx_license_key || license.key}.html`,
      aiPrompt: {
        short: `Review problematic license in ${filePath}`,
        detailed: `Problematic license detected:\n\nFile: ${filePath}\nLicense: ${license.name}\nSPDX: ${license.spdx_license_key || license.key}\nCategory: ${license.category}\n\nReview terms and assess legal implications.`,
        steps: ['Review license terms', 'Consult legal if needed', 'Find alternative or get permission', 'Document decision'],
      },
      ruleId: 'problematic-license',
      tags: ['scancode', 'license', 'problematic', license.category],
      effort: 'hard',
    };
  }

  private createRestrictiveLicenseFinding(filePath: string, license: ScanCodeLicense): AuditFinding {
    return {
      id: `scancode-copyleft-${filePath}-${license.start_line}`,
      tool: this.name,
      category: this.category,
      severity: 'medium',
      title: `Copyleft License: ${license.name}`,
      description: `File ${filePath} uses copyleft license "${license.name}" (${license.spdx_license_key || license.key}).`,
      explanation: 'Copyleft licenses require that derivative works be distributed under the same license. This may require you to release your source code.',
      impact: 'Modifications or linking may require source code disclosure.',
      file: filePath,
      line: license.start_line,
      endLine: license.end_line,
      recommendation: 'Understand copyleft obligations. If unacceptable, find code with a permissive license.',
      documentationUrl: `https://spdx.org/licenses/${license.spdx_license_key || license.key}.html`,
      aiPrompt: {
        short: `Review copyleft license in ${filePath}`,
        detailed: `Copyleft license detected:\n\nFile: ${filePath}\nLicense: ${license.name}\nSPDX: ${license.spdx_license_key || license.key}\n\nUnderstand obligations before using.`,
        steps: ['Understand copyleft requirements', 'Determine if isolation is possible', 'Consider alternatives', 'Document compliance plan'],
      },
      ruleId: 'copyleft-license',
      tags: ['scancode', 'license', 'copyleft', license.category],
      effort: 'moderate',
    };
  }

  private createUnapprovedLicenseFinding(filePath: string, license: ScanCodeLicense): AuditFinding {
    return {
      id: `scancode-unapproved-${filePath}-${license.start_line}`,
      tool: this.name,
      category: this.category,
      severity: 'low',
      title: `Unapproved License: ${license.name}`,
      description: `File ${filePath} uses license "${license.name}" which is not in the approved list.`,
      explanation: 'This license is not in your organization\'s approved license list. Review the terms to determine if it should be added.',
      impact: 'License terms may need review before use.',
      file: filePath,
      line: license.start_line,
      endLine: license.end_line,
      recommendation: `Review the ${license.name} license and add to approved list if acceptable.`,
      documentationUrl: `https://spdx.org/licenses/${license.spdx_license_key || license.key}.html`,
      aiPrompt: {
        short: `Approve or reject ${license.name} license`,
        detailed: `Unapproved license detected:\n\nFile: ${filePath}\nLicense: ${license.name}\nSPDX: ${license.spdx_license_key || license.key}\n\nReview and decide whether to approve.`,
        steps: ['Review license terms', 'Compare with policy', 'Add to approved list or find alternative', 'Update configuration'],
      },
      ruleId: 'unapproved-license',
      tags: ['scancode', 'license', 'unapproved', license.category],
      effort: 'easy',
    };
  }

  private createScanErrorFinding(filePath: string, error: string): AuditFinding {
    return {
      id: `scancode-error-${filePath}-${Date.now()}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `Scan Error: ${filePath}`,
      description: `ScanCode encountered an error scanning this file: ${error}`,
      explanation: 'The file could not be fully analyzed. This may be due to file format, encoding, or other issues.',
      impact: 'License information for this file may be incomplete.',
      file: filePath,
      recommendation: 'Manually review the file for license information.',
      aiPrompt: {
        short: `Review scan error for ${filePath}`,
        detailed: `ScanCode error:\n\nFile: ${filePath}\nError: ${error}\n\nManually review the file.`,
        steps: ['Check file format', 'Review manually', 'Report issue if persistent'],
      },
      ruleId: 'scan-error',
      tags: ['scancode', 'error'],
      effort: 'trivial',
    };
  }

  private createResult(findings: AuditFinding[], duration: number, filesScanned: number): AuditResult {
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
        passed: filesScanned - new Set(findings.map(f => f.file)).size,
        failed: new Set(findings.map(f => f.file)).size,
      },
      metadata: { filesScanned },
    };
  }
}
