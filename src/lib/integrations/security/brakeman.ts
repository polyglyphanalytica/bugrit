// Brakeman Integration (Ruby on Rails Security Scanner)
// License: MIT
// Website: https://brakemanscanner.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface BrakemanWarning {
  warning_type: string;
  warning_code: number;
  fingerprint: string;
  check_name: string;
  message: string;
  file: string;
  line: number;
  link: string;
  code: string;
  render_path: string | null;
  location: {
    type: string;
    class?: string;
    method?: string;
  };
  user_input: string | null;
  confidence: 'High' | 'Medium' | 'Weak';
  cwe_id: number[];
}

interface BrakemanOutput {
  scan_info: {
    app_path: string;
    rails_version: string;
    brakeman_version: string;
    start_time: string;
    end_time: string;
    duration: number;
  };
  warnings: BrakemanWarning[];
  errors: Array<{ error: string; backtrace: string }>;
}

export class BrakemanIntegration implements ToolIntegration {
  name = 'Brakeman';
  category = 'security' as const;
  description = 'Static analysis security vulnerability scanner for Ruby on Rails applications';
  website = 'https://brakemanscanner.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('brakeman --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        confidence: 1, // 0=all, 1=medium+high, 2=high only
        allWarnings: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const confidence = config?.options?.confidence ?? 1;

      const result = execSync(
        `brakeman -f json -w${confidence} "${targetDir}"`,
        { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
      );

      const output: BrakemanOutput = JSON.parse(result);

      for (const warning of output.warnings) {
        findings.push(this.convertToFinding(warning));
      }

      return this.createResult(findings, Date.now() - startTime, output.scan_info);
    } catch (error) {
      if (error instanceof Error && 'stdout' in error) {
        try {
          const output: BrakemanOutput = JSON.parse((error as { stdout: string }).stdout);
          for (const warning of output.warnings) {
            findings.push(this.convertToFinding(warning));
          }
          return this.createResult(findings, Date.now() - startTime, output.scan_info);
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

  private convertToFinding(warning: BrakemanWarning): AuditFinding {
    const confidenceToSeverity: Record<string, Severity> = {
      High: 'high',
      Medium: 'medium',
      Weak: 'low',
    };

    const severity = confidenceToSeverity[warning.confidence] || 'medium';

    return {
      id: `brakeman-${warning.fingerprint}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `Brakeman: ${warning.warning_type}`,
      description: warning.message,
      explanation: this.buildExplanation(warning),
      impact: this.getImpact(warning.warning_type),
      file: warning.file,
      line: warning.line,
      codeSnippet: warning.code || undefined,
      recommendation: this.getRecommendation(warning.warning_type, warning.check_name),
      documentationUrl: warning.link || 'https://brakemanscanner.org/docs/warning_types/',
      aiPrompt: {
        short: `Fix Brakeman ${warning.warning_type} in ${warning.file} at line ${warning.line}`,
        detailed: `
Fix the Ruby on Rails security vulnerability found by Brakeman.

File: ${warning.file}
Line: ${warning.line}
Warning Type: ${warning.warning_type}
Check: ${warning.check_name}
Confidence: ${warning.confidence}
${warning.cwe_id?.length ? `CWE: ${warning.cwe_id.map(id => `CWE-${id}`).join(', ')}` : ''}

Message: ${warning.message}

${warning.code ? `Code:\n\`\`\`ruby\n${warning.code}\n\`\`\`` : ''}

${warning.user_input ? `User input involved: ${warning.user_input}` : ''}

${warning.location ? `Location: ${warning.location.type}${warning.location.class ? ` ${warning.location.class}` : ''}${warning.location.method ? `#${warning.location.method}` : ''}` : ''}

${this.getRecommendation(warning.warning_type, warning.check_name)}

Please fix this security issue while maintaining the application's functionality.
        `.trim(),
        steps: [
          `Open ${warning.file} and go to line ${warning.line}`,
          `Review the ${warning.warning_type} vulnerability`,
          'Apply the recommended security fix',
          'Test the affected functionality',
          'Re-run Brakeman to verify',
        ],
      },
      ruleId: warning.check_name,
      tags: ['brakeman', 'ruby', 'rails', 'security', warning.warning_type.toLowerCase().replace(/\s+/g, '-'), ...warning.cwe_id?.map(id => `cwe-${id}`) || []],
      effort: 'moderate',
    };
  }

  private buildExplanation(warning: BrakemanWarning): string {
    const parts: string[] = [];
    parts.push(`Confidence: ${warning.confidence}.`);

    if (warning.cwe_id?.length) {
      parts.push(`CWE: ${warning.cwe_id.map(id => `CWE-${id}`).join(', ')}.`);
    }

    if (warning.user_input) {
      parts.push(`User input: ${warning.user_input}.`);
    }

    return parts.join(' ');
  }

  private getImpact(warningType: string): string {
    const impacts: Record<string, string> = {
      'SQL Injection': 'Attackers could read, modify, or delete database data.',
      'Cross-Site Scripting': 'Attackers could inject malicious scripts that run in users\' browsers.',
      'Command Injection': 'Attackers could execute arbitrary system commands.',
      'File Access': 'Attackers could read or write arbitrary files.',
      'Mass Assignment': 'Attackers could modify protected attributes.',
      'Remote Code Execution': 'Attackers could execute arbitrary code on the server.',
      'Denial of Service': 'Attackers could crash or slow down the application.',
      'Session Setting': 'Session security may be compromised.',
      'SSL Verification': 'Man-in-the-middle attacks may be possible.',
      'Redirect': 'Users could be redirected to malicious sites.',
      'Unsafe Deserialization': 'Attackers could execute code via crafted payloads.',
    };

    return impacts[warningType] || `Security vulnerability: ${warningType}. This could be exploited by attackers.`;
  }

  private getRecommendation(warningType: string, checkName: string): string {
    const recommendations: Record<string, string> = {
      'SQL Injection': 'Use parameterized queries or ActiveRecord query methods instead of string interpolation.',
      'Cross-Site Scripting': 'Escape user input with html_escape or use Rails\' automatic escaping. Use raw() and html_safe sparingly.',
      'Command Injection': 'Avoid passing user input to system commands. Use array form of system() if necessary.',
      'File Access': 'Validate and sanitize file paths. Use File.basename and restrict to allowed directories.',
      'Mass Assignment': 'Use strong parameters to whitelist allowed attributes.',
      'Remote Code Execution': 'Never pass user input to eval, instance_eval, or similar methods.',
      'Denial of Service': 'Add input validation, timeouts, and resource limits.',
      'Session Setting': 'Use secure session configuration. Set secure, httponly, and samesite flags.',
      'SSL Verification': 'Enable SSL certificate verification. Never disable it in production.',
      'Redirect': 'Validate redirect URLs. Only allow redirects to trusted domains.',
      'Unsafe Deserialization': 'Avoid deserializing untrusted data. Use JSON instead of YAML/Marshal.',
      'Dynamic Render Path': 'Do not use user input to determine which view to render.',
      'Dangerous Send': 'Avoid using send() with user input. Whitelist allowed methods.',
    };

    return recommendations[warningType] || `Fix the ${checkName} issue according to Rails security best practices.`;
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    scanInfo?: BrakemanOutput['scan_info']
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
      metadata: scanInfo ? {
        appPath: scanInfo.app_path,
        railsVersion: scanInfo.rails_version,
        brakemanVersion: scanInfo.brakeman_version,
        scanDuration: scanInfo.duration,
      } : undefined,
    };
  }
}
