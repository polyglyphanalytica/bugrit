/**
 * Cloud Build Tool Integrations
 *
 * Wraps the 16 Docker-based tools from cloud-build.ts as proper ToolIntegration
 * classes so they can be used by the AuditOrchestrator.
 */

import {
  ToolIntegration,
  ToolConfig,
  AuditTarget,
  AuditResult,
  AuditFinding,
  ToolCategory,
  Severity,
} from '../types';
import {
  CloudBuildRunner,
  createCloudBuildRunner,
  DOCKER_TOOLS,
  DockerToolId,
} from '../../deploy/cloud-build';

// Tool metadata for all Cloud Build tools
const TOOL_METADATA: Record<
  DockerToolId,
  {
    category: ToolCategory;
    description: string;
    website: string;
    targetType: 'url' | 'source' | 'image';
  }
> = {
  // Wave 1 tools
  'owasp-zap': {
    category: 'security',
    description: 'OWASP ZAP web application security scanner',
    website: 'https://www.zaproxy.org/',
    targetType: 'url',
  },
  'dependency-check': {
    category: 'security',
    description: 'OWASP Dependency-Check for vulnerable dependencies',
    website: 'https://owasp.org/www-project-dependency-check/',
    targetType: 'source',
  },
  sitespeed: {
    category: 'performance',
    description: 'Sitespeed.io web performance testing',
    website: 'https://www.sitespeed.io/',
    targetType: 'url',
  },
  codeclimate: {
    category: 'code-quality',
    description: 'Code Climate automated code review',
    website: 'https://codeclimate.com/',
    targetType: 'source',
  },
  trivy: {
    category: 'security',
    description: 'Trivy vulnerability scanner for containers and filesystems',
    website: 'https://trivy.dev/',
    targetType: 'source',
  },
  grype: {
    category: 'security',
    description: 'Anchore Grype vulnerability scanner',
    website: 'https://github.com/anchore/grype',
    targetType: 'source',
  },
  // Wave 2 tools
  semgrep: {
    category: 'security',
    description: 'Semgrep static analysis for security and bugs',
    website: 'https://semgrep.dev/',
    targetType: 'source',
  },
  nuclei: {
    category: 'security',
    description: 'Nuclei vulnerability scanner with community templates',
    website: 'https://nuclei.projectdiscovery.io/',
    targetType: 'url',
  },
  checkov: {
    category: 'security',
    description: 'Checkov infrastructure-as-code security scanner',
    website: 'https://www.checkov.io/',
    targetType: 'source',
  },
  syft: {
    category: 'security',
    description: 'Anchore Syft SBOM generator',
    website: 'https://github.com/anchore/syft',
    targetType: 'source',
  },
  dockle: {
    category: 'security',
    description: 'Dockle container image linter',
    website: 'https://github.com/goodwithtech/dockle',
    targetType: 'image',
  },
  shellcheck: {
    category: 'code-quality',
    description: 'ShellCheck static analysis for shell scripts',
    website: 'https://www.shellcheck.net/',
    targetType: 'source',
  },
  tfsec: {
    category: 'security',
    description: 'tfsec Terraform security scanner',
    website: 'https://aquasecurity.github.io/tfsec/',
    targetType: 'source',
  },
  gitleaks: {
    category: 'security',
    description: 'Gitleaks secret detection in source code',
    website: 'https://gitleaks.io/',
    targetType: 'source',
  },
  bandit: {
    category: 'security',
    description: 'Bandit Python security linter',
    website: 'https://bandit.readthedocs.io/',
    targetType: 'source',
  },
  gosec: {
    category: 'security',
    description: 'gosec Go security checker',
    website: 'https://securego.io/',
    targetType: 'source',
  },
  // Wave 3: Language-specific tools
  phpstan: {
    category: 'code-quality',
    description: 'PHPStan static analysis for PHP',
    website: 'https://phpstan.org/',
    targetType: 'source',
  },
  psalm: {
    category: 'code-quality',
    description: 'Psalm type-safe PHP analysis',
    website: 'https://psalm.dev/',
    targetType: 'source',
  },
  brakeman: {
    category: 'security',
    description: 'Brakeman Ruby on Rails security scanner',
    website: 'https://brakemanscanner.org/',
    targetType: 'source',
  },
  rubocop: {
    category: 'code-quality',
    description: 'RuboCop Ruby style linter',
    website: 'https://rubocop.org/',
    targetType: 'source',
  },
  spotbugs: {
    category: 'code-quality',
    description: 'SpotBugs Java static analysis',
    website: 'https://spotbugs.github.io/',
    targetType: 'source',
  },
  pmd: {
    category: 'code-quality',
    description: 'PMD Java source analyzer',
    website: 'https://pmd.github.io/',
    targetType: 'source',
  },
  checkstyle: {
    category: 'code-quality',
    description: 'Checkstyle Java code style checker',
    website: 'https://checkstyle.org/',
    targetType: 'source',
  },
  detekt: {
    category: 'code-quality',
    description: 'Detekt Kotlin static analysis',
    website: 'https://detekt.dev/',
    targetType: 'source',
  },
  // Wave 4: API, Mobile, Cloud Native, AI/ML tools
  'osv-scanner': {
    category: 'security',
    description: 'Google OSV vulnerability scanner',
    website: 'https://google.github.io/osv-scanner/',
    targetType: 'source',
  },
  'pip-audit': {
    category: 'security',
    description: 'pip-audit Python dependency scanner',
    website: 'https://github.com/pypa/pip-audit',
    targetType: 'source',
  },
  'cargo-audit': {
    category: 'security',
    description: 'Cargo Audit Rust dependency scanner',
    website: 'https://github.com/RustSec/rustsec',
    targetType: 'source',
  },
  spectral: {
    category: 'security',
    description: 'Spectral OpenAPI/AsyncAPI linter',
    website: 'https://stoplight.io/open-source/spectral',
    targetType: 'source',
  },
  schemathesis: {
    category: 'security',
    description: 'Schemathesis API fuzzing',
    website: 'https://schemathesis.io/',
    targetType: 'url',
  },
  'graphql-cop': {
    category: 'security',
    description: 'GraphQL Cop security scanner',
    website: 'https://github.com/dolevf/graphql-cop',
    targetType: 'url',
  },
  mobsf: {
    category: 'security',
    description: 'MobSF mobile security framework',
    website: 'https://mobsf.github.io/Mobile-Security-Framework-MobSF/',
    targetType: 'source',
  },
  apkleaks: {
    category: 'security',
    description: 'APKLeaks Android secrets scanner',
    website: 'https://github.com/dwisiswant0/apkleaks',
    targetType: 'source',
  },
  swiftlint: {
    category: 'code-quality',
    description: 'SwiftLint Swift style linter',
    website: 'https://github.com/realm/SwiftLint',
    targetType: 'source',
  },
  kubesec: {
    category: 'security',
    description: 'Kubesec Kubernetes manifest scanner',
    website: 'https://kubesec.io/',
    targetType: 'source',
  },
  'kube-bench': {
    category: 'security',
    description: 'Kube-bench CIS Kubernetes benchmark',
    website: 'https://github.com/aquasecurity/kube-bench',
    targetType: 'source',
  },
  polaris: {
    category: 'security',
    description: 'Polaris Kubernetes best practices',
    website: 'https://www.fairwinds.com/polaris',
    targetType: 'source',
  },
  terrascan: {
    category: 'security',
    description: 'Terrascan multi-cloud IaC scanner',
    website: 'https://runterrascan.io/',
    targetType: 'source',
  },
  'kube-hunter': {
    category: 'security',
    description: 'Kube-hunter Kubernetes penetration testing',
    website: 'https://github.com/aquasecurity/kube-hunter',
    targetType: 'url',
  },
  cppcheck: {
    category: 'code-quality',
    description: 'Cppcheck C/C++ static analysis',
    website: 'https://cppcheck.sourceforge.io/',
    targetType: 'source',
  },
  flawfinder: {
    category: 'security',
    description: 'Flawfinder C/C++ security scanner',
    website: 'https://dwheeler.com/flawfinder/',
    targetType: 'source',
  },
  clippy: {
    category: 'code-quality',
    description: 'Clippy Rust linter',
    website: 'https://github.com/rust-lang/rust-clippy',
    targetType: 'source',
  },
  garak: {
    category: 'security',
    description: 'Garak LLM vulnerability scanner',
    website: 'https://github.com/leondz/garak',
    targetType: 'url',
  },
  modelscan: {
    category: 'security',
    description: 'ModelScan ML model security scanner',
    website: 'https://github.com/protectai/modelscan',
    targetType: 'source',
  },
};

/**
 * Base class for Cloud Build tool integrations
 */
abstract class CloudBuildIntegration implements ToolIntegration {
  abstract name: string;
  abstract toolId: DockerToolId;

  get category(): ToolCategory {
    return TOOL_METADATA[this.toolId].category;
  }

  get description(): string {
    return TOOL_METADATA[this.toolId].description;
  }

  get website(): string {
    return TOOL_METADATA[this.toolId].website;
  }

  async isAvailable(): Promise<boolean> {
    const runner = createCloudBuildRunner();
    return runner !== null;
  }

  getDefaultConfig(): ToolConfig {
    return { enabled: true };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const runner = createCloudBuildRunner();

    if (!runner) {
      return this.errorResult('Cloud Build not configured', startTime);
    }

    try {
      const targetValue = this.getTarget(target);
      if (!targetValue) {
        return this.errorResult(`No valid target for ${this.name}`, startTime);
      }

      const scanId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // For source-based tools, upload source first
      let finalTarget = targetValue;
      const metadata = TOOL_METADATA[this.toolId];

      if (metadata.targetType === 'source' && target.directory) {
        finalTarget = await runner.uploadSource(target.directory, scanId);
      }

      const { result, output } = await runner.runTool({
        toolId: this.toolId,
        target: finalTarget,
        scanId,
      });

      if (!result.success) {
        return this.errorResult(result.error || 'Tool execution failed', startTime);
      }

      // Normalize the output
      const findings = this.normalizeOutput(output);

      // Cleanup if we uploaded source
      if (metadata.targetType === 'source' && target.directory) {
        await runner.cleanup(scanId);
      }

      return {
        tool: this.name,
        category: this.category,
        success: true,
        duration: Date.now() - startTime,
        findings,
        summary: this.generateSummary(findings),
        metadata: { buildId: result.jobId },
      };
    } catch (error) {
      return this.errorResult(
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  protected getTarget(target: AuditTarget): string | undefined {
    const metadata = TOOL_METADATA[this.toolId];
    switch (metadata.targetType) {
      case 'url':
        return target.url;
      case 'source':
        return target.directory;
      case 'image':
        return target.image;
      default:
        return undefined;
    }
  }

  protected abstract normalizeOutput(output: unknown): AuditFinding[];

  protected errorResult(error: string, startTime: number): AuditResult {
    return {
      tool: this.name,
      category: this.category,
      success: false,
      duration: Date.now() - startTime,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error,
    };
  }

  protected generateSummary(findings: AuditFinding[]): AuditResult['summary'] {
    const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const finding of findings) {
      bySeverity[finding.severity]++;
    }
    return {
      total: findings.length,
      bySeverity,
      passed: 0,
      failed: findings.length,
    };
  }

  protected createFinding(params: Partial<AuditFinding> & { title: string; description: string }): AuditFinding {
    return {
      id: `${this.toolId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tool: this.name,
      category: this.category,
      severity: params.severity || 'medium',
      title: params.title,
      description: params.description,
      explanation: params.explanation || params.description,
      impact: params.impact || 'Could affect application security or quality',
      file: params.file,
      line: params.line,
      column: params.column,
      url: params.url,
      selector: params.selector,
      codeSnippet: params.codeSnippet,
      screenshot: params.screenshot,
      recommendation: params.recommendation || 'Review and address this finding',
      fixExample: params.fixExample,
      documentationUrl: params.documentationUrl || this.website,
      aiPrompt: params.aiPrompt || {
        short: `Fix ${params.title}`,
        detailed: `Address the following issue: ${params.description}`,
        steps: ['Review the finding', 'Understand the impact', 'Apply the recommended fix'],
      },
      ruleId: params.ruleId,
      tags: params.tags || [],
      effort: params.effort || 'moderate',
    };
  }

  protected mapSeverity(severity: string): Severity {
    const normalized = severity.toLowerCase();
    if (['critical', 'blocker'].includes(normalized)) return 'critical';
    if (['high', 'major', 'error'].includes(normalized)) return 'high';
    if (['medium', 'moderate', 'warning'].includes(normalized)) return 'medium';
    if (['low', 'minor', 'info'].includes(normalized)) return 'low';
    return 'info';
  }
}

// ============================================================
// Individual Tool Implementations
// ============================================================

export class CloudBuildOWASPZAPIntegration extends CloudBuildIntegration {
  name = 'OWASP ZAP (Cloud)';
  toolId: DockerToolId = 'owasp-zap';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { site?: Array<{ alerts?: Array<{ name: string; riskdesc: string; desc: string; solution: string; reference: string; instances?: Array<{ uri: string; evidence?: string }> }> }> };

    for (const site of data.site || []) {
      for (const alert of site.alerts || []) {
        const severity = this.mapZAPSeverity(alert.riskdesc);
        findings.push(this.createFinding({
          title: alert.name,
          description: alert.desc,
          severity,
          recommendation: alert.solution,
          documentationUrl: alert.reference,
          url: alert.instances?.[0]?.uri,
          codeSnippet: alert.instances?.[0]?.evidence,
          tags: ['web-security', 'dast'],
        }));
      }
    }
    return findings;
  }

  private mapZAPSeverity(riskdesc: string): Severity {
    if (riskdesc.includes('High')) return 'high';
    if (riskdesc.includes('Medium')) return 'medium';
    if (riskdesc.includes('Low')) return 'low';
    return 'info';
  }
}

export class CloudBuildDependencyCheckIntegration extends CloudBuildIntegration {
  name = 'OWASP Dependency Check (Cloud)';
  toolId: DockerToolId = 'dependency-check';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { dependencies?: Array<{ fileName: string; filePath: string; vulnerabilities?: Array<{ name: string; severity: string; description: string; references?: Array<{ url: string }> }> }> };

    for (const dep of data.dependencies || []) {
      for (const vuln of dep.vulnerabilities || []) {
        findings.push(this.createFinding({
          title: `${vuln.name} in ${dep.fileName}`,
          description: vuln.description,
          severity: this.mapSeverity(vuln.severity),
          file: dep.filePath,
          ruleId: vuln.name,
          documentationUrl: vuln.references?.[0]?.url,
          tags: ['dependency', 'cve', 'vulnerability'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildSitespeedIntegration extends CloudBuildIntegration {
  name = 'Sitespeed.io (Cloud)';
  toolId: DockerToolId = 'sitespeed';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { score?: number; metrics?: Record<string, number> };

    // Performance findings based on metrics
    if (data.metrics) {
      if (data.metrics.lcp && data.metrics.lcp > 2500) {
        findings.push(this.createFinding({
          title: 'Largest Contentful Paint (LCP) is slow',
          description: `LCP is ${data.metrics.lcp}ms, which exceeds the 2.5s threshold for good user experience`,
          severity: data.metrics.lcp > 4000 ? 'high' : 'medium',
          tags: ['performance', 'core-web-vitals', 'lcp'],
        }));
      }
      if (data.metrics.cls && data.metrics.cls > 0.1) {
        findings.push(this.createFinding({
          title: 'Cumulative Layout Shift (CLS) is high',
          description: `CLS is ${data.metrics.cls}, which exceeds the 0.1 threshold`,
          severity: data.metrics.cls > 0.25 ? 'high' : 'medium',
          tags: ['performance', 'core-web-vitals', 'cls'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildCodeClimateIntegration extends CloudBuildIntegration {
  name = 'Code Climate (Cloud)';
  toolId: DockerToolId = 'codeclimate';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as Array<{ type: string; check_name: string; description: string; severity: string; location?: { path: string; lines?: { begin: number } }; categories?: string[] }>;

    for (const issue of Array.isArray(data) ? data : []) {
      if (issue.type === 'issue') {
        findings.push(this.createFinding({
          title: issue.check_name,
          description: issue.description,
          severity: this.mapSeverity(issue.severity),
          file: issue.location?.path,
          line: issue.location?.lines?.begin,
          tags: issue.categories || ['code-quality'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildTrivyIntegration extends CloudBuildIntegration {
  name = 'Trivy (Cloud)';
  toolId: DockerToolId = 'trivy';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { Results?: Array<{ Target: string; Vulnerabilities?: Array<{ VulnerabilityID: string; Severity: string; Title: string; Description: string; PkgName: string; InstalledVersion: string; FixedVersion?: string; PrimaryURL?: string }> }> };

    for (const result of data.Results || []) {
      for (const vuln of result.Vulnerabilities || []) {
        findings.push(this.createFinding({
          title: `${vuln.VulnerabilityID}: ${vuln.Title || vuln.PkgName}`,
          description: vuln.Description || `Vulnerability in ${vuln.PkgName}@${vuln.InstalledVersion}`,
          severity: this.mapSeverity(vuln.Severity),
          file: result.Target,
          ruleId: vuln.VulnerabilityID,
          documentationUrl: vuln.PrimaryURL,
          recommendation: vuln.FixedVersion ? `Upgrade to version ${vuln.FixedVersion}` : 'No fix available yet',
          tags: ['vulnerability', 'cve', vuln.PkgName],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildGrypeIntegration extends CloudBuildIntegration {
  name = 'Grype (Cloud)';
  toolId: DockerToolId = 'grype';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { matches?: Array<{ vulnerability: { id: string; severity: string; description?: string; dataSource?: string; fix?: { versions?: string[] } }; artifact: { name: string; version: string; locations?: Array<{ path: string }> } }> };

    for (const match of data.matches || []) {
      const vuln = match.vulnerability;
      const artifact = match.artifact;
      findings.push(this.createFinding({
        title: `${vuln.id} in ${artifact.name}@${artifact.version}`,
        description: vuln.description || `Vulnerability found in ${artifact.name}`,
        severity: this.mapSeverity(vuln.severity),
        file: artifact.locations?.[0]?.path,
        ruleId: vuln.id,
        documentationUrl: vuln.dataSource,
        recommendation: vuln.fix?.versions?.length ? `Upgrade to ${vuln.fix.versions.join(' or ')}` : 'Review and assess risk',
        tags: ['vulnerability', 'sbom', artifact.name],
      }));
    }
    return findings;
  }
}

export class CloudBuildSemgrepIntegration extends CloudBuildIntegration {
  name = 'Semgrep (Cloud)';
  toolId: DockerToolId = 'semgrep';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: Array<{ check_id: string; path: string; start: { line: number; col: number }; end: { line: number; col: number }; extra: { message: string; severity: string; metadata?: { cwe?: string[]; owasp?: string[]; references?: string[] }; lines?: string } }> };

    for (const result of data.results || []) {
      findings.push(this.createFinding({
        title: result.check_id,
        description: result.extra.message,
        severity: this.mapSeverity(result.extra.severity),
        file: result.path,
        line: result.start.line,
        column: result.start.col,
        codeSnippet: result.extra.lines,
        ruleId: result.check_id,
        documentationUrl: result.extra.metadata?.references?.[0],
        tags: [
          'sast',
          ...(result.extra.metadata?.cwe || []),
          ...(result.extra.metadata?.owasp || []),
        ],
      }));
    }
    return findings;
  }
}

export class CloudBuildNucleiIntegration extends CloudBuildIntegration {
  name = 'Nuclei (Cloud)';
  toolId: DockerToolId = 'nuclei';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    // Nuclei outputs JSONL, parse each line
    const lines = typeof output === 'string' ? output.split('\n').filter(Boolean) : [];

    for (const line of lines) {
      try {
        const result = JSON.parse(line) as {
          'template-id': string;
          info: { name: string; severity: string; description?: string; reference?: string[] };
          'matched-at': string;
          'extracted-results'?: string[];
        };
        findings.push(this.createFinding({
          title: result.info.name,
          description: result.info.description || `Template ${result['template-id']} matched`,
          severity: this.mapSeverity(result.info.severity),
          url: result['matched-at'],
          ruleId: result['template-id'],
          documentationUrl: result.info.reference?.[0],
          codeSnippet: result['extracted-results']?.join('\n'),
          tags: ['nuclei', 'vulnerability-scan'],
        }));
      } catch {
        // Skip invalid lines
      }
    }
    return findings;
  }
}

export class CloudBuildCheckovIntegration extends CloudBuildIntegration {
  name = 'Checkov (Cloud)';
  toolId: DockerToolId = 'checkov';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: { failed_checks?: Array<{ check_id: string; check_name: string; file_path: string; file_line_range: [number, number]; guideline?: string; resource?: string }> } };

    for (const check of data.results?.failed_checks || []) {
      findings.push(this.createFinding({
        title: `${check.check_id}: ${check.check_name}`,
        description: `IaC misconfiguration in ${check.resource || check.file_path}`,
        severity: this.mapCheckovSeverity(check.check_id),
        file: check.file_path,
        line: check.file_line_range[0],
        ruleId: check.check_id,
        documentationUrl: check.guideline,
        tags: ['iac', 'infrastructure', 'misconfiguration'],
      }));
    }
    return findings;
  }

  private mapCheckovSeverity(checkId: string): Severity {
    // Critical checks usually have CKV_ prefix with specific patterns
    if (checkId.includes('SECRET') || checkId.includes('CRED')) return 'critical';
    if (checkId.includes('ENCRYPT') || checkId.includes('PUBLIC')) return 'high';
    return 'medium';
  }
}

export class CloudBuildSyftIntegration extends CloudBuildIntegration {
  name = 'Syft (Cloud)';
  toolId: DockerToolId = 'syft';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    // Syft generates SBOM, not findings. Return empty but store metadata.
    // The SBOM data can be used by other tools like Grype.
    return [];
  }
}

export class CloudBuildDockleIntegration extends CloudBuildIntegration {
  name = 'Dockle (Cloud)';
  toolId: DockerToolId = 'dockle';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { details?: Array<{ code: string; title: string; level: string; alerts?: string[] }> };

    for (const detail of data.details || []) {
      for (const alert of detail.alerts || []) {
        findings.push(this.createFinding({
          title: `${detail.code}: ${detail.title}`,
          description: alert,
          severity: this.mapDockleSeverity(detail.level),
          ruleId: detail.code,
          tags: ['docker', 'container', 'best-practice'],
        }));
      }
    }
    return findings;
  }

  private mapDockleSeverity(level: string): Severity {
    if (level === 'FATAL') return 'critical';
    if (level === 'WARN') return 'high';
    if (level === 'INFO') return 'medium';
    return 'low';
  }
}

export class CloudBuildShellCheckIntegration extends CloudBuildIntegration {
  name = 'ShellCheck (Cloud)';
  toolId: DockerToolId = 'shellcheck';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ file: string; line: number; column: number; level: string; code: number; message: string }>) {
      findings.push(this.createFinding({
        title: `SC${issue.code}`,
        description: issue.message,
        severity: this.mapSeverity(issue.level),
        file: issue.file,
        line: issue.line,
        column: issue.column,
        ruleId: `SC${issue.code}`,
        documentationUrl: `https://www.shellcheck.net/wiki/SC${issue.code}`,
        tags: ['shell', 'bash', 'script'],
      }));
    }
    return findings;
  }
}

export class CloudBuildTfsecIntegration extends CloudBuildIntegration {
  name = 'tfsec (Cloud)';
  toolId: DockerToolId = 'tfsec';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: Array<{ rule_id: string; rule_description: string; severity: string; location: { filename: string; start_line: number; end_line: number }; description: string; resolution?: string; links?: string[] }> };

    for (const result of data.results || []) {
      findings.push(this.createFinding({
        title: `${result.rule_id}: ${result.rule_description}`,
        description: result.description,
        severity: this.mapSeverity(result.severity),
        file: result.location.filename,
        line: result.location.start_line,
        ruleId: result.rule_id,
        recommendation: result.resolution,
        documentationUrl: result.links?.[0],
        tags: ['terraform', 'iac', 'security'],
      }));
    }
    return findings;
  }
}

export class CloudBuildGitleaksIntegration extends CloudBuildIntegration {
  name = 'Gitleaks (Cloud)';
  toolId: DockerToolId = 'gitleaks';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const leak of data as Array<{ Description: string; File: string; StartLine: number; EndLine: number; Secret: string; Match: string; RuleID: string }>) {
      findings.push(this.createFinding({
        title: `Secret detected: ${leak.Description}`,
        description: `Potential secret found matching rule ${leak.RuleID}`,
        severity: 'critical',
        file: leak.File,
        line: leak.StartLine,
        codeSnippet: leak.Match.replace(leak.Secret, '***REDACTED***'),
        ruleId: leak.RuleID,
        tags: ['secret', 'credential', 'sensitive-data'],
        recommendation: 'Remove the secret from source code and rotate the credential immediately',
      }));
    }
    return findings;
  }
}

export class CloudBuildBanditIntegration extends CloudBuildIntegration {
  name = 'Bandit (Cloud)';
  toolId: DockerToolId = 'bandit';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: Array<{ test_id: string; test_name: string; issue_severity: string; issue_confidence: string; issue_text: string; filename: string; line_number: number; code: string; more_info?: string }> };

    for (const result of data.results || []) {
      findings.push(this.createFinding({
        title: `${result.test_id}: ${result.test_name}`,
        description: result.issue_text,
        severity: this.mapSeverity(result.issue_severity),
        file: result.filename,
        line: result.line_number,
        codeSnippet: result.code,
        ruleId: result.test_id,
        documentationUrl: result.more_info,
        tags: ['python', 'security', result.test_name.toLowerCase().replace(/\s+/g, '-')],
      }));
    }
    return findings;
  }
}

export class CloudBuildGosecIntegration extends CloudBuildIntegration {
  name = 'gosec (Cloud)';
  toolId: DockerToolId = 'gosec';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { Issues?: Array<{ severity: string; confidence: string; cwe: { id: string }; rule_id: string; details: string; file: string; line: string; column: string; code: string }> };

    for (const issue of data.Issues || []) {
      findings.push(this.createFinding({
        title: `${issue.rule_id}: CWE-${issue.cwe.id}`,
        description: issue.details,
        severity: this.mapSeverity(issue.severity),
        file: issue.file,
        line: parseInt(issue.line, 10),
        column: parseInt(issue.column, 10),
        codeSnippet: issue.code,
        ruleId: issue.rule_id,
        tags: ['go', 'golang', 'security', `cwe-${issue.cwe.id}`],
      }));
    }
    return findings;
  }
}

// Export all Cloud Build integrations
export const CLOUD_BUILD_INTEGRATIONS: ToolIntegration[] = [
  new CloudBuildOWASPZAPIntegration(),
  new CloudBuildDependencyCheckIntegration(),
  new CloudBuildSitespeedIntegration(),
  new CloudBuildCodeClimateIntegration(),
  new CloudBuildTrivyIntegration(),
  new CloudBuildGrypeIntegration(),
  new CloudBuildSemgrepIntegration(),
  new CloudBuildNucleiIntegration(),
  new CloudBuildCheckovIntegration(),
  new CloudBuildSyftIntegration(),
  new CloudBuildDockleIntegration(),
  new CloudBuildShellCheckIntegration(),
  new CloudBuildTfsecIntegration(),
  new CloudBuildGitleaksIntegration(),
  new CloudBuildBanditIntegration(),
  new CloudBuildGosecIntegration(),
];
