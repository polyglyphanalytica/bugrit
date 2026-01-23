'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function GitHubIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">GitHub Integration</h1>
        <p className="text-lg text-muted-foreground">
          Connect your GitHub repositories for automatic scans on every push.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'PR Check Action',
            description: 'Block PRs with security issues',
            prompt: `Read the Bugrit docs:
- GitHub Integration: https://bugrit.com/docs/integrations/github
- Scans API: https://bugrit.com/docs/api-reference/scans

Create a GitHub Action that scans PRs before merge:

1. Trigger on: pull_request to main branch
2. POST to /api/v1/scans with the PR branch
3. Poll until scan completes
4. Add PR comment with scan summary
5. FAIL if critical issues found

Use secrets.BUGRIT_API_KEY for auth.`
          },
          {
            label: 'Auto-Scan on Push',
            description: 'Scan every push to main',
            prompt: `Read the Bugrit GitHub Integration docs at https://bugrit.com/docs/integrations/github

Set up automatic scanning on every push to main:

1. Create GitHub Action triggered on push to main
2. POST to /api/v1/scans with sourceType: "github"
3. Wait for scan completion (poll every 10s)
4. If critical issues found, create a GitHub issue
5. Send Slack notification with results

Use secrets.BUGRIT_API_KEY. My stack: [YOUR_STACK]`
          },
          {
            label: 'Manual via API',
            description: 'Trigger scans programmatically',
            prompt: `Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Add a "Scan Repository" button to my app:

1. On click, POST to /api/v1/scans with:
   - sourceType: "github"
   - repoUrl: the GitHub repo URL
   - branch: selected branch
2. Show progress while scanning
3. Display results when complete

My stack: [YOUR_STACK]`
          },
        ]}
      />

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Your code lives on GitHub. Connect once and every PR gets checked automatically.
          Security issues appear right where you review code.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>PR comments:</strong> Findings appear as comments on the exact lines with issues</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Branch protection:</strong> Block merges to main when critical issues are found</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Private repos:</strong> Securely connect private repositories</span>
          </li>
        </ul>
      </div>

      {/* Quick Setup - Collapsed by default */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Manual Setup (3 steps)
        </summary>
        <div className="p-4 bg-muted/30 space-y-4">
          <div className="p-4 border rounded-lg bg-background">
            <h4 className="font-semibold mb-2">1. Install the GitHub App</h4>
            <p className="text-muted-foreground">
              Go to{' '}
              <a href="/settings/integrations" className="text-primary hover:underline">
                Settings → Integrations
              </a>{' '}
              and click &quot;Connect GitHub&quot;.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-background">
            <h4 className="font-semibold mb-2">2. Select Repositories</h4>
            <p className="text-muted-foreground">
              Choose which repositories the app can access.
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-background">
            <h4 className="font-semibold mb-2">3. Link to Application</h4>
            <p className="text-muted-foreground">
              In your application settings, select the GitHub repository to link.
            </p>
          </div>
        </div>
      </details>

      {/* Technical Reference - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Technical Reference
        </summary>
        <div className="p-4 bg-muted/30 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Automatic Scan Triggers</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Trigger</th>
                  <th className="text-left py-2 px-2">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-2"><code>push</code></td>
                  <td className="py-2 px-2 text-muted-foreground">Scan on every push to specified branches</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2"><code>pull_request</code></td>
                  <td className="py-2 px-2 text-muted-foreground">Scan when PRs are opened or updated</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2"><code>release</code></td>
                  <td className="py-2 px-2 text-muted-foreground">Scan when a new release is published</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><code>schedule</code></td>
                  <td className="py-2 px-2 text-muted-foreground">Run scans on a schedule (daily, weekly)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-semibold mb-3">API Example</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "branch": "feature/new-feature"
  }'`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Permissions Required</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Permission</th>
                  <th className="text-left py-2 px-2">Access</th>
                  <th className="text-left py-2 px-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-2">Contents</td>
                  <td className="py-2 px-2">Read</td>
                  <td className="py-2 px-2 text-muted-foreground">Clone repository for scanning</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2">Pull requests</td>
                  <td className="py-2 px-2">Write</td>
                  <td className="py-2 px-2 text-muted-foreground">Post comments on PRs</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2">Checks</td>
                  <td className="py-2 px-2">Write</td>
                  <td className="py-2 px-2 text-muted-foreground">Create check runs</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">Statuses</td>
                  <td className="py-2 px-2">Write</td>
                  <td className="py-2 px-2 text-muted-foreground">Set commit status</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
