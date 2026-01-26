// SBOM Generator Integration - Software Bill of Materials
// Uses cdxgen (CycloneDX Generator) to produce SBOMs in CycloneDX format
// Website: https://github.com/CycloneDX/cdxgen

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface CdxComponent {
  type: string;
  name: string;
  version?: string;
  purl?: string;
  group?: string;
  scope?: string;
  description?: string;
  licenses?: Array<{
    license?: {
      id?: string;
      name?: string;
      url?: string;
    };
    expression?: string;
  }>;
  externalReferences?: Array<{
    type: string;
    url: string;
  }>;
  hashes?: Array<{
    alg: string;
    content: string;
  }>;
  properties?: Array<{
    name: string;
    value: string;
  }>;
}

interface CdxDependency {
  ref: string;
  dependsOn?: string[];
}

interface CdxBom {
  bomFormat: string;
  specVersion: string;
  version?: number;
  metadata?: {
    timestamp?: string;
    component?: CdxComponent;
    tools?: Array<{ name: string; version: string }>;
  };
  components?: CdxComponent[];
  dependencies?: CdxDependency[];
  vulnerabilities?: Array<{
    id: string;
    source?: { name: string; url: string };
    ratings?: Array<{ severity: string; score?: number }>;
    description?: string;
    recommendation?: string;
    affects?: Array<{ ref: string }>;
  }>;
}

const HIGH_RISK_LICENSES = ['GPL-2.0-only', 'GPL-3.0-only', 'AGPL-3.0-only', 'SSPL-1.0', 'EUPL-1.2'];
const COPYLEFT_LICENSES = ['GPL', 'AGPL', 'LGPL', 'MPL', 'CPAL', 'OSL', 'EPL', 'EUPL'];

export class SBOMGeneratorIntegration implements ToolIntegration {
  name = 'sbom-generator';
  category = 'dependencies' as const;
  description = 'Generates Software Bill of Materials (SBOM) in CycloneDX format and analyzes components for license compliance, missing metadata, and supply chain risks';
  website = 'https://github.com/CycloneDX/cdxgen';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx @cyclonedx/cdxgen --version', { stdio: 'ignore', timeout: 15000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        format: 'json',
        specVersion: '1.5',
        includeDevDependencies: false,
        analyzeLicenses: true,
        flagUnlicensed: true,
        outputFile: '',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const options = config?.options ?? this.getDefaultConfig().options ?? {};
      const includeDev = options.includeDevDependencies ? '' : '--no-dev';

      // Generate SBOM using cdxgen
      const result = execSync(
        `npx @cyclonedx/cdxgen -o /dev/stdout --format json ${includeDev}`,
        {
          cwd: targetDir,
          encoding: 'utf-8',
          maxBuffer: 100 * 1024 * 1024,
          timeout: 120000,
        }
      );

      let bom: CdxBom;
      try {
        bom = JSON.parse(result);
      } catch {
        return this.createErrorResult('Failed to parse SBOM output as JSON', Date.now() - startTime);
      }

      const components = bom.components || [];
      const vulnerabilities = bom.vulnerabilities || [];
      const dependencies = bom.dependencies || [];

      // Analyze components for issues
      this.analyzeUnlicensedComponents(components, findings);
      this.analyzeCopyleftLicenses(components, findings);
      this.analyzeVulnerabilities(vulnerabilities, components, findings);
      this.analyzeOrphanedDependencies(dependencies, components, findings);
      this.analyzeComponentMetadata(components, findings);

      // Generate info-level SBOM summary finding
      findings.push(this.createSummaryFinding(components, vulnerabilities, dependencies));

      return this.createResult(findings, Date.now() - startTime, {
        bomFormat: bom.bomFormat,
        specVersion: bom.specVersion,
        totalComponents: components.length,
        totalVulnerabilities: vulnerabilities.length,
        totalDependencies: dependencies.length,
        generatedAt: bom.metadata?.timestamp,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        Date.now() - startTime
      );
    }
  }

  private analyzeUnlicensedComponents(components: CdxComponent[], findings: AuditFinding[]): void {
    for (const comp of components) {
      const hasLicense = comp.licenses && comp.licenses.length > 0 &&
        comp.licenses.some(l => l.license?.id || l.license?.name || l.expression);

      if (!hasLicense) {
        findings.push({
          id: `sbom-no-license-${comp.group ? comp.group + '/' : ''}${comp.name}`,
          tool: this.name,
          category: this.category,
          severity: 'medium',
          title: `Missing license: ${this.formatComponentName(comp)}`,
          description: `Component ${this.formatComponentName(comp)}${comp.version ? '@' + comp.version : ''} has no license information in its SBOM entry. This creates legal uncertainty for your project.`,
          explanation: 'Every software component should declare its license. Components without license information may be proprietary, use a restrictive license, or simply lack proper metadata. Using unlicensed components poses legal risk.',
          impact: 'Potential legal liability from using components with unknown licensing terms. May violate compliance requirements (e.g., SOC 2, ISO 27001).',
          recommendation: `Investigate the license for ${this.formatComponentName(comp)}. Check the package registry or source repository for license information and update your records.`,
          aiPrompt: {
            short: `Check license for ${this.formatComponentName(comp)}`,
            detailed: `Component ${this.formatComponentName(comp)}${comp.version ? '@' + comp.version : ''} has no license declared in the SBOM. Determine the actual license by checking the source repository, package registry (npm/PyPI/Maven), or LICENSE file.`,
            steps: [
              `Search for ${this.formatComponentName(comp)} on the relevant package registry`,
              'Check the source repository for a LICENSE or COPYING file',
              'If license is found, update project documentation',
              'If no license exists, evaluate whether to replace the component',
            ],
          },
          ruleId: 'sbom-missing-license',
          tags: ['sbom', 'license', 'compliance', 'supply-chain'],
          effort: 'easy',
        });
      }
    }
  }

  private analyzeCopyleftLicenses(components: CdxComponent[], findings: AuditFinding[]): void {
    for (const comp of components) {
      if (!comp.licenses) continue;

      for (const licenseEntry of comp.licenses) {
        const licenseId = licenseEntry.license?.id || licenseEntry.license?.name || licenseEntry.expression || '';

        const isHighRisk = HIGH_RISK_LICENSES.some(l => licenseId.includes(l));
        const isCopyleft = COPYLEFT_LICENSES.some(l => licenseId.toUpperCase().includes(l.toUpperCase()));

        if (isHighRisk) {
          findings.push({
            id: `sbom-copyleft-${this.formatComponentName(comp)}-${licenseId}`,
            tool: this.name,
            category: this.category,
            severity: 'high',
            title: `Strong copyleft license: ${this.formatComponentName(comp)} (${licenseId})`,
            description: `Component ${this.formatComponentName(comp)}${comp.version ? '@' + comp.version : ''} uses ${licenseId}, a strong copyleft license that may require your entire project to be open-sourced.`,
            explanation: `${licenseId} is a strong copyleft license. If you distribute software containing components under this license, you may be required to release your entire codebase under the same license terms. This has significant implications for proprietary software.`,
            impact: 'May require open-sourcing proprietary code. Could prevent commercial distribution without compliance.',
            recommendation: `Review whether ${licenseId} is acceptable for your project. Consider replacing ${this.formatComponentName(comp)} with an alternative that uses a permissive license (MIT, Apache-2.0, BSD).`,
            aiPrompt: {
              short: `Review copyleft license ${licenseId} on ${this.formatComponentName(comp)}`,
              detailed: `${this.formatComponentName(comp)}${comp.version ? '@' + comp.version : ''} uses ${licenseId}. Evaluate the legal implications and suggest permissively-licensed alternatives.`,
              steps: [
                `Understand ${licenseId} obligations`,
                'Determine if the component is dynamically or statically linked',
                'Consult legal counsel if needed',
                'Search for alternative packages with permissive licenses',
              ],
            },
            ruleId: 'sbom-copyleft-license',
            tags: ['sbom', 'license', 'copyleft', 'compliance', licenseId.toLowerCase()],
            effort: 'moderate',
          });
        } else if (isCopyleft && !isHighRisk) {
          findings.push({
            id: `sbom-weak-copyleft-${this.formatComponentName(comp)}-${licenseId}`,
            tool: this.name,
            category: this.category,
            severity: 'low',
            title: `Weak copyleft license: ${this.formatComponentName(comp)} (${licenseId})`,
            description: `Component ${this.formatComponentName(comp)}${comp.version ? '@' + comp.version : ''} uses ${licenseId}, a weak copyleft license that may have some sharing requirements.`,
            explanation: `${licenseId} is a weak copyleft license. Modifications to the licensed component itself must be shared, but linking or using it doesn't necessarily require open-sourcing your entire project.`,
            impact: 'Modifications to this specific component must be shared under the same license.',
            recommendation: `Ensure any modifications to ${this.formatComponentName(comp)} are tracked and can be shared if required by ${licenseId}.`,
            aiPrompt: {
              short: `Review weak copyleft ${licenseId} for ${this.formatComponentName(comp)}`,
              detailed: `${this.formatComponentName(comp)} uses ${licenseId}. Review the obligations and ensure compliance.`,
              steps: [
                `Review ${licenseId} terms`,
                'Track any modifications made to this component',
                'Ensure compliance documentation is maintained',
              ],
            },
            ruleId: 'sbom-weak-copyleft-license',
            tags: ['sbom', 'license', 'copyleft', 'compliance'],
            effort: 'easy',
          });
        }
      }
    }
  }

  private analyzeVulnerabilities(
    vulnerabilities: CdxBom['vulnerabilities'],
    components: CdxComponent[],
    findings: AuditFinding[]
  ): void {
    if (!vulnerabilities) return;

    for (const vuln of vulnerabilities) {
      const severity = this.mapVulnSeverity(vuln.ratings?.[0]?.severity);
      const affectedRefs = vuln.affects?.map(a => a.ref) || [];
      const affectedNames = affectedRefs.map(ref => {
        const comp = components.find(c => c.purl === ref || `${c.group ? c.group + '/' : ''}${c.name}@${c.version}` === ref);
        return comp ? this.formatComponentName(comp) : ref;
      }).join(', ');

      findings.push({
        id: `sbom-vuln-${vuln.id}`,
        tool: this.name,
        category: this.category,
        severity,
        title: `Vulnerability ${vuln.id}${affectedNames ? ` in ${affectedNames}` : ''}`,
        description: vuln.description || `Known vulnerability ${vuln.id} found in SBOM components.`,
        explanation: `This vulnerability was identified during SBOM analysis. Source: ${vuln.source?.name || 'Unknown'}. ${vuln.description || ''}`,
        impact: `Security vulnerability affecting ${affectedNames || 'project components'}. CVSS score: ${vuln.ratings?.[0]?.score ?? 'N/A'}.`,
        recommendation: vuln.recommendation || `Update affected components to patched versions. Check ${vuln.source?.url || 'the vulnerability database'} for details.`,
        documentationUrl: vuln.source?.url,
        aiPrompt: {
          short: `Fix vulnerability ${vuln.id}`,
          detailed: `Vulnerability ${vuln.id} affects ${affectedNames || 'project components'}. ${vuln.description || ''}\n\nSource: ${vuln.source?.name || 'Unknown'}\nSeverity: ${severity}`,
          steps: [
            `Research ${vuln.id} in the vulnerability database`,
            'Identify the fixed version for affected components',
            'Update dependencies to patched versions',
            'Run tests to verify the update doesn\'t break functionality',
          ],
        },
        ruleId: `vuln-${vuln.id}`,
        tags: ['sbom', 'vulnerability', 'supply-chain', severity],
        effort: severity === 'critical' || severity === 'high' ? 'moderate' : 'easy',
      });
    }
  }

  private analyzeOrphanedDependencies(
    dependencies: CdxDependency[],
    components: CdxComponent[],
    findings: AuditFinding[]
  ): void {
    // Find components that nothing depends on (potential dead dependencies)
    if (dependencies.length === 0 || components.length === 0) return;

    const dependedOn = new Set<string>();
    for (const dep of dependencies) {
      if (dep.dependsOn) {
        for (const ref of dep.dependsOn) {
          dependedOn.add(ref);
        }
      }
    }

    // Count components that are leaf nodes with no dependents
    const rootRefs = new Set(dependencies.map(d => d.ref));
    let orphanCount = 0;
    for (const comp of components) {
      const ref = comp.purl || `${comp.group ? comp.group + '/' : ''}${comp.name}@${comp.version}`;
      if (!dependedOn.has(ref) && !rootRefs.has(ref)) {
        orphanCount++;
      }
    }

    if (orphanCount > 5) {
      findings.push({
        id: 'sbom-orphaned-deps',
        tool: this.name,
        category: this.category,
        severity: 'info',
        title: `${orphanCount} potentially unused dependencies detected`,
        description: `The SBOM dependency graph shows ${orphanCount} components that are not referenced by any other component. These may be unused or incorrectly resolved.`,
        explanation: 'Orphaned dependencies increase your attack surface and bundle size without providing value. They may be leftover from removed features or incorrectly resolved transitive dependencies.',
        impact: 'Increased attack surface and maintenance burden from potentially unused packages.',
        recommendation: 'Review the dependency tree with tools like `npm ls` or `depcheck` to confirm and remove unused packages.',
        aiPrompt: {
          short: `Review ${orphanCount} potentially unused dependencies`,
          detailed: `SBOM analysis found ${orphanCount} components not referenced in the dependency graph. Review and remove unused packages.`,
          steps: [
            'Run depcheck or knip to identify unused dependencies',
            'Cross-reference with import statements in the codebase',
            'Remove confirmed unused packages',
            'Regenerate lock file and SBOM',
          ],
        },
        ruleId: 'sbom-orphaned-dependencies',
        tags: ['sbom', 'dependencies', 'cleanup', 'supply-chain'],
        effort: 'moderate',
      });
    }
  }

  private analyzeComponentMetadata(components: CdxComponent[], findings: AuditFinding[]): void {
    let noHashCount = 0;
    let noPurlCount = 0;

    for (const comp of components) {
      if (!comp.hashes || comp.hashes.length === 0) noHashCount++;
      if (!comp.purl) noPurlCount++;
    }

    if (noHashCount > components.length * 0.5 && components.length > 10) {
      findings.push({
        id: 'sbom-missing-hashes',
        tool: this.name,
        category: this.category,
        severity: 'low',
        title: `${noHashCount} of ${components.length} components lack integrity hashes`,
        description: `${Math.round((noHashCount / components.length) * 100)}% of SBOM components don't include cryptographic hashes, making supply chain verification difficult.`,
        explanation: 'Component hashes allow verification that downloaded packages haven\'t been tampered with. Without hashes, you cannot verify the integrity of your supply chain.',
        impact: 'Reduced ability to detect supply chain attacks or tampered packages.',
        recommendation: 'Use a package manager with lockfile integrity verification (npm ci, yarn --frozen-lockfile). Consider using tools that enrich SBOMs with hash data.',
        aiPrompt: {
          short: 'Improve SBOM component hash coverage',
          detailed: `${noHashCount} of ${components.length} components lack integrity hashes. Improve supply chain verification.`,
          steps: [
            'Ensure lockfiles include integrity hashes',
            'Use npm ci or yarn --frozen-lockfile for reproducible installs',
            'Consider enriching SBOM with hash data post-generation',
          ],
        },
        ruleId: 'sbom-missing-hashes',
        tags: ['sbom', 'supply-chain', 'integrity'],
        effort: 'easy',
      });
    }
  }

  private createSummaryFinding(
    components: CdxComponent[],
    vulnerabilities: CdxBom['vulnerabilities'],
    dependencies: CdxDependency[]
  ): AuditFinding {
    const licenseCounts: Record<string, number> = {};
    let unlicensedCount = 0;
    for (const comp of components) {
      if (comp.licenses && comp.licenses.length > 0) {
        const lid = comp.licenses[0].license?.id || comp.licenses[0].license?.name || comp.licenses[0].expression || 'Other';
        licenseCounts[lid] = (licenseCounts[lid] || 0) + 1;
      } else {
        unlicensedCount++;
      }
    }

    const topLicenses = Object.entries(licenseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([license, count]) => `${license}: ${count}`)
      .join(', ');

    return {
      id: 'sbom-summary',
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `SBOM: ${components.length} components, ${(vulnerabilities || []).length} vulnerabilities`,
      description: `Generated Software Bill of Materials containing ${components.length} components with ${dependencies.length} dependency relationships. Found ${(vulnerabilities || []).length} known vulnerabilities.`,
      explanation: `SBOM Summary:\n- Total components: ${components.length}\n- Dependencies mapped: ${dependencies.length}\n- Vulnerabilities found: ${(vulnerabilities || []).length}\n- Unlicensed components: ${unlicensedCount}\n- Top licenses: ${topLicenses || 'N/A'}`,
      impact: 'Informational overview of your software supply chain.',
      recommendation: 'Review the full SBOM for compliance requirements. Address any flagged vulnerabilities or licensing issues.',
      aiPrompt: {
        short: 'Review SBOM summary',
        detailed: `SBOM analysis complete: ${components.length} components, ${(vulnerabilities || []).length} vulnerabilities, ${unlicensedCount} unlicensed components.`,
        steps: [
          'Review components with licensing issues',
          'Address known vulnerabilities',
          'Set up automated SBOM generation in CI/CD',
          'Share SBOM with stakeholders for compliance',
        ],
      },
      ruleId: 'sbom-summary',
      tags: ['sbom', 'summary', 'supply-chain'],
      effort: 'trivial',
    };
  }

  private formatComponentName(comp: CdxComponent): string {
    return comp.group ? `${comp.group}/${comp.name}` : comp.name;
  }

  private mapVulnSeverity(severity?: string): Severity {
    if (!severity) return 'medium';
    const lower = severity.toLowerCase();
    if (lower === 'critical') return 'critical';
    if (lower === 'high') return 'high';
    if (lower === 'medium' || lower === 'moderate') return 'medium';
    if (lower === 'low') return 'low';
    return 'info';
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    metadata: Record<string, unknown>
  ): AuditResult {
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
        passed: findings.filter(f => f.severity === 'info').length,
        failed: findings.filter(f => f.severity !== 'info').length,
      },
      metadata,
    };
  }

  private createErrorResult(error: string, duration: number): AuditResult {
    return {
      tool: this.name,
      category: this.category,
      success: false,
      duration,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error,
    };
  }
}
