export default function GitHubIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">GitHub Integration</h1>
        <p className="text-lg text-muted-foreground">
          Connect your GitHub repositories for automatic scans on every push.
          Get scan results posted directly to pull requests.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Your code lives on GitHub. Instead of copying files or running separate scans, connect once and every PR gets checked automatically. Security issues appear right where you review code.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>PR comments:</strong> Findings appear as comments on the exact lines with issues—fix before merge</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Branch protection:</strong> Block merges to main when critical issues are found</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Private repos:</strong> Securely connect private repositories with GitHub App permissions</span>
          </li>
        </ul>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Features</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Automatic Scans</strong> - Trigger scans on push, pull request, or release</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Private Repository Access</strong> - Securely connect to private repos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>PR Comments</strong> - Get findings posted as PR comments</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Check Runs</strong> - View scan status directly in GitHub</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span><strong>Branch Protection</strong> - Block merges when critical issues are found</span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Setup</h2>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">1. Install the GitHub App</h4>
            <p className="text-muted-foreground">
              Go to{' '}
              <a href="/settings/integrations" className="text-primary hover:underline">
                Settings → Integrations
              </a>{' '}
              and click &quot;Connect GitHub&quot;. You will be redirected to GitHub to install
              the Bugrit app on your organization or personal account.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">2. Select Repositories</h4>
            <p className="text-muted-foreground">
              Choose which repositories the app can access. You can grant access to all
              repositories or select specific ones.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">3. Link to Application</h4>
            <p className="text-muted-foreground">
              In your application settings, select the GitHub repository to link.
              Scans will be automatically triggered based on your configuration.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Automatic Scan Triggers</h2>
        <p className="text-muted-foreground mb-4">
          Configure when scans run automatically:
        </p>
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
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">PR Check Integration</h2>
        <p className="text-muted-foreground mb-4">
          When configured, Bugrit will:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">1.</span>
            <span>Create a check run when a PR is opened</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">2.</span>
            <span>Run 69 analysis tools on your code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">3.</span>
            <span>Post findings as PR comments with inline annotations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">4.</span>
            <span>Update the check status (pass/fail based on severity thresholds)</span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Branch Protection</h2>
        <p className="text-muted-foreground mb-4">
          Use Bugrit scans as a required status check:
        </p>
        <ol className="space-y-2 text-muted-foreground">
          <li><strong>1.</strong> Go to your repo Settings → Branches → Branch protection rules</li>
          <li><strong>2.</strong> Enable &quot;Require status checks to pass before merging&quot;</li>
          <li><strong>3.</strong> Search for and select &quot;Bugrit Scan&quot;</li>
          <li><strong>4.</strong> PRs cannot be merged until the scan passes</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Manual Scan via API</h2>
        <p className="text-muted-foreground mb-4">
          You can also trigger scans manually using the API:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "branch": "feature/new-feature",
    "commitSha": "a1b2c3d4e5f6"
  }'`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Permissions Required</h2>
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
              <td className="py-2 px-2">Metadata</td>
              <td className="py-2 px-2">Read</td>
              <td className="py-2 px-2 text-muted-foreground">List repos and branches</td>
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
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Webhook Events</h2>
        <p className="text-muted-foreground mb-4">
          The Bugrit GitHub App listens for these events:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li><code>push</code> - When code is pushed to a branch</li>
          <li><code>pull_request</code> - When PRs are opened, synchronized, or reopened</li>
          <li><code>release</code> - When releases are published</li>
          <li><code>installation</code> - When the app is installed or removed</li>
        </ul>
      </section>
    </div>
  );
}
