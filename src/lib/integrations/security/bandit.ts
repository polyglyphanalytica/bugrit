// Bandit Integration (Python Security Linter)
// License: Apache 2.0
// Website: https://bandit.readthedocs.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface BanditIssue {
  code: string;
  col_offset: number;
  end_col_offset: number;
  filename: string;
  issue_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  issue_cwe: { id: number; link: string };
  issue_severity: 'HIGH' | 'MEDIUM' | 'LOW';
  issue_text: string;
  line_number: number;
  line_range: number[];
  more_info: string;
  test_id: string;
  test_name: string;
}

interface BanditOutput {
  errors: string[];
  generated_at: string;
  metrics: Record<string, unknown>;
  results: BanditIssue[];
}

export class BanditIntegration implements ToolIntegration {
  name = 'Bandit';
  category = 'security' as const;
  description = 'Security linter designed to find common security issues in Python code';
  website = 'https://bandit.readthedocs.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('bandit --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        severity: 'low',
        confidence: 'low',
        recursive: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const recursive = config?.options?.recursive !== false ? '-r' : '';

      const result = execSync(
        `bandit ${recursive} -f json "${targetDir}"`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const output: BanditOutput = JSON.parse(result);

      for (const issue of output.results) {
        findings.push(this.convertToFinding(issue));
      }

      return this.createResult(findings, Date.now() - startTime);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: BanditOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const issue of output.results) {
            findings.push(this.convertToFinding(issue));
          }
          return this.createResult(findings, Date.now() - startTime);
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

  private convertToFinding(issue: BanditIssue): AuditFinding {
    const severityMap: Record<string, Severity> = {
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };

    const severity = severityMap[issue.issue_severity] || 'medium';

    return {
      id: `bandit-${issue.filename}-${issue.line_number}-${issue.test_id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Bandit: ${issue.test_name} (${issue.test_id})`,
      description: issue.issue_text,
      explanation: `Severity: ${issue.issue_severity}, Confidence: ${issue.issue_confidence}. ${issue.issue_cwe ? `CWE-${issue.issue_cwe.id}` : ''}`,
      impact: this.getImpact(severity, issue.test_name),
      file: issue.filename,
      line: issue.line_number,
      column: issue.col_offset,
      recommendation: this.getRecommendation(issue.test_id, issue.test_name),
      documentationUrl: issue.more_info || issue.issue_cwe?.link || `https://bandit.readthedocs.io/en/latest/plugins/${issue.test_id}.html`,
      aiPrompt: {
        short: `Fix Bandit ${issue.test_id} security issue in ${issue.filename} at line ${issue.line_number}`,
        detailed: `
Fix the Python security issue found by Bandit.

File: ${issue.filename}
Line: ${issue.line_number}
Test: ${issue.test_id} - ${issue.test_name}
Severity: ${issue.issue_severity}
Confidence: ${issue.issue_confidence}
${issue.issue_cwe ? `CWE: ${issue.issue_cwe.id} - ${issue.issue_cwe.link}` : ''}

Issue: ${issue.issue_text}

${this.getRecommendation(issue.test_id, issue.test_name)}

Please fix this security issue while maintaining the code's functionality.
        `.trim(),
        steps: [
          `Open ${issue.filename} and go to line ${issue.line_number}`,
          `Review the ${issue.test_name} security check`,
          'Apply the recommended fix pattern',
          'Test that functionality is preserved',
          'Re-run Bandit to verify the fix',
        ],
      },
      ruleId: issue.test_id,
      tags: ['bandit', 'python', 'security', issue.test_id, issue.issue_cwe ? `cwe-${issue.issue_cwe.id}` : ''].filter(Boolean),
      effort: 'moderate',
    };
  }

  private getImpact(severity: Severity, testName: string): string {
    return `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity Python security issue: ${testName}. This could potentially be exploited by attackers.`;
  }

  private getRecommendation(testId: string, testName: string): string {
    const recommendations: Record<string, string> = {
      B101: 'Remove assert statements from production code. Use proper error handling instead.',
      B102: 'Avoid using exec(). Find an alternative implementation.',
      B103: 'Set safe permissions when creating files (e.g., 0o600 for sensitive files).',
      B104: 'Do not bind to all interfaces (0.0.0.0). Bind to specific interfaces.',
      B105: 'Do not hardcode passwords. Use environment variables or a secrets manager.',
      B106: 'Do not hardcode passwords in function arguments.',
      B107: 'Do not hardcode passwords in function defaults.',
      B108: 'Avoid using /tmp for sensitive operations. Use tempfile module securely.',
      B110: 'Do not use pass in except blocks. Handle exceptions properly.',
      B112: 'Avoid try-except-continue patterns that may hide errors.',
      B201: 'Avoid using Flask debug mode in production.',
      B301: 'Avoid using pickle for untrusted data. Use JSON or other safe formats.',
      B302: 'Avoid marshal for untrusted data.',
      B303: 'Use hashlib with secure algorithms (SHA256+), not MD5 or SHA1.',
      B304: 'Avoid using insecure cipher modes.',
      B305: 'Avoid using insecure cipher modes.',
      B306: 'Avoid using tempfile.mktemp(). Use tempfile.mkstemp() instead.',
      B307: 'Avoid using eval(). Find alternative approaches.',
      B308: 'Avoid mark_safe() with untrusted content.',
      B310: 'Validate URLs before using with urllib.',
      B311: 'Use secrets module instead of random for security-sensitive values.',
      B312: 'Avoid telnetlib for security-sensitive operations.',
      B313: 'Avoid xml modules vulnerable to attacks. Use defusedxml.',
      B314: 'Avoid xml modules vulnerable to attacks. Use defusedxml.',
      B315: 'Avoid xml modules vulnerable to attacks. Use defusedxml.',
      B316: 'Avoid xml modules vulnerable to attacks. Use defusedxml.',
      B317: 'Avoid xml modules vulnerable to attacks. Use defusedxml.',
      B318: 'Avoid xml modules vulnerable to attacks. Use defusedxml.',
      B319: 'Avoid xml modules vulnerable to attacks. Use defusedxml.',
      B320: 'Avoid xml modules vulnerable to attacks. Use defusedxml.',
      B321: 'Avoid FTP for sensitive operations. Use SFTP.',
      B323: 'Avoid unverified SSL context. Verify certificates.',
      B324: 'Avoid insecure hash functions (MD4, MD5, SHA1).',
      B501: 'Verify SSL certificates. Do not disable verification.',
      B502: 'Avoid SSL protocols. Use TLS.',
      B503: 'Avoid weak SSL ciphers.',
      B504: 'Avoid SSLv2.',
      B505: 'Avoid weak cryptographic key sizes.',
      B506: 'Use safe YAML loading. Use yaml.safe_load() instead of yaml.load().',
      B507: 'Verify hostnames in SSL connections.',
      B601: 'Avoid paramiko calls with policy that accepts unknown hosts.',
      B602: 'Avoid subprocess with shell=True.',
      B603: 'Avoid subprocess without shell=True but validate inputs.',
      B604: 'Avoid function calls that may allow command injection.',
      B605: 'Avoid starting processes with a shell.',
      B606: 'Avoid starting processes without a shell but validate inputs.',
      B607: 'Avoid starting processes with partial path.',
      B608: 'SQL injection - use parameterized queries.',
      B609: 'Avoid wildcard injection in Linux commands.',
      B610: 'Django SQL injection - use parameterized queries.',
      B611: 'Django SQL injection - use parameterized queries.',
      B701: 'Jinja2 autoescape is disabled. Enable it.',
      B702: 'Mako autoescape is disabled. Enable it.',
      B703: 'Django XSS vulnerability.',
    };

    return recommendations[testId] || `Fix the ${testName} security issue according to best practices.`;
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
