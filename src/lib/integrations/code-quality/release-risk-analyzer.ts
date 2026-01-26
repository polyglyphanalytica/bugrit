// Release Risk Analyzer - Git-based Release Change Risk Assessment
// Analyzes changes between releases/branches and flags risky patterns
// Pure git-based analysis, no external dependencies required

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface DiffStat {
  file: string;
  additions: number;
  deletions: number;
}

interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
}

interface RiskPattern {
  name: string;
  description: string;
  filePatterns: RegExp[];
  severity: Severity;
  ruleId: string;
  tags: string[];
}

const RISK_PATTERNS: RiskPattern[] = [
  {
    name: 'Authentication & Authorization Changes',
    description: 'Changes to authentication or authorization code are high-risk and require careful review',
    filePatterns: [
      /auth/i, /login/i, /session/i, /oauth/i, /jwt/i, /token/i,
      /permission/i, /rbac/i, /acl/i, /password/i, /credential/i,
      /middleware.*auth/i, /guard/i, /policy/i,
    ],
    severity: 'high',
    ruleId: 'release-risk-auth-changes',
    tags: ['security', 'authentication', 'authorization'],
  },
  {
    name: 'Payment & Financial Changes',
    description: 'Changes to payment processing or financial logic demand careful verification',
    filePatterns: [
      /payment/i, /billing/i, /stripe/i, /invoice/i, /checkout/i,
      /subscription/i, /charge/i, /refund/i, /pricing/i, /wallet/i,
    ],
    severity: 'high',
    ruleId: 'release-risk-payment-changes',
    tags: ['financial', 'payment', 'billing'],
  },
  {
    name: 'Database Migration Changes',
    description: 'Database migrations can cause data loss or downtime if not properly reviewed',
    filePatterns: [
      /migration/i, /migrate/i, /schema/i, /\.sql$/i,
      /seed/i, /fixture/i, /db.*change/i,
    ],
    severity: 'high',
    ruleId: 'release-risk-db-migration',
    tags: ['database', 'migration', 'schema'],
  },
  {
    name: 'Infrastructure & Configuration Changes',
    description: 'Changes to infrastructure or deployment config can cause outages',
    filePatterns: [
      /docker/i, /kubernetes/i, /k8s/i, /helm/i, /terraform/i,
      /\.env/i, /config.*prod/i, /deploy/i, /ci.*cd/i,
      /\.github.*workflow/i, /cloudbuild/i, /apphosting/i, /nginx/i,
    ],
    severity: 'medium',
    ruleId: 'release-risk-infra-changes',
    tags: ['infrastructure', 'deployment', 'configuration'],
  },
  {
    name: 'Cryptography & Security-Sensitive Changes',
    description: 'Changes to cryptographic code or security-critical paths',
    filePatterns: [
      /crypt/i, /encrypt/i, /decrypt/i, /hash/i, /hmac/i,
      /certificate/i, /ssl/i, /tls/i, /secret/i, /key.*gen/i,
      /sanitiz/i, /escap/i, /xss/i, /csrf/i, /cors/i,
    ],
    severity: 'high',
    ruleId: 'release-risk-crypto-changes',
    tags: ['security', 'cryptography', 'sensitive'],
  },
  {
    name: 'Dependency Changes',
    description: 'New or updated dependencies may introduce vulnerabilities',
    filePatterns: [
      /package\.json$/i, /package-lock\.json$/i, /yarn\.lock$/i,
      /pnpm-lock/i, /requirements.*\.txt$/i, /Pipfile/i,
      /Gemfile/i, /go\.mod$/i, /go\.sum$/i, /Cargo\.lock$/i,
      /pyproject\.toml$/i, /poetry\.lock$/i, /composer\.lock$/i,
    ],
    severity: 'medium',
    ruleId: 'release-risk-dependency-changes',
    tags: ['dependencies', 'supply-chain'],
  },
];

export class ReleaseRiskAnalyzerIntegration implements ToolIntegration {
  name = 'release-risk-analyzer';
  category = 'code-quality' as const;
  description = 'Analyzes git changes between releases to identify high-risk patterns including auth modifications, test deletions, large diffs, and infrastructure changes';
  website = 'https://github.com/polyglyphanalytica/bugrit';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('git --version', { stdio: 'ignore', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        baseBranch: 'main',
        maxFilesThreshold: 50,
        maxAdditionsThreshold: 1000,
        testDeletionThreshold: 0,
        flagLargeFiles: true,
        flagTestDeletions: true,
        flagRiskyPatterns: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const options = config?.options ?? this.getDefaultConfig().options ?? {};
      const baseBranch = (target.branch || options.baseBranch || 'main') as string;

      // Determine the comparison range
      const compareRef = this.getCompareRef(targetDir, baseBranch);
      if (!compareRef) {
        return this.createErrorResult(
          'Unable to determine comparison reference. Ensure the repository has commits or tags.',
          Date.now() - startTime
        );
      }

      // Get diff stats
      const diffStats = this.getDiffStats(targetDir, compareRef);
      const commits = this.getCommits(targetDir, compareRef);
      const allChangedFiles = diffStats.map(d => d.file);
      const totalAdditions = diffStats.reduce((sum, d) => sum + d.additions, 0);
      const totalDeletions = diffStats.reduce((sum, d) => sum + d.deletions, 0);

      // 1. Large diff analysis
      const maxFiles = (options.maxFilesThreshold || 50) as number;
      const maxAdditions = (options.maxAdditionsThreshold || 1000) as number;
      if (options.flagLargeFiles !== false) {
        this.analyzeLargeDiff(allChangedFiles, totalAdditions, totalDeletions, maxFiles, maxAdditions, findings);
      }

      // 2. Test deletion analysis
      if (options.flagTestDeletions !== false) {
        this.analyzeTestDeletions(diffStats, targetDir, compareRef, findings);
      }

      // 3. Risky pattern analysis
      if (options.flagRiskyPatterns !== false) {
        this.analyzeRiskyPatterns(allChangedFiles, diffStats, findings);
      }

      // 4. Single-author risk
      this.analyzeSingleAuthor(commits, findings);

      // 5. Large individual file changes
      this.analyzeLargeFileChanges(diffStats, findings);

      // 6. Summary finding
      findings.push(this.createSummaryFinding(diffStats, commits, compareRef, totalAdditions, totalDeletions));

      return this.createResult(findings, Date.now() - startTime, {
        compareRef,
        totalFiles: allChangedFiles.length,
        totalAdditions,
        totalDeletions,
        totalCommits: commits.length,
        authors: [...new Set(commits.map(c => c.author))],
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        Date.now() - startTime
      );
    }
  }

  private getCompareRef(targetDir: string, baseBranch: string): string | null {
    const { execSync } = require('child_process');
    try {
      // Try to find the latest tag first
      const latestTag = execSync('git describe --tags --abbrev=0 HEAD 2>/dev/null', {
        cwd: targetDir,
        encoding: 'utf-8',
      }).trim();

      if (latestTag) {
        return latestTag;
      }
    } catch {
      // No tags found, fall through
    }

    try {
      // Fall back to comparing against base branch
      execSync(`git rev-parse --verify ${baseBranch}`, {
        cwd: targetDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      return baseBranch;
    } catch {
      // Base branch doesn't exist
    }

    try {
      // Fall back to comparing against the initial commit
      const firstCommit = execSync('git rev-list --max-parents=0 HEAD', {
        cwd: targetDir,
        encoding: 'utf-8',
      }).trim().split('\n')[0];
      return firstCommit;
    } catch {
      return null;
    }
  }

  private getDiffStats(targetDir: string, compareRef: string): DiffStat[] {
    const { execSync } = require('child_process');
    try {
      const output = execSync(`git diff --numstat ${compareRef}...HEAD`, {
        cwd: targetDir,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });

      return output.trim().split('\n').filter(Boolean).map((line: string) => {
        const [additions, deletions, file] = line.split('\t');
        return {
          file: file || '',
          additions: additions === '-' ? 0 : parseInt(additions, 10) || 0,
          deletions: deletions === '-' ? 0 : parseInt(deletions, 10) || 0,
        };
      });
    } catch {
      // If three-dot fails, try two-dot
      try {
        const output = execSync(`git diff --numstat ${compareRef}..HEAD`, {
          cwd: targetDir,
          encoding: 'utf-8',
          maxBuffer: 10 * 1024 * 1024,
        });

        return output.trim().split('\n').filter(Boolean).map((line: string) => {
          const [additions, deletions, file] = line.split('\t');
          return {
            file: file || '',
            additions: additions === '-' ? 0 : parseInt(additions, 10) || 0,
            deletions: deletions === '-' ? 0 : parseInt(deletions, 10) || 0,
          };
        });
      } catch {
        return [];
      }
    }
  }

  private getCommits(targetDir: string, compareRef: string): CommitInfo[] {
    const { execSync } = require('child_process');
    try {
      const output = execSync(
        `git log ${compareRef}..HEAD --format="COMMIT_START%n%H%n%an%n%ai%n%s" --name-only`,
        { cwd: targetDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const commits: CommitInfo[] = [];
      const parts = output.split('COMMIT_START\n').filter(Boolean);

      for (const part of parts) {
        const lines = part.trim().split('\n');
        if (lines.length >= 4) {
          commits.push({
            hash: lines[0],
            author: lines[1],
            date: lines[2],
            message: lines[3],
            files: lines.slice(4).filter(Boolean),
          });
        }
      }

      return commits;
    } catch {
      return [];
    }
  }

  private analyzeLargeDiff(
    files: string[],
    totalAdditions: number,
    totalDeletions: number,
    maxFiles: number,
    maxAdditions: number,
    findings: AuditFinding[]
  ): void {
    if (files.length > maxFiles) {
      findings.push({
        id: 'release-risk-large-changeset',
        tool: this.name,
        category: this.category,
        severity: 'medium',
        title: `Large release: ${files.length} files changed`,
        description: `This release modifies ${files.length} files (threshold: ${maxFiles}). Large changesets are harder to review thoroughly and more likely to contain bugs.`,
        explanation: 'Research shows that code review effectiveness decreases significantly as the size of the changeset increases. Changes over 400 lines receive diminishing review quality, and changes to many files increase the risk of subtle regressions.',
        impact: `Increased risk of bugs and regressions. ${files.length} files changed with +${totalAdditions}/-${totalDeletions} lines.`,
        recommendation: 'Consider breaking this release into smaller, focused releases. Ensure thorough testing for all changed areas.',
        aiPrompt: {
          short: `Review large release with ${files.length} files`,
          detailed: `Release changes ${files.length} files with +${totalAdditions}/-${totalDeletions} lines. Identify the highest-risk areas for focused review.`,
          steps: [
            'Categorize changes by area (feature, fix, refactor)',
            'Prioritize review of security and business-critical files',
            'Ensure adequate test coverage for all changes',
            'Consider splitting into multiple smaller releases',
          ],
        },
        ruleId: 'release-risk-large-changeset',
        tags: ['release-risk', 'large-diff', 'review-quality'],
        effort: 'hard',
      });
    }

    if (totalAdditions > maxAdditions) {
      findings.push({
        id: 'release-risk-high-additions',
        tool: this.name,
        category: this.category,
        severity: 'low',
        title: `High volume of new code: +${totalAdditions} lines`,
        description: `This release adds ${totalAdditions} lines of new code (threshold: ${maxAdditions}). Large amounts of new code increase the surface area for bugs.`,
        explanation: 'New code has a higher defect density than mature code. Large additions warrant proportionally thorough review and testing.',
        impact: 'Greater surface area for defects. New code typically has 3-5x the defect rate of mature code.',
        recommendation: 'Ensure comprehensive test coverage for all new code. Consider incremental rollout or feature flags.',
        aiPrompt: {
          short: `Review ${totalAdditions} lines of new code`,
          detailed: `Release adds ${totalAdditions} new lines across ${files.length} files. Focus review on new code paths.`,
          steps: [
            'Check test coverage for new code',
            'Review new code for error handling',
            'Verify edge cases are handled',
            'Consider feature flags for gradual rollout',
          ],
        },
        ruleId: 'release-risk-high-additions',
        tags: ['release-risk', 'new-code', 'review-quality'],
        effort: 'moderate',
      });
    }
  }

  private analyzeTestDeletions(
    diffStats: DiffStat[],
    targetDir: string,
    compareRef: string,
    findings: AuditFinding[]
  ): void {
    const testPatterns = [/\.test\./i, /\.spec\./i, /\/__tests__\//i, /\/test\//i, /\.e2e\./i, /\.cy\./i];
    const { execSync } = require('child_process');

    // Check for deleted test files
    let deletedFiles: string[] = [];
    try {
      const deleted = execSync(`git diff --diff-filter=D --name-only ${compareRef}...HEAD`, {
        cwd: targetDir,
        encoding: 'utf-8',
      });
      deletedFiles = deleted.trim().split('\n').filter(Boolean);
    } catch {
      try {
        const deleted = execSync(`git diff --diff-filter=D --name-only ${compareRef}..HEAD`, {
          cwd: targetDir,
          encoding: 'utf-8',
        });
        deletedFiles = deleted.trim().split('\n').filter(Boolean);
      } catch {
        // Ignore
      }
    }

    const deletedTests = deletedFiles.filter(f => testPatterns.some(p => p.test(f)));

    if (deletedTests.length > 0) {
      findings.push({
        id: 'release-risk-test-deletions',
        tool: this.name,
        category: this.category,
        severity: 'high',
        title: `${deletedTests.length} test file(s) deleted`,
        description: `This release deletes ${deletedTests.length} test files: ${deletedTests.slice(0, 5).join(', ')}${deletedTests.length > 5 ? ` and ${deletedTests.length - 5} more` : ''}`,
        explanation: 'Deleting test files reduces confidence in code correctness. Unless the tested code was also removed, this represents a regression in test coverage.',
        impact: 'Reduced test coverage. Previously tested behavior is now unverified.',
        recommendation: 'Verify that all deleted tests correspond to removed features. If code still exists, restore or replace the tests.',
        aiPrompt: {
          short: `Investigate ${deletedTests.length} deleted test files`,
          detailed: `Deleted test files:\n${deletedTests.join('\n')}\n\nVerify each deletion is intentional and the corresponding code was also removed.`,
          steps: [
            'Check if the tested source code was also deleted',
            'If source code remains, restore or rewrite the tests',
            'Check test coverage metrics before and after',
            'Document reason for any intentional test removal',
          ],
        },
        ruleId: 'release-risk-test-deletions',
        tags: ['release-risk', 'testing', 'coverage-regression'],
        effort: 'moderate',
      });
    }

    // Check for net test line reduction in modified test files
    const modifiedTests = diffStats.filter(d => testPatterns.some(p => p.test(d.file)));
    const netTestDeletion = modifiedTests.reduce((sum, d) => sum + (d.deletions - d.additions), 0);

    if (netTestDeletion > 50) {
      findings.push({
        id: 'release-risk-test-reduction',
        tool: this.name,
        category: this.category,
        severity: 'medium',
        title: `Net reduction of ${netTestDeletion} lines in test files`,
        description: `Modified test files show a net reduction of ${netTestDeletion} lines across ${modifiedTests.length} files. This may indicate reduced test coverage.`,
        explanation: 'While refactoring tests is normal, a large net reduction in test code volume may indicate that test coverage is being eroded.',
        impact: 'Potentially reduced test coverage and confidence in code correctness.',
        recommendation: 'Review modified test files to ensure test coverage is maintained. Run coverage reports to compare before and after.',
        aiPrompt: {
          short: 'Review net test line reduction',
          detailed: `${modifiedTests.length} test files modified with net -${netTestDeletion} lines. Verify coverage is maintained.`,
          steps: [
            'Compare test coverage metrics before and after',
            'Review each modified test file for removed assertions',
            'Ensure any removed tests are replaced or no longer needed',
          ],
        },
        ruleId: 'release-risk-test-reduction',
        tags: ['release-risk', 'testing', 'coverage-regression'],
        effort: 'moderate',
      });
    }
  }

  private analyzeRiskyPatterns(files: string[], diffStats: DiffStat[], findings: AuditFinding[]): void {
    for (const pattern of RISK_PATTERNS) {
      const matchingFiles = files.filter(f => pattern.filePatterns.some(p => p.test(f)));

      if (matchingFiles.length > 0) {
        const matchingStats = diffStats.filter(d => matchingFiles.includes(d.file));
        const totalChanges = matchingStats.reduce((sum, d) => sum + d.additions + d.deletions, 0);

        findings.push({
          id: `${pattern.ruleId}-${matchingFiles.length}`,
          tool: this.name,
          category: this.category,
          severity: pattern.severity,
          title: `${pattern.name}: ${matchingFiles.length} file(s) modified`,
          description: `${pattern.description}. Files: ${matchingFiles.slice(0, 5).join(', ')}${matchingFiles.length > 5 ? ` and ${matchingFiles.length - 5} more` : ''}`,
          explanation: `${pattern.description}. These changes affect ${matchingFiles.length} files with ${totalChanges} total line changes. Changes to these files typically carry higher risk and should receive focused review.`,
          impact: `Changes to ${pattern.name.toLowerCase()} code require extra scrutiny to prevent security regressions, data loss, or service disruptions.`,
          recommendation: `Ensure all ${matchingFiles.length} changed files in this category receive thorough peer review. Consider additional testing or security review.`,
          aiPrompt: {
            short: `Review ${matchingFiles.length} ${pattern.name.toLowerCase()} changes`,
            detailed: `${matchingFiles.length} files matching "${pattern.name}" were changed:\n${matchingFiles.join('\n')}\n\nTotal changes: ${totalChanges} lines. Perform a focused security review.`,
            steps: [
              `Review all ${matchingFiles.length} changed files for correctness`,
              'Check for security implications',
              'Verify test coverage for changed behavior',
              'Request peer review from domain expert if needed',
            ],
          },
          ruleId: pattern.ruleId,
          tags: ['release-risk', ...pattern.tags],
          effort: totalChanges > 200 ? 'hard' : 'moderate',
        });
      }
    }
  }

  private analyzeSingleAuthor(commits: CommitInfo[], findings: AuditFinding[]): void {
    if (commits.length < 5) return;

    const authors = new Set(commits.map(c => c.author));
    if (authors.size === 1) {
      const author = [...authors][0];
      findings.push({
        id: 'release-risk-single-author',
        tool: this.name,
        category: this.category,
        severity: 'medium',
        title: `All ${commits.length} commits from single author`,
        description: `All ${commits.length} commits in this release are from ${author}. Single-author releases miss the benefits of diverse perspectives and peer review.`,
        explanation: 'Releases authored entirely by one person lack the natural review that comes from collaborative development. This increases the risk of blind spots, bugs, and knowledge silos.',
        impact: 'Higher risk of undetected bugs. Knowledge concentrated in one person creates a bus factor of 1.',
        recommendation: 'Ensure at least one thorough peer review before release. Consider pair programming for critical changes.',
        aiPrompt: {
          short: 'Single-author release needs peer review',
          detailed: `All ${commits.length} commits are from ${author}. Ensure thorough peer review before release.`,
          steps: [
            'Request peer review from at least one other team member',
            'Focus review on business logic and security-sensitive code',
            'Document key decisions for knowledge sharing',
          ],
        },
        ruleId: 'release-risk-single-author',
        tags: ['release-risk', 'review', 'bus-factor'],
        effort: 'moderate',
      });
    }
  }

  private analyzeLargeFileChanges(diffStats: DiffStat[], findings: AuditFinding[]): void {
    const largeChanges = diffStats.filter(d => (d.additions + d.deletions) > 300);

    for (const change of largeChanges.slice(0, 5)) {
      findings.push({
        id: `release-risk-large-file-${change.file.replace(/[^a-z0-9]/gi, '-')}`,
        tool: this.name,
        category: this.category,
        severity: 'low',
        title: `Large change in ${change.file}: +${change.additions}/-${change.deletions}`,
        description: `File ${change.file} has ${change.additions + change.deletions} line changes. Files with extensive modifications are harder to review correctly.`,
        explanation: 'Individual files with large diffs are more likely to contain subtle bugs. Reviewers tend to lose attention and miss issues in very large diffs.',
        impact: 'Increased risk of missed bugs in review. Consider focused review of this file.',
        file: change.file,
        recommendation: `Focus review attention on ${change.file}. Consider breaking this change into smaller commits for easier review.`,
        aiPrompt: {
          short: `Focused review: ${change.file}`,
          detailed: `${change.file} changed by +${change.additions}/-${change.deletions} lines. Review carefully for correctness.`,
          steps: [
            'Review the full diff for this file',
            'Check for logical errors and edge cases',
            'Verify test coverage for changed behavior',
          ],
        },
        ruleId: 'release-risk-large-file-change',
        tags: ['release-risk', 'large-diff', 'review-focus'],
        effort: change.additions + change.deletions > 500 ? 'hard' : 'moderate',
      });
    }
  }

  private createSummaryFinding(
    diffStats: DiffStat[],
    commits: CommitInfo[],
    compareRef: string,
    totalAdditions: number,
    totalDeletions: number
  ): AuditFinding {
    const authors = [...new Set(commits.map(c => c.author))];

    return {
      id: 'release-risk-summary',
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `Release analysis: ${diffStats.length} files, ${commits.length} commits`,
      description: `Analyzed changes since ${compareRef}: ${diffStats.length} files modified across ${commits.length} commits by ${authors.length} author(s).`,
      explanation: `Release Risk Summary:\n- Comparison: ${compareRef}...HEAD\n- Files changed: ${diffStats.length}\n- Lines added: +${totalAdditions}\n- Lines deleted: -${totalDeletions}\n- Commits: ${commits.length}\n- Authors: ${authors.join(', ') || 'N/A'}`,
      impact: 'Informational overview of release scope and risk factors.',
      recommendation: 'Review flagged risk areas before proceeding with the release.',
      aiPrompt: {
        short: 'Release risk assessment summary',
        detailed: `Release scope: ${diffStats.length} files, +${totalAdditions}/-${totalDeletions} lines, ${commits.length} commits, ${authors.length} authors.`,
        steps: [
          'Address all high-severity risk findings',
          'Ensure adequate test coverage',
          'Verify rollback plan is in place',
          'Communicate release scope to stakeholders',
        ],
      },
      ruleId: 'release-risk-summary',
      tags: ['release-risk', 'summary'],
      effort: 'trivial',
    };
  }

  private createResult(
    findings: AuditFinding[],
    duration: number,
    metadata: Record<string, unknown>
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
        passed: findings.filter(f => f.severity === 'info').length,
        failed: findings.filter(f => f.severity !== 'info').length,
      },
      metadata,
    };
  }

  private createErrorResult(error: string, duration: number): AuditResult {
    return {
      tool: this.name,
      category: this.category,
      success: false,
      duration,
      findings: [],
      summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
      error,
    };
  }
}
