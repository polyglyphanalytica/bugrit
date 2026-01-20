// gosec Integration (Go Security Checker)
// License: Apache 2.0
// Website: https://github.com/securego/gosec

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface GosecIssue {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  cwe: { id: string; url: string };
  rule_id: string;
  details: string;
  file: string;
  code: string;
  line: string;
  column: string;
}

interface GosecOutput {
  Golang: { errors: Record<string, unknown>; parsed: Record<string, unknown> };
  Issues: GosecIssue[];
  Stats: { files: number; lines: number; nosec: number; found: number };
}

export class GosecIntegration implements ToolIntegration {
  name = 'gosec';
  category = 'security' as const;
  description = 'Go security checker that inspects Go source code for security problems';
  website = 'https://github.com/securego/gosec';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('gosec --version', { stdio: 'ignore' });
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
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';

      const result = execSync(
        `gosec -fmt=json "${targetDir}/..."`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const output: GosecOutput = JSON.parse(result);

      for (const issue of output.Issues) {
        findings.push(this.convertToFinding(issue));
      }

      return this.createResult(findings, Date.now() - startTime, output.Stats);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: GosecOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const issue of output.Issues) {
            findings.push(this.convertToFinding(issue));
          }
          return this.createResult(findings, Date.now() - startTime, output.Stats);
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

  private convertToFinding(issue: GosecIssue): AuditFinding {
    const severityMap: Record<string, Severity> = {
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    };

    const severity = severityMap[issue.severity] || 'medium';

    return {
      id: `gosec-${issue.file}-${issue.line}-${issue.rule_id}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `gosec: ${issue.rule_id}`,
      description: issue.details,
      explanation: `Severity: ${issue.severity}, Confidence: ${issue.confidence}. CWE-${issue.cwe.id}`,
      impact: this.getImpact(severity, issue.rule_id),
      file: issue.file,
      line: parseInt(issue.line),
      column: parseInt(issue.column),
      codeSnippet: issue.code,
      recommendation: this.getRecommendation(issue.rule_id),
      documentationUrl: issue.cwe.url || `https://github.com/securego/gosec#available-rules`,
      aiPrompt: {
        short: `Fix gosec ${issue.rule_id} in ${issue.file} at line ${issue.line}`,
        detailed: `
Fix the Go security issue found by gosec.

File: ${issue.file}
Line: ${issue.line}
Rule: ${issue.rule_id}
Severity: ${issue.severity}
Confidence: ${issue.confidence}
CWE: ${issue.cwe.id}

Issue: ${issue.details}

Code:
\`\`\`go
${issue.code}
\`\`\`

${this.getRecommendation(issue.rule_id)}

Please fix this security issue while maintaining the code's functionality.
        `.trim(),
        steps: [
          `Open ${issue.file} and go to line ${issue.line}`,
          `Review the ${issue.rule_id} security rule`,
          'Apply the recommended fix',
          'Test the code',
          'Re-run gosec to verify',
        ],
      },
      ruleId: issue.rule_id,
      tags: ['gosec', 'go', 'security', issue.rule_id, `cwe-${issue.cwe.id}`],
      effort: 'moderate',
    };
  }

  private getImpact(severity: Severity, ruleId: string): string {
    return `${severity.charAt(0).toUpperCase() + severity.slice(1)} severity Go security issue (${ruleId}). This vulnerability could potentially be exploited.`;
  }

  private getRecommendation(ruleId: string): string {
    const recommendations: Record<string, string> = {
      G101: 'Remove hardcoded credentials. Use environment variables or a secrets manager.',
      G102: 'Bind to a specific IP address instead of 0.0.0.0.',
      G103: 'Audit unsafe block usage. Ensure pointer arithmetic is correct.',
      G104: 'Handle errors properly. Do not ignore returned errors.',
      G106: 'Audit ssh.InsecureIgnoreHostKey usage. Verify host keys.',
      G107: 'Validate URLs before use to prevent SSRF.',
      G108: 'Handle profiling endpoints. Do not expose pprof in production.',
      G109: 'Check integer overflow in strconv operations.',
      G110: 'Limit decompression to prevent zip bombs.',
      G201: 'Use parameterized queries instead of string concatenation for SQL.',
      G202: 'Use parameterized queries instead of string concatenation for SQL.',
      G203: 'Sanitize HTML output to prevent XSS.',
      G204: 'Validate command arguments to prevent command injection.',
      G301: 'Use secure file permissions. Avoid world-writable files.',
      G302: 'Use secure file permissions when creating files.',
      G303: 'Avoid predictable temporary files. Use ioutil.TempFile.',
      G304: 'Validate file paths to prevent path traversal.',
      G305: 'Check for path traversal in zip extraction.',
      G306: 'Use secure permissions when writing files.',
      G307: 'Use io.Copy with a limit to prevent resource exhaustion.',
      G401: 'Use secure hash algorithms (SHA256+). Avoid MD5, SHA1.',
      G402: 'Enable TLS certificate verification.',
      G403: 'Use RSA keys of at least 2048 bits.',
      G404: 'Use crypto/rand instead of math/rand for security-sensitive values.',
      G501: 'Avoid importing blacklisted crypto packages.',
      G502: 'Avoid importing blacklisted crypto packages.',
      G503: 'Avoid importing blacklisted crypto packages.',
      G504: 'Avoid importing blacklisted crypto packages.',
      G505: 'Avoid importing blacklisted crypto packages.',
      G601: 'Avoid taking address of loop variable. Copy the value first.',
    };

    return recommendations[ruleId] || `Fix the ${ruleId} security issue according to Go security best practices.`;
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    stats?: GosecOutput['Stats']
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
        passed: 0,
        failed: findings.length,
      },
      metadata: stats ? {
        filesScanned: stats.files,
        linesScanned: stats.lines,
        nosecAnnotations: stats.nosec,
      } : undefined,
    };
  }
}
