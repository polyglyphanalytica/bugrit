// axe-core Integration (Self-hosted)
// License: MPL 2.0
// Website: https://github.com/dequelabs/axe-core

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity, AccessibilityViolation } from '../types';

interface AxeNode {
  html: string;
  target: string[];
  failureSummary: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
}

interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

interface AxeResults {
  url: string;
  timestamp: string;
  passes: AxeViolation[];
  violations: AxeViolation[];
  incomplete: AxeViolation[];
  inapplicable: AxeViolation[];
}

export class AxeCoreIntegration implements ToolIntegration {
  name = 'axe-core';
  category = 'accessibility' as const;
  description = 'Accessibility testing engine for websites to find and fix accessibility issues';
  website = 'https://www.deque.com/axe/';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx @axe-core/cli --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        browser: 'chromium',
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.url) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'URL target is required for axe-core',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const tags = (config?.options?.tags as string[])?.join(',') || 'wcag2a,wcag2aa';

      const result = execSync(
        `npx @axe-core/cli "${target.url}" --tags ${tags} --stdout`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const axeResults: AxeResults = JSON.parse(result);

      for (const violation of axeResults.violations) {
        for (const node of violation.nodes) {
          findings.push(this.convertToFinding(violation, node, target.url));
        }
      }

      return this.createResult(findings, Date.now() - startTime, axeResults);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const axeResults: AxeResults = JSON.parse((error as { stdout: string }).stdout);
          for (const violation of axeResults.violations) {
            for (const node of violation.nodes) {
              findings.push(this.convertToFinding(violation, node, target.url));
            }
          }
          return this.createResult(findings, Date.now() - startTime, axeResults);
        } catch {
          // Parse error
        }
      }

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

  private convertToFinding(violation: AxeViolation, node: AxeNode, url: string): AuditFinding {
    const impactToSeverity: Record<string, Severity> = {
      critical: 'critical',
      serious: 'high',
      moderate: 'medium',
      minor: 'low',
    };

    const severity = impactToSeverity[node.impact] || 'medium';
    const wcagTags = violation.tags.filter(t => t.startsWith('wcag'));

    return {
      id: `axe-${violation.id}-${node.target.join('-')}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `axe: ${violation.help}`,
      description: violation.description,
      explanation: `Impact: ${node.impact}. WCAG: ${wcagTags.join(', ')}. ${node.failureSummary}`,
      impact: this.getImpact(node.impact, violation.help),
      url,
      selector: node.target.join(' > '),
      codeSnippet: node.html,
      recommendation: node.failureSummary.replace(/Fix any of the following:|Fix all of the following:/g, '').trim(),
      documentationUrl: violation.helpUrl,
      aiPrompt: {
        short: `Fix axe accessibility issue: ${violation.help}`,
        detailed: `
Fix the accessibility violation found by axe-core.

URL: ${url}
Rule: ${violation.id}
Impact: ${node.impact}
WCAG: ${wcagTags.join(', ')}

Issue: ${violation.help}

Description:
${violation.description}

Affected Element:
- Selector: ${node.target.join(' > ')}
- HTML: ${node.html}

How to fix:
${node.failureSummary}

Please fix this accessibility issue to make the site usable for people with disabilities.
        `.trim(),
        steps: [
          `Locate the element: ${node.target.join(' > ')}`,
          'Review the WCAG guidelines for this rule',
          `Apply fix: ${node.failureSummary.split('\n')[0]}`,
          'Test with a screen reader if possible',
          'Re-run axe-core to verify',
        ],
      },
      ruleId: violation.id,
      tags: ['axe-core', 'accessibility', 'wcag', ...wcagTags, node.impact],
      effort: this.estimateEffort(violation.id),
    };
  }

  private getImpact(impact: string, help: string): string {
    const impacts: Record<string, string> = {
      critical: `Critical accessibility barrier: ${help}. Users with disabilities cannot access this content at all.`,
      serious: `Serious accessibility issue: ${help}. Users with disabilities will have significant difficulty.`,
      moderate: `Moderate accessibility issue: ${help}. Some users will experience difficulties.`,
      minor: `Minor accessibility issue: ${help}. Some users may experience minor inconveniences.`,
    };
    return impacts[impact] || `Accessibility issue: ${help}`;
  }

  private estimateEffort(ruleId: string): AuditFinding['effort'] {
    const trivial = ['document-title', 'html-has-lang', 'meta-viewport', 'page-has-heading-one'];
    const easy = ['image-alt', 'link-name', 'button-name', 'label', 'input-button-name'];
    const hard = ['color-contrast', 'aria-required-parent', 'duplicate-id-aria'];

    if (trivial.includes(ruleId)) return 'trivial';
    if (easy.includes(ruleId)) return 'easy';
    if (hard.includes(ruleId)) return 'hard';
    return 'moderate';
  }

  private createResult(findings: AuditFinding[], duration: number, axeResults: AxeResults): AuditResult {
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
        passed: axeResults.passes.length,
        failed: axeResults.violations.length,
      },
      metadata: {
        url: axeResults.url,
        passedRules: axeResults.passes.length,
        violatedRules: axeResults.violations.length,
        incompleteRules: axeResults.incomplete.length,
        inapplicableRules: axeResults.inapplicable.length,
      },
    };
  }
}
