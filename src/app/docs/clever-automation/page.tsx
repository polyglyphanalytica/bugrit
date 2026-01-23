import Link from 'next/link';

export default function CleverAutomationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Clever Automation</h1>
        <p className="text-lg text-muted-foreground">
          Set it and forget it. Automatically trigger tests and scans whenever you push code,
          merge a PR, or on a schedule. Ship faster without skipping security.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Vibe coding is fast. Security scanning shouldn&apos;t slow you down. The best security
          is the kind you don&apos;t have to remember to do—automation means every commit gets
          scanned, every deploy gets tested, every merge gets the full treatment.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Zero friction:</strong> Scans trigger automatically—no manual steps, no forgotten checks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Catch issues early:</strong> Find vulnerabilities before they reach production, not after</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Quality gates:</strong> Block deploys when critical issues are found—automated guard rails</span>
          </li>
        </ul>
      </div>

      {/* Quick Start Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-5 border rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
          <div className="text-2xl mb-2">🔧</div>
          <h3 className="font-bold mb-2">Configure in Dashboard</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Set up automations visually in your settings. Connect repos, define triggers, done.
          </p>
          <Link href="/settings/automations" className="text-sm text-primary hover:underline">
            Go to Automations Settings →
          </Link>
        </div>
        <div className="p-5 border rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
          <div className="text-2xl mb-2">📡</div>
          <h3 className="font-bold mb-2">Use the API</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Programmatically create and manage automations via our REST API.
          </p>
          <Link href="/docs/api-reference/automations" className="text-sm text-primary hover:underline">
            View API Reference →
          </Link>
        </div>
      </div>

      {/* Automation Methods */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Automation Methods</h2>
        <p className="text-muted-foreground mb-6">
          Multiple ways to trigger scans automatically. Pick what fits your workflow.
        </p>

        {/* GitHub Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>🐙</span> GitHub Actions
          </h3>
          <p className="text-muted-foreground mb-4">
            The most common approach. Add a workflow file and every push triggers a scan.
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`# .github/workflows/bugrit.yml
name: Bugrit Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger Bugrit Scan
        id: scan
        run: |
          RESPONSE=$(curl -s -X POST https://bugrit.com/api/v1/scans \\
            -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "projectId": "\${{ secrets.BUGRIT_PROJECT_ID }}",
              "platform": "web",
              "sourceType": "github",
              "repoUrl": "https://github.com/\${{ github.repository }}",
              "branch": "\${{ github.ref_name }}",
              "commitSha": "\${{ github.sha }}"
            }')

          SCAN_ID=$(echo $RESPONSE | jq -r '.id')
          echo "scan_id=$SCAN_ID" >> $GITHUB_OUTPUT
          echo "Scan started: $SCAN_ID"

      - name: Wait for Scan
        run: |
          SCAN_ID=\${{ steps.scan.outputs.scan_id }}
          echo "Waiting for scan $SCAN_ID..."

          for i in {1..60}; do
            STATUS=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
              "https://bugrit.com/api/v1/scans/$SCAN_ID" | jq -r '.status')

            echo "Status: $STATUS"

            if [ "$STATUS" = "completed" ]; then
              echo "Scan completed!"
              break
            elif [ "$STATUS" = "failed" ]; then
              echo "Scan failed"
              exit 1
            fi

            sleep 10
          done

      - name: Check for Critical Issues
        run: |
          SCAN_ID=\${{ steps.scan.outputs.scan_id }}
          RESULT=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            "https://bugrit.com/api/v1/scans/$SCAN_ID")

          CRITICAL=$(echo $RESULT | jq -r '.summary.critical // 0')
          HIGH=$(echo $RESULT | jq -r '.summary.high // 0')

          echo "Critical: $CRITICAL, High: $HIGH"

          if [ "$CRITICAL" -gt 0 ]; then
            echo "::error::Found $CRITICAL critical vulnerabilities"
            exit 1
          fi`}</pre>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Add <code className="px-1 bg-muted rounded">BUGRIT_API_KEY</code> and <code className="px-1 bg-muted rounded">BUGRIT_PROJECT_ID</code> to your repository secrets.
          </p>
        </div>

        {/* GitLab CI */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>🦊</span> GitLab CI
          </h3>
          <p className="text-muted-foreground mb-4">
            Same concept, GitLab flavor.
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`# .gitlab-ci.yml
bugrit-scan:
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq
  script:
    - |
      RESPONSE=$(curl -s -X POST https://bugrit.com/api/v1/scans \\
        -H "Authorization: Bearer $BUGRIT_API_KEY" \\
        -H "Content-Type: application/json" \\
        -d '{
          "projectId": "'$BUGRIT_PROJECT_ID'",
          "platform": "web",
          "sourceType": "gitlab",
          "repoUrl": "'$CI_PROJECT_URL'",
          "branch": "'$CI_COMMIT_REF_NAME'",
          "commitSha": "'$CI_COMMIT_SHA'"
        }')

      SCAN_ID=$(echo $RESPONSE | jq -r '.id')

      # Wait for completion
      while true; do
        STATUS=$(curl -s -H "Authorization: Bearer $BUGRIT_API_KEY" \\
          "https://bugrit.com/api/v1/scans/$SCAN_ID" | jq -r '.status')

        [ "$STATUS" = "completed" ] && break
        [ "$STATUS" = "failed" ] && exit 1
        sleep 10
      done
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"`}</pre>
          </div>
        </div>

        {/* Git Hooks */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>🪝</span> Git Hooks (Pre-push)
          </h3>
          <p className="text-muted-foreground mb-4">
            Scan before you push. Catch issues before they leave your machine.
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`#!/bin/bash
# .git/hooks/pre-push (or use husky)

# Quick local scan before pushing
echo "Running Bugrit pre-push scan..."

# Create a zip of changed files
git diff --name-only HEAD~1 | zip -@ /tmp/changes.zip 2>/dev/null

# Trigger scan
RESPONSE=$(curl -s -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer $BUGRIT_API_KEY" \\
  -F "projectId=$BUGRIT_PROJECT_ID" \\
  -F "platform=web" \\
  -F "sourceType=upload" \\
  -F "file=@/tmp/changes.zip")

SCAN_ID=$(echo $RESPONSE | jq -r '.id')

# Wait and check
for i in {1..30}; do
  STATUS=$(curl -s -H "Authorization: Bearer $BUGRIT_API_KEY" \\
    "https://bugrit.com/api/v1/scans/$SCAN_ID" | jq -r '.status')

  [ "$STATUS" = "completed" ] && break
  [ "$STATUS" = "failed" ] && echo "Scan failed" && exit 1
  sleep 5
done

CRITICAL=$(curl -s -H "Authorization: Bearer $BUGRIT_API_KEY" \\
  "https://bugrit.com/api/v1/scans/$SCAN_ID" | jq -r '.summary.critical // 0')

if [ "$CRITICAL" -gt 0 ]; then
  echo "BLOCKED: $CRITICAL critical issues found. Fix before pushing."
  exit 1
fi

echo "Scan passed! Pushing..."
rm /tmp/changes.zip`}</pre>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Make it executable: <code className="px-1 bg-muted rounded">chmod +x .git/hooks/pre-push</code>.
            Or use <a href="https://typicode.github.io/husky/" className="text-primary hover:underline" target="_blank">Husky</a> for team-wide hooks.
          </p>
        </div>

        {/* Webhooks */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>📡</span> Webhooks (Push to Scan)
          </h3>
          <p className="text-muted-foreground mb-4">
            Configure GitHub/GitLab webhooks to trigger scans on any repo event.
            Set this up in your <Link href="/settings/automations" className="text-primary hover:underline">Automations Settings</Link>.
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`# Your webhook endpoint (we provide this)
POST https://bugrit.com/api/webhooks/github/{your-project-id}

# GitHub sends push events to this URL
# We automatically:
# 1. Verify the webhook signature
# 2. Clone the repo at that commit
# 3. Run a full scan
# 4. Post results back to the PR (if enabled)`}</pre>
          </div>
        </div>

        {/* Scheduled Scans */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>⏰</span> Scheduled Scans (Cron)
          </h3>
          <p className="text-muted-foreground mb-4">
            Run scans on a schedule. Great for nightly security audits or weekly dependency checks.
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`# GitHub Actions with schedule
name: Nightly Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Every day at 2 AM UTC
  workflow_dispatch:     # Also allow manual runs

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Full Scan
        run: |
          curl -X POST https://bugrit.com/api/v1/scans \\
            -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "projectId": "\${{ secrets.BUGRIT_PROJECT_ID }}",
              "platform": "web",
              "sourceType": "github",
              "repoUrl": "https://github.com/\${{ github.repository }}",
              "branch": "main",
              "scanConfig": {
                "tools": "all",
                "depth": "thorough"
              }
            }'`}</pre>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            You can also configure scheduled scans directly in <Link href="/settings/automations" className="text-primary hover:underline">Automations Settings</Link>.
          </p>
        </div>

        {/* Slack/Discord Bot */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>💬</span> Slack & Discord Commands
          </h3>
          <p className="text-muted-foreground mb-4">
            Trigger scans from chat. Perfect for on-demand checks during code review discussions.
          </p>
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="font-mono text-sm mb-2">/bugrit scan https://github.com/yourorg/repo</p>
            <p className="text-sm text-muted-foreground">
              Install our <a href="/integrations/slack" className="text-primary hover:underline">Slack app</a> or <a href="/integrations/discord" className="text-primary hover:underline">Discord bot</a> to enable slash commands.
            </p>
          </div>
        </div>

        {/* VS Code / IDE */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>💻</span> IDE Integration
          </h3>
          <p className="text-muted-foreground mb-4">
            Scan from your editor. Right-click to scan a file, folder, or entire project.
          </p>
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">
              Install the Bugrit extension for VS Code, JetBrains IDEs, or Neovim.
            </p>
            <div className="flex gap-2 flex-wrap">
              <a href="https://marketplace.visualstudio.com/items?itemName=bugrit.bugrit-vscode" className="px-3 py-1.5 bg-background rounded border text-sm hover:border-primary transition-colors">
                VS Code
              </a>
              <a href="https://plugins.jetbrains.com/plugin/bugrit" className="px-3 py-1.5 bg-background rounded border text-sm hover:border-primary transition-colors">
                JetBrains
              </a>
              <span className="px-3 py-1.5 bg-background rounded border text-sm text-muted-foreground">
                Neovim (coming soon)
              </span>
            </div>
          </div>
        </div>

        {/* API Direct */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <span>🔌</span> Direct API Integration
          </h3>
          <p className="text-muted-foreground mb-4">
            Build your own automation. Our API supports any workflow you can imagine.
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`# Trigger a scan from anywhere
curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "proj-abc123",
    "platform": "web",
    "sourceType": "url",
    "targetUrl": "https://staging.your-app.com"
  }'

# Or upload code directly
curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "projectId=proj-abc123" \\
  -F "platform=web" \\
  -F "sourceType=upload" \\
  -F "file=@./my-code.zip"`}</pre>
          </div>
        </div>
      </section>

      {/* Automation API */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Automations API</h2>
        <p className="text-muted-foreground mb-4">
          Create and manage automations programmatically. Each automation defines a trigger and
          what happens when it fires.
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
          <pre className="text-sm">{`# Create an automation
curl -X POST https://bugrit.com/api/v1/automations \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Scan on push to main",
    "projectId": "proj-abc123",
    "trigger": {
      "type": "github_push",
      "config": {
        "branches": ["main", "develop"],
        "repository": "yourorg/yourrepo"
      }
    },
    "action": {
      "type": "scan",
      "config": {
        "platform": "web",
        "tools": "all",
        "failOn": "critical"
      }
    },
    "enabled": true
  }'

# List automations
curl https://bugrit.com/api/v1/automations \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Delete an automation
curl -X DELETE https://bugrit.com/api/v1/automations/auto-xyz789 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
        </div>
        <p className="text-sm text-muted-foreground">
          See the full <Link href="/docs/api-reference/automations" className="text-primary hover:underline">Automations API Reference</Link> for all trigger types and options.
        </p>
      </section>

      {/* Trigger Types */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Trigger Types</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Trigger</th>
                <th className="text-left py-3 px-2 font-semibold">When it Fires</th>
                <th className="text-left py-3 px-2 font-semibold">Best For</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-3 px-2"><code className="px-1 bg-muted rounded">github_push</code></td>
                <td className="py-3 px-2">Code pushed to specified branches</td>
                <td className="py-3 px-2">Continuous scanning on every commit</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2"><code className="px-1 bg-muted rounded">github_pr</code></td>
                <td className="py-3 px-2">Pull request opened or updated</td>
                <td className="py-3 px-2">PR checks and blocking merges</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2"><code className="px-1 bg-muted rounded">gitlab_push</code></td>
                <td className="py-3 px-2">Code pushed to GitLab repo</td>
                <td className="py-3 px-2">GitLab users</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2"><code className="px-1 bg-muted rounded">gitlab_mr</code></td>
                <td className="py-3 px-2">Merge request opened or updated</td>
                <td className="py-3 px-2">GitLab MR checks</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2"><code className="px-1 bg-muted rounded">schedule</code></td>
                <td className="py-3 px-2">On a cron schedule</td>
                <td className="py-3 px-2">Nightly/weekly audits</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2"><code className="px-1 bg-muted rounded">webhook</code></td>
                <td className="py-3 px-2">When webhook URL is called</td>
                <td className="py-3 px-2">Custom integrations</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2"><code className="px-1 bg-muted rounded">docker_push</code></td>
                <td className="py-3 px-2">New image pushed to registry</td>
                <td className="py-3 px-2">Container security</td>
              </tr>
              <tr>
                <td className="py-3 px-2"><code className="px-1 bg-muted rounded">npm_publish</code></td>
                <td className="py-3 px-2">Package published to npm</td>
                <td className="py-3 px-2">Library authors</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Best Practices */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>1.</span> Start with push-to-main
            </h4>
            <p className="text-sm text-muted-foreground">
              Begin by automating scans on your main branch. Once you trust the workflow, expand to PRs and other branches.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>2.</span> Use quality gates
            </h4>
            <p className="text-sm text-muted-foreground">
              Configure automations to fail builds on critical issues. Start strict and loosen if needed.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>3.</span> Combine triggers
            </h4>
            <p className="text-sm text-muted-foreground">
              Use quick scans on PRs (fast feedback) and thorough scans on a nightly schedule (comprehensive coverage).
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>4.</span> Monitor your credits
            </h4>
            <p className="text-sm text-muted-foreground">
              Automations consume credits. Set up <Link href="/settings/subscription" className="text-primary hover:underline">usage alerts</Link> to avoid surprises.
            </p>
          </div>
        </div>
      </section>

      {/* AI Prompt */}
      <section>
        <h2 className="text-2xl font-bold mb-4">AI Coding Assistant Prompt</h2>
        <p className="text-muted-foreground mb-4">
          Copy this prompt to have your AI assistant set up automation for you:
        </p>
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">{`I need to set up automated security scanning with Bugrit. Please help me:

1. Create a GitHub Actions workflow file (.github/workflows/bugrit.yml) that:
   - Triggers on push to main and develop branches
   - Triggers on pull requests to main
   - Calls the Bugrit API to start a scan
   - Waits for the scan to complete
   - Fails the build if critical vulnerabilities are found
   - Uses secrets BUGRIT_API_KEY and BUGRIT_PROJECT_ID

2. The workflow should use these API endpoints:
   - POST https://bugrit.com/api/v1/scans (start scan)
   - GET https://bugrit.com/api/v1/scans/{scanId} (check status)

Make sure the workflow handles errors gracefully and provides clear output about scan progress.`}</pre>
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/settings/automations" className="p-4 border rounded-lg hover:border-primary transition-colors">
            <h4 className="font-semibold mb-1">Configure Automations</h4>
            <p className="text-sm text-muted-foreground">Set up automations in your dashboard</p>
          </Link>
          <Link href="/docs/integrations/ci-cd" className="p-4 border rounded-lg hover:border-primary transition-colors">
            <h4 className="font-semibold mb-1">CI/CD Deep Dive</h4>
            <p className="text-sm text-muted-foreground">More examples for Jenkins, CircleCI, and others</p>
          </Link>
          <Link href="/docs/integrations/github" className="p-4 border rounded-lg hover:border-primary transition-colors">
            <h4 className="font-semibold mb-1">GitHub App</h4>
            <p className="text-sm text-muted-foreground">One-click PR scanning with our GitHub App</p>
          </Link>
          <Link href="/docs/api-reference/scans" className="p-4 border rounded-lg hover:border-primary transition-colors">
            <h4 className="font-semibold mb-1">Scans API</h4>
            <p className="text-sm text-muted-foreground">Full API reference for triggering scans</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
