// Unified Audit Orchestrator
// Coordinates all tool integrations and generates comprehensive audit reports

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, ToolCategory } from './types';
import { FindingIntelligence, IntelligenceReport } from './ai';

// Import all integrations
import {
  ESLintIntegration,
  BiomeIntegration,
  StylelintIntegration,
  PrettierIntegration,
  HTMLHintIntegration,
  MarkdownlintIntegration,
  CommitlintIntegration,
  SonarQubeIntegration,
  CodeClimateIntegration,
  ReleaseRiskAnalyzerIntegration,
} from './code-quality';

// Import Dependencies & Supply Chain tools
import {
  SBOMGeneratorIntegration,
} from './dependencies';

import {
  SemgrepIntegration,
  OWASPZAPIntegration,
  TrivyIntegration,
  DependencyCheckIntegration,
  DetectSecretsIntegration,
  RetireJSIntegration,
  NPMAuditIntegration,
  BanditIntegration,
  GosecIntegration,
  BrakemanIntegration,
} from './security';

import {
  LighthouseIntegration,
  AxeCoreIntegration,
  Pa11yIntegration,
} from './accessibility';

import {
  K6Integration,
  ArtilleryIntegration,
  JMeterIntegration,
  LocustIntegration,
  SitespeedIntegration,
  WebPageTestIntegration,
} from './performance';

import {
  NewmanIntegration,
  PactIntegration,
  DreddIntegration,
  GraphQLInspectorIntegration,
} from './api-testing';

import {
  StorybookIntegration,
  PuppeteerIntegration,
  BackstopIntegration,
} from './visual';

import {
  IstanbulIntegration,
  StrykerIntegration,
  BundleAnalyzerIntegration,
} from './coverage';

import {
  SentryIntegration,
  OpenTelemetryIntegration,
} from './observability';

import {
  LitmusChaosIntegration,
} from './chaos';

// Import Complexity tools
import {
  KnipIntegration,
  LizardIntegration,
  TsPruneIntegration,
} from './complexity';

// Import Documentation tools
import {
  ValeIntegration,
  AlexIntegration,
  CspellIntegration,
  WriteGoodIntegration,
} from './documentation';

// Import Database tools
import {
  SQLFluffIntegration,
  PgFormatterIntegration,
  SchemaSpyIntegration,
} from './database';

// Import License tools
import {
  LicenseCheckerIntegration,
  ScanCodeIntegration,
} from './license';

// Import Secret Scanning tools
import {
  GitleaksIntegration,
  TrufflehogIntegration,
  GitSecretsIntegration,
} from './secret-scanning';

// Import IaC Security tools
import {
  CheckovIntegration,
  TfsecIntegration,
  KubesecIntegration,
  KubeBenchIntegration,
  GrypeIntegration,
  DockleIntegration,
  HadolintIntegration,
} from './iac-security';

// Import API Schema tools
import {
  SpectralIntegration,
  OpenAPIDiffIntegration,
} from './api-schema';

// Import Nuclei from security (not in main security export)
import { NucleiIntegration } from './security';

// Import Cloud Build integrations (Docker-based tools)
import { CLOUD_BUILD_INTEGRATIONS } from './cloud-build';

// All available integrations
const ALL_INTEGRATIONS: ToolIntegration[] = [
  // Code Quality
  new ESLintIntegration(),
  new BiomeIntegration(),
  new StylelintIntegration(),
  new PrettierIntegration(),
  new HTMLHintIntegration(),
  new MarkdownlintIntegration(),
  new CommitlintIntegration(),
  new SonarQubeIntegration(),
  new CodeClimateIntegration(),

  // Security
  new SemgrepIntegration(),
  new OWASPZAPIntegration(),
  new TrivyIntegration(),
  new DependencyCheckIntegration(),
  new DetectSecretsIntegration(),
  new RetireJSIntegration(),
  new NPMAuditIntegration(),
  new BanditIntegration(),
  new GosecIntegration(),
  new BrakemanIntegration(),

  // Accessibility
  new LighthouseIntegration(),
  new AxeCoreIntegration(),
  new Pa11yIntegration(),

  // Performance
  new K6Integration(),
  new ArtilleryIntegration(),
  new JMeterIntegration(),
  new LocustIntegration(),
  new SitespeedIntegration(),
  new WebPageTestIntegration(),

  // API Testing
  new NewmanIntegration(),
  new PactIntegration(),
  new DreddIntegration(),
  new GraphQLInspectorIntegration(),

  // Visual
  new StorybookIntegration(),
  new PuppeteerIntegration(),
  new BackstopIntegration(),

  // Coverage
  new IstanbulIntegration(),
  new StrykerIntegration(),
  new BundleAnalyzerIntegration(),

  // Observability
  new SentryIntegration(),
  new OpenTelemetryIntegration(),

  // Chaos
  new LitmusChaosIntegration(),

  // Complexity Analysis (3 tools)
  new KnipIntegration(),
  new LizardIntegration(),
  new TsPruneIntegration(),

  // Documentation Quality (4 tools)
  new ValeIntegration(),
  new AlexIntegration(),
  new CspellIntegration(),
  new WriteGoodIntegration(),

  // Database Tools (3 tools)
  new SQLFluffIntegration(),
  new PgFormatterIntegration(),
  new SchemaSpyIntegration(),

  // License Scanning (2 tools)
  new LicenseCheckerIntegration(),
  new ScanCodeIntegration(),

  // Secret Scanning (3 tools)
  new GitleaksIntegration(),
  new TrufflehogIntegration(),
  new GitSecretsIntegration(),

  // IaC Security (7 tools)
  new CheckovIntegration(),
  new TfsecIntegration(),
  new KubesecIntegration(),
  new KubeBenchIntegration(),
  new GrypeIntegration(),
  new DockleIntegration(),
  new HadolintIntegration(),

  // API Schema Validation (2 tools)
  new SpectralIntegration(),
  new OpenAPIDiffIntegration(),

  // Additional Security (1 tool)
  new NucleiIntegration(),

  // Dependencies & Supply Chain (1 tool)
  new SBOMGeneratorIntegration(),

  // Release Risk Analysis (1 tool)
  new ReleaseRiskAnalyzerIntegration(),

  // Cloud Build integrations (78 Docker-based tools)
  // Wave 1 (6): Core security & performance - OWASP ZAP, Dependency Check, Sitespeed, CodeClimate, Trivy, Grype
  // Wave 2 (10): Advanced security - Semgrep, Nuclei, Checkov, Syft, Dockle, ShellCheck, tfsec, Gitleaks, Bandit, gosec
  // Wave 3 (8): Language-specific - PHPStan, Psalm, Brakeman, RuboCop, SpotBugs, PMD, Checkstyle, Detekt
  // Wave 4 (20): Dependencies, API, Mobile, Cloud Native, AI/ML - OSV Scanner, pip-audit, cargo-audit, Spectral, MobSF, Kubesec, Garak, etc.
  // Wave 5-8 (34): Extended language support, Cloud compliance, Supply chain - SwiftLint, Cppcheck, Clippy, Ruff, mypy, Prowler, Cosign, etc.
  ...CLOUD_BUILD_INTEGRATIONS,
];

export interface OrchestratorConfig {
  /** Categories to include in the audit */
  categories?: ToolCategory[];
  /** Specific tools to include (overrides categories if specified) */
  tools?: string[];
  /** Specific tools to exclude */
  excludeTools?: string[];
  /** Tool-specific configurations */
  toolConfigs?: Record<string, ToolConfig>;
  /** Run tools in parallel */
  parallel?: boolean;
  /** Maximum concurrent tools */
  maxConcurrent?: number;
  /** Timeout for each tool in milliseconds */
  timeout?: number;
  /** Generate AI intelligence report */
  enableIntelligence?: boolean;
  /** Only check tool availability without running */
  dryRun?: boolean;
}

export interface AuditReport {
  id: string;
  timestamp: string;
  duration: number;
  target: AuditTarget;
  config: OrchestratorConfig;
  results: AuditResult[];
  intelligence?: IntelligenceReport;
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    toolsRun: string[];
    toolsSkipped: string[];
    toolsFailed: string[];
  };
}

export class AuditOrchestrator {
  private integrations: ToolIntegration[] = ALL_INTEGRATIONS;

  /**
   * Get all available integrations
   */
  getAllIntegrations(): ToolIntegration[] {
    return [...this.integrations];
  }

  /**
   * Get integrations by category
   */
  getIntegrationsByCategory(category: ToolCategory): ToolIntegration[] {
    return this.integrations.filter(i => i.category === category);
  }

  /**
   * Get a specific integration by name
   */
  getIntegration(name: string): ToolIntegration | undefined {
    return this.integrations.find(i => i.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Check which tools are available
   */
  async checkAvailability(): Promise<Map<string, boolean>> {
    const availability = new Map<string, boolean>();

    await Promise.all(
      this.integrations.map(async (integration) => {
        try {
          const isAvailable = await integration.isAvailable();
          availability.set(integration.name, isAvailable);
        } catch {
          availability.set(integration.name, false);
        }
      })
    );

    return availability;
  }

  /**
   * Run a comprehensive audit across all configured tools
   */
  async runAudit(target: AuditTarget, config: OrchestratorConfig = {}): Promise<AuditReport> {
    const startTime = Date.now();
    // Generate cryptographically secure random ID
    const randomBytes = new Uint8Array(5);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      const nodeCrypto = require('crypto');
      const nodeRandom = nodeCrypto.randomBytes(5);
      randomBytes.set(nodeRandom);
    }
    const random = Array.from(randomBytes)
      .map(b => b.toString(36).padStart(2, '0'))
      .join('')
      .substring(0, 9);
    const reportId = `audit-${Date.now()}-${random}`;

    // Select tools to run
    let toolsToRun = this.selectTools(config);

    // Check availability
    const availability = await this.checkAvailability();
    const availableTools = toolsToRun.filter(t => availability.get(t.name));
    const skippedTools = toolsToRun.filter(t => !availability.get(t.name)).map(t => t.name);

    if (config.dryRun) {
      return {
        id: reportId,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        target,
        config,
        results: [],
        summary: {
          totalFindings: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
          byCategory: {},
          toolsRun: [],
          toolsSkipped: skippedTools,
          toolsFailed: [],
        },
      };
    }

    // Run tools
    const results: AuditResult[] = [];
    const failedTools: string[] = [];

    if (config.parallel !== false) {
      // Run in parallel with concurrency limit
      const maxConcurrent = config.maxConcurrent || 5;
      const chunks = this.chunkArray(availableTools, maxConcurrent);

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(tool => this.runTool(tool, target, config))
        );

        for (let i = 0; i < chunkResults.length; i++) {
          const result = chunkResults[i];
          if (result.success) {
            results.push(result);
          } else {
            failedTools.push(chunk[i].name);
            results.push(result); // Include failed results too
          }
        }
      }
    } else {
      // Run sequentially
      for (const tool of availableTools) {
        const result = await this.runTool(tool, target, config);
        if (result.success) {
          results.push(result);
        } else {
          failedTools.push(tool.name);
          results.push(result);
        }
      }
    }

    // Generate intelligence report if enabled
    let intelligence: IntelligenceReport | undefined;
    if (config.enableIntelligence !== false) {
      const intelligenceEngine = new FindingIntelligence(results);
      intelligence = intelligenceEngine.generateReport();
    }

    // Generate summary
    const summary = this.generateSummary(results, skippedTools, failedTools);

    return {
      id: reportId,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      target,
      config,
      results,
      intelligence,
      summary,
    };
  }

  /**
   * Run a single tool
   */
  private async runTool(
    tool: ToolIntegration,
    target: AuditTarget,
    config: OrchestratorConfig
  ): Promise<AuditResult> {
    const toolConfig = config.toolConfigs?.[tool.name];
    const timeout = config.timeout || 300000; // 5 minutes default

    try {
      const result = await Promise.race([
        tool.run(target, toolConfig),
        new Promise<AuditResult>((_, reject) =>
          setTimeout(() => reject(new Error('Tool timeout')), timeout)
        ),
      ]);

      return result;
    } catch (error) {
      return {
        tool: tool.name,
        category: tool.category,
        success: false,
        duration: 0,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Select tools based on config
   */
  private selectTools(config: OrchestratorConfig): ToolIntegration[] {
    let tools = [...this.integrations];

    // Filter by specific tools if provided
    if (config.tools && config.tools.length > 0) {
      const toolNames = config.tools.map(t => t.toLowerCase());
      tools = tools.filter(t => toolNames.includes(t.name.toLowerCase()));
    }
    // Otherwise filter by categories
    else if (config.categories && config.categories.length > 0) {
      tools = tools.filter(t => config.categories!.includes(t.category));
    }

    // Exclude specific tools
    if (config.excludeTools && config.excludeTools.length > 0) {
      const excludeNames = config.excludeTools.map(t => t.toLowerCase());
      tools = tools.filter(t => !excludeNames.includes(t.name.toLowerCase()));
    }

    return tools;
  }

  /**
   * Generate summary from results
   */
  private generateSummary(
    results: AuditResult[],
    skippedTools: string[],
    failedTools: string[]
  ): AuditReport['summary'] {
    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const byCategory: Record<string, number> = {};
    let totalFindings = 0;

    for (const result of results) {
      if (result.success) {
        totalFindings += result.findings.length;

        for (const finding of result.findings) {
          bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
          byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
        }
      }
    }

    return {
      totalFindings,
      bySeverity,
      byCategory,
      toolsRun: results.filter(r => r.success).map(r => r.tool),
      toolsSkipped: skippedTools,
      toolsFailed: failedTools,
    };
  }

  /**
   * Chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const auditOrchestrator = new AuditOrchestrator();

// Export all integration classes for direct use
export {
  // Code Quality
  ESLintIntegration,
  BiomeIntegration,
  StylelintIntegration,
  PrettierIntegration,
  HTMLHintIntegration,
  MarkdownlintIntegration,
  CommitlintIntegration,
  SonarQubeIntegration,
  CodeClimateIntegration,

  // Security
  SemgrepIntegration,
  OWASPZAPIntegration,
  TrivyIntegration,
  DependencyCheckIntegration,
  DetectSecretsIntegration,
  RetireJSIntegration,
  NPMAuditIntegration,
  BanditIntegration,
  GosecIntegration,
  BrakemanIntegration,

  // Accessibility
  LighthouseIntegration,
  AxeCoreIntegration,
  Pa11yIntegration,

  // Performance
  K6Integration,
  ArtilleryIntegration,
  JMeterIntegration,
  LocustIntegration,
  SitespeedIntegration,
  WebPageTestIntegration,

  // API Testing
  NewmanIntegration,
  PactIntegration,
  DreddIntegration,
  GraphQLInspectorIntegration,

  // Visual
  StorybookIntegration,
  PuppeteerIntegration,
  BackstopIntegration,

  // Coverage
  IstanbulIntegration,
  StrykerIntegration,
  BundleAnalyzerIntegration,

  // Observability
  SentryIntegration,
  OpenTelemetryIntegration,

  // Chaos
  LitmusChaosIntegration,

  // Complexity
  KnipIntegration,
  LizardIntegration,
  TsPruneIntegration,

  // Documentation
  ValeIntegration,
  AlexIntegration,
  CspellIntegration,
  WriteGoodIntegration,

  // Database
  SQLFluffIntegration,
  PgFormatterIntegration,
  SchemaSpyIntegration,

  // License
  LicenseCheckerIntegration,
  ScanCodeIntegration,

  // Secret Scanning
  GitleaksIntegration,
  TrufflehogIntegration,
  GitSecretsIntegration,

  // IaC Security
  CheckovIntegration,
  TfsecIntegration,
  KubesecIntegration,
  KubeBenchIntegration,
  GrypeIntegration,
  DockleIntegration,
  HadolintIntegration,

  // API Schema
  SpectralIntegration,
  OpenAPIDiffIntegration,

  // Additional Security
  NucleiIntegration,

  // Dependencies & Supply Chain
  SBOMGeneratorIntegration,

  // Release Risk Analysis
  ReleaseRiskAnalyzerIntegration,
};
