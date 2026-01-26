# Tool Maintenance Guide

This document describes how to keep the 150 external scanning modules updated and protected from deprecated versions.

## Overview

| Type | Count | Update Method |
|------|-------|---------------|
| npm packages | 37 | Renovate/Dependabot |
| Docker images | 78 | Manual version pinning |

## Quick Commands

```bash
# Check health of all tools
npx ts-node scripts/check-tool-health.ts

# Show only stale/problematic tools
npx ts-node scripts/check-tool-health.ts --stale-only

# Output as JSON (for CI)
npx ts-node scripts/check-tool-health.ts --json

# List all pinned Docker versions
npx ts-node -e "
  import { listAllVersions } from './src/lib/deploy/docker-versions';
  console.table(listAllVersions());
"

# Find stale Docker tools (>90 days old)
npx ts-node -e "
  import { getStaleTools } from './src/lib/deploy/docker-versions';
  console.log(getStaleTools(90));
"
```

## Docker Version Pinning

### Why Pin Versions?

- **Reproducibility**: Same image in dev, staging, and production
- **Security**: Controlled rollout of security patches
- **Stability**: Prevent unexpected breaking changes
- **Auditability**: Know exactly what's running

### How to Update a Docker Tool

1. **Find the latest version:**
   ```bash
   # Check Docker Hub
   curl -s "https://hub.docker.com/v2/repositories/aquasec/trivy/tags?page_size=5" | jq '.results[].name'

   # Check GitHub releases
   gh release list --repo aquasecurity/trivy --limit 5
   ```

2. **Update the version in `docker-versions.ts`:**
   ```typescript
   'trivy': {
     image: 'aquasec/trivy',
     version: '0.50.0',  // Updated
     lastUpdated: '2024-02-01',  // Today's date
     releaseNotes: 'https://github.com/aquasecurity/trivy/releases/tag/v0.50.0',
   },
   ```

3. **Test locally:**
   ```bash
   docker pull aquasec/trivy:0.50.0
   docker run --rm aquasec/trivy:0.50.0 --version
   ```

4. **Run a test scan:**
   ```bash
   # Run the tool against a test repo
   npm run test:integration -- --tool=trivy
   ```

5. **Deploy to staging, then production**

### Version Pinning Best Practices

| Tool Category | Update Frequency | Breaking Change Risk |
|---------------|------------------|---------------------|
| Security scanners | Weekly | Medium |
| Linters | Monthly | Low |
| Language runtimes | Quarterly | High |
| Cloud/K8s tools | Monthly | Medium |

## npm Package Updates

### Automated Updates with Renovate

Create `.github/renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "schedule": ["before 6am on monday"],
  "packageRules": [
    {
      "matchPackagePatterns": ["eslint", "prettier", "stylelint"],
      "groupName": "linting tools",
      "automerge": true
    },
    {
      "matchPackagePatterns": ["secretlint", "semgrep"],
      "groupName": "security tools",
      "automerge": false,
      "labels": ["security"]
    },
    {
      "matchPackagePatterns": ["lighthouse", "axe-core", "pa11y"],
      "groupName": "quality tools",
      "automerge": true
    }
  ]
}
```

### Manual npm Updates

```bash
# Check for outdated packages
npm outdated

# Update a specific tool
npm update eslint

# Update all tools (careful!)
npm update
```

## Health Monitoring

### Health Check Statuses

| Status | Definition | Action |
|--------|------------|--------|
| `healthy` | Updated within 6 months | None |
| `stale` | No updates in 6-12 months | Consider updating |
| `deprecated` | npm deprecated flag | Find replacement |
| `abandoned` | No updates in 12+ months | Find replacement |
| `error` | Failed to check status | Investigate |

### CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/tool-health.yml
name: Tool Health Check

on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6am
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run health check
        run: npx ts-node scripts/check-tool-health.ts --json > health-report.json

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: tool-health-report
          path: health-report.json

      - name: Check for critical issues
        run: |
          DEPRECATED=$(jq '.summary.deprecated' health-report.json)
          ABANDONED=$(jq '.summary.abandoned' health-report.json)
          if [ "$DEPRECATED" -gt 0 ] || [ "$ABANDONED" -gt 0 ]; then
            echo "::error::Found deprecated or abandoned tools!"
            exit 1
          fi

      - name: Notify on issues
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Tool health check failed! Check the report."
            }
```

## Deprecation Response Plan

When a tool is deprecated:

1. **Assess impact:**
   - How many users rely on this tool?
   - Are findings from this tool critical?

2. **Find alternatives:**
   | Deprecated Tool | Potential Replacements |
   |-----------------|----------------------|
   | tfsec | trivy (includes IaC) |
   | (example) | (example) |

3. **Migration timeline:**
   - Week 1: Identify replacement, test
   - Week 2: Add replacement tool
   - Week 3: Deprecation notice to users
   - Week 4: Remove deprecated tool

4. **Update documentation:**
   - Remove from tool count
   - Update category sections
   - Add migration guide

## Emergency Procedures

### Critical Security Vulnerability in a Tool

1. **Disable the tool immediately:**
   ```typescript
   // In registry.ts, add:
   disabled: true,
   disabledReason: 'CVE-XXXX-YYYY - security vulnerability',
   ```

2. **Notify users** via webhook/email

3. **Patch or update** the tool version

4. **Re-enable** after verification

### Docker Image Removed from Registry

1. **Check for alternative registries:**
   - Docker Hub → GitHub Container Registry
   - Quay.io → Docker Hub

2. **Fork and self-host** if necessary:
   ```bash
   docker pull old-registry/tool:version
   docker tag old-registry/tool:version gcr.io/bugrit/tool:version
   docker push gcr.io/bugrit/tool:version
   ```

3. **Update `docker-versions.ts`** with new registry

## Quarterly Audit Checklist

- [ ] Run full health check
- [ ] Update all stale Docker versions
- [ ] Review npm audit results
- [ ] Check for new tool versions with breaking changes
- [ ] Update tool documentation
- [ ] Review credit costs (compute changes)
- [ ] Test all tools against sample repositories
- [ ] Update this maintenance guide

## Contacts

| Role | Responsibility |
|------|---------------|
| Security team | Critical tool vulnerabilities |
| Platform team | Docker/Cloud Build issues |
| Product team | Tool additions/removals |

## Revision History

| Date | Change |
|------|--------|
| 2026-01-23 | Added 15 more tools (Pyright, nbqa, eslint-plugin-vue, eslint-plugin-react, scalafmt, Scalafix, HLint, Buf, angular-eslint, ScanCode, Licensee, Cosign, Safety, sqlcheck, pgFormatter) - total now 115 |
| 2026-01-23 | Added 12 more tools (lockfile-lint, audit-ci, webhint, accessibility-checker, Clair, Falco, Slither, Error Prone, Credo, Steampipe, SonarScanner, Infer) |
| 2026-01-23 | Added 9 more tools (html-validate, textlint, npm-check-updates, yamllint, Bearer, Pylint, Dart Analyzer, ktlint, Prowler) |
| 2026-01-23 | Added 11 new tools (Oxlint, Ruff, Mypy, Hadolint, SQLFluff, GolangCI-Lint, TruffleHog, actionlint, KICS, cfn-lint, Vale) |
| 2026-01-21 | Initial maintenance guide |
