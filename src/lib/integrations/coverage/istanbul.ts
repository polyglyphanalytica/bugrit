// Istanbul/nyc Integration (Self-hosted)
// License: ISC
// Website: https://istanbul.js.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface IstanbulFileCoverage {
  path: string;
  statementMap: Record<string, { start: { line: number; column: number }; end: { line: number; column: number } }>;
  fnMap: Record<string, { name: string; decl: { start: { line: number } }; loc: { start: { line: number } } }>;
  branchMap: Record<string, { type: string; locations: Array<{ start: { line: number } }> }>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

interface IstanbulSummary {
  lines: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
}

interface IstanbulCoverage {
  total: IstanbulSummary;
  [filePath: string]: IstanbulFileCoverage | IstanbulSummary;
}

export class IstanbulIntegration implements ToolIntegration {
  name = 'Istanbul';
  category = 'coverage' as const;
  description = 'JavaScript code coverage tool with support for ES6+';
  website = 'https://istanbul.js.org';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx nyc --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        reporter: ['json-summary', 'text'],
        all: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');

      const targetDir = target.directory || '.';
      const thresholds = config?.options?.thresholds || { lines: 80, functions: 80, branches: 80, statements: 80 };

      // Check for existing coverage report
      const coveragePath = path.join(targetDir, 'coverage', 'coverage-summary.json');
      const coverageDetailPath = path.join(targetDir, 'coverage', 'coverage-final.json');

      if (!fs.existsSync(coveragePath)) {
        // Try to generate coverage
        try {
          execSync('npx nyc report --reporter=json-summary', {
            encoding: 'utf-8',
            cwd: targetDir,
            maxBuffer: 50 * 1024 * 1024
          });
        } catch {
          return {
            tool: this.name,
            category: this.category,
            success: false,
            duration: Date.now() - startTime,
            findings: [],
            summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
            error: 'No coverage data found. Run tests with coverage first.',
          };
        }
      }

      const coverageData: IstanbulCoverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));

      // Analyze overall coverage
      findings.push(...this.analyzeOverallCoverage(coverageData.total, thresholds));

      // Analyze file-level coverage if detail available
      if (fs.existsSync(coverageDetailPath)) {
        const detailData = JSON.parse(fs.readFileSync(coverageDetailPath, 'utf-8'));
        findings.push(...this.analyzeFileCoverage(detailData, thresholds, targetDir));
      }

      return this.createResult(findings, Date.now() - startTime, coverageData.total);
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

  private analyzeOverallCoverage(summary: IstanbulSummary, thresholds: Record<string, number>): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const metrics = ['lines', 'statements', 'functions', 'branches'] as const;

    for (const metric of metrics) {
      const pct = summary[metric].pct;
      const threshold = thresholds[metric] || 80;

      if (pct < threshold) {
        const severity: Severity = pct < threshold - 20 ? 'high' : pct < threshold - 10 ? 'medium' : 'low';

        findings.push({
          id: `istanbul-${metric}-coverage`,
          tool: this.name,
          category: this.category,
          severity,
          title: `Istanbul: Low ${metric.charAt(0).toUpperCase() + metric.slice(1)} Coverage`,
          description: `${metric.charAt(0).toUpperCase() + metric.slice(1)} coverage is ${pct.toFixed(2)}% (threshold: ${threshold}%)`,
          explanation: `${summary[metric].covered} of ${summary[metric].total} ${metric} are covered by tests.`,
          impact: 'Low code coverage increases the risk of undetected bugs.',
          recommendation: `Add tests to improve ${metric} coverage to at least ${threshold}%.`,
          documentationUrl: 'https://istanbul.js.org/',
          aiPrompt: {
            short: `Improve ${metric} coverage to ${threshold}%`,
            detailed: `
Improve code coverage for ${metric}.

Current: ${pct.toFixed(2)}%
Target: ${threshold}%
Covered: ${summary[metric].covered}/${summary[metric].total}

Add unit tests to cover the uncovered ${metric}.
            `.trim(),
            steps: [
              'Review coverage report to find uncovered code',
              'Identify critical paths needing tests',
              'Write unit tests for uncovered code',
              'Re-run coverage to verify improvement',
            ],
          },
          ruleId: `${metric}-coverage`,
          tags: ['istanbul', 'coverage', metric],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private analyzeFileCoverage(
    data: Record<string, IstanbulFileCoverage>,
    thresholds: Record<string, number>,
    targetDir: string
  ): AuditFinding[] {
    const findings: AuditFinding[] = [];

    for (const [filePath, coverage] of Object.entries(data)) {
      const stmtTotal = Object.keys(coverage.s).length;
      const stmtCovered = Object.values(coverage.s).filter(c => c > 0).length;
      const stmtPct = stmtTotal > 0 ? (stmtCovered / stmtTotal) * 100 : 100;

      const fnTotal = Object.keys(coverage.f).length;
      const fnCovered = Object.values(coverage.f).filter(c => c > 0).length;

      const threshold = thresholds.statements || 80;

      if (stmtPct < threshold - 30 && stmtTotal > 5) {
        findings.push({
          id: `istanbul-file-${filePath.replace(/[^a-z0-9]/gi, '-')}`.substring(0, 100),
          tool: this.name,
          category: this.category,
          severity: 'medium',
          title: `Istanbul: Very Low Coverage in File`,
          description: `${coverage.path} has only ${stmtPct.toFixed(1)}% statement coverage`,
          explanation: `${stmtCovered}/${stmtTotal} statements, ${fnCovered}/${fnTotal} functions covered.`,
          impact: 'This file has very low test coverage and may contain undetected bugs.',
          file: coverage.path,
          recommendation: 'Add comprehensive tests for this file.',
          documentationUrl: 'https://istanbul.js.org/',
          aiPrompt: {
            short: `Add tests for ${coverage.path}`,
            detailed: `
Add tests for file with low coverage.

File: ${coverage.path}
Statement coverage: ${stmtPct.toFixed(1)}%
Function coverage: ${fnTotal > 0 ? ((fnCovered / fnTotal) * 100).toFixed(1) : 100}%

Write unit tests to cover the critical functionality in this file.
            `.trim(),
            steps: [
              `Open ${coverage.path}`,
              'Identify untested code paths',
              'Write unit tests',
              'Re-run coverage',
            ],
          },
          ruleId: 'file-coverage',
          tags: ['istanbul', 'coverage', 'low-coverage'],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private createResult(findings: AuditFinding[], duration: number, summary: IstanbulSummary): AuditResult {
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
        lines: summary.lines.pct,
        statements: summary.statements.pct,
        functions: summary.functions.pct,
        branches: summary.branches.pct,
      },
    };
  }
}
