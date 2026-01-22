// Lighthouse Integration (Self-hosted)
// License: Apache 2.0
// Website: https://github.com/GoogleChrome/lighthouse

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity, PerformanceMetrics } from '../types';

interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  displayValue?: string;
  numericValue?: number;
  numericUnit?: string;
  details?: {
    type: string;
    items?: Array<{
      node?: { selector: string; snippet: string; explanation: string };
      source?: { url: string; line: number; column: number };
    }>;
  };
}

interface LighthouseCategory {
  id: string;
  title: string;
  score: number;
  auditRefs: Array<{ id: string; weight: number }>;
}

interface LighthouseResult {
  lighthouseVersion: string;
  requestedUrl: string;
  finalUrl: string;
  fetchTime: string;
  categories: {
    performance: LighthouseCategory;
    accessibility: LighthouseCategory;
    'best-practices': LighthouseCategory;
    seo: LighthouseCategory;
    pwa?: LighthouseCategory;
  };
  audits: Record<string, LighthouseAudit>;
}

export class LighthouseIntegration implements ToolIntegration {
  name = 'Lighthouse';
  category = 'accessibility' as const;
  description = 'Automated auditing for performance, accessibility, progressive web apps, SEO, and best practices';
  website = 'https://developers.google.com/web/tools/lighthouse';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx lighthouse --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        categories: ['accessibility', 'performance', 'best-practices', 'seo'],
        output: 'json',
        chromeFlags: ['--headless', '--no-sandbox'],
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
        error: 'URL target is required for Lighthouse',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const categories = (config?.options?.categories as string[]) || ['accessibility', 'performance', 'best-practices', 'seo'];
      const chromeFlags = (config?.options?.chromeFlags as string[]) || ['--headless', '--no-sandbox'];

      const result = execSync(
        `npx lighthouse "${target.url}" --output json --only-categories=${categories.join(',')} --chrome-flags="${chromeFlags.join(' ')}" --quiet`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 120000 }
      );

      const lhResult: LighthouseResult = JSON.parse(result);

      // Process accessibility audits
      for (const [auditId, audit] of Object.entries(lhResult.audits)) {
        if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'informative') {
          findings.push(this.convertToFinding(audit, auditId, target.url, lhResult));
        }
      }

      const metrics = this.extractMetrics(lhResult);

      return this.createResult(findings, Date.now() - startTime, lhResult, metrics);
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

  private convertToFinding(audit: LighthouseAudit, auditId: string, url: string, result: LighthouseResult): AuditFinding {
    const score = audit.score || 0;
    const severity = this.scoreToseverity(score);
    const categoryName = this.getCategoryForAudit(auditId, result);

    return {
      id: `lighthouse-${auditId}`,
      tool: this.name,
      category: 'accessibility',
      severity,
      title: `Lighthouse: ${audit.title}`,
      description: audit.description.replace(/<[^>]*>/g, ''),
      explanation: `Score: ${Math.round(score * 100)}/100. ${audit.displayValue || ''}`,
      impact: this.getImpact(categoryName, audit.title),
      url,
      selector: audit.details?.items?.[0]?.node?.selector,
      codeSnippet: audit.details?.items?.[0]?.node?.snippet,
      recommendation: this.getRecommendation(auditId, audit),
      documentationUrl: `https://web.dev/${auditId}/`,
      aiPrompt: {
        short: `Fix Lighthouse ${categoryName} issue: ${audit.title}`,
        detailed: `
Fix the Lighthouse ${categoryName} issue.

URL: ${url}
Audit: ${audit.title}
Score: ${Math.round(score * 100)}/100
Category: ${categoryName}

Description:
${audit.description.replace(/<[^>]*>/g, '')}

${audit.displayValue ? `Current value: ${audit.displayValue}` : ''}

${audit.details?.items?.[0]?.node ? `
Affected element:
- Selector: ${audit.details.items[0].node.selector}
- HTML: ${audit.details.items[0].node.snippet}
${audit.details.items[0].node.explanation ? `- Issue: ${audit.details.items[0].node.explanation}` : ''}
` : ''}

Please fix this issue to improve the ${categoryName} score.
        `.trim(),
        steps: [
          `Identify the affected elements on ${url}`,
          `Review the ${audit.title} requirement`,
          'Apply the recommended fix',
          'Re-run Lighthouse to verify improvement',
        ],
      },
      ruleId: auditId,
      tags: ['lighthouse', categoryName, auditId],
      effort: this.estimateEffort(auditId),
    };
  }

  private scoreToseverity(score: number): Severity {
    if (score < 0.5) return 'high';
    if (score < 0.7) return 'medium';
    if (score < 0.9) return 'low';
    return 'info';
  }

  private getCategoryForAudit(auditId: string, result: LighthouseResult): string {
    for (const [catName, category] of Object.entries(result.categories)) {
      if (category.auditRefs.some(ref => ref.id === auditId)) {
        return catName;
      }
    }
    return 'general';
  }

  private getImpact(category: string, title: string): string {
    const impacts: Record<string, string> = {
      accessibility: `Accessibility issue: ${title}. Users with disabilities may not be able to use your site effectively.`,
      performance: `Performance issue: ${title}. Page load times and user experience are affected.`,
      'best-practices': `Best practice violation: ${title}. This may cause issues in certain browsers or scenarios.`,
      seo: `SEO issue: ${title}. Search engine visibility and rankings may be affected.`,
    };
    return impacts[category] || `${title} needs improvement.`;
  }

  private getRecommendation(auditId: string, audit: LighthouseAudit): string {
    // Extract recommendation from description if it contains "Learn more"
    const desc = audit.description;
    if (desc.includes('[Learn')) {
      return desc.replace(/<[^>]*>/g, '').split('[Learn')[0].trim();
    }
    return desc.replace(/<[^>]*>/g, '');
  }

  private estimateEffort(auditId: string): AuditFinding['effort'] {
    const trivialFixes = ['meta-description', 'document-title', 'html-has-lang', 'meta-viewport'];
    const easyFixes = ['image-alt', 'link-name', 'button-name', 'label', 'color-contrast'];
    const hardFixes = ['uses-responsive-images', 'render-blocking-resources', 'total-blocking-time'];

    if (trivialFixes.includes(auditId)) return 'trivial';
    if (easyFixes.includes(auditId)) return 'easy';
    if (hardFixes.includes(auditId)) return 'hard';
    return 'moderate';
  }

  private extractMetrics(result: LighthouseResult): PerformanceMetrics {
    const audits = result.audits;
    return {
      lcp: audits['largest-contentful-paint']?.numericValue,
      fid: audits['max-potential-fid']?.numericValue,
      cls: audits['cumulative-layout-shift']?.numericValue,
      fcp: audits['first-contentful-paint']?.numericValue,
      ttfb: audits['server-response-time']?.numericValue,
      tti: audits['interactive']?.numericValue,
      tbt: audits['total-blocking-time']?.numericValue,
      si: audits['speed-index']?.numericValue,
    };
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    lhResult: LighthouseResult,
    metrics: PerformanceMetrics
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
        passed: Object.values(lhResult.audits).filter(a => a.score === 1).length,
        failed: findings.length,
      },
      metadata: {
        scores: {
          performance: Math.round((lhResult.categories.performance?.score || 0) * 100),
          accessibility: Math.round((lhResult.categories.accessibility?.score || 0) * 100),
          bestPractices: Math.round((lhResult.categories['best-practices']?.score || 0) * 100),
          seo: Math.round((lhResult.categories.seo?.score || 0) * 100),
        },
        metrics,
        url: lhResult.finalUrl,
      },
    };
  }
}
