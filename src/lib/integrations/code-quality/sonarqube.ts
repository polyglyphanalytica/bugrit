// SonarQube Community Edition Integration
// License: LGPL
// Website: https://www.sonarqube.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface SonarIssue {
  key: string;
  rule: string;
  severity: 'BLOCKER' | 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';
  component: string;
  project: string;
  line?: number;
  message: string;
  type: 'BUG' | 'VULNERABILITY' | 'CODE_SMELL';
  effort?: string;
  debt?: string;
  tags: string[];
}

interface SonarResponse {
  total: number;
  issues: SonarIssue[];
}

export class SonarQubeIntegration implements ToolIntegration {
  name = 'SonarQube';
  category = 'code-quality' as const;
  description = 'Continuous inspection of code quality with deep analysis for bugs, vulnerabilities, and code smells';
  website = 'https://www.sonarqube.org';

  private serverUrl: string;
  private token: string;

  constructor(config?: { serverUrl?: string; token?: string }) {
    this.serverUrl = config?.serverUrl || process.env.SONARQUBE_URL || 'http://localhost:9000';
    this.token = config?.token || process.env.SONARQUBE_TOKEN || '';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/system/status`);
      const data = await response.json();
      return data.status === 'UP';
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        projectKey: '',
        qualityGate: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const projectKey = (config?.options?.projectKey as string) || target.directory?.split('/').pop() || 'default';

      // First, run the scanner if directory provided
      if (target.directory) {
        await this.runScanner(target.directory, projectKey);
      }

      // Then fetch issues from SonarQube API
      const response = await fetch(
        `${this.serverUrl}/api/issues/search?componentKeys=${projectKey}&ps=500`,
        {
          headers: this.token ? { Authorization: `Basic ${Buffer.from(`${this.token}:`).toString('base64')}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error(`SonarQube API error: ${response.statusText}`);
      }

      const data: SonarResponse = await response.json();

      for (const issue of data.issues) {
        findings.push(this.convertToFinding(issue));
      }

      return this.createResult(findings, Date.now() - startTime);
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

  private async runScanner(directory: string, projectKey: string): Promise<void> {
    const { execSync } = await import('child_process');

    execSync(
      `npx sonarqube-scanner -Dsonar.projectKey=${projectKey} -Dsonar.sources=${directory} -Dsonar.host.url=${this.serverUrl}${this.token ? ` -Dsonar.login=${this.token}` : ''}`,
      { stdio: 'inherit' }
    );

    // Wait for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  private convertToFinding(issue: SonarIssue): AuditFinding {
    const severityMap: Record<string, Severity> = {
      BLOCKER: 'critical',
      CRITICAL: 'high',
      MAJOR: 'medium',
      MINOR: 'low',
      INFO: 'info',
    };

    const severity = severityMap[issue.severity] || 'medium';
    const filePath = issue.component.split(':').pop() || issue.component;

    return {
      id: `sonarqube-${issue.key}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `SonarQube: ${issue.type} - ${issue.rule}`,
      description: issue.message,
      explanation: this.getTypeExplanation(issue.type),
      impact: this.getImpact(issue.type, issue.severity),
      file: filePath,
      line: issue.line,
      recommendation: `Review and fix this ${issue.type.toLowerCase()}. Estimated effort: ${issue.effort || 'unknown'}`,
      documentationUrl: `${this.serverUrl}/coding_rules?rule_key=${issue.rule}`,
      aiPrompt: {
        short: `Fix SonarQube ${issue.type} in ${filePath}${issue.line ? ` at line ${issue.line}` : ''}: ${issue.message}`,
        detailed: `
Fix the SonarQube issue in my code.

File: ${filePath}
Line: ${issue.line || 'N/A'}
Type: ${issue.type}
Severity: ${issue.severity}
Rule: ${issue.rule}
Message: ${issue.message}
Estimated Effort: ${issue.effort || 'unknown'}

Please fix this ${issue.type.toLowerCase()} while maintaining the code's functionality.
        `.trim(),
        steps: [
          `Open ${filePath}${issue.line ? ` and go to line ${issue.line}` : ''}`,
          `Understand the SonarQube rule: ${issue.rule}`,
          `Fix the ${issue.type.toLowerCase()}`,
          'Run SonarQube analysis again to verify the fix',
        ],
      },
      ruleId: issue.rule,
      tags: ['sonarqube', issue.type.toLowerCase(), ...issue.tags],
      effort: this.mapEffort(issue.effort),
    };
  }

  private getTypeExplanation(type: string): string {
    const explanations: Record<string, string> = {
      BUG: 'This is a bug that will likely cause incorrect behavior or crashes at runtime.',
      VULNERABILITY: 'This is a security vulnerability that could be exploited by attackers.',
      CODE_SMELL: 'This is a maintainability issue that makes the code harder to understand or change.',
    };
    return explanations[type] || 'This issue was detected by SonarQube code analysis.';
  }

  private getImpact(type: string, severity: string): string {
    if (type === 'VULNERABILITY') {
      return `Security vulnerability with ${severity.toLowerCase()} severity. Could lead to security breaches.`;
    }
    if (type === 'BUG') {
      return `Bug with ${severity.toLowerCase()} severity. Could cause application failures or incorrect behavior.`;
    }
    return `Code smell with ${severity.toLowerCase()} severity. Reduces code maintainability.`;
  }

  private mapEffort(effort?: string): AuditFinding['effort'] {
    if (!effort) return 'moderate';
    const minutes = parseInt(effort.replace('min', ''));
    if (minutes <= 5) return 'trivial';
    if (minutes <= 15) return 'easy';
    if (minutes <= 60) return 'moderate';
    if (minutes <= 240) return 'hard';
    return 'complex';
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
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
        passed: 0,
        failed: findings.length,
      },
    };
  }
}
