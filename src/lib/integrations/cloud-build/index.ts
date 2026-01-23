/**
 * Cloud Build Tool Integrations
 *
 * Wraps the 78 Docker-based tools from cloud-build.ts as proper ToolIntegration
 * classes so they can be used by the AuditOrchestrator.
 *
 * Wave 1 (6 tools): Core security & performance
 * Wave 2 (10 tools): Advanced security scanning
 * Wave 3 (8 tools): Language-specific analysis
 * Wave 4 (20 tools): Dependencies, API, Mobile, Cloud Native, AI/ML
 * Wave 5-8 (34 tools): Extended language support, Cloud compliance, Supply chain
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
  androguard: {
    category: 'security',
    description: 'Android APK reverse engineering and malware analysis',
    website: 'https://github.com/androguard/androguard',
    targetType: 'source',
  },
  // Wave 5: Additional tools
  ruff: {
    category: 'code-quality',
    description: 'Fast Python linter and formatter',
    website: 'https://docs.astral.sh/ruff/',
    targetType: 'source',
  },
  mypy: {
    category: 'code-quality',
    description: 'Python static type checker',
    website: 'https://mypy-lang.org/',
    targetType: 'source',
  },
  hadolint: {
    category: 'code-quality',
    description: 'Dockerfile linter and best practices checker',
    website: 'https://github.com/hadolint/hadolint',
    targetType: 'source',
  },
  sqlfluff: {
    category: 'code-quality',
    description: 'SQL linter and auto-formatter',
    website: 'https://sqlfluff.com/',
    targetType: 'source',
  },
  'golangci-lint': {
    category: 'code-quality',
    description: 'Fast Go linters aggregator',
    website: 'https://golangci-lint.run/',
    targetType: 'source',
  },
  trufflehog: {
    category: 'security',
    description: 'Finds leaked credentials and secrets',
    website: 'https://trufflesecurity.com/trufflehog',
    targetType: 'source',
  },
  actionlint: {
    category: 'code-quality',
    description: 'GitHub Actions workflow linter',
    website: 'https://github.com/rhysd/actionlint',
    targetType: 'source',
  },
  kics: {
    category: 'security',
    description: 'Infrastructure as Code security scanner',
    website: 'https://kics.io/',
    targetType: 'source',
  },
  'cfn-lint': {
    category: 'code-quality',
    description: 'AWS CloudFormation linter',
    website: 'https://github.com/aws-cloudformation/cfn-lint',
    targetType: 'source',
  },
  vale: {
    category: 'code-quality',
    description: 'Prose linter for technical writing',
    website: 'https://vale.sh/',
    targetType: 'source',
  },
  yamllint: {
    category: 'code-quality',
    description: 'YAML syntax and style linter',
    website: 'https://github.com/adrienverge/yamllint',
    targetType: 'source',
  },
  bearer: {
    category: 'security',
    description: 'Data security scanner for code',
    website: 'https://www.bearer.com/',
    targetType: 'source',
  },
  pylint: {
    category: 'code-quality',
    description: 'Python code analysis tool',
    website: 'https://pylint.org/',
    targetType: 'source',
  },
  'dart-analyze': {
    category: 'code-quality',
    description: 'Dart static analyzer',
    website: 'https://dart.dev/tools/dart-analyze',
    targetType: 'source',
  },
  ktlint: {
    category: 'code-quality',
    description: 'Kotlin linter and formatter',
    website: 'https://ktlint.github.io/',
    targetType: 'source',
  },
  prowler: {
    category: 'security',
    description: 'AWS/Azure/GCP security assessment tool',
    website: 'https://prowler.com/',
    targetType: 'source',
  },
  clair: {
    category: 'security',
    description: 'Container vulnerability scanner',
    website: 'https://quay.github.io/clair/',
    targetType: 'image',
  },
  falco: {
    category: 'security',
    description: 'Cloud-native runtime security',
    website: 'https://falco.org/',
    targetType: 'source',
  },
  slither: {
    category: 'security',
    description: 'Solidity smart contract analyzer',
    website: 'https://github.com/crytic/slither',
    targetType: 'source',
  },
  'error-prone': {
    category: 'code-quality',
    description: 'Java static analysis tool by Google',
    website: 'https://errorprone.info/',
    targetType: 'source',
  },
  credo: {
    category: 'code-quality',
    description: 'Elixir static code analysis',
    website: 'https://hexdocs.pm/credo/',
    targetType: 'source',
  },
  steampipe: {
    category: 'security',
    description: 'Cloud infrastructure compliance scanner',
    website: 'https://steampipe.io/',
    targetType: 'source',
  },
  'sonar-scanner': {
    category: 'code-quality',
    description: 'SonarQube code quality scanner',
    website: 'https://docs.sonarqube.org/',
    targetType: 'source',
  },
  infer: {
    category: 'security',
    description: 'Facebook static analyzer for Java/C/C++/Objective-C',
    website: 'https://fbinfer.com/',
    targetType: 'source',
  },
  // Wave 8: January 2026 expansion
  scalafmt: {
    category: 'code-quality',
    description: 'Scala code formatter',
    website: 'https://scalameta.org/scalafmt/',
    targetType: 'source',
  },
  scalafix: {
    category: 'code-quality',
    description: 'Scala refactoring and linting tool',
    website: 'https://scalacenter.github.io/scalafix/',
    targetType: 'source',
  },
  hlint: {
    category: 'code-quality',
    description: 'Haskell source code suggestions',
    website: 'https://github.com/ndmitchell/hlint',
    targetType: 'source',
  },
  buf: {
    category: 'code-quality',
    description: 'Protocol buffer linter and breaking change detector',
    website: 'https://buf.build/',
    targetType: 'source',
  },
  'angular-eslint': {
    category: 'code-quality',
    description: 'ESLint plugin for Angular projects',
    website: 'https://github.com/angular-eslint/angular-eslint',
    targetType: 'source',
  },
  'scancode-toolkit': {
    category: 'security',
    description: 'License and copyright scanner',
    website: 'https://scancode-toolkit.readthedocs.io/',
    targetType: 'source',
  },
  licensee: {
    category: 'security',
    description: 'License detection tool',
    website: 'https://github.com/licensee/licensee',
    targetType: 'source',
  },
  cosign: {
    category: 'security',
    description: 'Container signing and verification',
    website: 'https://docs.sigstore.dev/cosign/',
    targetType: 'image',
  },
  safety: {
    category: 'security',
    description: 'Python dependency vulnerability checker',
    website: 'https://safetycli.com/',
    targetType: 'source',
  },
  sqlcheck: {
    category: 'code-quality',
    description: 'SQL anti-pattern detector',
    website: 'https://github.com/jarulraj/sqlcheck',
    targetType: 'source',
  },
  pgformatter: {
    category: 'code-quality',
    description: 'PostgreSQL SQL formatter',
    website: 'https://github.com/darold/pgFormatter',
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

// ============================================================
// Wave 3: Language-specific tools
// ============================================================

export class CloudBuildPHPStanIntegration extends CloudBuildIntegration {
  name = 'PHPStan (Cloud)';
  toolId: DockerToolId = 'phpstan';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { files?: Record<string, { messages: Array<{ line: number; message: string; ignorable?: boolean }> }> };

    for (const [file, fileData] of Object.entries(data.files || {})) {
      for (const msg of fileData.messages || []) {
        findings.push(this.createFinding({
          title: 'PHPStan Error',
          description: msg.message,
          severity: 'medium',
          file,
          line: msg.line,
          tags: ['php', 'static-analysis', 'type-safety'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildPsalmIntegration extends CloudBuildIntegration {
  name = 'Psalm (Cloud)';
  toolId: DockerToolId = 'psalm';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ type: string; message: string; file_name: string; line_from: number; column_from: number; severity: string }>) {
      findings.push(this.createFinding({
        title: issue.type,
        description: issue.message,
        severity: this.mapSeverity(issue.severity),
        file: issue.file_name,
        line: issue.line_from,
        column: issue.column_from,
        ruleId: issue.type,
        tags: ['php', 'psalm', 'type-safety'],
      }));
    }
    return findings;
  }
}

export class CloudBuildBrakemanIntegration extends CloudBuildIntegration {
  name = 'Brakeman (Cloud)';
  toolId: DockerToolId = 'brakeman';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { warnings?: Array<{ warning_type: string; message: string; file: string; line: number; confidence: string; code?: string; link?: string }> };

    for (const warn of data.warnings || []) {
      findings.push(this.createFinding({
        title: warn.warning_type,
        description: warn.message,
        severity: this.mapBrakemanConfidence(warn.confidence),
        file: warn.file,
        line: warn.line,
        codeSnippet: warn.code,
        documentationUrl: warn.link,
        tags: ['ruby', 'rails', 'security'],
      }));
    }
    return findings;
  }

  private mapBrakemanConfidence(confidence: string): Severity {
    if (confidence === 'High') return 'high';
    if (confidence === 'Medium') return 'medium';
    return 'low';
  }
}

export class CloudBuildRuboCopIntegration extends CloudBuildIntegration {
  name = 'RuboCop (Cloud)';
  toolId: DockerToolId = 'rubocop';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { files?: Array<{ path: string; offenses: Array<{ cop_name: string; message: string; severity: string; location: { start_line: number; start_column: number } }> }> };

    for (const file of data.files || []) {
      for (const offense of file.offenses || []) {
        findings.push(this.createFinding({
          title: offense.cop_name,
          description: offense.message,
          severity: this.mapSeverity(offense.severity),
          file: file.path,
          line: offense.location.start_line,
          column: offense.location.start_column,
          ruleId: offense.cop_name,
          tags: ['ruby', 'style', 'linting'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildSpotBugsIntegration extends CloudBuildIntegration {
  name = 'SpotBugs (Cloud)';
  toolId: DockerToolId = 'spotbugs';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { BugInstance?: Array<{ type: string; priority: string; category: string; message?: string; SourceLine?: { sourcepath: string; start: string } }> };

    for (const bug of data.BugInstance || []) {
      findings.push(this.createFinding({
        title: bug.type,
        description: bug.message || `SpotBugs ${bug.category} issue: ${bug.type}`,
        severity: this.mapSpotBugsPriority(bug.priority),
        file: bug.SourceLine?.sourcepath,
        line: bug.SourceLine?.start ? parseInt(bug.SourceLine.start, 10) : undefined,
        ruleId: bug.type,
        tags: ['java', 'spotbugs', bug.category.toLowerCase()],
      }));
    }
    return findings;
  }

  private mapSpotBugsPriority(priority: string): Severity {
    const p = parseInt(priority, 10);
    if (p === 1) return 'high';
    if (p === 2) return 'medium';
    return 'low';
  }
}

export class CloudBuildPMDIntegration extends CloudBuildIntegration {
  name = 'PMD (Cloud)';
  toolId: DockerToolId = 'pmd';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { files?: Array<{ filename: string; violations: Array<{ rule: string; ruleset: string; priority: number; beginline: number; description: string; externalInfoUrl?: string }> }> };

    for (const file of data.files || []) {
      for (const violation of file.violations || []) {
        findings.push(this.createFinding({
          title: violation.rule,
          description: violation.description,
          severity: this.mapPMDPriority(violation.priority),
          file: file.filename,
          line: violation.beginline,
          ruleId: violation.rule,
          documentationUrl: violation.externalInfoUrl,
          tags: ['java', 'pmd', violation.ruleset.toLowerCase()],
        }));
      }
    }
    return findings;
  }

  private mapPMDPriority(priority: number): Severity {
    if (priority === 1) return 'critical';
    if (priority === 2) return 'high';
    if (priority === 3) return 'medium';
    return 'low';
  }
}

export class CloudBuildCheckstyleIntegration extends CloudBuildIntegration {
  name = 'Checkstyle (Cloud)';
  toolId: DockerToolId = 'checkstyle';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { file?: Array<{ name: string; error?: Array<{ line: string; column?: string; severity: string; message: string; source: string }> }> };

    for (const file of data.file || []) {
      for (const error of file.error || []) {
        findings.push(this.createFinding({
          title: error.source.split('.').pop() || 'Checkstyle Issue',
          description: error.message,
          severity: this.mapSeverity(error.severity),
          file: file.name,
          line: parseInt(error.line, 10),
          column: error.column ? parseInt(error.column, 10) : undefined,
          ruleId: error.source,
          tags: ['java', 'checkstyle', 'style'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildDetektIntegration extends CloudBuildIntegration {
  name = 'Detekt (Cloud)';
  toolId: DockerToolId = 'detekt';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { findings?: Array<{ rule: string; severity: string; message: string; location: { file: string; line: number; column: number } }> };

    for (const finding of data.findings || []) {
      findings.push(this.createFinding({
        title: finding.rule,
        description: finding.message,
        severity: this.mapSeverity(finding.severity),
        file: finding.location.file,
        line: finding.location.line,
        column: finding.location.column,
        ruleId: finding.rule,
        tags: ['kotlin', 'detekt', 'code-quality'],
      }));
    }
    return findings;
  }
}

// ============================================================
// Wave 4: Dependencies, API, Mobile, Cloud Native, AI/ML
// ============================================================

export class CloudBuildOSVScannerIntegration extends CloudBuildIntegration {
  name = 'OSV Scanner (Cloud)';
  toolId: DockerToolId = 'osv-scanner';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: Array<{ source: { path: string }; packages: Array<{ package: { name: string; version: string }; vulnerabilities: Array<{ id: string; summary: string; severity?: Array<{ type: string; score: string }> }> }> }> };

    for (const result of data.results || []) {
      for (const pkg of result.packages || []) {
        for (const vuln of pkg.vulnerabilities || []) {
          findings.push(this.createFinding({
            title: `${vuln.id} in ${pkg.package.name}@${pkg.package.version}`,
            description: vuln.summary,
            severity: this.mapOSVSeverity(vuln.severity),
            file: result.source.path,
            ruleId: vuln.id,
            tags: ['vulnerability', 'dependency', 'osv'],
          }));
        }
      }
    }
    return findings;
  }

  private mapOSVSeverity(severity?: Array<{ type: string; score: string }>): Severity {
    if (!severity?.length) return 'medium';
    const cvss = parseFloat(severity[0].score);
    if (cvss >= 9.0) return 'critical';
    if (cvss >= 7.0) return 'high';
    if (cvss >= 4.0) return 'medium';
    return 'low';
  }
}

export class CloudBuildPipAuditIntegration extends CloudBuildIntegration {
  name = 'pip-audit (Cloud)';
  toolId: DockerToolId = 'pip-audit';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { dependencies?: Array<{ name: string; version: string; vulns: Array<{ id: string; description: string; fix_versions?: string[] }> }> };

    for (const dep of data.dependencies || []) {
      for (const vuln of dep.vulns || []) {
        findings.push(this.createFinding({
          title: `${vuln.id} in ${dep.name}@${dep.version}`,
          description: vuln.description,
          severity: 'high',
          ruleId: vuln.id,
          recommendation: vuln.fix_versions?.length ? `Upgrade to ${vuln.fix_versions.join(' or ')}` : 'No fix available',
          tags: ['python', 'pip', 'vulnerability'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildCargoAuditIntegration extends CloudBuildIntegration {
  name = 'cargo-audit (Cloud)';
  toolId: DockerToolId = 'cargo-audit';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { vulnerabilities?: { list: Array<{ advisory: { id: string; title: string; description: string; severity?: string }; package: { name: string; version: string }; versions?: { patched?: string[] } }> } };

    for (const vuln of data.vulnerabilities?.list || []) {
      findings.push(this.createFinding({
        title: `${vuln.advisory.id}: ${vuln.advisory.title}`,
        description: vuln.advisory.description,
        severity: this.mapSeverity(vuln.advisory.severity || 'medium'),
        ruleId: vuln.advisory.id,
        recommendation: vuln.versions?.patched?.length ? `Upgrade to ${vuln.versions.patched.join(' or ')}` : 'No patch available',
        tags: ['rust', 'cargo', 'vulnerability'],
      }));
    }
    return findings;
  }
}

export class CloudBuildSpectralIntegration extends CloudBuildIntegration {
  name = 'Spectral (Cloud)';
  toolId: DockerToolId = 'spectral';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ code: string; message: string; path: string[]; severity: number; source: string; range: { start: { line: number; character: number } } }>) {
      findings.push(this.createFinding({
        title: issue.code,
        description: issue.message,
        severity: this.mapSpectralSeverity(issue.severity),
        file: issue.source,
        line: issue.range.start.line,
        column: issue.range.start.character,
        ruleId: issue.code,
        tags: ['openapi', 'api', 'linting', ...issue.path],
      }));
    }
    return findings;
  }

  private mapSpectralSeverity(severity: number): Severity {
    if (severity === 0) return 'critical';
    if (severity === 1) return 'high';
    if (severity === 2) return 'medium';
    return 'low';
  }
}

export class CloudBuildSchemathesisIntegration extends CloudBuildIntegration {
  name = 'Schemathesis (Cloud)';
  toolId: DockerToolId = 'schemathesis';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { failures?: Array<{ endpoint: string; method: string; status_code: number; message: string; example?: unknown }> };

    for (const failure of data.failures || []) {
      findings.push(this.createFinding({
        title: `API Fuzz Failure: ${failure.method} ${failure.endpoint}`,
        description: failure.message,
        severity: failure.status_code >= 500 ? 'high' : 'medium',
        url: failure.endpoint,
        codeSnippet: failure.example ? JSON.stringify(failure.example, null, 2) : undefined,
        tags: ['api', 'fuzzing', 'schemathesis'],
      }));
    }
    return findings;
  }
}

export class CloudBuildGraphQLCopIntegration extends CloudBuildIntegration {
  name = 'GraphQL Cop (Cloud)';
  toolId: DockerToolId = 'graphql-cop';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { findings?: Array<{ title: string; severity: string; description: string; recommendation?: string }> };

    for (const finding of data.findings || []) {
      findings.push(this.createFinding({
        title: finding.title,
        description: finding.description,
        severity: this.mapSeverity(finding.severity),
        recommendation: finding.recommendation,
        tags: ['graphql', 'api', 'security'],
      }));
    }
    return findings;
  }
}

export class CloudBuildMobSFIntegration extends CloudBuildIntegration {
  name = 'MobSF (Cloud)';
  toolId: DockerToolId = 'mobsf';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { findings?: Record<string, Array<{ title: string; description: string; severity: string }>> };

    for (const [category, issues] of Object.entries(data.findings || {})) {
      for (const issue of issues) {
        findings.push(this.createFinding({
          title: issue.title,
          description: issue.description,
          severity: this.mapSeverity(issue.severity),
          tags: ['mobile', 'android', 'ios', category.toLowerCase()],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildAPKLeaksIntegration extends CloudBuildIntegration {
  name = 'APKLeaks (Cloud)';
  toolId: DockerToolId = 'apkleaks';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: Array<{ name: string; matches: string[] }> };

    for (const result of data.results || []) {
      for (const match of result.matches || []) {
        findings.push(this.createFinding({
          title: `Potential secret: ${result.name}`,
          description: `Found potential ${result.name} in APK`,
          severity: 'high',
          codeSnippet: match.substring(0, 200) + (match.length > 200 ? '...' : ''),
          tags: ['android', 'mobile', 'secrets', result.name.toLowerCase()],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildSwiftLintIntegration extends CloudBuildIntegration {
  name = 'SwiftLint (Cloud)';
  toolId: DockerToolId = 'swiftlint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ file: string; line: number; character: number; severity: string; type: string; rule_id: string; reason: string }>) {
      findings.push(this.createFinding({
        title: issue.rule_id,
        description: issue.reason,
        severity: this.mapSeverity(issue.severity),
        file: issue.file,
        line: issue.line,
        column: issue.character,
        ruleId: issue.rule_id,
        tags: ['swift', 'ios', 'macos', 'linting'],
      }));
    }
    return findings;
  }
}

export class CloudBuildKubesecIntegration extends CloudBuildIntegration {
  name = 'Kubesec (Cloud)';
  toolId: DockerToolId = 'kubesec';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const result of data as Array<{ object: string; scoring: { critical?: Array<{ id: string; reason: string }>; advise?: Array<{ id: string; reason: string }> } }>) {
      for (const issue of result.scoring?.critical || []) {
        findings.push(this.createFinding({
          title: issue.id,
          description: issue.reason,
          severity: 'critical',
          ruleId: issue.id,
          tags: ['kubernetes', 'security', 'manifest'],
        }));
      }
      for (const issue of result.scoring?.advise || []) {
        findings.push(this.createFinding({
          title: issue.id,
          description: issue.reason,
          severity: 'medium',
          ruleId: issue.id,
          tags: ['kubernetes', 'best-practice'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildKubeBenchIntegration extends CloudBuildIntegration {
  name = 'kube-bench (Cloud)';
  toolId: DockerToolId = 'kube-bench';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { Controls?: Array<{ tests?: Array<{ results?: Array<{ test_number: string; test_desc: string; status: string; remediation?: string }> }> }> };

    for (const control of data.Controls || []) {
      for (const test of control.tests || []) {
        for (const result of test.results || []) {
          if (result.status === 'FAIL') {
            findings.push(this.createFinding({
              title: `CIS ${result.test_number}`,
              description: result.test_desc,
              severity: 'high',
              ruleId: result.test_number,
              recommendation: result.remediation,
              tags: ['kubernetes', 'cis', 'benchmark', 'security'],
            }));
          }
        }
      }
    }
    return findings;
  }
}

export class CloudBuildPolarisIntegration extends CloudBuildIntegration {
  name = 'Polaris (Cloud)';
  toolId: DockerToolId = 'polaris';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { Results?: Array<{ Name: string; Namespace: string; PodResult?: { Results: Record<string, { Success: boolean; Message: string; Severity: string }> } }> };

    for (const result of data.Results || []) {
      for (const [check, checkResult] of Object.entries(result.PodResult?.Results || {})) {
        if (!checkResult.Success) {
          findings.push(this.createFinding({
            title: check,
            description: checkResult.Message,
            severity: this.mapSeverity(checkResult.Severity),
            ruleId: check,
            tags: ['kubernetes', 'polaris', 'best-practice', result.Namespace],
          }));
        }
      }
    }
    return findings;
  }
}

export class CloudBuildTerrascanIntegration extends CloudBuildIntegration {
  name = 'Terrascan (Cloud)';
  toolId: DockerToolId = 'terrascan';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: { violations?: Array<{ rule_name: string; description: string; severity: string; resource_name: string; file: string; line: number }> } };

    for (const violation of data.results?.violations || []) {
      findings.push(this.createFinding({
        title: violation.rule_name,
        description: violation.description,
        severity: this.mapSeverity(violation.severity),
        file: violation.file,
        line: violation.line,
        ruleId: violation.rule_name,
        tags: ['iac', 'terraform', 'cloud', violation.resource_name],
      }));
    }
    return findings;
  }
}

export class CloudBuildKubeHunterIntegration extends CloudBuildIntegration {
  name = 'kube-hunter (Cloud)';
  toolId: DockerToolId = 'kube-hunter';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { vulnerabilities?: Array<{ location: string; vid: string; category: string; severity: string; vulnerability: string; description: string; evidence?: string }> };

    for (const vuln of data.vulnerabilities || []) {
      findings.push(this.createFinding({
        title: vuln.vulnerability,
        description: vuln.description,
        severity: this.mapSeverity(vuln.severity),
        url: vuln.location,
        ruleId: vuln.vid,
        codeSnippet: vuln.evidence,
        tags: ['kubernetes', 'penetration-test', vuln.category.toLowerCase()],
      }));
    }
    return findings;
  }
}

export class CloudBuildCppcheckIntegration extends CloudBuildIntegration {
  name = 'Cppcheck (Cloud)';
  toolId: DockerToolId = 'cppcheck';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { errors?: Array<{ id: string; severity: string; msg: string; location?: Array<{ file: string; line: number; column: number }> }> };

    for (const error of data.errors || []) {
      const loc = error.location?.[0];
      findings.push(this.createFinding({
        title: error.id,
        description: error.msg,
        severity: this.mapSeverity(error.severity),
        file: loc?.file,
        line: loc?.line,
        column: loc?.column,
        ruleId: error.id,
        tags: ['c', 'cpp', 'cppcheck'],
      }));
    }
    return findings;
  }
}

export class CloudBuildFlawfinderIntegration extends CloudBuildIntegration {
  name = 'Flawfinder (Cloud)';
  toolId: DockerToolId = 'flawfinder';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: Array<{ filename: string; line: number; column: number; level: number; name: string; warning: string; suggestion?: string }> };

    for (const result of data.results || []) {
      findings.push(this.createFinding({
        title: result.name,
        description: result.warning,
        severity: this.mapFlawfinderLevel(result.level),
        file: result.filename,
        line: result.line,
        column: result.column,
        recommendation: result.suggestion,
        ruleId: result.name,
        tags: ['c', 'cpp', 'security', 'flawfinder'],
      }));
    }
    return findings;
  }

  private mapFlawfinderLevel(level: number): Severity {
    if (level >= 4) return 'critical';
    if (level >= 3) return 'high';
    if (level >= 2) return 'medium';
    return 'low';
  }
}

export class CloudBuildClippyIntegration extends CloudBuildIntegration {
  name = 'Clippy (Cloud)';
  toolId: DockerToolId = 'clippy';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lines = typeof output === 'string' ? output.split('\n').filter(Boolean) : [];

    for (const line of lines) {
      try {
        const msg = JSON.parse(line) as { reason: string; message?: { rendered: string; level: string; spans?: Array<{ file_name: string; line_start: number; column_start: number }>; code?: { code: string } } };
        if (msg.reason === 'compiler-message' && msg.message) {
          const span = msg.message.spans?.[0];
          findings.push(this.createFinding({
            title: msg.message.code?.code || 'Clippy Warning',
            description: msg.message.rendered,
            severity: msg.message.level === 'error' ? 'high' : 'medium',
            file: span?.file_name,
            line: span?.line_start,
            column: span?.column_start,
            ruleId: msg.message.code?.code,
            tags: ['rust', 'clippy', 'linting'],
          }));
        }
      } catch {
        // Skip non-JSON lines
      }
    }
    return findings;
  }
}

export class CloudBuildGarakIntegration extends CloudBuildIntegration {
  name = 'Garak (Cloud)';
  toolId: DockerToolId = 'garak';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: Array<{ probe: string; detector: string; passed: boolean; output?: string; trigger?: string }> };

    for (const result of data.results || []) {
      if (!result.passed) {
        findings.push(this.createFinding({
          title: `LLM Vulnerability: ${result.probe}`,
          description: `Detector ${result.detector} found vulnerability in LLM response`,
          severity: 'high',
          codeSnippet: result.output?.substring(0, 500),
          ruleId: `${result.probe}-${result.detector}`,
          tags: ['llm', 'ai', 'security', 'prompt-injection'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildModelScanIntegration extends CloudBuildIntegration {
  name = 'ModelScan (Cloud)';
  toolId: DockerToolId = 'modelscan';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { issues?: Array<{ severity: string; description: string; source: string; scanner: string }> };

    for (const issue of data.issues || []) {
      findings.push(this.createFinding({
        title: `ML Model Issue: ${issue.scanner}`,
        description: issue.description,
        severity: this.mapSeverity(issue.severity),
        file: issue.source,
        ruleId: issue.scanner,
        tags: ['ml', 'model', 'security', 'ai'],
      }));
    }
    return findings;
  }
}

export class CloudBuildAndroguardIntegration extends CloudBuildIntegration {
  name = 'Androguard (Cloud)';
  toolId: DockerToolId = 'androguard';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { analysis?: { permissions?: Array<{ name: string; protection_level?: string }>; activities?: Array<{ name: string; exported?: boolean }>; receivers?: Array<{ name: string; exported?: boolean }>; providers?: Array<{ name: string; exported?: boolean }> } };

    // Check for dangerous permissions
    for (const perm of data.analysis?.permissions || []) {
      if (perm.protection_level === 'dangerous') {
        findings.push(this.createFinding({
          title: `Dangerous Permission: ${perm.name}`,
          description: `Application requests dangerous permission: ${perm.name}`,
          severity: 'medium',
          ruleId: perm.name,
          tags: ['android', 'permission', 'mobile'],
        }));
      }
    }

    // Check for exported components
    const checkExported = (items: Array<{ name: string; exported?: boolean }> | undefined, type: string) => {
      for (const item of items || []) {
        if (item.exported) {
          findings.push(this.createFinding({
            title: `Exported ${type}: ${item.name}`,
            description: `${type} is exported and accessible to other apps`,
            severity: 'low',
            ruleId: `exported-${type.toLowerCase()}`,
            tags: ['android', 'exported', 'mobile'],
          }));
        }
      }
    };

    checkExported(data.analysis?.activities, 'Activity');
    checkExported(data.analysis?.receivers, 'Receiver');
    checkExported(data.analysis?.providers, 'Provider');

    return findings;
  }
}

// ============================================================
// Wave 5-8: Additional Tools
// ============================================================

export class CloudBuildRuffIntegration extends CloudBuildIntegration {
  name = 'Ruff (Cloud)';
  toolId: DockerToolId = 'ruff';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ code: string; message: string; filename: string; location: { row: number; column: number } }>) {
      findings.push(this.createFinding({
        title: issue.code,
        description: issue.message,
        severity: issue.code.startsWith('E') ? 'high' : 'medium',
        file: issue.filename,
        line: issue.location.row,
        column: issue.location.column,
        ruleId: issue.code,
        tags: ['python', 'ruff', 'linting'],
      }));
    }
    return findings;
  }
}

export class CloudBuildMypyIntegration extends CloudBuildIntegration {
  name = 'mypy (Cloud)';
  toolId: DockerToolId = 'mypy';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lines = typeof output === 'string' ? output.split('\n').filter(Boolean) : [];

    for (const line of lines) {
      const match = line.match(/^(.+):(\d+): (error|warning|note): (.+)$/);
      if (match) {
        findings.push(this.createFinding({
          title: 'Type Error',
          description: match[4],
          severity: match[3] === 'error' ? 'high' : 'medium',
          file: match[1],
          line: parseInt(match[2], 10),
          tags: ['python', 'mypy', 'type-checking'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildHadolintIntegration extends CloudBuildIntegration {
  name = 'Hadolint (Cloud)';
  toolId: DockerToolId = 'hadolint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ code: string; message: string; file: string; line: number; level: string }>) {
      findings.push(this.createFinding({
        title: issue.code,
        description: issue.message,
        severity: this.mapSeverity(issue.level),
        file: issue.file,
        line: issue.line,
        ruleId: issue.code,
        documentationUrl: `https://github.com/hadolint/hadolint/wiki/${issue.code}`,
        tags: ['docker', 'dockerfile', 'hadolint'],
      }));
    }
    return findings;
  }
}

export class CloudBuildSqlfluffIntegration extends CloudBuildIntegration {
  name = 'SQLFluff (Cloud)';
  toolId: DockerToolId = 'sqlfluff';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const file of data as Array<{ filepath: string; violations: Array<{ code: string; description: string; start_line_no: number; start_line_pos: number }> }>) {
      for (const violation of file.violations || []) {
        findings.push(this.createFinding({
          title: violation.code,
          description: violation.description,
          severity: 'medium',
          file: file.filepath,
          line: violation.start_line_no,
          column: violation.start_line_pos,
          ruleId: violation.code,
          tags: ['sql', 'sqlfluff', 'linting'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildGolangciLintIntegration extends CloudBuildIntegration {
  name = 'golangci-lint (Cloud)';
  toolId: DockerToolId = 'golangci-lint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { Issues?: Array<{ FromLinter: string; Text: string; Severity: string; Pos: { Filename: string; Line: number; Column: number } }> };

    for (const issue of data.Issues || []) {
      findings.push(this.createFinding({
        title: issue.FromLinter,
        description: issue.Text,
        severity: this.mapSeverity(issue.Severity),
        file: issue.Pos.Filename,
        line: issue.Pos.Line,
        column: issue.Pos.Column,
        ruleId: issue.FromLinter,
        tags: ['go', 'golang', 'linting'],
      }));
    }
    return findings;
  }
}

export class CloudBuildTrufflehogIntegration extends CloudBuildIntegration {
  name = 'TruffleHog (Cloud)';
  toolId: DockerToolId = 'trufflehog';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lines = typeof output === 'string' ? output.split('\n').filter(Boolean) : [];

    for (const line of lines) {
      try {
        const result = JSON.parse(line) as { DetectorName: string; SourceMetadata?: { Data?: { Filesystem?: { file: string; line?: number } } }; Raw?: string };
        findings.push(this.createFinding({
          title: `Secret Found: ${result.DetectorName}`,
          description: `Potential ${result.DetectorName} credential detected`,
          severity: 'critical',
          file: result.SourceMetadata?.Data?.Filesystem?.file,
          line: result.SourceMetadata?.Data?.Filesystem?.line,
          codeSnippet: result.Raw ? '***REDACTED***' : undefined,
          tags: ['secret', 'credential', 'trufflehog'],
        }));
      } catch {
        // Skip non-JSON lines
      }
    }
    return findings;
  }
}

export class CloudBuildActionlintIntegration extends CloudBuildIntegration {
  name = 'actionlint (Cloud)';
  toolId: DockerToolId = 'actionlint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ message: string; filepath: string; line: number; column: number; kind: string }>) {
      findings.push(this.createFinding({
        title: issue.kind,
        description: issue.message,
        severity: 'medium',
        file: issue.filepath,
        line: issue.line,
        column: issue.column,
        ruleId: issue.kind,
        tags: ['github-actions', 'workflow', 'ci-cd'],
      }));
    }
    return findings;
  }
}

export class CloudBuildKicsIntegration extends CloudBuildIntegration {
  name = 'KICS (Cloud)';
  toolId: DockerToolId = 'kics';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { queries?: Array<{ query_name: string; severity: string; description: string; files?: Array<{ file_name: string; line: number }> }> };

    for (const query of data.queries || []) {
      for (const file of query.files || []) {
        findings.push(this.createFinding({
          title: query.query_name,
          description: query.description,
          severity: this.mapSeverity(query.severity),
          file: file.file_name,
          line: file.line,
          ruleId: query.query_name,
          tags: ['iac', 'security', 'kics'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildCfnLintIntegration extends CloudBuildIntegration {
  name = 'cfn-lint (Cloud)';
  toolId: DockerToolId = 'cfn-lint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ Rule: { Id: string; Description: string }; Level: string; Message: string; Filename: string; Location: { Start: { LineNumber: number; ColumnNumber: number } } }>) {
      findings.push(this.createFinding({
        title: issue.Rule.Id,
        description: issue.Message,
        severity: this.mapSeverity(issue.Level),
        file: issue.Filename,
        line: issue.Location.Start.LineNumber,
        column: issue.Location.Start.ColumnNumber,
        ruleId: issue.Rule.Id,
        tags: ['cloudformation', 'aws', 'iac'],
      }));
    }
    return findings;
  }
}

export class CloudBuildValeIntegration extends CloudBuildIntegration {
  name = 'Vale (Cloud)';
  toolId: DockerToolId = 'vale';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as Record<string, Array<{ Line: number; Span: [number, number]; Check: string; Message: string; Severity: string }>>;

    for (const [file, issues] of Object.entries(data || {})) {
      for (const issue of issues) {
        findings.push(this.createFinding({
          title: issue.Check,
          description: issue.Message,
          severity: this.mapSeverity(issue.Severity),
          file,
          line: issue.Line,
          column: issue.Span[0],
          ruleId: issue.Check,
          tags: ['prose', 'documentation', 'vale'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildYamllintIntegration extends CloudBuildIntegration {
  name = 'yamllint (Cloud)';
  toolId: DockerToolId = 'yamllint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lines = typeof output === 'string' ? output.split('\n').filter(Boolean) : [];

    for (const line of lines) {
      const match = line.match(/^(.+):(\d+):(\d+): \[(\w+)\] (.+) \((.+)\)$/);
      if (match) {
        findings.push(this.createFinding({
          title: match[6],
          description: match[5],
          severity: match[4] === 'error' ? 'high' : 'medium',
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          ruleId: match[6],
          tags: ['yaml', 'linting', 'yamllint'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildBearerIntegration extends CloudBuildIntegration {
  name = 'Bearer (Cloud)';
  toolId: DockerToolId = 'bearer';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { findings?: Array<{ rule_id: string; title: string; description: string; severity: string; filename: string; line_number: number }> };

    for (const finding of data.findings || []) {
      findings.push(this.createFinding({
        title: finding.title,
        description: finding.description,
        severity: this.mapSeverity(finding.severity),
        file: finding.filename,
        line: finding.line_number,
        ruleId: finding.rule_id,
        tags: ['data-security', 'privacy', 'bearer'],
      }));
    }
    return findings;
  }
}

export class CloudBuildPylintIntegration extends CloudBuildIntegration {
  name = 'Pylint (Cloud)';
  toolId: DockerToolId = 'pylint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ type: string; module: string; obj: string; line: number; column: number; path: string; symbol: string; message: string; 'message-id': string }>) {
      findings.push(this.createFinding({
        title: `${issue['message-id']}: ${issue.symbol}`,
        description: issue.message,
        severity: this.mapPylintType(issue.type),
        file: issue.path,
        line: issue.line,
        column: issue.column,
        ruleId: issue['message-id'],
        tags: ['python', 'pylint', 'linting'],
      }));
    }
    return findings;
  }

  private mapPylintType(type: string): Severity {
    if (type === 'error' || type === 'fatal') return 'high';
    if (type === 'warning') return 'medium';
    return 'low';
  }
}

export class CloudBuildDartAnalyzeIntegration extends CloudBuildIntegration {
  name = 'dart analyze (Cloud)';
  toolId: DockerToolId = 'dart-analyze';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { diagnostics?: Array<{ code: string; severity: string; type: string; location: { file: string; range: { start: { line: number; column: number } } }; problemMessage: string }> };

    for (const diag of data.diagnostics || []) {
      findings.push(this.createFinding({
        title: diag.code,
        description: diag.problemMessage,
        severity: this.mapSeverity(diag.severity),
        file: diag.location.file,
        line: diag.location.range.start.line,
        column: diag.location.range.start.column,
        ruleId: diag.code,
        tags: ['dart', 'flutter', 'analysis'],
      }));
    }
    return findings;
  }
}

export class CloudBuildKtlintIntegration extends CloudBuildIntegration {
  name = 'ktlint (Cloud)';
  toolId: DockerToolId = 'ktlint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const file of data as Array<{ file: string; errors: Array<{ line: number; column: number; message: string; rule: string }> }>) {
      for (const error of file.errors || []) {
        findings.push(this.createFinding({
          title: error.rule,
          description: error.message,
          severity: 'medium',
          file: file.file,
          line: error.line,
          column: error.column,
          ruleId: error.rule,
          tags: ['kotlin', 'ktlint', 'style'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildProwlerIntegration extends CloudBuildIntegration {
  name = 'Prowler (Cloud)';
  toolId: DockerToolId = 'prowler';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const check of data as Array<{ CheckID: string; CheckTitle: string; Status: string; Severity: string; ResourceId: string; StatusExtended: string }>) {
      if (check.Status === 'FAIL') {
        findings.push(this.createFinding({
          title: `${check.CheckID}: ${check.CheckTitle}`,
          description: check.StatusExtended,
          severity: this.mapSeverity(check.Severity),
          ruleId: check.CheckID,
          tags: ['cloud', 'aws', 'azure', 'gcp', 'security', check.ResourceId],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildClairIntegration extends CloudBuildIntegration {
  name = 'Clair (Cloud)';
  toolId: DockerToolId = 'clair';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { vulnerabilities?: Record<string, Array<{ Name: string; Severity: string; Description: string; Link: string; FixedBy?: string }>> };

    for (const [, vulns] of Object.entries(data.vulnerabilities || {})) {
      for (const vuln of vulns) {
        findings.push(this.createFinding({
          title: vuln.Name,
          description: vuln.Description,
          severity: this.mapSeverity(vuln.Severity),
          ruleId: vuln.Name,
          documentationUrl: vuln.Link,
          recommendation: vuln.FixedBy ? `Upgrade to ${vuln.FixedBy}` : 'No fix available',
          tags: ['container', 'vulnerability', 'clair'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildFalcoIntegration extends CloudBuildIntegration {
  name = 'Falco (Cloud)';
  toolId: DockerToolId = 'falco';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const event of data as Array<{ rule: string; priority: string; output: string; output_fields?: Record<string, string> }>) {
      findings.push(this.createFinding({
        title: event.rule,
        description: event.output,
        severity: this.mapFalcoPriority(event.priority),
        ruleId: event.rule,
        tags: ['runtime', 'security', 'falco', 'kubernetes'],
      }));
    }
    return findings;
  }

  private mapFalcoPriority(priority: string): Severity {
    const p = priority.toLowerCase();
    if (p === 'critical' || p === 'emergency' || p === 'alert') return 'critical';
    if (p === 'error' || p === 'warning') return 'high';
    if (p === 'notice') return 'medium';
    return 'low';
  }
}

export class CloudBuildSlitherIntegration extends CloudBuildIntegration {
  name = 'Slither (Cloud)';
  toolId: DockerToolId = 'slither';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { results?: { detectors?: Array<{ check: string; impact: string; confidence: string; description: string; elements?: Array<{ source_mapping?: { filename: string; lines: number[] } }> }> } };

    for (const detector of data.results?.detectors || []) {
      const elem = detector.elements?.[0];
      findings.push(this.createFinding({
        title: detector.check,
        description: detector.description,
        severity: this.mapSlitherImpact(detector.impact),
        file: elem?.source_mapping?.filename,
        line: elem?.source_mapping?.lines?.[0],
        ruleId: detector.check,
        tags: ['solidity', 'smart-contract', 'security', 'slither'],
      }));
    }
    return findings;
  }

  private mapSlitherImpact(impact: string): Severity {
    if (impact === 'High') return 'critical';
    if (impact === 'Medium') return 'high';
    if (impact === 'Low') return 'medium';
    return 'low';
  }
}

export class CloudBuildErrorProneIntegration extends CloudBuildIntegration {
  name = 'Error Prone (Cloud)';
  toolId: DockerToolId = 'error-prone';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lines = typeof output === 'string' ? output.split('\n').filter(Boolean) : [];

    for (const line of lines) {
      const match = line.match(/^(.+):(\d+): (error|warning): \[(\w+)\] (.+)$/);
      if (match) {
        findings.push(this.createFinding({
          title: match[4],
          description: match[5],
          severity: match[3] === 'error' ? 'high' : 'medium',
          file: match[1],
          line: parseInt(match[2], 10),
          ruleId: match[4],
          documentationUrl: `https://errorprone.info/bugpattern/${match[4]}`,
          tags: ['java', 'error-prone', 'static-analysis'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildCredoIntegration extends CloudBuildIntegration {
  name = 'Credo (Cloud)';
  toolId: DockerToolId = 'credo';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { issues?: Array<{ category: string; check: string; message: string; filename: string; line_no: number; column: number; priority: number }> };

    for (const issue of data.issues || []) {
      findings.push(this.createFinding({
        title: issue.check,
        description: issue.message,
        severity: this.mapCredoPriority(issue.priority),
        file: issue.filename,
        line: issue.line_no,
        column: issue.column,
        ruleId: issue.check,
        tags: ['elixir', 'credo', issue.category.toLowerCase()],
      }));
    }
    return findings;
  }

  private mapCredoPriority(priority: number): Severity {
    if (priority >= 20) return 'high';
    if (priority >= 10) return 'medium';
    return 'low';
  }
}

export class CloudBuildSteampipeIntegration extends CloudBuildIntegration {
  name = 'Steampipe (Cloud)';
  toolId: DockerToolId = 'steampipe';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { controls?: Array<{ control_id: string; title: string; status: string; severity: string; reason: string; resource: string }> };

    for (const control of data.controls || []) {
      if (control.status === 'alarm') {
        findings.push(this.createFinding({
          title: `${control.control_id}: ${control.title}`,
          description: control.reason,
          severity: this.mapSeverity(control.severity),
          ruleId: control.control_id,
          tags: ['cloud', 'compliance', 'steampipe', control.resource],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildSonarScannerIntegration extends CloudBuildIntegration {
  name = 'SonarScanner (Cloud)';
  toolId: DockerToolId = 'sonar-scanner';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { issues?: Array<{ rule: string; severity: string; component: string; line?: number; message: string; type: string }> };

    for (const issue of data.issues || []) {
      findings.push(this.createFinding({
        title: issue.rule,
        description: issue.message,
        severity: this.mapSeverity(issue.severity),
        file: issue.component,
        line: issue.line,
        ruleId: issue.rule,
        tags: ['sonarqube', 'code-quality', issue.type.toLowerCase()],
      }));
    }
    return findings;
  }
}

export class CloudBuildInferIntegration extends CloudBuildIntegration {
  name = 'Infer (Cloud)';
  toolId: DockerToolId = 'infer';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const issue of data as Array<{ bug_type: string; severity: string; file: string; line: number; column: number; procedure: string; qualifier: string }>) {
      findings.push(this.createFinding({
        title: issue.bug_type,
        description: issue.qualifier,
        severity: this.mapSeverity(issue.severity),
        file: issue.file,
        line: issue.line,
        column: issue.column,
        ruleId: issue.bug_type,
        tags: ['infer', 'facebook', 'static-analysis', issue.procedure],
      }));
    }
    return findings;
  }
}

export class CloudBuildScalafmtIntegration extends CloudBuildIntegration {
  name = 'Scalafmt (Cloud)';
  toolId: DockerToolId = 'scalafmt';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lines = typeof output === 'string' ? output.split('\n').filter(Boolean) : [];

    for (const line of lines) {
      if (line.includes('error') || line.includes('would reformat')) {
        const match = line.match(/^(.+\.scala)/);
        findings.push(this.createFinding({
          title: 'Formatting Issue',
          description: line,
          severity: 'low',
          file: match?.[1],
          ruleId: 'scalafmt',
          tags: ['scala', 'formatting', 'scalafmt'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildScalafixIntegration extends CloudBuildIntegration {
  name = 'Scalafix (Cloud)';
  toolId: DockerToolId = 'scalafix';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { diagnostics?: Array<{ message: string; position: { path: string; startLine: number; startColumn: number }; severity: string }> };

    for (const diag of data.diagnostics || []) {
      findings.push(this.createFinding({
        title: 'Scalafix Issue',
        description: diag.message,
        severity: this.mapSeverity(diag.severity),
        file: diag.position.path,
        line: diag.position.startLine,
        column: diag.position.startColumn,
        tags: ['scala', 'refactoring', 'scalafix'],
      }));
    }
    return findings;
  }
}

export class CloudBuildHlintIntegration extends CloudBuildIntegration {
  name = 'HLint (Cloud)';
  toolId: DockerToolId = 'hlint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const hint of data as Array<{ hint: string; severity: string; file: string; startLine: number; startColumn: number; from: string; to: string }>) {
      findings.push(this.createFinding({
        title: hint.hint,
        description: `Replace "${hint.from}" with "${hint.to}"`,
        severity: this.mapSeverity(hint.severity),
        file: hint.file,
        line: hint.startLine,
        column: hint.startColumn,
        codeSnippet: hint.from,
        fixExample: hint.to,
        tags: ['haskell', 'hlint', 'suggestions'],
      }));
    }
    return findings;
  }
}

export class CloudBuildBufIntegration extends CloudBuildIntegration {
  name = 'Buf (Cloud)';
  toolId: DockerToolId = 'buf';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lines = typeof output === 'string' ? output.split('\n').filter(Boolean) : [];

    for (const line of lines) {
      const match = line.match(/^(.+):(\d+):(\d+):(.+)$/);
      if (match) {
        findings.push(this.createFinding({
          title: 'Buf Lint Issue',
          description: match[4].trim(),
          severity: 'medium',
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          tags: ['protobuf', 'grpc', 'buf'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildAngularEslintIntegration extends CloudBuildIntegration {
  name = 'angular-eslint (Cloud)';
  toolId: DockerToolId = 'angular-eslint';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = Array.isArray(output) ? output : [];

    for (const file of data as Array<{ filePath: string; messages: Array<{ ruleId: string; severity: number; message: string; line: number; column: number }> }>) {
      for (const msg of file.messages || []) {
        findings.push(this.createFinding({
          title: msg.ruleId || 'Angular Lint Issue',
          description: msg.message,
          severity: msg.severity === 2 ? 'high' : 'medium',
          file: file.filePath,
          line: msg.line,
          column: msg.column,
          ruleId: msg.ruleId,
          tags: ['angular', 'typescript', 'eslint'],
        }));
      }
    }
    return findings;
  }
}

export class CloudBuildScancodeToolkitIntegration extends CloudBuildIntegration {
  name = 'ScanCode Toolkit (Cloud)';
  toolId: DockerToolId = 'scancode-toolkit';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { files?: Array<{ path: string; licenses?: Array<{ key: string; name: string; category: string; spdx_license_key: string }>; copyrights?: Array<{ copyright: string }> }> };

    for (const file of data.files || []) {
      for (const license of file.licenses || []) {
        if (license.category === 'Copyleft' || license.category === 'Proprietary') {
          findings.push(this.createFinding({
            title: `License: ${license.name}`,
            description: `Found ${license.category} license: ${license.spdx_license_key}`,
            severity: license.category === 'Proprietary' ? 'high' : 'medium',
            file: file.path,
            ruleId: license.key,
            tags: ['license', 'compliance', 'scancode'],
          }));
        }
      }
    }
    return findings;
  }
}

export class CloudBuildLicenseeIntegration extends CloudBuildIntegration {
  name = 'Licensee (Cloud)';
  toolId: DockerToolId = 'licensee';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { licenses?: Array<{ spdx_id: string; key: string; name: string; matched_files: string[] }> };

    if (!data.licenses?.length) {
      findings.push(this.createFinding({
        title: 'No License Detected',
        description: 'Could not detect a license file in the repository',
        severity: 'medium',
        tags: ['license', 'compliance', 'licensee'],
      }));
    }
    return findings;
  }
}

export class CloudBuildCosignIntegration extends CloudBuildIntegration {
  name = 'Cosign (Cloud)';
  toolId: DockerToolId = 'cosign';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { verified?: boolean; signatures?: Array<{ issuer?: string; subject?: string }>; error?: string };

    if (!data.verified) {
      findings.push(this.createFinding({
        title: 'Container Signature Verification Failed',
        description: data.error || 'Container image signature could not be verified',
        severity: 'high',
        tags: ['container', 'signing', 'cosign', 'supply-chain'],
      }));
    }
    return findings;
  }
}

export class CloudBuildSafetyIntegration extends CloudBuildIntegration {
  name = 'Safety (Cloud)';
  toolId: DockerToolId = 'safety';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { vulnerabilities?: Array<{ package_name: string; vulnerable_versions: string; id: string; advisory: string; severity: string; more_info_url?: string }> };

    for (const vuln of data.vulnerabilities || []) {
      findings.push(this.createFinding({
        title: `${vuln.id} in ${vuln.package_name}`,
        description: vuln.advisory,
        severity: this.mapSeverity(vuln.severity),
        ruleId: vuln.id,
        documentationUrl: vuln.more_info_url,
        tags: ['python', 'dependency', 'vulnerability', 'safety'],
      }));
    }
    return findings;
  }
}

export class CloudBuildSqlcheckIntegration extends CloudBuildIntegration {
  name = 'sqlcheck (Cloud)';
  toolId: DockerToolId = 'sqlcheck';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { issues?: Array<{ risk_level: string; query: string; pattern_name: string; description: string; file?: string; line?: number }> };

    for (const issue of data.issues || []) {
      findings.push(this.createFinding({
        title: issue.pattern_name,
        description: issue.description,
        severity: this.mapSqlcheckRisk(issue.risk_level),
        file: issue.file,
        line: issue.line,
        codeSnippet: issue.query,
        ruleId: issue.pattern_name,
        tags: ['sql', 'anti-pattern', 'sqlcheck'],
      }));
    }
    return findings;
  }

  private mapSqlcheckRisk(risk: string): Severity {
    if (risk === 'high') return 'high';
    if (risk === 'medium') return 'medium';
    return 'low';
  }
}

export class CloudBuildPgformatterIntegration extends CloudBuildIntegration {
  name = 'pgFormatter (Cloud)';
  toolId: DockerToolId = 'pgformatter';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    // pgFormatter is a formatter, not a linter - returns empty findings
    // but formatted output is stored in result metadata
    return [];
  }
}

// Export all Cloud Build integrations (78 Docker-based tools)
export const CLOUD_BUILD_INTEGRATIONS: ToolIntegration[] = [
  // Wave 1: Core security & performance
  new CloudBuildOWASPZAPIntegration(),
  new CloudBuildDependencyCheckIntegration(),
  new CloudBuildSitespeedIntegration(),
  new CloudBuildCodeClimateIntegration(),
  new CloudBuildTrivyIntegration(),
  new CloudBuildGrypeIntegration(),

  // Wave 2: Advanced security scanning
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

  // Wave 3: Language-specific tools
  new CloudBuildPHPStanIntegration(),
  new CloudBuildPsalmIntegration(),
  new CloudBuildBrakemanIntegration(),
  new CloudBuildRuboCopIntegration(),
  new CloudBuildSpotBugsIntegration(),
  new CloudBuildPMDIntegration(),
  new CloudBuildCheckstyleIntegration(),
  new CloudBuildDetektIntegration(),

  // Wave 4: Dependencies, API, Mobile, Cloud Native, AI/ML
  new CloudBuildOSVScannerIntegration(),
  new CloudBuildPipAuditIntegration(),
  new CloudBuildCargoAuditIntegration(),
  new CloudBuildSpectralIntegration(),
  new CloudBuildSchemathesisIntegration(),
  new CloudBuildGraphQLCopIntegration(),
  new CloudBuildMobSFIntegration(),
  new CloudBuildAPKLeaksIntegration(),
  new CloudBuildSwiftLintIntegration(),
  new CloudBuildKubesecIntegration(),
  new CloudBuildKubeBenchIntegration(),
  new CloudBuildPolarisIntegration(),
  new CloudBuildTerrascanIntegration(),
  new CloudBuildKubeHunterIntegration(),
  new CloudBuildCppcheckIntegration(),
  new CloudBuildFlawfinderIntegration(),
  new CloudBuildClippyIntegration(),
  new CloudBuildGarakIntegration(),
  new CloudBuildModelScanIntegration(),
  new CloudBuildAndroguardIntegration(),

  // Wave 5-8: Additional tools
  new CloudBuildRuffIntegration(),
  new CloudBuildMypyIntegration(),
  new CloudBuildHadolintIntegration(),
  new CloudBuildSqlfluffIntegration(),
  new CloudBuildGolangciLintIntegration(),
  new CloudBuildTrufflehogIntegration(),
  new CloudBuildActionlintIntegration(),
  new CloudBuildKicsIntegration(),
  new CloudBuildCfnLintIntegration(),
  new CloudBuildValeIntegration(),
  new CloudBuildYamllintIntegration(),
  new CloudBuildBearerIntegration(),
  new CloudBuildPylintIntegration(),
  new CloudBuildDartAnalyzeIntegration(),
  new CloudBuildKtlintIntegration(),
  new CloudBuildProwlerIntegration(),
  new CloudBuildClairIntegration(),
  new CloudBuildFalcoIntegration(),
  new CloudBuildSlitherIntegration(),
  new CloudBuildErrorProneIntegration(),
  new CloudBuildCredoIntegration(),
  new CloudBuildSteampipeIntegration(),
  new CloudBuildSonarScannerIntegration(),
  new CloudBuildInferIntegration(),
  new CloudBuildScalafmtIntegration(),
  new CloudBuildScalafixIntegration(),
  new CloudBuildHlintIntegration(),
  new CloudBuildBufIntegration(),
  new CloudBuildAngularEslintIntegration(),
  new CloudBuildScancodeToolkitIntegration(),
  new CloudBuildLicenseeIntegration(),
  new CloudBuildCosignIntegration(),
  new CloudBuildSafetyIntegration(),
  new CloudBuildSqlcheckIntegration(),
  new CloudBuildPgformatterIntegration(),
];

// Export count for verification
// Total: 78 Docker-based tool integrations
export const CLOUD_BUILD_TOOL_COUNT = CLOUD_BUILD_INTEGRATIONS.length;  // 78 Docker integrations
