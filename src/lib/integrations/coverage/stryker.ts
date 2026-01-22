// Stryker Mutator Integration (Self-hosted)
// License: Apache 2.0
// Website: https://stryker-mutator.io

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface StrykerMutant {
  id: string;
  mutatorName: string;
  replacement: string;
  fileName: string;
  location: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  status: 'Killed' | 'Survived' | 'NoCoverage' | 'Timeout' | 'RuntimeError' | 'CompileError';
  statusReason?: string;
  description: string;
  coveredBy?: string[];
  killedBy?: string[];
  testsCompleted?: number;
}

interface StrykerReport {
  schemaVersion: string;
  thresholds: { high: number; low: number; break?: number };
  projectRoot: string;
  files: Record<string, {
    language: string;
    source: string;
    mutants: StrykerMutant[];
  }>;
}

interface StrykerScore {
  mutationScore: number;
  killed: number;
  survived: number;
  timeout: number;
  noCoverage: number;
  runtimeErrors: number;
  compileErrors: number;
  totalDetected: number;
  totalUndetected: number;
  totalMutants: number;
}

export class StrykerIntegration implements ToolIntegration {
  name = 'Stryker';
  category = 'coverage' as const;
  description = 'Mutation testing framework to measure test quality';
  website = 'https://stryker-mutator.io';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx stryker --version', { stdio: 'ignore' });
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
          high: 80,
          low: 60,
          break: 50,
        },
        concurrency: 4,
        timeoutMS: 60000,
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
      const thresholds = config?.options?.thresholds || { high: 80, low: 60 };

      // Run Stryker
      try {
        execSync('npx stryker run', {
          encoding: 'utf-8',
          cwd: targetDir,
          maxBuffer: 100 * 1024 * 1024,
          timeout: 3600000 // 1 hour - mutation testing can take a long time
        });
      } catch {
        // Stryker may exit with error if mutation score is below threshold
      }

      // Find and parse report
      const reportPath = path.join(targetDir, 'reports', 'mutation', 'mutation.json');

      if (!fs.existsSync(reportPath)) {
        return {
          tool: this.name,
          category: this.category,
          success: false,
          duration: Date.now() - startTime,
          findings: [],
          summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
          error: 'Stryker report not found. Run stryker with mutation.json reporter.',
        };
      }

      const report: StrykerReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const score = this.calculateScore(report);

      findings.push(...this.analyzeMutationScore(score, thresholds as Record<string, number>));
      findings.push(...this.analyzeSurvivedMutants(report, targetDir));

      return this.createResult(findings, Date.now() - startTime, score);
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

  private calculateScore(report: StrykerReport): StrykerScore {
    let killed = 0, survived = 0, timeout = 0, noCoverage = 0, runtimeErrors = 0, compileErrors = 0;

    for (const file of Object.values(report.files)) {
      for (const mutant of file.mutants) {
        switch (mutant.status) {
          case 'Killed': killed++; break;
          case 'Survived': survived++; break;
          case 'Timeout': timeout++; break;
          case 'NoCoverage': noCoverage++; break;
          case 'RuntimeError': runtimeErrors++; break;
          case 'CompileError': compileErrors++; break;
        }
      }
    }

    const totalDetected = killed + timeout;
    const totalUndetected = survived + noCoverage;
    const totalMutants = totalDetected + totalUndetected + runtimeErrors + compileErrors;
    const mutationScore = totalMutants > 0 ? (totalDetected / (totalDetected + totalUndetected)) * 100 : 100;

    return {
      mutationScore,
      killed,
      survived,
      timeout,
      noCoverage,
      runtimeErrors,
      compileErrors,
      totalDetected,
      totalUndetected,
      totalMutants,
    };
  }

  private analyzeMutationScore(score: StrykerScore, thresholds: Record<string, number>): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const lowThreshold = thresholds.low || 60;

    if (score.mutationScore < lowThreshold) {
      const severity: Severity = score.mutationScore < lowThreshold - 20 ? 'high' : 'medium';

      findings.push({
        id: 'stryker-low-mutation-score',
        tool: this.name,
        category: this.category,
        severity,
        title: 'Stryker: Low Mutation Score',
        description: `Mutation score is ${score.mutationScore.toFixed(2)}% (threshold: ${lowThreshold}%)`,
        explanation: `${score.survived} mutants survived (not killed by tests). ${score.noCoverage} mutants had no test coverage.`,
        impact: 'Low mutation score indicates tests may not effectively catch bugs.',
        recommendation: 'Improve tests to kill surviving mutants.',
        documentationUrl: 'https://stryker-mutator.io/docs/',
        aiPrompt: {
          short: `Improve mutation score from ${score.mutationScore.toFixed(1)}% to ${lowThreshold}%`,
          detailed: `
Improve the mutation testing score.

Current Score: ${score.mutationScore.toFixed(2)}%
Target: ${lowThreshold}%

Stats:
- Killed: ${score.killed}
- Survived: ${score.survived}
- No Coverage: ${score.noCoverage}
- Timeout: ${score.timeout}

Add or improve tests to detect the surviving mutants.
          `.trim(),
          steps: [
            'Review surviving mutants in Stryker report',
            'Identify weak tests',
            'Add assertions to detect mutations',
            'Re-run Stryker to verify',
          ],
        },
        ruleId: 'mutation-score',
        tags: ['stryker', 'mutation-testing', 'coverage'],
        effort: 'hard',
      });
    }

    if (score.noCoverage > score.totalMutants * 0.2) {
      findings.push({
        id: 'stryker-no-coverage',
        tool: this.name,
        category: this.category,
        severity: 'medium',
        title: 'Stryker: High No-Coverage Mutants',
        description: `${score.noCoverage} mutants (${((score.noCoverage / score.totalMutants) * 100).toFixed(1)}%) have no test coverage`,
        explanation: 'These code mutations are not exercised by any tests.',
        impact: 'Code without test coverage cannot be validated by mutation testing.',
        recommendation: 'Add tests to cover the untested code paths.',
        documentationUrl: 'https://stryker-mutator.io/docs/',
        aiPrompt: {
          short: 'Add tests for uncovered code',
          detailed: `Add tests for ${score.noCoverage} uncovered mutants.`,
          steps: ['Identify uncovered code', 'Add tests', 'Re-run Stryker'],
        },
        ruleId: 'no-coverage',
        tags: ['stryker', 'mutation-testing', 'coverage'],
        effort: 'moderate',
      });
    }

    return findings;
  }

  private analyzeSurvivedMutants(report: StrykerReport, targetDir: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    for (const [filePath, file] of Object.entries(report.files)) {
      const survived = file.mutants.filter(m => m.status === 'Survived');

      if (survived.length > 5) {
        // Group by mutator type
        const byMutator: Record<string, StrykerMutant[]> = {};
        for (const mutant of survived) {
          if (!byMutator[mutant.mutatorName]) {
            byMutator[mutant.mutatorName] = [];
          }
          byMutator[mutant.mutatorName].push(mutant);
        }

        for (const [mutatorName, mutants] of Object.entries(byMutator)) {
          if (mutants.length >= 3) {
            findings.push({
              id: `stryker-survived-${filePath}-${mutatorName}`.replace(/[^a-z0-9-]/gi, '-').substring(0, 100),
              tool: this.name,
              category: this.category,
              severity: 'low',
              title: `Stryker: Multiple Surviving ${mutatorName} Mutants`,
              description: `${mutants.length} ${mutatorName} mutations survived in ${filePath}`,
              explanation: `These mutations were not detected by tests: ${mutants.slice(0, 3).map(m => m.description).join('; ')}`,
              impact: 'Tests may not adequately cover this type of logic.',
              file: filePath,
              line: mutants[0].location.start.line,
              recommendation: `Add tests that specifically check for ${mutatorName} scenarios.`,
              documentationUrl: 'https://stryker-mutator.io/docs/',
              aiPrompt: {
                short: `Add tests for ${mutatorName} mutations`,
                detailed: `
Add tests to kill ${mutatorName} mutations in ${filePath}.

Surviving mutations:
${mutants.slice(0, 5).map(m => `- Line ${m.location.start.line}: ${m.description}`).join('\n')}
                `.trim(),
                steps: [
                  `Review ${mutatorName} mutations`,
                  'Add assertions for edge cases',
                  'Re-run Stryker',
                ],
              },
              ruleId: `survived-${mutatorName}`,
              tags: ['stryker', 'mutation-testing', mutatorName],
              effort: 'moderate',
            });
          }
        }
      }
    }

    return findings;
  }

  private createResult(findings: AuditFinding[], duration: number, score: StrykerScore): AuditResult {
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
        mutationScore: score.mutationScore,
        killed: score.killed,
        survived: score.survived,
        noCoverage: score.noCoverage,
        totalMutants: score.totalMutants,
      },
    };
  }
}
