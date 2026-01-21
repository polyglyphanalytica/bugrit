/**
 * CI/CD Integration Module
 *
 * Generates CI/CD configurations for GitHub Actions, GitLab CI, and other platforms
 * to integrate Bugrit scans into development workflows.
 */

import { ToolCategory } from '../integrations/types';

export type CICDPlatform = 'github-actions' | 'gitlab-ci' | 'azure-pipelines' | 'circleci' | 'jenkins';

export interface CICDConfig {
  /** Bugrit API endpoint */
  apiEndpoint: string;
  /** Project ID in Bugrit */
  projectId: string;
  /** Categories of tools to run */
  categories?: ToolCategory[];
  /** Specific tools to run */
  tools?: string[];
  /** Fail the build on findings of this severity or higher */
  failOn?: 'critical' | 'high' | 'medium' | 'low' | 'none';
  /** Branch patterns to scan */
  branches?: string[];
  /** Run on pull requests */
  onPullRequest?: boolean;
  /** Run on push to specified branches */
  onPush?: boolean;
  /** Schedule (cron format) */
  schedule?: string;
  /** Upload SARIF to GitHub Security tab */
  uploadSarif?: boolean;
  /** Post comments on PRs */
  commentOnPR?: boolean;
  /** Environment variables to set */
  envVars?: Record<string, string>;
}

const DEFAULT_CONFIG: Partial<CICDConfig> = {
  failOn: 'high',
  branches: ['main', 'master', 'develop'],
  onPullRequest: true,
  onPush: true,
  uploadSarif: true,
  commentOnPR: true,
  categories: ['security', 'code-quality'],
};

/**
 * Generate GitHub Actions workflow YAML
 */
export function generateGitHubActions(config: CICDConfig): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const onBlock = buildGitHubOnBlock(cfg);
  const toolsArg = cfg.tools?.length
    ? `--tools "${cfg.tools.join(',')}"`
    : cfg.categories?.length
      ? `--categories "${cfg.categories.join(',')}"`
      : '';

  return `# Bugrit Security & Quality Scan
# Auto-generated configuration - customize as needed

name: Bugrit Scan

${onBlock}

permissions:
  contents: read
  security-events: write
  pull-requests: write

jobs:
  bugrit-scan:
    name: Run Bugrit Analysis
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Bugrit Scan
        id: scan
        env:
          BUGRIT_API_KEY: \${{ secrets.BUGRIT_API_KEY }}
          BUGRIT_PROJECT_ID: "${cfg.projectId}"
        run: |
          npx @bugrit/cli scan \\
            --api-endpoint "${cfg.apiEndpoint}" \\
            --project "\$BUGRIT_PROJECT_ID" \\
            ${toolsArg} \\
            --fail-on "${cfg.failOn}" \\
            --output-format sarif \\
            --output-file results.sarif \\
            --output-format json \\
            --output-file results.json

      - name: Upload SARIF to GitHub Security
        if: always()${cfg.uploadSarif ? '' : ' && false'}
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
          category: bugrit

      - name: Comment on PR
        if: github.event_name == 'pull_request'${cfg.commentOnPR ? '' : ' && false'}
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('results.json', 'utf8'));

            const summary = results.summary;
            const criticals = summary.bySeverity.critical || 0;
            const highs = summary.bySeverity.high || 0;
            const mediums = summary.bySeverity.medium || 0;
            const lows = summary.bySeverity.low || 0;

            let status = '✅';
            if (criticals > 0 || highs > 0) status = '❌';
            else if (mediums > 0) status = '⚠️';

            const body = \`## Bugrit Scan Results \${status}

            | Severity | Count |
            |----------|-------|
            | 🔴 Critical | \${criticals} |
            | 🟠 High | \${highs} |
            | 🟡 Medium | \${mediums} |
            | 🔵 Low | \${lows} |

            **Total findings:** \${summary.totalFindings}
            **Tools run:** \${summary.toolsRun.join(', ')}

            [View full report](\${results.reportUrl || '#'})
            \`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });

      - name: Check failure threshold
        if: always()
        run: |
          node -e "
            const results = require('./results.json');
            const severity = '${cfg.failOn}';
            const thresholds = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
            const level = thresholds[severity] || 0;

            let shouldFail = false;
            if (level >= 4 && results.summary.bySeverity.critical > 0) shouldFail = true;
            if (level >= 3 && results.summary.bySeverity.high > 0) shouldFail = true;
            if (level >= 2 && results.summary.bySeverity.medium > 0) shouldFail = true;
            if (level >= 1 && results.summary.bySeverity.low > 0) shouldFail = true;

            if (shouldFail) {
              console.error('Build failed due to findings at or above ${cfg.failOn} severity');
              process.exit(1);
            }
            console.log('All findings are below threshold');
          "
`;
}

function buildGitHubOnBlock(cfg: Partial<CICDConfig>): string {
  const triggers: string[] = [];

  if (cfg.onPush && cfg.branches?.length) {
    triggers.push(`  push:
    branches:
${cfg.branches.map(b => `      - ${b}`).join('\n')}`);
  }

  if (cfg.onPullRequest) {
    triggers.push(`  pull_request:
    types: [opened, synchronize, reopened]`);
  }

  if (cfg.schedule) {
    triggers.push(`  schedule:
    - cron: '${cfg.schedule}'`);
  }

  triggers.push(`  workflow_dispatch:`);

  return `on:\n${triggers.join('\n\n')}`;
}

/**
 * Generate GitLab CI YAML
 */
export function generateGitLabCI(config: CICDConfig): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const toolsArg = cfg.tools?.length
    ? `--tools "${cfg.tools.join(',')}"`
    : cfg.categories?.length
      ? `--categories "${cfg.categories.join(',')}"`
      : '';

  const rules = buildGitLabRules(cfg);

  return `# Bugrit Security & Quality Scan
# Auto-generated configuration - customize as needed

stages:
  - scan

variables:
  BUGRIT_PROJECT_ID: "${cfg.projectId}"

bugrit-scan:
  stage: scan
  image: node:20-alpine
${rules}
  before_script:
    - npm install -g @bugrit/cli
  script:
    - |
      bugrit scan \\
        --api-endpoint "${cfg.apiEndpoint}" \\
        --project "$BUGRIT_PROJECT_ID" \\
        ${toolsArg} \\
        --fail-on "${cfg.failOn}" \\
        --output-format gitlab-sast \\
        --output-file gl-sast-report.json \\
        --output-format json \\
        --output-file results.json
  artifacts:
    reports:
      sast: gl-sast-report.json
    paths:
      - results.json
    expire_in: 1 week
  allow_failure: false

# Optional: Add MR comment with results
bugrit-comment:
  stage: scan
  image: alpine:latest
  needs:
    - bugrit-scan
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
  before_script:
    - apk add --no-cache curl jq
  script:
    - |
      SUMMARY=$(cat results.json | jq -r '.summary')
      CRITICAL=$(echo $SUMMARY | jq -r '.bySeverity.critical // 0')
      HIGH=$(echo $SUMMARY | jq -r '.bySeverity.high // 0')
      MEDIUM=$(echo $SUMMARY | jq -r '.bySeverity.medium // 0')
      LOW=$(echo $SUMMARY | jq -r '.bySeverity.low // 0')

      curl --request POST \\
        --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \\
        --header "Content-Type: application/json" \\
        --data "{
          \\"body\\": \\"## Bugrit Scan Results\\n\\n| Severity | Count |\\n|----------|-------|\\n| Critical | $CRITICAL |\\n| High | $HIGH |\\n| Medium | $MEDIUM |\\n| Low | $LOW |\\"
        }" \\
        "$CI_API_V4_URL/projects/$CI_PROJECT_ID/merge_requests/$CI_MERGE_REQUEST_IID/notes"
  allow_failure: true
`;
}

function buildGitLabRules(cfg: Partial<CICDConfig>): string {
  const rules: string[] = [];

  if (cfg.onPush && cfg.branches?.length) {
    for (const branch of cfg.branches) {
      rules.push(`    - if: $CI_COMMIT_BRANCH == "${branch}"`);
    }
  }

  if (cfg.onPullRequest) {
    rules.push(`    - if: $CI_PIPELINE_SOURCE == "merge_request_event"`);
  }

  if (cfg.schedule) {
    rules.push(`    - if: $CI_PIPELINE_SOURCE == "schedule"`);
  }

  rules.push(`    - if: $CI_PIPELINE_SOURCE == "web"`);

  return rules.length ? `  rules:\n${rules.join('\n')}` : '';
}

/**
 * Generate Azure Pipelines YAML
 */
export function generateAzurePipelines(config: CICDConfig): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const toolsArg = cfg.tools?.length
    ? `--tools "${cfg.tools.join(',')}"`
    : cfg.categories?.length
      ? `--categories "${cfg.categories.join(',')}"`
      : '';

  return `# Bugrit Security & Quality Scan
# Auto-generated configuration - customize as needed

trigger:
  branches:
    include:
${cfg.branches?.map(b => `      - ${b}`).join('\n') || '      - main'}

pr:
  branches:
    include:
${cfg.branches?.map(b => `      - ${b}`).join('\n') || '      - main'}

pool:
  vmImage: 'ubuntu-latest'

variables:
  BUGRIT_PROJECT_ID: '${cfg.projectId}'

stages:
- stage: Scan
  displayName: 'Bugrit Security Scan'
  jobs:
  - job: BugritScan
    displayName: 'Run Bugrit Analysis'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '20.x'
      displayName: 'Install Node.js'

    - script: npm install -g @bugrit/cli
      displayName: 'Install Bugrit CLI'

    - script: |
        bugrit scan \\
          --api-endpoint "${cfg.apiEndpoint}" \\
          --project "$(BUGRIT_PROJECT_ID)" \\
          ${toolsArg} \\
          --fail-on "${cfg.failOn}" \\
          --output-format sarif \\
          --output-file $(Build.ArtifactStagingDirectory)/results.sarif \\
          --output-format json \\
          --output-file $(Build.ArtifactStagingDirectory)/results.json
      displayName: 'Run Bugrit Scan'
      env:
        BUGRIT_API_KEY: $(BUGRIT_API_KEY)

    - task: PublishBuildArtifacts@1
      inputs:
        pathtoPublish: '$(Build.ArtifactStagingDirectory)'
        artifactName: 'BugritResults'
      displayName: 'Publish Results'
`;
}

/**
 * Generate CircleCI config YAML
 */
export function generateCircleCI(config: CICDConfig): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const toolsArg = cfg.tools?.length
    ? `--tools "${cfg.tools.join(',')}"`
    : cfg.categories?.length
      ? `--categories "${cfg.categories.join(',')}"`
      : '';

  return `# Bugrit Security & Quality Scan
# Auto-generated configuration - customize as needed

version: 2.1

orbs:
  node: circleci/node@5.1

jobs:
  bugrit-scan:
    executor:
      name: node/default
      tag: '20.9'
    steps:
      - checkout
      - run:
          name: Install Bugrit CLI
          command: npm install -g @bugrit/cli
      - run:
          name: Run Bugrit Scan
          command: |
            bugrit scan \\
              --api-endpoint "${cfg.apiEndpoint}" \\
              --project "${cfg.projectId}" \\
              ${toolsArg} \\
              --fail-on "${cfg.failOn}" \\
              --output-format json \\
              --output-file results.json
      - store_artifacts:
          path: results.json
          destination: bugrit-results

workflows:
  security-scan:
    jobs:
      - bugrit-scan:
          filters:
            branches:
              only:
${cfg.branches?.map(b => `                - ${b}`).join('\n') || '                - main'}
`;
}

/**
 * Generate Jenkinsfile
 */
export function generateJenkinsfile(config: CICDConfig): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const toolsArg = cfg.tools?.length
    ? `--tools "${cfg.tools.join(',')}"`
    : cfg.categories?.length
      ? `--categories "${cfg.categories.join(',')}"`
      : '';

  return `// Bugrit Security & Quality Scan
// Auto-generated configuration - customize as needed

pipeline {
    agent any

    environment {
        BUGRIT_API_KEY = credentials('bugrit-api-key')
        BUGRIT_PROJECT_ID = '${cfg.projectId}'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup') {
            steps {
                sh 'npm install -g @bugrit/cli'
            }
        }

        stage('Bugrit Scan') {
            steps {
                sh """
                    bugrit scan \\\\
                        --api-endpoint "${cfg.apiEndpoint}" \\\\
                        --project "\${BUGRIT_PROJECT_ID}" \\\\
                        ${toolsArg} \\\\
                        --fail-on "${cfg.failOn}" \\\\
                        --output-format json \\\\
                        --output-file results.json
                """
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'results.json', fingerprint: true
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '.',
                reportFiles: 'results.json',
                reportName: 'Bugrit Report'
            ])
        }
        failure {
            echo 'Bugrit scan found security issues!'
        }
    }
}
`;
}

/**
 * Generate CI/CD configuration for any supported platform
 */
export function generateCICDConfig(platform: CICDPlatform, config: CICDConfig): string {
  switch (platform) {
    case 'github-actions':
      return generateGitHubActions(config);
    case 'gitlab-ci':
      return generateGitLabCI(config);
    case 'azure-pipelines':
      return generateAzurePipelines(config);
    case 'circleci':
      return generateCircleCI(config);
    case 'jenkins':
      return generateJenkinsfile(config);
    default:
      throw new Error(`Unsupported CI/CD platform: ${platform}`);
  }
}

/**
 * Get the default filename for each platform
 */
export function getCICDFilename(platform: CICDPlatform): string {
  switch (platform) {
    case 'github-actions':
      return '.github/workflows/bugrit.yml';
    case 'gitlab-ci':
      return '.gitlab-ci.yml';
    case 'azure-pipelines':
      return 'azure-pipelines.yml';
    case 'circleci':
      return '.circleci/config.yml';
    case 'jenkins':
      return 'Jenkinsfile';
    default:
      return 'bugrit-ci.yml';
  }
}

export const SUPPORTED_PLATFORMS: CICDPlatform[] = [
  'github-actions',
  'gitlab-ci',
  'azure-pipelines',
  'circleci',
  'jenkins',
];
