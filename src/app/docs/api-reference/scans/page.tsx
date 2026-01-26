'use client';

export default function ScansApiPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Scans API</h1>
        <p className="text-lg text-muted-foreground">
          Trigger scans to run 150 analysis modules on your code and retrieve reports.
        </p>
      </div>

      {/* Not a Developer Section */}
      <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 rounded-xl">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
          <span>🎯</span> Not a Developer? Start Here
        </h2>
        <p className="text-muted-foreground mb-4">
          You don&apos;t need to write code yourself. Copy the prompts below and paste them into
          <strong> Claude</strong>, <strong>ChatGPT</strong>, <strong>Cursor</strong>, or any AI coding assistant.
          Your AI will read the docs and build what you need.
        </p>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 1:</strong> Copy a prompt below
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 2:</strong> Paste into your AI assistant
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 3:</strong> AI builds it for you
          </div>
        </div>
      </div>

      {/* NEW: Real-Time Polling */}
      <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>⚡</span> NEW: Real-Time Session Polling
        </h2>
        <p className="text-muted-foreground mb-4">
          Watch your scan results <strong>stream in live</strong> as each module completes. No more waiting for all 150 modules to finish before seeing results!
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-background/80 rounded-lg">
            <strong className="text-green-600 dark:text-green-400">Before:</strong> Wait 2-5 minutes for all tools, then see results
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong className="text-green-600 dark:text-green-400">Now:</strong> See each tool&apos;s results immediately as it finishes
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Use <code className="bg-muted px-1 rounded">/api/sessions</code> for the new streaming experience.
          <a href="/docs/api-reference/sessions" className="text-primary underline ml-1">View Sessions API →</a>
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

      {/* Quick Start Prompts */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quick Start Prompts</h2>
        <p className="text-muted-foreground mb-4">
          Common scanning tasks you can accomplish with a single prompt.
        </p>

        <div className="space-y-6">
          {/* Auto-scan on Deploy */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🚀</span> Auto-Scan After Every Deploy
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Automatically scan your code whenever you deploy and get alerted if critical issues are found.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Scans API docs at https://bugrit.com/docs/api-reference/scans

Add a post-deployment hook that triggers a security scan:

1. After successful deploy, POST to /api/v1/scans with:
   - applicationId: from env.BUGRIT_APP_ID
   - sourceType: "github"
   - repoUrl: your repo URL
   - branch: "main"
2. Poll GET /api/v1/scans/{scanId} until status is "completed"
3. Check response.summary.critical - if > 0, send Slack/email alert
4. Store BUGRIT_API_KEY in environment variables

Use my deployment script framework. Add error handling and logging.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Scans API docs at https://bugrit.com/docs/api-reference/scans

Add a post-deployment hook that triggers a security scan:

1. After successful deploy, POST to /api/v1/scans with:
   - applicationId: from env.BUGRIT_APP_ID
   - sourceType: "github"
   - repoUrl: your repo URL
   - branch: "main"
2. Poll GET /api/v1/scans/{scanId} until status is "completed"
3. Check response.summary.critical - if > 0, send Slack/email alert
4. Store BUGRIT_API_KEY in environment variables

Use my deployment script framework. Add error handling and logging.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
            <details className="border-t border-slate-800">
              <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
                👩‍💻 Technical Details (for developers)
              </summary>
              <div className="p-4 bg-muted/30 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">API Endpoint</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm font-mono">POST</span>
                    <code className="text-sm">/api/v1/scans</code>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example Request</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "branch": "main"
  }'`}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`{
  "scan": {
    "id": "scn-xyz789",
    "applicationId": "app-abc123",
    "status": "running",
    "sourceType": "github",
    "toolsTotal": 115,
    "toolsCompleted": 0,
    "createdAt": "2026-01-19T10:30:00Z",
    "estimatedCompletion": "2026-01-19T10:31:00Z"
  }
}`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* GitHub Action */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🔄</span> GitHub Action for PR Checks
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Block PRs with critical security issues automatically.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read these Bugrit docs:
- Scans API: https://bugrit.com/docs/api-reference/scans
- CI/CD Integration: https://bugrit.com/docs/integrations/ci-cd

Create a GitHub Action that runs on every PR:

1. Triggers on: pull_request to main branch
2. POST to /api/v1/scans with:
   - sourceType: "github"
   - repoUrl: from github.repository
   - branch: from github.head_ref (PR branch)
   - applicationId: from secrets.BUGRIT_APP_ID
3. Poll every 10 seconds until status is "completed"
4. Read summary.critical and summary.high from response
5. Add PR comment with scan summary (use GitHub API)
6. FAIL the check if critical > 0 or high > 3

Use secrets.BUGRIT_API_KEY for auth.`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read these Bugrit docs:
- Scans API: https://bugrit.com/docs/api-reference/scans
- CI/CD Integration: https://bugrit.com/docs/integrations/ci-cd

Create a GitHub Action that runs on every PR:

1. Triggers on: pull_request to main branch
2. POST to /api/v1/scans with:
   - sourceType: "github"
   - repoUrl: from github.repository
   - branch: from github.head_ref (PR branch)
   - applicationId: from secrets.BUGRIT_APP_ID
3. Poll every 10 seconds until status is "completed"
4. Read summary.critical and summary.high from response
5. Add PR comment with scan summary (use GitHub API)
6. FAIL the check if critical > 0 or high > 3

Use secrets.BUGRIT_API_KEY for auth.`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>

          {/* Scan Live Site */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🌐</span> Scan Your Live Website
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Check your production site for security headers, SSL issues, and more.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Create a scheduled job that scans my live site daily:

1. Run at midnight every day (cron job or scheduled task)
2. POST to /api/v1/scans with:
   - applicationId: my app ID
   - sourceType: "url"
   - targetUrl: "https://mysite.com"
3. Wait for completion (poll status)
4. If summary.critical > 0:
   - Send urgent alert to security team
5. Store results for trend tracking
6. Generate weekly security report email

My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Create a scheduled job that scans my live site daily:

1. Run at midnight every day (cron job or scheduled task)
2. POST to /api/v1/scans with:
   - applicationId: my app ID
   - sourceType: "url"
   - targetUrl: "https://mysite.com"
3. Wait for completion (poll status)
4. If summary.critical > 0:
   - Send urgent alert to security team
5. Store results for trend tracking
6. Generate weekly security report email

My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
            <details className="border-t border-slate-800">
              <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
                👩‍💻 Technical Details (for developers)
              </summary>
              <div className="p-4 bg-muted/30">
                <h4 className="font-semibold mb-2">Example: Scan a Live URL</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "url",
    "targetUrl": "https://your-app.com"
  }'`}</pre>
                </div>
              </div>
            </details>
          </div>

          {/* Scan Progress Dashboard */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📊</span> Build a Scan Progress Dashboard
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Show real-time scan progress with a nice UI.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Build a scan progress component:

1. Trigger scan: POST /api/v1/scans (store returned scanId)
2. Poll GET /api/v1/scans/{scanId} every 3 seconds
3. Display progress bar: toolsCompleted / toolsTotal * 100
4. Show current status (pending/running/completed/failed)
5. When completed, show summary:
   - Badge counts for critical (red), high (orange), medium (yellow), low (blue)
6. Button to view full report when done
7. Cancel button that calls DELETE /api/v1/scans/{scanId}

Use my existing component library.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Build a scan progress component:

1. Trigger scan: POST /api/v1/scans (store returned scanId)
2. Poll GET /api/v1/scans/{scanId} every 3 seconds
3. Display progress bar: toolsCompleted / toolsTotal * 100
4. Show current status (pending/running/completed/failed)
5. When completed, show summary:
   - Badge counts for critical (red), high (orange), medium (yellow), low (blue)
6. Button to view full report when done
7. Cancel button that calls DELETE /api/v1/scans/{scanId}

Use my existing component library.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Start a Scan - Technical Reference */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Start a Scan</h2>

        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Trigger a New Scan</h3>
            <p className="text-slate-400 text-sm mb-3">
              Submit your code or URL for analysis with 150 security and quality modules.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Add a "Scan Now" button to my app that:

1. On click, POST to /api/v1/scans with:
   - applicationId: the current project ID
   - sourceType: "github" (or "url" for live sites)
   - repoUrl: the repo URL (if github)
   - branch: "main"
2. Show loading indicator while scan runs
3. Poll for status every 5 seconds
4. When done, show results with severity counts
5. Link to full report

Handle errors (auth, rate limits, validation).
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Add a "Scan Now" button to my app that:

1. On click, POST to /api/v1/scans with:
   - applicationId: the current project ID
   - sourceType: "github" (or "url" for live sites)
   - repoUrl: the repo URL (if github)
   - branch: "main"
2. Show loading indicator while scan runs
3. Poll for status every 5 seconds
4. When done, show results with severity counts
5. Link to full report

Handle errors (auth, rate limits, validation).
My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800" open>
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Reference
            </summary>
            <div className="p-4 bg-muted/30 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm font-mono">POST</span>
                  <code className="text-sm">/api/v1/scans</code>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Submit your code for analysis. Bugrit runs 150 modules and generates a unified report.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
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
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* Get Scan Status */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Get Scan Status</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Check Scan Progress</h3>
            <p className="text-slate-400 text-sm mb-3">
              Monitor your scan and get results when complete.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Build a function that waits for scan completion:

1. Takes scanId as parameter
2. Polls GET /api/v1/scans/{scanId} every 5 seconds
3. Returns when status is "completed" or "failed"
4. Includes timeout (max 10 minutes)
5. Returns the scan object with summary

Use async/await. Handle network errors gracefully.
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Build a function that waits for scan completion:

1. Takes scanId as parameter
2. Polls GET /api/v1/scans/{scanId} every 5 seconds
3. Returns when status is "completed" or "failed"
4. Includes timeout (max 10 minutes)
5. Returns the scan object with summary

Use async/await. Handle network errors gracefully.
My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800">
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Details (for developers)
            </summary>
            <div className="p-4 bg-muted/30 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                  <code className="text-sm">/api/v1/scans/:scanId</code>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Response (completed)</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`{
  "scan": {
    "id": "scn-xyz789",
    "status": "completed",
    "toolsTotal": 115,
    "toolsCompleted": 115,
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
            </div>
          </details>
        </div>
      </section>

      {/* List Scans */}
      <section>
        <h2 className="text-2xl font-bold mb-4">List Scans</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">View Scan History</h3>
            <p className="text-slate-400 text-sm mb-3">
              Get a list of all your scans with filters.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Create a scan history table component:

1. Fetch GET /api/v1/scans with filters:
   - applicationId (optional): filter by app
   - status (optional): pending/running/completed/failed
   - limit: number of results
2. Display as table with columns:
   - Date (createdAt)
   - Status badge (color-coded)
   - Source type
   - Issue counts (summary.critical, high, etc.)
3. Click row to view full scan details
4. Add filter dropdowns for status and app

Include pagination if many results.
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Scans API at https://bugrit.com/docs/api-reference/scans

Create a scan history table component:

1. Fetch GET /api/v1/scans with filters:
   - applicationId (optional): filter by app
   - status (optional): pending/running/completed/failed
   - limit: number of results
2. Display as table with columns:
   - Date (createdAt)
   - Status badge (color-coded)
   - Source type
   - Issue counts (summary.critical, high, etc.)
3. Click row to view full scan details
4. Add filter dropdowns for status and app

Include pagination if many results.
My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800">
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Details (for developers)
            </summary>
            <div className="p-4 bg-muted/30 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                  <code className="text-sm">/api/v1/scans</code>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Query Parameters</h4>
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
            </div>
          </details>
        </div>
      </section>

      {/* Cancel Scan */}
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

      {/* Scan Status Values */}
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
              <td className="py-2 px-2 text-muted-foreground">150 modules currently analyzing your code</td>
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
