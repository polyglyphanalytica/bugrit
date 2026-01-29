import Link from 'next/link';
import { VibePromptTabs } from '@/components/docs/vibe-prompt';

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

      {/* VIBE CODING PROMPTS - FIRST */}
      <VibePromptTabs
        prompts={[
          {
            label: 'GitHub Actions',
            description: 'Scan on every push and PR (most common)',
            prompt: `Help me set up automated Bugrit scanning in my GitHub repository.

I want a GitHub Actions workflow that:
1. Triggers on push to main and develop branches
2. Triggers on pull requests to main
3. Scans my code with Bugrit's 150 security modules (5,000+ scans)
4. Fails the build if critical vulnerabilities are found
5. Posts results as a PR comment

Create .github/workflows/bugrit.yml with:
- API call to POST https://bugrit.com/api/v1/scans
- Polling loop to wait for completion
- Check for critical issues and fail if found
- Use secrets: BUGRIT_API_KEY, BUGRIT_PROJECT_ID

My repository: [MY_GITHUB_REPO_URL]

Please create the complete workflow file.`,
          },
          {
            label: 'GitLab CI',
            description: 'Scan in GitLab pipelines',
            prompt: `Help me set up automated Bugrit scanning in my GitLab repository.

I want a GitLab CI job that:
1. Triggers on merge requests
2. Triggers on pushes to main branch
3. Scans my code with Bugrit
4. Fails if critical vulnerabilities found

Create .gitlab-ci.yml with:
- Stage: security-scan
- API call to https://bugrit.com/api/v1/scans
- Wait for completion
- Check results and fail on critical issues
- Use CI variables: BUGRIT_API_KEY, BUGRIT_PROJECT_ID

My repository: [MY_GITLAB_REPO_URL]

Please create the complete GitLab CI configuration.`,
          },
          {
            label: 'Scheduled Scans',
            description: 'Nightly or weekly security audits',
            prompt: `Help me set up scheduled Bugrit scans for my repository.

I want:
1. Nightly security scan at 2 AM UTC
2. Full deep scan (all 150 modules, 5,000+ scans)
3. Email notification if critical issues found
4. Can also be triggered manually

Create a GitHub Actions workflow with:
- cron: '0 2 * * *' (daily at 2 AM)
- workflow_dispatch for manual runs
- Full scan configuration with depth: "thorough"
- Notification step on critical issues

My repository: [MY_GITHUB_REPO_URL]

Please create the scheduled workflow.`,
          },
          {
            label: 'Pre-Push Hook',
            description: 'Scan before pushing locally',
            prompt: `Help me set up a git pre-push hook that scans my code with Bugrit before pushing.

I want:
1. Quick scan of changed files only
2. Block push if critical issues found
3. Show clear output of what was found
4. Complete within 30 seconds for fast feedback

Create:
1. .git/hooks/pre-push script (or husky config)
2. Script that zips changed files
3. Calls Bugrit API for quick scan
4. Parses results and blocks on critical

My Bugrit API key is in BUGRIT_API_KEY env var.

Please create the pre-push hook script.`,
          },
          {
            label: 'API Automation',
            description: 'Create automation rules via API',
            prompt: `Help me create Bugrit automation rules via the API.

I want to set up:
1. Automation that triggers on GitHub push to main
2. Runs full security scan
3. Fails on critical issues
4. Posts results to Slack

Use the Bugrit Automations API:
POST https://bugrit.com/api/v1/automations

Create an automation with:
- trigger: github_push to main branch
- action: full scan with all modules
- failOn: critical
- notification: Slack webhook

My details:
- Project ID: [MY_PROJECT_ID]
- GitHub repo: [MY_GITHUB_REPO]
- Slack webhook: [MY_SLACK_WEBHOOK]

Please create the API call to set this up.`,
          },
        ]}
      />

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

      {/* Technical Details - Collapsed */}
      <details className="group">
        <summary className="cursor-pointer text-lg font-semibold flex items-center gap-2 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          View Technical Details & Code Examples
        </summary>

        <div className="mt-4 space-y-8 pl-4 border-l-2 border-muted">
          {/* GitHub Actions */}
          <section>
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

      - name: Wait for Scan
        run: |
          SCAN_ID=\${{ steps.scan.outputs.scan_id }}
          for i in {1..60}; do
            STATUS=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
              "https://bugrit.com/api/v1/scans/$SCAN_ID" | jq -r '.status')
            [ "$STATUS" = "completed" ] && break
            [ "$STATUS" = "failed" ] && exit 1
            sleep 10
          done

      - name: Check for Critical Issues
        run: |
          SCAN_ID=\${{ steps.scan.outputs.scan_id }}
          CRITICAL=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            "https://bugrit.com/api/v1/scans/$SCAN_ID" | jq -r '.summary.critical // 0')
          [ "$CRITICAL" -gt 0 ] && exit 1 || exit 0`}</pre>
            </div>
          </section>

          {/* GitLab CI */}
          <section>
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span>🦊</span> GitLab CI
            </h3>
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
          "sourceType": "gitlab",
          "repoUrl": "'$CI_PROJECT_URL'",
          "branch": "'$CI_COMMIT_REF_NAME'"
        }')
      SCAN_ID=$(echo $RESPONSE | jq -r '.id')
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
          </section>

          {/* Scheduled Scans */}
          <section>
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span>⏰</span> Scheduled Scans
            </h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`# Nightly security scan
name: Nightly Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Every day at 2 AM UTC
  workflow_dispatch:     # Manual trigger

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
              "sourceType": "github",
              "repoUrl": "https://github.com/\${{ github.repository }}",
              "branch": "main",
              "scanConfig": { "tools": "all", "depth": "thorough" }
            }'`}</pre>
            </div>
          </section>

          {/* Automations API */}
          <section>
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span>🔌</span> Automations API
            </h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`# Create an automation rule
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
  }'`}</pre>
            </div>
          </section>

          {/* Trigger Types Table */}
          <section>
            <h3 className="text-xl font-semibold mb-3">Trigger Types</h3>
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
                    <td className="py-3 px-2">Code pushed to branches</td>
                    <td className="py-3 px-2">Continuous scanning</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2"><code className="px-1 bg-muted rounded">github_pr</code></td>
                    <td className="py-3 px-2">PR opened or updated</td>
                    <td className="py-3 px-2">PR checks</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2"><code className="px-1 bg-muted rounded">schedule</code></td>
                    <td className="py-3 px-2">Cron schedule</td>
                    <td className="py-3 px-2">Nightly audits</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-2"><code className="px-1 bg-muted rounded">webhook</code></td>
                    <td className="py-3 px-2">HTTP call</td>
                    <td className="py-3 px-2">Custom integrations</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2"><code className="px-1 bg-muted rounded">docker_push</code></td>
                    <td className="py-3 px-2">Image pushed</td>
                    <td className="py-3 px-2">Container security</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </details>

      {/* Best Practices */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">1. Start Simple</h4>
            <p className="text-sm text-muted-foreground">
              Begin with push-to-main scanning. Expand to PRs once you trust the workflow.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">2. Use Quality Gates</h4>
            <p className="text-sm text-muted-foreground">
              Fail builds on critical issues. Start strict, loosen if needed.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">3. Layer Your Scans</h4>
            <p className="text-sm text-muted-foreground">
              Quick scans on PRs, thorough scans nightly. Balance speed and coverage.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">4. Monitor Credits</h4>
            <p className="text-sm text-muted-foreground">
              Set up <Link href="/settings/subscription" className="text-primary hover:underline">usage alerts</Link> to avoid surprises.
            </p>
          </div>
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
          <Link href="/docs/api-reference/automations" className="p-4 border rounded-lg hover:border-primary transition-colors">
            <h4 className="font-semibold mb-1">Automations API</h4>
            <p className="text-sm text-muted-foreground">Full API reference for automation rules</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
