// Sentry Integration (Self-hosted)
// License: BSL (functional source license)
// Website: https://sentry.io/self-hosted/

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  permalink: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  status: 'resolved' | 'unresolved' | 'ignored' | 'resolvedInNextRelease';
  isUnhandled: boolean;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  metadata: {
    value?: string;
    type?: string;
    filename?: string;
    function?: string;
  };
  platform: string;
  project: { id: string; name: string; slug: string };
}

interface SentryEvent {
  eventID: string;
  title: string;
  message: string;
  context?: Record<string, unknown>;
  tags?: Array<{ key: string; value: string }>;
  entries?: Array<{
    type: string;
    data: {
      values?: Array<{
        stacktrace?: {
          frames: Array<{
            filename: string;
            lineNo: number;
            colNo: number;
            function: string;
            context?: Array<[number, string]>;
          }>;
        };
        type?: string;
        value?: string;
      }>;
    };
  }>;
}

export class SentryIntegration implements ToolIntegration {
  name = 'Sentry';
  category = 'observability' as const;
  description = 'Application monitoring and error tracking (self-hosted)';
  website = 'https://sentry.io';

  async isAvailable(): Promise<boolean> {
    // Check if Sentry is configured
    return !!(process.env.SENTRY_DSN || process.env.SENTRY_URL);
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        sentryUrl: process.env.SENTRY_URL || 'https://sentry.io',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        lookbackDays: 7,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    const sentryUrl = (config?.options?.sentryUrl || process.env.SENTRY_URL) as string | undefined;
    const authToken = config?.options?.authToken || process.env.SENTRY_AUTH_TOKEN;
    const org = config?.options?.organization || process.env.SENTRY_ORG;
    const project = config?.options?.project || process.env.SENTRY_PROJECT;

    if (!sentryUrl || !authToken || !org || !project) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'Sentry configuration required (SENTRY_URL, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)',
      };
    }

    try {
      const lookbackDays = (config?.options?.lookbackDays || 7) as number;
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

      // Fetch unresolved issues
      const issuesResponse = await fetch(
        `${sentryUrl}/api/0/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=${lookbackDays}d`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!issuesResponse.ok) {
        throw new Error(`Sentry API error: ${issuesResponse.status}`);
      }

      const issues: SentryIssue[] = await issuesResponse.json();

      for (const issue of issues) {
        findings.push(this.convertIssueTofinding(issue, sentryUrl));
      }

      return this.createResult(findings, Date.now() - startTime, issues.length);
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

  private convertIssueTofinding(issue: SentryIssue, sentryUrl: string): AuditFinding {
    const levelToSeverity: Record<string, Severity> = {
      fatal: 'critical',
      error: 'high',
      warning: 'medium',
      info: 'low',
      debug: 'info',
    };

    const severity = levelToSeverity[issue.level] || 'medium';
    const eventCount = parseInt(issue.count, 10);

    // Boost severity if high frequency
    const adjustedSeverity: Severity = eventCount > 100 && severity === 'medium' ? 'high' : severity;

    return {
      id: `sentry-${issue.shortId}`,
      tool: this.name,
      category: this.category,
      severity: adjustedSeverity,
      title: `Sentry: ${issue.title}`,
      description: issue.metadata?.value || issue.title,
      explanation: `${issue.level.toUpperCase()} in ${issue.culprit}. Occurred ${eventCount} times, affected ${issue.userCount} users.`,
      impact: this.getImpact(issue),
      file: issue.metadata?.filename,
      recommendation: 'Investigate and fix the error to prevent future occurrences.',
      documentationUrl: issue.permalink,
      aiPrompt: {
        short: `Fix Sentry ${issue.level}: ${issue.metadata?.type || issue.title}`,
        detailed: `
Fix the error tracked by Sentry.

Issue: ${issue.shortId}
Title: ${issue.title}
Level: ${issue.level}
Culprit: ${issue.culprit}

${issue.metadata?.type ? `Type: ${issue.metadata.type}` : ''}
${issue.metadata?.value ? `Value: ${issue.metadata.value}` : ''}
${issue.metadata?.filename ? `File: ${issue.metadata.filename}` : ''}
${issue.metadata?.function ? `Function: ${issue.metadata.function}` : ''}

Occurrences: ${eventCount}
Users affected: ${issue.userCount}
First seen: ${issue.firstSeen}
Last seen: ${issue.lastSeen}

Link: ${issue.permalink}

Investigate the root cause and implement a fix.
        `.trim(),
        steps: [
          `Review the error in Sentry: ${issue.permalink}`,
          'Analyze the stack trace',
          'Reproduce the issue locally if possible',
          'Implement a fix',
          'Deploy and verify in Sentry',
        ],
      },
      ruleId: issue.shortId,
      tags: ['sentry', 'observability', issue.level, issue.platform, issue.isUnhandled ? 'unhandled' : 'handled'],
      effort: this.estimateEffort(issue),
    };
  }

  private getImpact(issue: SentryIssue): string {
    const count = parseInt(issue.count, 10);

    if (issue.level === 'fatal') {
      return `Fatal error causing application crashes. ${count} occurrences affecting ${issue.userCount} users.`;
    }
    if (issue.level === 'error') {
      return `Error affecting functionality. ${count} occurrences affecting ${issue.userCount} users.`;
    }
    if (issue.isUnhandled) {
      return `Unhandled error that may cause unexpected behavior. ${count} occurrences.`;
    }
    return `Issue occurred ${count} times affecting ${issue.userCount} users.`;
  }

  private estimateEffort(issue: SentryIssue): AuditFinding['effort'] {
    if (issue.level === 'fatal' || issue.isUnhandled) {
      return 'hard';
    }
    if (issue.metadata?.filename && issue.metadata?.function) {
      return 'moderate';
    }
    return 'hard';
  }

  private createResult(findings: AuditFinding[], duration: number, totalIssues: number): AuditResult {
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
        passed: findings.length === 0 ? 1 : 0,
        failed: findings.length,
      },
      metadata: {
        totalIssues,
        criticalCount: bySeverity.critical,
        highCount: bySeverity.high,
      },
    };
  }
}
