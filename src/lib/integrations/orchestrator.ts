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
} from './code-quality';

import {
  SemgrepIntegration,
  OWASPZAPIntegration,
  TrivyIntegration,
  DependencyCheckIntegration,
  DetectSecretsIntegration,
  RetireJSIntegration,
  NpmAuditIntegration,
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
  new NpmAuditIntegration(),
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
    const reportId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

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
  NpmAuditIntegration,
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
};
