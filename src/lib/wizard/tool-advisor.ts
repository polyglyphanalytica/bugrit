/**
 * Intelligent Tool Advisor
 *
 * Provides real-time intelligent feedback on tool selection:
 * - Coverage gap detection (what's missing)
 * - Redundancy detection (overlapping/overbought tools)
 * - Smart prioritization (bubbles up essential tools)
 * - Cost optimization advice
 */

import {
  SelectionState,
  SelectableTool,
  ToolCategory,
  WizardInput,
  AppSensitivity,
  AppType,
  TOOL_DATABASE,
  SENSITIVITY_PROFILES,
  CATEGORY_INFO,
} from './recommendation-engine';

// ============================================================
// Types
// ============================================================

export type AdvisorSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AdvisorMessage {
  severity: AdvisorSeverity;
  category: 'coverage' | 'redundancy' | 'optimization' | 'recommendation';
  title: string;
  description: string;
  affectedTools?: string[];
  suggestedAction?: {
    type: 'add' | 'remove' | 'swap';
    toolIds: string[];
    label: string;
  };
}

export interface CoverageAnalysis {
  coveredCategories: ToolCategory[];
  missingCategories: ToolCategory[];
  coveragePercentage: number;
  criticalGaps: CoverageGap[];
}

export interface CoverageGap {
  category: ToolCategory;
  severity: 'critical' | 'recommended' | 'optional';
  reason: string;
  suggestedTools: string[];
}

export interface RedundancyAnalysis {
  redundantGroups: RedundantToolGroup[];
  totalWastedCredits: number;
  optimizationPotential: number;
}

export interface RedundantToolGroup {
  purpose: string;
  tools: string[];
  recommendation: string;
  keepTool: string;
  removableTools: string[];
  creditsSaved: number;
}

export interface ToolAdvisorResult {
  score: number; // 0-100 overall score
  scoreLabel: string;
  messages: AdvisorMessage[];
  coverage: CoverageAnalysis;
  redundancy: RedundancyAnalysis;
  prioritizedTools: PrioritizedTool[];
  summary: {
    selectedCount: number;
    recommendedCount: number;
    totalCredits: number;
    estimatedTime: string;
    verdict: string;
  };
}

export interface PrioritizedTool {
  tool: SelectableTool;
  priority: number; // 1-10, higher = more important
  reasons: string[];
  isEssential: boolean;
  isSelected: boolean;
}

// ============================================================
// Tool Overlap Definitions
// ============================================================

/**
 * Tools that serve similar purposes - selecting multiple is often redundant
 */
const TOOL_OVERLAP_GROUPS: Array<{
  purpose: string;
  tools: string[];
  recommendation: string;
  preferredTool: string;
}> = [
  {
    purpose: 'JavaScript/TypeScript Linting',
    tools: ['eslint', 'biome'],
    recommendation: 'Both ESLint and Biome do JS/TS linting. Choose one based on your preference (ESLint has more plugins, Biome is faster).',
    preferredTool: 'eslint',
  },
  {
    purpose: 'Vulnerability Scanning',
    tools: ['trivy', 'grype'],
    recommendation: 'Trivy and Grype both scan for vulnerabilities in dependencies. One is usually sufficient.',
    preferredTool: 'trivy',
  },
  {
    purpose: 'Secret Detection',
    tools: ['gitleaks', 'secretlint'],
    recommendation: 'Both Gitleaks and Secretlint detect secrets. Gitleaks is more comprehensive; Secretlint integrates better with linting workflows.',
    preferredTool: 'gitleaks',
  },
  {
    purpose: 'PHP Static Analysis',
    tools: ['phpstan', 'psalm'],
    recommendation: 'PHPStan and Psalm are both excellent PHP analyzers. Running both provides marginal benefit - pick one.',
    preferredTool: 'phpstan',
  },
  {
    purpose: 'Java Code Quality',
    tools: ['spotbugs', 'pmd'],
    recommendation: 'SpotBugs finds bugs while PMD focuses on style/practices. They complement each other, but for basic scans one may suffice.',
    preferredTool: 'spotbugs',
  },
  {
    purpose: 'Accessibility Testing',
    tools: ['axe-core', 'pa11y', 'lighthouse-a11y'],
    recommendation: 'Multiple accessibility tools provide diminishing returns. axe-core is the most comprehensive.',
    preferredTool: 'axe-core',
  },
  {
    purpose: 'Kubernetes Security',
    tools: ['kubesec', 'polaris', 'kube-bench'],
    recommendation: 'These K8s tools overlap significantly. For basic scans, kubesec is sufficient. Add polaris for best practices or kube-bench for CIS compliance.',
    preferredTool: 'kubesec',
  },
  {
    purpose: 'IaC Security Scanning',
    tools: ['checkov', 'tfsec', 'terrascan'],
    recommendation: 'Checkov covers Terraform, CloudFormation, and K8s. tfsec is Terraform-specific. Usually one is enough.',
    preferredTool: 'checkov',
  },
  {
    purpose: 'Dependency Vulnerability Scanning',
    tools: ['dependency-check', 'osv-scanner', 'npm-audit'],
    recommendation: 'Multiple dependency scanners often find the same CVEs. OSV Scanner is fast and uses Google\'s database.',
    preferredTool: 'osv-scanner',
  },
  {
    purpose: 'Web Performance',
    tools: ['lighthouse', 'sitespeed'],
    recommendation: 'Lighthouse is quick and covers basics. Sitespeed.io is more comprehensive but slower. Choose based on depth needed.',
    preferredTool: 'lighthouse',
  },
  {
    purpose: 'Android Security',
    tools: ['mobsf', 'apkleaks', 'androguard'],
    recommendation: 'MobSF is comprehensive for mobile security. APKLeaks and Androguard are more specialized.',
    preferredTool: 'mobsf',
  },
];

// ============================================================
// Category Requirements by Sensitivity
// ============================================================

interface CategoryRequirement {
  category: ToolCategory;
  severity: 'critical' | 'recommended' | 'optional';
  reason: string;
  minimumTools: number;
}

function getCategoryRequirements(
  sensitivity: AppSensitivity,
  appType: AppType
): CategoryRequirement[] {
  const requirements: CategoryRequirement[] = [];

  // Security is critical for most app types
  const securitySeverity = ['financial', 'healthcare', 'government', 'enterprise'].includes(sensitivity)
    ? 'critical'
    : sensitivity === 'personal'
      ? 'optional'
      : 'recommended';

  requirements.push({
    category: 'security',
    severity: securitySeverity,
    reason: securitySeverity === 'critical'
      ? `${sensitivity} apps handle sensitive data - comprehensive security scanning is essential`
      : 'Security scanning helps catch vulnerabilities before they reach production',
    minimumTools: securitySeverity === 'critical' ? 3 : 1,
  });

  // Dependencies are important for supply chain security
  requirements.push({
    category: 'dependencies',
    severity: ['financial', 'healthcare', 'government', 'enterprise'].includes(sensitivity) ? 'critical' : 'recommended',
    reason: 'Dependency scanning protects against supply chain attacks and known CVEs',
    minimumTools: 1,
  });

  // Code quality
  requirements.push({
    category: 'code-quality',
    severity: 'recommended',
    reason: 'Code quality tools catch bugs and enforce best practices',
    minimumTools: 1,
  });

  // Accessibility for web/pwa apps
  if (['web', 'pwa'].includes(appType)) {
    const a11ySeverity = ['healthcare', 'government', 'education'].includes(sensitivity)
      ? 'critical'
      : 'recommended';
    requirements.push({
      category: 'accessibility',
      severity: a11ySeverity,
      reason: a11ySeverity === 'critical'
        ? `${sensitivity} apps often have legal accessibility requirements`
        : 'Accessibility ensures your app works for all users',
      minimumTools: 1,
    });
  }

  // Performance for web apps
  if (['web', 'pwa'].includes(appType)) {
    requirements.push({
      category: 'performance',
      severity: sensitivity === 'ecommerce' ? 'critical' : 'recommended',
      reason: sensitivity === 'ecommerce'
        ? 'Performance directly impacts conversion rates for e-commerce'
        : 'Performance testing helps ensure good user experience',
      minimumTools: 1,
    });
  }

  // API security for API apps
  if (appType === 'api') {
    requirements.push({
      category: 'api-security',
      severity: ['financial', 'healthcare', 'enterprise'].includes(sensitivity) ? 'critical' : 'recommended',
      reason: 'API security scanning validates your endpoints and contracts',
      minimumTools: 1,
    });
  }

  // Mobile security for mobile apps
  if (appType === 'mobile-native') {
    requirements.push({
      category: 'mobile',
      severity: ['financial', 'healthcare'].includes(sensitivity) ? 'critical' : 'recommended',
      reason: 'Mobile security scanning checks for platform-specific vulnerabilities',
      minimumTools: 1,
    });
  }

  // Cloud native for apps with K8s/IaC
  requirements.push({
    category: 'cloud-native',
    severity: 'optional',
    reason: 'Cloud-native scanning is important if you use Kubernetes or infrastructure-as-code',
    minimumTools: 0,
  });

  return requirements;
}

// ============================================================
// Main Advisor Class
// ============================================================

export class ToolAdvisor {
  /**
   * Analyze the current tool selection and provide intelligent feedback
   */
  static analyze(
    selectionState: SelectionState,
    context?: WizardInput
  ): ToolAdvisorResult {
    const messages: AdvisorMessage[] = [];
    const sensitivity = context?.sensitivity || 'personal';
    const appType = context?.appType || 'web';

    // Analyze coverage
    const coverage = this.analyzeCoverage(selectionState, sensitivity, appType);

    // Analyze redundancy
    const redundancy = this.analyzeRedundancy(selectionState);

    // Generate prioritized tool list
    const prioritizedTools = this.prioritizeTools(selectionState, context);

    // Generate messages based on analysis
    messages.push(...this.generateCoverageMessages(coverage, sensitivity));
    messages.push(...this.generateRedundancyMessages(redundancy));
    messages.push(...this.generateOptimizationMessages(selectionState, context));

    // Calculate overall score
    const score = this.calculateScore(coverage, redundancy, selectionState);

    // Generate summary
    const summary = this.generateSummary(selectionState, coverage, redundancy, score);

    return {
      score,
      scoreLabel: this.getScoreLabel(score),
      messages,
      coverage,
      redundancy,
      prioritizedTools,
      summary,
    };
  }

  /**
   * Get quick advice for a single tool toggle action
   */
  static getToggleAdvice(
    toolId: string,
    isAdding: boolean,
    selectionState: SelectionState,
    context?: WizardInput
  ): AdvisorMessage[] {
    const messages: AdvisorMessage[] = [];
    const tool = TOOL_DATABASE.find(t => t.id === toolId);
    if (!tool) return messages;

    if (isAdding) {
      // Check if this creates redundancy
      const selectedIds = selectionState.selectedTools.map(t => t.id);
      for (const group of TOOL_OVERLAP_GROUPS) {
        if (group.tools.includes(toolId)) {
          const alreadySelected = group.tools.filter(
            t => t !== toolId && selectedIds.includes(t)
          );
          if (alreadySelected.length > 0) {
            messages.push({
              severity: 'warning',
              category: 'redundancy',
              title: `Overlaps with ${alreadySelected.join(', ')}`,
              description: group.recommendation,
              affectedTools: [toolId, ...alreadySelected],
            });
          }
        }
      }

      // Check if this fills a coverage gap
      const currentCoverage = this.analyzeCoverage(
        selectionState,
        context?.sensitivity || 'personal',
        context?.appType || 'web'
      );
      const toolCategory = tool.category as ToolCategory;
      const gap = currentCoverage.criticalGaps.find(g => g.category === toolCategory);
      if (gap) {
        messages.push({
          severity: 'success',
          category: 'coverage',
          title: `Good choice!`,
          description: `Adding ${tool.name} helps cover ${CATEGORY_INFO[toolCategory].displayName}.`,
          affectedTools: [toolId],
        });
      }
    } else {
      // Check if removing creates a coverage gap
      const sensitivity = context?.sensitivity || 'personal';
      const appType = context?.appType || 'web';
      const requirements = getCategoryRequirements(sensitivity, appType);
      const toolCategory = tool.category as ToolCategory;

      const categoryTools = selectionState.selectedTools.filter(
        t => t.category === toolCategory && t.id !== toolId
      );
      const requirement = requirements.find(r => r.category === toolCategory);

      if (requirement && categoryTools.length < requirement.minimumTools) {
        if (requirement.severity === 'critical') {
          messages.push({
            severity: 'critical',
            category: 'coverage',
            title: `Creates critical gap in ${CATEGORY_INFO[toolCategory].displayName}`,
            description: requirement.reason,
            affectedTools: [toolId],
          });
        } else if (requirement.severity === 'recommended') {
          messages.push({
            severity: 'warning',
            category: 'coverage',
            title: `Leaves ${CATEGORY_INFO[toolCategory].displayName} uncovered`,
            description: requirement.reason,
            affectedTools: [toolId],
          });
        }
      }
    }

    return messages;
  }

  /**
   * Get the top recommended tools to add based on current selection
   */
  static getTopRecommendations(
    selectionState: SelectionState,
    context?: WizardInput,
    limit: number = 5
  ): PrioritizedTool[] {
    const allTools = this.prioritizeTools(selectionState, context);
    return allTools
      .filter(pt => !pt.isSelected && pt.priority >= 5)
      .slice(0, limit);
  }

  // ============================================================
  // Private Analysis Methods
  // ============================================================

  private static analyzeCoverage(
    selectionState: SelectionState,
    sensitivity: AppSensitivity,
    appType: AppType
  ): CoverageAnalysis {
    const requirements = getCategoryRequirements(sensitivity, appType);
    const selectedByCategory = new Map<ToolCategory, number>();

    // Count tools per category
    for (const tool of selectionState.selectedTools) {
      const count = selectedByCategory.get(tool.category) || 0;
      selectedByCategory.set(tool.category, count + 1);
    }

    const coveredCategories: ToolCategory[] = [];
    const missingCategories: ToolCategory[] = [];
    const criticalGaps: CoverageGap[] = [];

    for (const req of requirements) {
      const count = selectedByCategory.get(req.category) || 0;
      if (count >= req.minimumTools) {
        coveredCategories.push(req.category);
      } else if (req.severity !== 'optional') {
        missingCategories.push(req.category);

        // Find suggested tools for this gap
        const suggestedTools = TOOL_DATABASE
          .filter(t => t.category === req.category)
          .sort((a, b) => a.credits - b.credits)
          .slice(0, 3)
          .map(t => t.id);

        criticalGaps.push({
          category: req.category,
          severity: req.severity,
          reason: req.reason,
          suggestedTools,
        });
      }
    }

    const totalRequired = requirements.filter(r => r.severity !== 'optional').length;
    const coveragePercentage = totalRequired > 0
      ? Math.round((coveredCategories.length / totalRequired) * 100)
      : 100;

    return {
      coveredCategories,
      missingCategories,
      coveragePercentage,
      criticalGaps,
    };
  }

  private static analyzeRedundancy(selectionState: SelectionState): RedundancyAnalysis {
    const redundantGroups: RedundantToolGroup[] = [];
    const selectedIds = new Set(selectionState.selectedTools.map(t => t.id));
    let totalWastedCredits = 0;

    for (const group of TOOL_OVERLAP_GROUPS) {
      const selectedInGroup = group.tools.filter(t => selectedIds.has(t));

      if (selectedInGroup.length > 1) {
        const keepTool = selectedInGroup.includes(group.preferredTool)
          ? group.preferredTool
          : selectedInGroup[0];

        const removableTools = selectedInGroup.filter(t => t !== keepTool);
        const creditsSaved = removableTools.reduce((sum, toolId) => {
          const tool = TOOL_DATABASE.find(t => t.id === toolId);
          return sum + (tool?.credits || 0);
        }, 0);

        totalWastedCredits += creditsSaved;

        redundantGroups.push({
          purpose: group.purpose,
          tools: selectedInGroup,
          recommendation: group.recommendation,
          keepTool,
          removableTools,
          creditsSaved,
        });
      }
    }

    const totalCredits = selectionState.selectedTools.reduce((sum, t) => sum + t.credits, 0);
    const optimizationPotential = totalCredits > 0
      ? Math.round((totalWastedCredits / totalCredits) * 100)
      : 0;

    return {
      redundantGroups,
      totalWastedCredits,
      optimizationPotential,
    };
  }

  private static prioritizeTools(
    selectionState: SelectionState,
    context?: WizardInput
  ): PrioritizedTool[] {
    const allTools = [
      ...selectionState.selectedTools,
      ...selectionState.availableByCategory.flatMap(g => g.tools),
    ];

    const sensitivity = context?.sensitivity || 'personal';
    const appType = context?.appType || 'web';
    const languages = context?.languages || [];
    const concerns = context?.concerns || [];

    const profile = SENSITIVITY_PROFILES[sensitivity];
    const selectedIds = new Set(selectionState.selectedTools.map(t => t.id));

    return allTools.map(tool => {
      const reasons: string[] = [];
      let priority = 5; // Base priority

      // Boost for sensitivity profile priority tools
      if (profile.priorityTools.includes(tool.id)) {
        priority += 3;
        reasons.push(`Essential for ${sensitivity} applications`);
      }

      // Boost for required categories
      if (profile.requiredCategories.includes(tool.category)) {
        priority += 2;
        reasons.push(`${CATEGORY_INFO[tool.category].displayName} is critical for ${sensitivity}`);
      }

      // Boost for language match
      if (tool.languages && tool.languages.some(l => languages.includes(l))) {
        priority += 2;
        const matchedLang = tool.languages.find(l => languages.includes(l));
        reasons.push(`Specialized for ${matchedLang}`);
      }

      // Boost for app type match
      if (tool.appTypes && tool.appTypes.includes(appType)) {
        priority += 1;
        reasons.push(`Designed for ${appType} applications`);
      }

      // Boost for addressing concerns
      const concernToolMap: Record<string, string[]> = {
        'security-vulnerabilities': ['semgrep', 'owasp-zap', 'trivy', 'nuclei'],
        'secrets-exposure': ['gitleaks', 'secretlint'],
        'dependency-risks': ['trivy', 'osv-scanner', 'dependency-check'],
        'ai-generated-bugs': ['semgrep', 'eslint', 'stryker'],
        'performance': ['lighthouse', 'sitespeed'],
        'accessibility': ['axe-core', 'pa11y'],
        'code-quality': ['eslint', 'codeclimate', 'biome'],
        'compliance': ['checkov', 'kube-bench', 'license-checker'],
      };

      for (const concern of concerns) {
        if (concernToolMap[concern]?.includes(tool.id)) {
          priority += 2;
          reasons.push(`Addresses your ${concern.replace(/-/g, ' ')} concern`);
        }
      }

      // Lower priority for expensive tools
      if (tool.credits >= 4) {
        priority -= 1;
      }

      // Cap priority
      priority = Math.min(10, Math.max(1, priority));

      const isEssential = priority >= 8 || profile.priorityTools.includes(tool.id);

      return {
        tool,
        priority,
        reasons: reasons.length > 0 ? reasons : ['General code quality improvement'],
        isEssential,
        isSelected: selectedIds.has(tool.id),
      };
    }).sort((a, b) => {
      // Selected tools first, then by priority
      if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
      return b.priority - a.priority;
    });
  }

  private static generateCoverageMessages(
    coverage: CoverageAnalysis,
    sensitivity: AppSensitivity
  ): AdvisorMessage[] {
    const messages: AdvisorMessage[] = [];

    // Critical gaps
    for (const gap of coverage.criticalGaps) {
      if (gap.severity === 'critical') {
        const categoryInfo = CATEGORY_INFO[gap.category];
        messages.push({
          severity: 'critical',
          category: 'coverage',
          title: `Missing ${categoryInfo.displayName} coverage`,
          description: gap.reason,
          affectedTools: gap.suggestedTools,
          suggestedAction: {
            type: 'add',
            toolIds: gap.suggestedTools.slice(0, 2),
            label: `Add ${gap.suggestedTools.slice(0, 2).map(id => TOOL_DATABASE.find(t => t.id === id)?.name).join(' or ')}`,
          },
        });
      } else if (gap.severity === 'recommended') {
        const categoryInfo = CATEGORY_INFO[gap.category];
        messages.push({
          severity: 'warning',
          category: 'coverage',
          title: `Consider adding ${categoryInfo.displayName}`,
          description: gap.reason,
          affectedTools: gap.suggestedTools,
          suggestedAction: {
            type: 'add',
            toolIds: gap.suggestedTools.slice(0, 1),
            label: `Add ${TOOL_DATABASE.find(t => t.id === gap.suggestedTools[0])?.name}`,
          },
        });
      }
    }

    // Good coverage message
    if (coverage.coveragePercentage >= 80 && coverage.criticalGaps.filter(g => g.severity === 'critical').length === 0) {
      messages.push({
        severity: 'success',
        category: 'coverage',
        title: 'Good coverage!',
        description: `Your selection covers ${coverage.coveragePercentage}% of recommended categories for ${sensitivity} applications.`,
      });
    }

    return messages;
  }

  private static generateRedundancyMessages(redundancy: RedundancyAnalysis): AdvisorMessage[] {
    const messages: AdvisorMessage[] = [];

    for (const group of redundancy.redundantGroups) {
      messages.push({
        severity: 'warning',
        category: 'redundancy',
        title: `Overlapping tools for ${group.purpose}`,
        description: group.recommendation,
        affectedTools: group.tools,
        suggestedAction: {
          type: 'remove',
          toolIds: group.removableTools,
          label: `Remove ${group.removableTools.map(id => TOOL_DATABASE.find(t => t.id === id)?.name).join(', ')} to save ${group.creditsSaved} credits`,
        },
      });
    }

    if (redundancy.totalWastedCredits > 5) {
      messages.push({
        severity: 'info',
        category: 'optimization',
        title: `Save ${redundancy.totalWastedCredits} credits`,
        description: `You have ${redundancy.redundantGroups.length} groups of overlapping tools. Removing duplicates won't reduce scan quality but will save credits.`,
      });
    }

    return messages;
  }

  private static generateOptimizationMessages(
    selectionState: SelectionState,
    context?: WizardInput
  ): AdvisorMessage[] {
    const messages: AdvisorMessage[] = [];
    const selectedCount = selectionState.selectedTools.length;
    const totalCredits = selectionState.credits.selected;

    // Too few tools warning
    if (selectedCount < 3) {
      const sensitivity = context?.sensitivity || 'personal';
      if (sensitivity !== 'personal') {
        messages.push({
          severity: 'warning',
          category: 'recommendation',
          title: 'Consider adding more tools',
          description: `Only ${selectedCount} tool${selectedCount === 1 ? '' : 's'} selected. For ${sensitivity} applications, we recommend at least 5 tools for adequate coverage.`,
        });
      }
    }

    // Too many tools warning
    if (selectedCount > 20) {
      messages.push({
        severity: 'info',
        category: 'optimization',
        title: 'Large scan selection',
        description: `You've selected ${selectedCount} tools (${totalCredits} credits). This comprehensive scan will take longer. Consider running essential tools first, then optional ones.`,
      });
    }

    // High credit warning
    if (totalCredits > 50) {
      messages.push({
        severity: 'info',
        category: 'optimization',
        title: 'High credit usage',
        description: `This scan will use ${totalCredits} credits. Consider splitting into multiple focused scans (security-first, then quality) to manage costs.`,
      });
    }

    // No tools selected
    if (selectedCount === 0) {
      messages.push({
        severity: 'critical',
        category: 'recommendation',
        title: 'No tools selected',
        description: 'Select at least one tool to run a scan. We recommend starting with Semgrep and Gitleaks for basic security coverage.',
        suggestedAction: {
          type: 'add',
          toolIds: ['semgrep', 'gitleaks'],
          label: 'Add recommended basics',
        },
      });
    }

    return messages;
  }

  private static calculateScore(
    coverage: CoverageAnalysis,
    redundancy: RedundancyAnalysis,
    selectionState: SelectionState
  ): number {
    let score = 50; // Base score

    // Coverage contribution (up to +40)
    score += Math.round(coverage.coveragePercentage * 0.4);

    // Penalty for critical gaps (-15 each)
    const criticalGaps = coverage.criticalGaps.filter(g => g.severity === 'critical').length;
    score -= criticalGaps * 15;

    // Penalty for redundancy (-5 per group)
    score -= redundancy.redundantGroups.length * 5;

    // Bonus for having tools selected
    if (selectionState.selectedTools.length > 0) {
      score += 10;
    }

    // Penalty for no tools
    if (selectionState.selectedTools.length === 0) {
      score = 0;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 25) return 'Needs Improvement';
    return 'Incomplete';
  }

  private static generateSummary(
    selectionState: SelectionState,
    coverage: CoverageAnalysis,
    redundancy: RedundancyAnalysis,
    score: number
  ): ToolAdvisorResult['summary'] {
    const selectedCount = selectionState.selectedTools.length;
    const totalCredits = selectionState.credits.selected;
    const criticalGaps = coverage.criticalGaps.filter(g => g.severity === 'critical').length;

    let verdict: string;

    if (selectedCount === 0) {
      verdict = 'Select tools to begin your security scan';
    } else if (criticalGaps > 0) {
      verdict = `Address ${criticalGaps} critical coverage gap${criticalGaps > 1 ? 's' : ''} for better protection`;
    } else if (redundancy.redundantGroups.length > 2) {
      verdict = 'Good coverage, but consider removing redundant tools to optimize costs';
    } else if (score >= 75) {
      verdict = 'Well-balanced selection with good coverage';
    } else {
      verdict = 'Consider adding tools for more comprehensive coverage';
    }

    return {
      selectedCount,
      recommendedCount: coverage.coveredCategories.length >= 3 ? selectedCount : selectedCount + 3,
      totalCredits,
      estimatedTime: selectionState.estimatedTime,
      verdict,
    };
  }
}

// ============================================================
// Exports
// ============================================================

export { TOOL_OVERLAP_GROUPS, getCategoryRequirements };
