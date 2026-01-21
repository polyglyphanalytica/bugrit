'use client';

export default function ScansApiPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Scans API</h1>
        <p className="text-lg text-muted-foreground">
          Trigger scans to run 69 analysis tools on your code and retrieve reports.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Every time you deploy code, you&apos;re taking a risk. The Scans API lets you automatically check for security vulnerabilities, code quality issues, and bugs <strong>before your users find them</strong>.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Catch bugs before deploy:</strong> Run a scan in your CI/CD pipeline and fail the build if critical issues are found</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Monitor continuously:</strong> Schedule scans to run daily and catch issues from dependency updates</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Stay secure:</strong> 62% of AI-generated code has vulnerabilities. Don&apos;t ship them to production.</span>
          </li>
        </ul>
      </div>

      {/* Vibe Coding Section */}
      <div className="p-6 bg-slate-950 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white flex items-center gap-2">
          <span>🤖</span> Vibe Coding Prompts
        </h2>
        <p className="text-slate-300 mb-4 text-sm">
          Copy these prompts into your AI assistant to implement scan functionality.
        </p>

        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Auto-scan on Deploy</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read the Bugrit Scans API documentation at:
https://bugrit.dev/docs/api-reference/scans

Then add a post-deployment webhook that triggers a Bugrit scan:

1. After successful deploy, POST to https://bugrit.dev/api/v1/scans
2. Request body (see docs for all fields):
   - applicationId: from env.BUGGERED_APP_ID
   - sourceType: "github" (or "url" for live sites)
   - repoUrl: your GitHub repo URL
   - branch: "main" (optional)
3. Poll GET /api/v1/scans/{scanId} until status is "completed"
4. Check response.summary.critical - if > 0, send alert and fail deployment
5. Store API key in BUGGERED_API_KEY environment variable

Use fetch or axios, add error handling, and log progress.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read the Bugrit Scans API documentation at:\nhttps://bugrit.dev/docs/api-reference/scans\n\nThen add a post-deployment webhook that triggers a Bugrit scan:\n\n1. After successful deploy, POST to https://bugrit.dev/api/v1/scans\n2. Request body (see docs for all fields):\n   - applicationId: from env.BUGGERED_APP_ID\n   - sourceType: "github" (or "url" for live sites)\n   - repoUrl: your GitHub repo URL\n   - branch: "main" (optional)\n3. Poll GET /api/v1/scans/{scanId} until status is "completed"\n4. Check response.summary.critical - if > 0, send alert and fail deployment\n5. Store API key in BUGGERED_API_KEY environment variable\n\nUse fetch or axios, add error handling, and log progress.`)}>Copy prompt</button>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">GitHub Action Workflow</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read these Bugrit docs:
- Scans API: https://bugrit.dev/docs/api-reference/scans
- CI/CD Integration: https://bugrit.dev/docs/integrations/ci-cd

Then create a GitHub Action that runs on push to main:

1. Checkout code
2. POST to /api/v1/scans with:
   - sourceType: "github"
   - repoUrl: github.repository URL
   - applicationId: from secrets
3. Poll GET /api/v1/scans/{scanId} every 10 seconds (max 5 minutes)
4. Read summary.critical and summary.high from response
5. Add a commit comment with scan summary
6. Fail workflow if critical or high issues found

Use secrets.BUGGERED_API_KEY for Authorization: Bearer header.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read these Bugrit docs:\n- Scans API: https://bugrit.dev/docs/api-reference/scans\n- CI/CD Integration: https://bugrit.dev/docs/integrations/ci-cd\n\nThen create a GitHub Action that runs on push to main:\n\n1. Checkout code\n2. POST to /api/v1/scans with:\n   - sourceType: "github"\n   - repoUrl: github.repository URL\n   - applicationId: from secrets\n3. Poll GET /api/v1/scans/{scanId} every 10 seconds (max 5 minutes)\n4. Read summary.critical and summary.high from response\n5. Add a commit comment with scan summary\n6. Fail workflow if critical or high issues found\n\nUse secrets.BUGGERED_API_KEY for Authorization: Bearer header.`)}>Copy prompt</button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Start a Scan</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/v1/scans</code>
          </div>
          <p className="text-muted-foreground">
            Submit your code for analysis. Bugrit runs 69 tools and generates a unified report.
          </p>

          <h4 className="font-semibold">Request Body</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Field</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Required</th>
                <th className="text-left py-2 px-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-2"><code>applicationId</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">Yes</td>
                <td className="py-2 px-2 text-muted-foreground">Your application ID</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>sourceType</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">Yes</td>
                <td className="py-2 px-2 text-muted-foreground">url, github, gitlab, upload, docker, npm, mobile</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>targetUrl</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">If url</td>
                <td className="py-2 px-2 text-muted-foreground">Live URL to scan</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>repoUrl</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">If github/gitlab</td>
                <td className="py-2 px-2 text-muted-foreground">Repository URL</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>branch</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">No</td>
                <td className="py-2 px-2 text-muted-foreground">Branch to scan (default: main)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>dockerImage</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">If docker</td>
                <td className="py-2 px-2 text-muted-foreground">Docker image name</td>
              </tr>
              <tr>
                <td className="py-2 px-2"><code>npmPackage</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">If npm</td>
                <td className="py-2 px-2 text-muted-foreground">npm package name</td>
              </tr>
            </tbody>
          </table>

          <h4 className="font-semibold mt-4">Example: Scan a GitHub Repo</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "branch": "main"
  }'`}</pre>
          </div>

          <h4 className="font-semibold mt-4">Example: Scan a Live URL</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "url",
    "targetUrl": "https://your-app.com"
  }'`}</pre>
          </div>

          <h4 className="font-semibold mt-4">Response</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`{
  "scan": {
    "id": "scn-xyz789",
    "applicationId": "app-abc123",
    "status": "running",
    "sourceType": "github",
    "toolsTotal": 52,
    "toolsCompleted": 0,
    "createdAt": "2026-01-19T10:30:00Z",
    "estimatedCompletion": "2026-01-19T10:31:00Z"
  }
}`}</pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Get Scan Status</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/scans/:scanId</code>
          </div>
          <p className="text-muted-foreground">
            Check the status of a running scan. Poll until status is &quot;completed&quot;.
          </p>

          <h4 className="font-semibold">Response</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`{
  "scan": {
    "id": "scn-xyz789",
    "status": "completed",
    "toolsTotal": 69,
    "toolsCompleted": 69,
    "reportId": "rpt-abc123",
    "completedAt": "2026-01-19T10:30:47Z",
    "summary": {
      "critical": 2,
      "high": 5,
      "medium": 12,
      "low": 28
    }
  }
}`}</pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">List Scans</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/scans</code>
          </div>
          <p className="text-muted-foreground">
            List all scans for your account. Filter by application or status.
          </p>
          <h4 className="font-semibold">Query Parameters</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Parameter</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-2"><code>applicationId</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2 text-muted-foreground">Filter by application</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>status</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2 text-muted-foreground">pending, running, completed, failed</td>
              </tr>
              <tr>
                <td className="py-2 px-2"><code>limit</code></td>
                <td className="py-2 px-2">integer</td>
                <td className="py-2 px-2 text-muted-foreground">Max results (default: 20)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Cancel Scan</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-sm font-mono">DELETE</span>
            <code className="text-sm">/api/v1/scans/:scanId</code>
          </div>
          <p className="text-muted-foreground">
            Cancel a running scan. Partial results may still be available.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Scan Status Values</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Status</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>pending</code></td>
              <td className="py-2 px-2 text-muted-foreground">Scan queued, waiting to start</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>running</code></td>
              <td className="py-2 px-2 text-muted-foreground">69 tools currently analyzing your code</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>completed</code></td>
              <td className="py-2 px-2 text-muted-foreground">All tools finished, report ready</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>failed</code></td>
              <td className="py-2 px-2 text-muted-foreground">Scan failed (check error field)</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>canceled</code></td>
              <td className="py-2 px-2 text-muted-foreground">Scan was canceled by user</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
