'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function CICDIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">CI/CD Integration</h1>
        <p className="text-lg text-muted-foreground">
          Automatically scan your code on every push, PR, or release.
        </p>
      </div>

      {/* NEW: Incremental Scanning Default */}
      <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>⚡</span> Smart Default: Incremental Scanning
        </h2>
        <p className="text-muted-foreground mb-4">
          By default, Bugrit scans <strong>only changed files</strong> in your PR or commit. This means:
        </p>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-background/80 rounded-lg">
            <strong className="text-green-600 dark:text-green-400">1-2 credits</strong>
            <p className="text-sm text-muted-foreground">per PR instead of 10-20</p>
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong className="text-green-600 dark:text-green-400">&lt;30 seconds</strong>
            <p className="text-sm text-muted-foreground">scan time for most PRs</p>
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong className="text-green-600 dark:text-green-400">No noise</strong>
            <p className="text-sm text-muted-foreground">only issues you introduced</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Need a full repo scan? Add <code className="bg-muted px-1 rounded">scanMode: &quot;full&quot;</code> to your request.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'PR Scan (Default)',
            description: 'Scan only changed files - fast and cheap',
            prompt: `Read the Bugrit CI/CD docs at https://bugrit.com/docs/integrations/ci-cd

Create a GitHub Action that scans ONLY CHANGED FILES on every PR:

1. Trigger on: pull_request to main
2. Get list of changed files: git diff --name-only origin/main...HEAD
3. Count lines in changed files only
4. POST to /api/v1/scans with:
   - scanMode: "incremental" (default, can omit)
   - changedFiles: array of changed file paths
   - estimatedLines: line count of changed files only
5. Poll until scan completes
6. Add PR comment with scan summary
7. FAIL if critical issues found

This uses ~1-2 credits per PR instead of 10-20 for full scan.
Use secrets.BUGRIT_API_KEY and secrets.BUGRIT_APP_ID.`
          },
          {
            label: 'Full Scan (Override)',
            description: 'Scan entire repo - for releases or scheduled audits',
            prompt: `Read the Bugrit CI/CD docs at https://bugrit.com/docs/integrations/ci-cd

Create a GitHub Action that runs a FULL REPO SCAN on releases:

1. Trigger on: push to main OR release published
2. POST to /api/v1/scans with:
   - scanMode: "full" (override incremental default)
   - sourceType: "github"
   - repoUrl: from github.repository
3. Poll until scan completes
4. Generate full security report
5. FAIL release if critical > 0 or high > 5

Use this for weekly audits or release gates.
Use secrets.BUGRIT_API_KEY and secrets.BUGRIT_APP_ID.`
          },
          {
            label: 'GitLab CI',
            description: 'Incremental scan in GitLab pipeline',
            prompt: `Read the Bugrit CI/CD docs at https://bugrit.com/docs/integrations/ci-cd

Create a GitLab CI job that scans ONLY CHANGED FILES:

1. Add job to .gitlab-ci.yml
2. Get changed files: git diff --name-only $CI_MERGE_REQUEST_DIFF_BASE_SHA
3. POST to /api/v1/scans with changedFiles array
4. Poll until scan completes
5. Block merge if critical issues found

Default is incremental. Add scanMode: "full" for complete scan.
Use CI variables: BUGRIT_API_KEY, BUGRIT_APP_ID.`
          },
          {
            label: 'Quality Gate',
            description: 'Block bad deploys',
            prompt: `Read the Bugrit CI/CD docs at https://bugrit.com/docs/integrations/ci-cd

Add a quality gate to my pipeline:

1. After Bugrit scan completes
2. Check summary.critical and summary.high
3. FAIL if critical > 0
4. FAIL if high > 5
5. Print summary of findings

Works with both incremental (default) and full scans.
My CI: [GitHub Actions / GitLab CI / CircleCI / Jenkins]`
          },
        ]}
      />

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why Incremental by Default?
        </h2>
        <p className="text-muted-foreground mb-4">
          Full repo scans on every PR are wasteful. You don&apos;t need to re-scan 50,000 lines when you only changed 200.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Save credits:</strong> 1-2 credits per PR vs 10-20 for full scan</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Faster feedback:</strong> Results in 30 seconds, not 2-5 minutes</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Less noise:</strong> Only see issues YOU introduced, not legacy debt</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Full scans when needed:</strong> Use <code className="bg-muted px-1 rounded">scanMode: &quot;full&quot;</code> for releases</span>
          </li>
        </ul>
      </div>

      {/* Scan Mode Reference */}
      <div className="p-4 bg-muted/50 rounded-xl">
        <h3 className="font-semibold mb-3">Scan Modes</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Mode</th>
              <th className="text-left py-2 px-2">When to Use</th>
              <th className="text-left py-2 px-2">Credits</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>incremental</code> (default)</td>
              <td className="py-2 px-2 text-muted-foreground">Every PR, every commit</td>
              <td className="py-2 px-2 text-muted-foreground">1-2 credits</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>full</code></td>
              <td className="py-2 px-2 text-muted-foreground">Releases, weekly audits, new repos</td>
              <td className="py-2 px-2 text-muted-foreground">10-20 credits</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Secrets Setup */}
      <div className="p-4 bg-muted/50 rounded-xl">
        <h3 className="font-semibold mb-3">Required Secrets</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><code className="bg-muted px-1 py-0.5 rounded">BUGRIT_API_KEY</code> - From Settings → API Keys</li>
          <li><code className="bg-muted px-1 py-0.5 rounded">BUGRIT_APP_ID</code> - From your application dashboard</li>
        </ul>
      </div>

      {/* Technical Reference - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Configuration Examples
        </summary>
        <div className="p-4 bg-muted/30 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">GitHub Actions - Incremental (Recommended)</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`# .github/workflows/bugrit-pr.yml
name: Bugrit PR Scan

on:
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for diff

      - name: Get changed files
        id: changed
        run: |
          CHANGED=$(git diff --name-only origin/\${{ github.base_ref }}...HEAD | grep -E '\\.(ts|tsx|js|jsx|py|go|rs|java)$' || true)
          echo "files<<EOF" >> \$GITHUB_OUTPUT
          echo "\$CHANGED" >> \$GITHUB_OUTPUT
          echo "EOF" >> \$GITHUB_OUTPUT

          if [ -n "\$CHANGED" ]; then
            LINES=$(echo "\$CHANGED" | xargs wc -l 2>/dev/null | tail -1 | awk '{print \$1}')
          else
            LINES=0
          fi
          echo "lines=\$LINES" >> \$GITHUB_OUTPUT

      - name: Trigger Incremental Scan
        if: steps.changed.outputs.lines > 0
        run: |
          # Convert newline-separated files to JSON array
          FILES_JSON=$(echo '\${{ steps.changed.outputs.files }}' | jq -R -s -c 'split("\\n") | map(select(length > 0))')

          curl -X POST https://bugrit.com/api/v1/scans \\
            -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "applicationId": "'\${{ secrets.BUGRIT_APP_ID }}'",
              "sourceType": "github",
              "repoUrl": "https://github.com/'\${{ github.repository }}'",
              "branch": "'\${{ github.head_ref }}'",
              "scanMode": "incremental",
              "changedFiles": '\$FILES_JSON',
              "estimatedLines": '\${{ steps.changed.outputs.lines }}'
            }' | tee response.json

          echo "SCAN_ID=$(jq -r '.scan.id' response.json)" >> \$GITHUB_ENV

      - name: Wait and Check
        if: steps.changed.outputs.lines > 0
        run: |
          while true; do
            RESULT=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
              "https://bugrit.com/api/v1/scans/\$SCAN_ID")
            STATUS=$(echo \$RESULT | jq -r '.scan.status')
            [ "\$STATUS" = "completed" ] && break
            [ "\$STATUS" = "failed" ] && exit 1
            sleep 5
          done

          CRITICAL=$(echo \$RESULT | jq -r '.scan.summary.critical')
          [ "\$CRITICAL" -gt 0 ] && exit 1 || exit 0`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">GitHub Actions - Full Scan (For Releases)</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`# .github/workflows/bugrit-release.yml
name: Bugrit Release Scan

on:
  release:
    types: [published]
  schedule:
    - cron: '0 0 * * 0'  # Weekly full audit

jobs:
  full-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger Full Scan
        run: |
          curl -X POST https://bugrit.com/api/v1/scans \\
            -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "applicationId": "'\${{ secrets.BUGRIT_APP_ID }}'",
              "sourceType": "github",
              "repoUrl": "https://github.com/'\${{ github.repository }}'",
              "branch": "main",
              "scanMode": "full"
            }' | tee response.json`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">API Request Body</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Field</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-2"><code>scanMode</code></td>
                  <td className="py-2 px-2">string</td>
                  <td className="py-2 px-2 text-muted-foreground">&quot;incremental&quot; (default) or &quot;full&quot;</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2"><code>changedFiles</code></td>
                  <td className="py-2 px-2">string[]</td>
                  <td className="py-2 px-2 text-muted-foreground">Array of file paths (for incremental)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2"><code>estimatedLines</code></td>
                  <td className="py-2 px-2">number</td>
                  <td className="py-2 px-2 text-muted-foreground">Lines in changed files (for billing)</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><code>baseBranch</code></td>
                  <td className="py-2 px-2">string</td>
                  <td className="py-2 px-2 text-muted-foreground">Branch to diff against (default: main)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
