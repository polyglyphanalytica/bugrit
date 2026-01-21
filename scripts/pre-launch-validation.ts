#!/usr/bin/env npx ts-node
/**
 * Pre-Launch Validation Script
 *
 * Validates that the Bugrit platform is ready for production launch.
 * Checks code, configuration, integrations, and documentation.
 *
 * Usage:
 *   npx ts-node scripts/pre-launch-validation.ts
 *   npx ts-node scripts/pre-launch-validation.ts --json
 *   npx ts-node scripts/pre-launch-validation.ts --fix
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Warnings found (can still launch)
 *   2 - Critical issues found (must fix before launch)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';

interface CheckResult {
  name: string;
  category: string;
  status: CheckStatus;
  message: string;
  details?: string[];
  fixable?: boolean;
}

interface ValidationReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
    skipped: number;
  };
  checks: CheckResult[];
  readyToLaunch: boolean;
}

// ============================================================================
// Check Functions
// ============================================================================

const checks: Array<() => Promise<CheckResult>> = [];

function check(fn: () => Promise<CheckResult>) {
  checks.push(fn);
}

// --- Environment Checks ---

check(async () => {
  const envExample = path.join(process.cwd(), '.env.example');
  const envLocal = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envExample)) {
    return {
      name: 'Environment template exists',
      category: 'Configuration',
      status: 'fail',
      message: '.env.example file not found',
    };
  }

  if (!fs.existsSync(envLocal)) {
    return {
      name: 'Local environment configured',
      category: 'Configuration',
      status: 'warn',
      message: '.env.local not found - ensure production env vars are set in deployment',
    };
  }

  return {
    name: 'Environment files',
    category: 'Configuration',
    status: 'pass',
    message: 'Environment configuration present',
  };
});

check(async () => {
  const requiredVars = [
    'FIREBASE_SERVICE_ACCOUNT_KEY',
    'FIREBASE_PROJECT_ID',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_APP_URL',
    'ADMIN_ENCRYPTION_KEY',
    'GOOGLE_CLOUD_PROJECT',
  ];

  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8');
  const missing = requiredVars.filter(v => !envContent.includes(v));

  if (missing.length > 0) {
    return {
      name: 'Required env vars documented',
      category: 'Configuration',
      status: 'fail',
      message: `Missing required env vars in .env.example: ${missing.join(', ')}`,
      details: missing,
    };
  }

  return {
    name: 'Required env vars documented',
    category: 'Configuration',
    status: 'pass',
    message: 'All required environment variables documented',
  };
});

// --- Tool Registry Checks ---

check(async () => {
  const registryPath = path.join(process.cwd(), 'src/lib/tools/registry.ts');
  const apiTypesPath = path.join(process.cwd(), 'src/lib/api/types.ts');

  if (!fs.existsSync(registryPath) || !fs.existsSync(apiTypesPath)) {
    return {
      name: 'Tool registry files exist',
      category: 'Tools',
      status: 'fail',
      message: 'Tool registry or API types file not found',
    };
  }

  const registry = fs.readFileSync(registryPath, 'utf-8');
  const apiTypes = fs.readFileSync(apiTypesPath, 'utf-8');

  // Count tools in registry
  const registryMatches = registry.match(/id:\s*['"]([^'"]+)['"]/g) || [];
  const registryCount = registryMatches.length;

  // Count tools in AVAILABLE_TOOLS
  const apiToolsMatch = apiTypes.match(/AVAILABLE_TOOLS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  const apiToolsCount = apiToolsMatch
    ? (apiToolsMatch[1].match(/['"][^'"]+['"]/g) || []).length
    : 0;

  if (registryCount !== apiToolsCount) {
    return {
      name: 'Tool count consistency',
      category: 'Tools',
      status: 'fail',
      message: `Tool count mismatch: registry has ${registryCount}, API types has ${apiToolsCount}`,
      fixable: true,
    };
  }

  return {
    name: 'Tool count consistency',
    category: 'Tools',
    status: 'pass',
    message: `${registryCount} tools registered and exposed in API`,
  };
});

check(async () => {
  const versionsPath = path.join(process.cwd(), 'src/lib/deploy/docker-versions.ts');

  if (!fs.existsSync(versionsPath)) {
    return {
      name: 'Docker version pinning',
      category: 'Tools',
      status: 'fail',
      message: 'docker-versions.ts not found - Docker tools not pinned',
    };
  }

  const versions = fs.readFileSync(versionsPath, 'utf-8');
  const versionCount = (versions.match(/['"][a-z-]+['"]\s*:\s*\{/g) || []).length;

  // Check for any using :latest
  if (versions.includes("version: 'latest'")) {
    return {
      name: 'Docker version pinning',
      category: 'Tools',
      status: 'warn',
      message: 'Some Docker images still use :latest tag',
      fixable: true,
    };
  }

  return {
    name: 'Docker version pinning',
    category: 'Tools',
    status: 'pass',
    message: `${versionCount} Docker tools have pinned versions`,
  };
});

// --- Integration Checks ---

check(async () => {
  const cloudBuildPath = path.join(process.cwd(), 'src/lib/integrations/cloud-build/index.ts');

  if (!fs.existsSync(cloudBuildPath)) {
    return {
      name: 'Cloud Build integrations',
      category: 'Integrations',
      status: 'fail',
      message: 'Cloud Build integration file not found',
    };
  }

  const content = fs.readFileSync(cloudBuildPath, 'utf-8');

  // Count integration classes
  const classCount = (content.match(/class CloudBuild\w+Integration/g) || []).length;

  // Count exports in CLOUD_BUILD_INTEGRATIONS array
  const exportMatch = content.match(/CLOUD_BUILD_INTEGRATIONS[^=]*=\s*\[([\s\S]*?)\];/);
  const exportCount = exportMatch
    ? (exportMatch[1].match(/new CloudBuild\w+Integration\(\)/g) || []).length
    : 0;

  if (classCount !== exportCount) {
    return {
      name: 'Cloud Build integration exports',
      category: 'Integrations',
      status: 'warn',
      message: `${classCount} classes defined but only ${exportCount} exported`,
      fixable: true,
    };
  }

  return {
    name: 'Cloud Build integrations',
    category: 'Integrations',
    status: 'pass',
    message: `${exportCount} Cloud Build integrations configured`,
  };
});

// --- Documentation Checks ---

check(async () => {
  const requiredDocs = [
    'src/lib/tools/DEPLOYMENT_CHECKLIST.md',
    'src/lib/tools/MAINTENANCE.md',
  ];

  const missing = requiredDocs.filter(doc => !fs.existsSync(path.join(process.cwd(), doc)));

  if (missing.length > 0) {
    return {
      name: 'Required documentation',
      category: 'Documentation',
      status: 'fail',
      message: `Missing documentation: ${missing.join(', ')}`,
      details: missing,
    };
  }

  return {
    name: 'Required documentation',
    category: 'Documentation',
    status: 'pass',
    message: 'All required documentation present',
  };
});

check(async () => {
  const docsPage = path.join(process.cwd(), 'src/app/docs/page.tsx');

  if (!fs.existsSync(docsPage)) {
    return {
      name: 'Documentation page',
      category: 'Documentation',
      status: 'skip',
      message: 'Docs page not found, skipping tool count check',
    };
  }

  const content = fs.readFileSync(docsPage, 'utf-8');

  // Check if tool count is mentioned and matches
  const countMatch = content.match(/(\d+)\s*(?:tools?|scanning tools?)/i);
  if (countMatch) {
    const docCount = parseInt(countMatch[1], 10);
    if (docCount < 60) {
      return {
        name: 'Documentation accuracy',
        category: 'Documentation',
        status: 'warn',
        message: `Docs mention ${docCount} tools - may be outdated`,
        fixable: true,
      };
    }
  }

  return {
    name: 'Documentation accuracy',
    category: 'Documentation',
    status: 'pass',
    message: 'Tool count in documentation appears current',
  };
});

// --- Build Checks ---

check(async () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));

  if (!packageJson.scripts?.build) {
    return {
      name: 'Build script',
      category: 'Build',
      status: 'fail',
      message: 'No build script defined in package.json',
    };
  }

  return {
    name: 'Build script',
    category: 'Build',
    status: 'pass',
    message: 'Build script configured',
  };
});

check(async () => {
  const nextConfig = path.join(process.cwd(), 'next.config.js');
  const nextConfigMjs = path.join(process.cwd(), 'next.config.mjs');
  const nextConfigTs = path.join(process.cwd(), 'next.config.ts');

  if (!fs.existsSync(nextConfig) && !fs.existsSync(nextConfigMjs) && !fs.existsSync(nextConfigTs)) {
    return {
      name: 'Next.js configuration',
      category: 'Build',
      status: 'warn',
      message: 'No next.config found - using defaults',
    };
  }

  return {
    name: 'Next.js configuration',
    category: 'Build',
    status: 'pass',
    message: 'Next.js configuration present',
  };
});

// --- Security Checks ---

check(async () => {
  const gitignore = path.join(process.cwd(), '.gitignore');

  if (!fs.existsSync(gitignore)) {
    return {
      name: 'Gitignore',
      category: 'Security',
      status: 'fail',
      message: '.gitignore not found',
    };
  }

  const content = fs.readFileSync(gitignore, 'utf-8');
  const required = ['.env', '.env.local', 'node_modules'];
  const missing = required.filter(r => !content.includes(r));

  if (missing.length > 0) {
    return {
      name: 'Gitignore completeness',
      category: 'Security',
      status: 'fail',
      message: `.gitignore missing: ${missing.join(', ')}`,
      fixable: true,
    };
  }

  return {
    name: 'Gitignore',
    category: 'Security',
    status: 'pass',
    message: 'Sensitive files excluded from git',
  };
});

check(async () => {
  const envExample = fs.readFileSync(path.join(process.cwd(), '.env.example'), 'utf-8');

  // Check for placeholder secrets that look real
  const suspiciousPatterns = [
    /sk_live_[a-zA-Z0-9]{20,}/,
    /whsec_[a-zA-Z0-9]{20,}/,
    /-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(envExample)) {
      return {
        name: 'No secrets in example',
        category: 'Security',
        status: 'fail',
        message: 'Potential real secrets found in .env.example',
      };
    }
  }

  return {
    name: 'No secrets in example',
    category: 'Security',
    status: 'pass',
    message: '.env.example contains only placeholders',
  };
});

// --- CI/CD Checks ---

check(async () => {
  const renovate = path.join(process.cwd(), 'renovate.json');

  if (!fs.existsSync(renovate)) {
    return {
      name: 'Renovate configuration',
      category: 'CI/CD',
      status: 'warn',
      message: 'No renovate.json - automated dependency updates not configured',
      fixable: true,
    };
  }

  return {
    name: 'Renovate configuration',
    category: 'CI/CD',
    status: 'pass',
    message: 'Automated dependency updates configured',
  };
});

check(async () => {
  const healthWorkflow = path.join(process.cwd(), '.github/workflows/tool-health.yml');

  if (!fs.existsSync(healthWorkflow)) {
    return {
      name: 'Tool health workflow',
      category: 'CI/CD',
      status: 'warn',
      message: 'No tool health check workflow - add .github/workflows/tool-health.yml',
      fixable: true,
    };
  }

  return {
    name: 'Tool health workflow',
    category: 'CI/CD',
    status: 'pass',
    message: 'Automated tool health monitoring configured',
  };
});

// ============================================================================
// Runner
// ============================================================================

async function runValidation(): Promise<ValidationReport> {
  const results: CheckResult[] = [];

  console.log('Running pre-launch validation...\n');

  for (const checkFn of checks) {
    try {
      const result = await checkFn();
      results.push(result);

      const icon = {
        pass: '\x1b[32m✓\x1b[0m',
        warn: '\x1b[33m⚠\x1b[0m',
        fail: '\x1b[31m✗\x1b[0m',
        skip: '\x1b[90m○\x1b[0m',
      }[result.status];

      console.log(`  ${icon} ${result.name}`);
      if (result.status !== 'pass' && result.status !== 'skip') {
        console.log(`    ${result.message}`);
      }
    } catch (error) {
      results.push({
        name: 'Unknown check',
        category: 'Error',
        status: 'fail',
        message: `Check threw error: ${error}`,
      });
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    warnings: results.filter(r => r.status === 'warn').length,
    failed: results.filter(r => r.status === 'fail').length,
    skipped: results.filter(r => r.status === 'skip').length,
  };

  return {
    timestamp: new Date().toISOString(),
    summary,
    checks: results,
    readyToLaunch: summary.failed === 0,
  };
}

function printReport(report: ValidationReport): void {
  console.log('\n' + '═'.repeat(60));
  console.log('PRE-LAUNCH VALIDATION REPORT');
  console.log('═'.repeat(60));
  console.log(`Generated: ${report.timestamp}`);
  console.log('');
  console.log(`  \x1b[32m✓ Passed:\x1b[0m   ${report.summary.passed}`);
  console.log(`  \x1b[33m⚠ Warnings:\x1b[0m ${report.summary.warnings}`);
  console.log(`  \x1b[31m✗ Failed:\x1b[0m   ${report.summary.failed}`);
  console.log(`  \x1b[90m○ Skipped:\x1b[0m  ${report.summary.skipped}`);
  console.log('');

  if (report.readyToLaunch) {
    console.log('\x1b[32m✓ READY TO LAUNCH\x1b[0m');
    if (report.summary.warnings > 0) {
      console.log('  (with warnings - review recommended)');
    }
  } else {
    console.log('\x1b[31m✗ NOT READY TO LAUNCH\x1b[0m');
    console.log('  Fix failed checks before deploying to production.');
  }

  // List fixable issues
  const fixable = report.checks.filter(c => c.fixable && c.status !== 'pass');
  if (fixable.length > 0) {
    console.log('\n\x1b[33mFixable issues:\x1b[0m');
    for (const check of fixable) {
      console.log(`  - ${check.name}: ${check.message}`);
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

  try {
    const report = await runValidation();

    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report);
    }

    if (!report.readyToLaunch) {
      process.exit(2);
    } else if (report.summary.warnings > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running validation:', error);
    process.exit(2);
  }
}

main();
