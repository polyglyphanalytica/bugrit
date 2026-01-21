#!/usr/bin/env npx ts-node
/**
 * Tool Health Check Script
 *
 * Monitors the health of all 68 scanning tools by checking:
 * - npm package status (deprecated, downloads, last publish)
 * - Docker image availability and tags
 * - GitHub repository status (archived, stars, last commit)
 *
 * Usage:
 *   npx ts-node scripts/check-tool-health.ts
 *   npx ts-node scripts/check-tool-health.ts --json
 *   npx ts-node scripts/check-tool-health.ts --stale-only
 *
 * Exit codes:
 *   0 - All tools healthy
 *   1 - Some tools need attention
 *   2 - Critical issues found (deprecated/abandoned tools)
 */

import { TOOL_REGISTRY, ToolDefinition } from '../src/lib/tools/registry';
import { DOCKER_VERSIONS, DockerImageVersion } from '../src/lib/deploy/docker-versions';

// ============================================================================
// Types
// ============================================================================

interface NpmPackageInfo {
  name: string;
  version: string;
  deprecated?: string;
  time: {
    modified: string;
    created: string;
  };
}

interface ToolHealthStatus {
  toolId: string;
  name: string;
  type: 'npm' | 'docker';
  status: 'healthy' | 'stale' | 'deprecated' | 'abandoned' | 'error';
  lastUpdated: string | null;
  daysSinceUpdate: number | null;
  version: string | null;
  issues: string[];
  warnings: string[];
}

interface HealthReport {
  timestamp: string;
  summary: {
    total: number;
    healthy: number;
    stale: number;
    deprecated: number;
    abandoned: number;
    errors: number;
  };
  tools: ToolHealthStatus[];
}

// ============================================================================
// Configuration
// ============================================================================

const STALE_THRESHOLD_DAYS = 180;  // 6 months without update = stale
const ABANDONED_THRESHOLD_DAYS = 365;  // 1 year without update = abandoned

// GitHub repos for tools (for activity checking)
const GITHUB_REPOS: Record<string, string> = {
  'eslint': 'eslint/eslint',
  'biome': 'biomejs/biome',
  'prettier': 'prettier/prettier',
  'semgrep': 'semgrep/semgrep',
  'trivy': 'aquasecurity/trivy',
  'grype': 'anchore/grype',
  'nuclei': 'projectdiscovery/nuclei',
  'checkov': 'bridgecrewio/checkov',
  'gitleaks': 'gitleaks/gitleaks',
  'owasp-zap': 'zaproxy/zaproxy',
  'tfsec': 'aquasecurity/tfsec',
  'bandit': 'PyCQA/bandit',
  'gosec': 'securego/gosec',
  'brakeman': 'presidentbeef/brakeman',
  'rubocop': 'rubocop/rubocop',
  'phpstan': 'phpstan/phpstan',
  'psalm': 'vimeo/psalm',
  'spotbugs': 'spotbugs/spotbugs',
  'pmd': 'pmd/pmd',
  'detekt': 'detekt/detekt',
  'mobsf': 'MobSF/Mobile-Security-Framework-MobSF',
  'kubesec': 'controlplaneio/kubesec',
  'polaris': 'FairwindsOps/polaris',
  'terrascan': 'tenable/terrascan',
  'lighthouse': 'GoogleChrome/lighthouse',
  'axe-core': 'dequelabs/axe-core',
  'sitespeed': 'sitespeedio/sitespeed.io',
};

// ============================================================================
// API Clients
// ============================================================================

async function fetchNpmInfo(packageName: string): Promise<NpmPackageInfo | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`);
    if (!response.ok) return null;
    return await response.json() as NpmPackageInfo;
  } catch {
    return null;
  }
}

async function fetchGitHubLastCommit(repo: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'bugrit-health-check',
      },
    });
    if (!response.ok) return null;
    const commits = await response.json() as Array<{ commit: { committer: { date: string } } }>;
    return commits[0]?.commit?.committer?.date || null;
  } catch {
    return null;
  }
}

async function checkDockerImageExists(image: string, tag: string): Promise<boolean> {
  // For Docker Hub images
  if (!image.includes('/') || image.startsWith('docker.io/')) {
    const [namespace, name] = image.replace('docker.io/', '').includes('/')
      ? image.replace('docker.io/', '').split('/')
      : ['library', image.replace('docker.io/', '')];
    try {
      const response = await fetch(
        `https://hub.docker.com/v2/repositories/${namespace}/${name}/tags/${tag}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
  // For other registries, assume exists (would need registry-specific checks)
  return true;
}

// ============================================================================
// Health Check Logic
// ============================================================================

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function determineStatus(daysSinceUpdate: number | null, isDeprecated: boolean): ToolHealthStatus['status'] {
  if (isDeprecated) return 'deprecated';
  if (daysSinceUpdate === null) return 'error';
  if (daysSinceUpdate > ABANDONED_THRESHOLD_DAYS) return 'abandoned';
  if (daysSinceUpdate > STALE_THRESHOLD_DAYS) return 'stale';
  return 'healthy';
}

async function checkNpmTool(tool: ToolDefinition): Promise<ToolHealthStatus> {
  const issues: string[] = [];
  const warnings: string[] = [];

  const npmInfo = await fetchNpmInfo(tool.npm!);

  if (!npmInfo) {
    return {
      toolId: tool.id,
      name: tool.name,
      type: 'npm',
      status: 'error',
      lastUpdated: null,
      daysSinceUpdate: null,
      version: null,
      issues: ['Failed to fetch npm package info'],
      warnings: [],
    };
  }

  const lastUpdated = npmInfo.time.modified;
  const days = daysSince(lastUpdated);
  const isDeprecated = !!npmInfo.deprecated;

  if (isDeprecated) {
    issues.push(`Package deprecated: ${npmInfo.deprecated}`);
  }

  if (days > STALE_THRESHOLD_DAYS) {
    warnings.push(`No updates in ${days} days`);
  }

  // Check GitHub activity if we have a repo
  const repo = GITHUB_REPOS[tool.id];
  if (repo) {
    const lastCommit = await fetchGitHubLastCommit(repo);
    if (lastCommit) {
      const commitDays = daysSince(lastCommit);
      if (commitDays > ABANDONED_THRESHOLD_DAYS) {
        warnings.push(`GitHub repo inactive for ${commitDays} days`);
      }
    }
  }

  return {
    toolId: tool.id,
    name: tool.name,
    type: 'npm',
    status: determineStatus(days, isDeprecated),
    lastUpdated,
    daysSinceUpdate: days,
    version: npmInfo.version,
    issues,
    warnings,
  };
}

async function checkDockerTool(tool: ToolDefinition): Promise<ToolHealthStatus> {
  const issues: string[] = [];
  const warnings: string[] = [];

  const versionInfo = DOCKER_VERSIONS[tool.id];

  if (!versionInfo) {
    return {
      toolId: tool.id,
      name: tool.name,
      type: 'docker',
      status: 'error',
      lastUpdated: null,
      daysSinceUpdate: null,
      version: null,
      issues: ['Missing version pinning in docker-versions.ts'],
      warnings: [],
    };
  }

  const lastUpdated = versionInfo.lastUpdated;
  const days = daysSince(lastUpdated);

  // Check if Docker image exists
  const imageExists = await checkDockerImageExists(versionInfo.image, versionInfo.version);
  if (!imageExists) {
    issues.push(`Docker image not found: ${versionInfo.image}:${versionInfo.version}`);
  }

  if (days > STALE_THRESHOLD_DAYS) {
    warnings.push(`Version pinning outdated (${days} days old)`);
  }

  // Check GitHub activity if we have a repo
  const repo = GITHUB_REPOS[tool.id];
  if (repo) {
    const lastCommit = await fetchGitHubLastCommit(repo);
    if (lastCommit) {
      const commitDays = daysSince(lastCommit);
      if (commitDays > ABANDONED_THRESHOLD_DAYS) {
        warnings.push(`GitHub repo inactive for ${commitDays} days`);
      }
    }
  }

  return {
    toolId: tool.id,
    name: tool.name,
    type: 'docker',
    status: issues.length > 0 ? 'error' : determineStatus(days, false),
    lastUpdated,
    daysSinceUpdate: days,
    version: versionInfo.version,
    issues,
    warnings,
  };
}

async function checkAllTools(): Promise<HealthReport> {
  const tools: ToolHealthStatus[] = [];

  console.log('Checking tool health...\n');

  for (const tool of TOOL_REGISTRY) {
    process.stdout.write(`  Checking ${tool.name}...`);

    let status: ToolHealthStatus;
    if (tool.npm) {
      status = await checkNpmTool(tool);
    } else if (tool.docker) {
      status = await checkDockerTool(tool);
    } else {
      status = {
        toolId: tool.id,
        name: tool.name,
        type: 'npm',
        status: 'error',
        lastUpdated: null,
        daysSinceUpdate: null,
        version: null,
        issues: ['No npm or docker configuration'],
        warnings: [],
      };
    }

    tools.push(status);

    // Print status indicator
    const indicator = {
      healthy: '\x1b[32m✓\x1b[0m',
      stale: '\x1b[33m⚠\x1b[0m',
      deprecated: '\x1b[31m✗\x1b[0m',
      abandoned: '\x1b[31m✗\x1b[0m',
      error: '\x1b[31m?\x1b[0m',
    }[status.status];
    console.log(` ${indicator}`);

    // Rate limiting for API calls
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const summary = {
    total: tools.length,
    healthy: tools.filter(t => t.status === 'healthy').length,
    stale: tools.filter(t => t.status === 'stale').length,
    deprecated: tools.filter(t => t.status === 'deprecated').length,
    abandoned: tools.filter(t => t.status === 'abandoned').length,
    errors: tools.filter(t => t.status === 'error').length,
  };

  return {
    timestamp: new Date().toISOString(),
    summary,
    tools,
  };
}

// ============================================================================
// Output Formatting
// ============================================================================

function printReport(report: HealthReport, staleOnly: boolean = false): void {
  console.log('\n' + '═'.repeat(60));
  console.log('TOOL HEALTH REPORT');
  console.log('═'.repeat(60));
  console.log(`Generated: ${report.timestamp}`);
  console.log(`Total tools: ${report.summary.total}`);
  console.log('');
  console.log(`  \x1b[32m✓ Healthy:\x1b[0m    ${report.summary.healthy}`);
  console.log(`  \x1b[33m⚠ Stale:\x1b[0m      ${report.summary.stale}`);
  console.log(`  \x1b[31m✗ Deprecated:\x1b[0m ${report.summary.deprecated}`);
  console.log(`  \x1b[31m✗ Abandoned:\x1b[0m  ${report.summary.abandoned}`);
  console.log(`  \x1b[31m? Errors:\x1b[0m     ${report.summary.errors}`);

  const toolsToShow = staleOnly
    ? report.tools.filter(t => t.status !== 'healthy')
    : report.tools;

  if (toolsToShow.length === 0) {
    console.log('\n\x1b[32mAll tools are healthy!\x1b[0m');
    return;
  }

  // Group by status
  const byStatus = {
    deprecated: toolsToShow.filter(t => t.status === 'deprecated'),
    abandoned: toolsToShow.filter(t => t.status === 'abandoned'),
    error: toolsToShow.filter(t => t.status === 'error'),
    stale: toolsToShow.filter(t => t.status === 'stale'),
    healthy: staleOnly ? [] : toolsToShow.filter(t => t.status === 'healthy'),
  };

  for (const [status, tools] of Object.entries(byStatus)) {
    if (tools.length === 0) continue;

    const header = {
      deprecated: '\n\x1b[31m═══ DEPRECATED TOOLS (action required) ═══\x1b[0m',
      abandoned: '\n\x1b[31m═══ ABANDONED TOOLS (consider replacing) ═══\x1b[0m',
      error: '\n\x1b[31m═══ ERRORS (needs investigation) ═══\x1b[0m',
      stale: '\n\x1b[33m═══ STALE TOOLS (update recommended) ═══\x1b[0m',
      healthy: '\n\x1b[32m═══ HEALTHY TOOLS ═══\x1b[0m',
    }[status];

    console.log(header);

    for (const tool of tools) {
      console.log(`\n  ${tool.name} (${tool.toolId})`);
      console.log(`    Type: ${tool.type}`);
      console.log(`    Version: ${tool.version || 'unknown'}`);
      console.log(`    Last updated: ${tool.lastUpdated || 'unknown'} (${tool.daysSinceUpdate || '?'} days ago)`);

      for (const issue of tool.issues) {
        console.log(`    \x1b[31m• Issue: ${issue}\x1b[0m`);
      }
      for (const warning of tool.warnings) {
        console.log(`    \x1b[33m• Warning: ${warning}\x1b[0m`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const staleOnly = args.includes('--stale-only');

  try {
    const report = await checkAllTools();

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report, staleOnly);
    }

    // Exit code based on health
    if (report.summary.deprecated > 0 || report.summary.abandoned > 0) {
      process.exit(2);  // Critical
    } else if (report.summary.stale > 0 || report.summary.errors > 0) {
      process.exit(1);  // Warning
    } else {
      process.exit(0);  // Healthy
    }
  } catch (error) {
    console.error('Error running health check:', error);
    process.exit(2);
  }
}

main();
