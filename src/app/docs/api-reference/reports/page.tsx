'use client';

export default function ReportsApiPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Reports API</h1>
        <p className="text-lg text-muted-foreground">
          Generate and retrieve detailed reports from your test scans.
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

      {/* Quick Start Prompts */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quick Start Prompts</h2>
        <p className="text-muted-foreground mb-4">
          Common reporting tasks you can accomplish with a single prompt.
        </p>

        <div className="space-y-6">
          {/* Security Dashboard Component */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📊</span> Build a Security Dashboard
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Create a full dashboard showing your security scan results with severity indicators.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Reports API docs at https://bugrit.dev/docs/api-reference/reports

Build a security dashboard component for my app:

1. Show the latest scan results from GET /api/v1/scans?limit=1
2. Display a summary card with:
   - Overall status (green if summary.critical === 0, red otherwise)
   - Severity counts as colored badges
   - Last scan timestamp
3. List all findings with severity color coding
4. Include a "View Full Report" button that opens details

Use my existing component library. Store API key in env vars.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Reports API docs at https://bugrit.dev/docs/api-reference/reports

Build a security dashboard component for my app:

1. Show the latest scan results from GET /api/v1/scans?limit=1
2. Display a summary card with:
   - Overall status (green if summary.critical === 0, red otherwise)
   - Severity counts as colored badges
   - Last scan timestamp
3. List all findings with severity color coding
4. Include a "View Full Report" button that opens details

Use my existing component library. Store API key in env vars.
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
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                    <code className="text-sm">/api/v1/scans/:scanId/report</code>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Example Code</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`// Fetch the latest scan
const scansRes = await fetch('/api/v1/scans?limit=1', {
  headers: { 'Authorization': \`Bearer \${process.env.BUGRIT_API_KEY}\` }
});
const { data: scans } = await scansRes.json();

// Get the full report
if (scans[0]?.status === 'completed') {
  const reportRes = await fetch(\`/api/v1/scans/\${scans[0].id}/report\`, {
    headers: { 'Authorization': \`Bearer \${process.env.BUGRIT_API_KEY}\` }
  });
  const { data: report } = await reportRes.json();

  // report.summary.critical, report.summary.high, etc.
  // report.findings[].title, severity, file, line
}`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Scan History Timeline */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📈</span> Scan History with Trends
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Show how your security posture changes over time with a timeline view.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit API docs:
- Scans: https://bugrit.dev/docs/api-reference/scans
- Reports: https://bugrit.dev/docs/api-reference/reports

Create a scan history timeline component:

1. Fetch GET /api/v1/scans?limit=20 for recent scans
2. Display as timeline or table showing:
   - Scan date (from createdAt)
   - Status badge (completed/failed/running)
   - Issue counts with severity colors
   - Trend arrow (up if more issues, down if fewer)
3. On click, show full report details
4. Add a chart showing total issues over time

Handle loading and empty states.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit API docs:
- Scans: https://bugrit.dev/docs/api-reference/scans
- Reports: https://bugrit.dev/docs/api-reference/reports

Create a scan history timeline component:

1. Fetch GET /api/v1/scans?limit=20 for recent scans
2. Display as timeline or table showing:
   - Scan date (from createdAt)
   - Status badge (completed/failed/running)
   - Issue counts with severity colors
   - Trend arrow (up if more issues, down if fewer)
3. On click, show full report details
4. Add a chart showing total issues over time

Handle loading and empty states.
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
                <h4 className="font-semibold mb-2">Response Structure</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`// GET /api/v1/scans response
{
  "data": [
    {
      "id": "scn-abc123",
      "status": "completed",
      "summary": {
        "critical": 2,
        "high": 5,
        "medium": 12,
        "low": 28,
        "total": 47
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "completedAt": "2024-01-15T10:05:00Z"
    }
  ]
}`}</pre>
                </div>
              </div>
            </details>
          </div>

          {/* Admin Widget */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🔔</span> Admin Dashboard Widget
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Add a compact security status widget to your existing admin panel.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Reports API at https://bugrit.dev/docs/api-reference/reports

Add a security status widget to my admin dashboard:

1. Fetch latest scan: GET /api/v1/scans?limit=1
2. Create a small card showing:
   - Status text: "Secure" (green) or "Issues Found" (red)
   - Badge with critical + high count
   - Last scan date
3. Hover/click shows full severity breakdown
4. Auto-refresh every 5 minutes
5. Link to full security report page

Keep it compact - this is a sidebar widget.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Reports API at https://bugrit.dev/docs/api-reference/reports

Add a security status widget to my admin dashboard:

1. Fetch latest scan: GET /api/v1/scans?limit=1
2. Create a small card showing:
   - Status text: "Secure" (green) or "Issues Found" (red)
   - Badge with critical + high count
   - Last scan date
3. Hover/click shows full severity breakdown
4. Auto-refresh every 5 minutes
5. Link to full security report page

Keep it compact - this is a sidebar widget.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AI Intelligence Reports */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>🤖</span> AI Intelligence Reports
        </h2>
        <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg mb-4">
          <p className="text-sm">
            <strong>Paid Feature:</strong> AI Intelligence Reports require Starter tier or above.
            Get executive summaries, smart prioritization, and actionable recommendations.
          </p>
        </div>

        <div className="space-y-6">
          {/* Executive Summary Prompt */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📝</span> Executive Summary for Stakeholders
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Generate a non-technical report that managers and executives can understand.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit AI Reports API at https://bugrit.dev/docs/api-reference/reports

Build an executive summary page for stakeholders:

1. Call GET /api/v1/reports/ai?scan_id=SCAN_ID&format=executive
2. Display the executiveSummary object:
   - Headline (main message)
   - Risk level indicator (healthy/elevated/high/critical)
   - Key metrics (total issues, critical count, compliance status)
   - Top 3 concerns as a list
   - Immediate actions required
   - Estimated fix time
3. Use professional styling (no technical jargon)
4. Add export to PDF button
5. Include trend comparison if previous scan available

This is for non-technical stakeholders.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit AI Reports API at https://bugrit.dev/docs/api-reference/reports

Build an executive summary page for stakeholders:

1. Call GET /api/v1/reports/ai?scan_id=SCAN_ID&format=executive
2. Display the executiveSummary object:
   - Headline (main message)
   - Risk level indicator (healthy/elevated/high/critical)
   - Key metrics (total issues, critical count, compliance status)
   - Top 3 concerns as a list
   - Immediate actions required
   - Estimated fix time
3. Use professional styling (no technical jargon)
4. Add export to PDF button
5. Include trend comparison if previous scan available

This is for non-technical stakeholders.
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
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                    <code className="text-sm">/api/v1/reports/ai?scan_id=:scanId&format=executive</code>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response Structure</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`{
  "scanId": "scn-xyz789",
  "generatedAt": "2024-01-15T10:35:00Z",
  "executiveSummary": {
    "headline": "3 Critical Security Issues Require Immediate Attention",
    "riskLevel": "high",
    "riskScore": 72,
    "keyMetrics": {
      "totalIssues": 47,
      "criticalCount": 3,
      "securityRisk": "High - SQL injection detected",
      "complianceStatus": "Failing - OWASP violations",
      "technicalDebt": "Medium - 12 hours to fix"
    },
    "topConcerns": [
      "SQL injection in authentication",
      "Stored XSS in comments",
      "Exposed API keys"
    ],
    "positiveNotes": [
      "No critical dependency vulnerabilities",
      "Good test coverage (85%)"
    ],
    "immediateActions": [
      "Sanitize inputs in /api/auth",
      "Implement CSP headers",
      "Move secrets to env vars"
    ],
    "estimatedFixTime": "2-3 hours for critical issues"
  },
  "format": "executive"
}`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Developer Action Items */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🛠️</span> Developer Action Items
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Get a prioritized to-do list with specific files and line numbers to fix.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit AI Reports API at https://bugrit.dev/docs/api-reference/reports

Create a developer task list from AI analysis:

1. Call GET /api/v1/reports/ai?scan_id=SCAN_ID&format=full
2. Display developerReport.actionItems as a task list:
   - Priority order (1 = most critical)
   - Title and description
   - File path + line number (link to code)
   - Estimated effort
   - Impact level
3. Show file health scores (developerReport.fileHealth)
4. Include code patterns section showing repeated issues
5. Add checkboxes to track completion

Make items clickable to expand details.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit AI Reports API at https://bugrit.dev/docs/api-reference/reports

Create a developer task list from AI analysis:

1. Call GET /api/v1/reports/ai?scan_id=SCAN_ID&format=full
2. Display developerReport.actionItems as a task list:
   - Priority order (1 = most critical)
   - Title and description
   - File path + line number (link to code)
   - Estimated effort
   - Impact level
3. Show file health scores (developerReport.fileHealth)
4. Include code patterns section showing repeated issues
5. Add checkboxes to track completion

Make items clickable to expand details.
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
                  <h4 className="font-semibold mb-2">Developer Report Structure</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`"developerReport": {
  "summary": "Security scan found 47 issues across 12 files...",
  "fileHealth": [
    {
      "file": "src/api/users.ts",
      "score": 45,
      "issueCount": 8,
      "topIssues": ["SQL injection", "Missing validation"],
      "trend": "declining"
    }
  ],
  "actionItems": [
    {
      "id": "act-001",
      "priority": 1,
      "title": "Fix SQL injection in user lookup",
      "description": "User input is directly concatenated...",
      "file": "src/api/users.ts",
      "line": 45,
      "effort": "30 minutes",
      "impact": "Critical - prevents DB access",
      "autoFixAvailable": true
    }
  ],
  "codePatterns": [
    {
      "pattern": "Unsanitized SQL queries",
      "occurrences": 3,
      "severity": "critical",
      "affectedFiles": ["src/api/users.ts", "src/api/posts.ts"]
    }
  ]
}`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Generate AI Report */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>⚡</span> Generate New AI Analysis
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Trigger AI analysis for any completed scan.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit AI Reports API at https://bugrit.dev/docs/api-reference/reports

Add an "Analyze with AI" button to my scan results page:

1. Button appears for completed scans
2. On click, POST to /api/v1/reports/ai with:
   { "scanId": "THE_SCAN_ID", "format": "full" }
3. Show loading state during generation
4. On success, redirect to AI report view
5. Handle errors (e.g., tier limits, incomplete scans)

The button should be prominent but not intrusive.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit AI Reports API at https://bugrit.dev/docs/api-reference/reports

Add an "Analyze with AI" button to my scan results page:

1. Button appears for completed scans
2. On click, POST to /api/v1/reports/ai with:
   { "scanId": "THE_SCAN_ID", "format": "full" }
3. Show loading state during generation
4. On success, redirect to AI report view
5. Handle errors (e.g., tier limits, incomplete scans)

The button should be prominent but not intrusive.
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
                    <code className="text-sm">/api/v1/reports/ai</code>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`{
  "scanId": "scn-xyz789",
  "format": "full"  // "full" | "summary" | "executive"
}`}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Format Options</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Format</th>
                        <th className="text-left py-2">Includes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2"><code>full</code></td>
                        <td className="py-2 text-muted-foreground">Everything: intelligence, executive summary, developer report</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2"><code>summary</code></td>
                        <td className="py-2 text-muted-foreground">Executive summary + condensed intelligence</td>
                      </tr>
                      <tr>
                        <td className="py-2"><code>executive</code></td>
                        <td className="py-2 text-muted-foreground">Executive summary only (fastest)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Standard Reports API */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Standard Reports</h2>
        <p className="text-muted-foreground mb-4">
          Basic report endpoints available on all tiers.
        </p>

        <div className="space-y-6">
          {/* List Reports */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📚</span> List All Reports
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Build a reports archive or history page.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Reports API at https://bugrit.dev/docs/api-reference/reports

Create a reports list page:

1. Fetch GET /api/v1/reports with optional filters:
   - ?applicationId=xxx to filter by app
   - ?limit=20 for pagination
2. Display as a table with columns:
   - Report date
   - Application name
   - Total issues
   - Critical/High count
3. Click row to view full report
4. Add filters dropdown for application
5. Include pagination

My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Reports API at https://bugrit.dev/docs/api-reference/reports

Create a reports list page:

1. Fetch GET /api/v1/reports with optional filters:
   - ?applicationId=xxx to filter by app
   - ?limit=20 for pagination
2. Display as a table with columns:
   - Report date
   - Application name
   - Total issues
   - Critical/High count
3. Click row to view full report
4. Add filters dropdown for application
5. Include pagination

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
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                    <code className="text-sm">/api/v1/reports</code>
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

          {/* Get Single Report */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📄</span> Get Report Details
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Display a full report with all findings.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Reports API at https://bugrit.dev/docs/api-reference/reports

Create a detailed report view page:

1. Fetch GET /api/v1/reports/:reportId
2. Show summary section:
   - Pass rate percentage as progress bar
   - Severity breakdown as colored badges
   - Scan duration
3. Show findings as expandable cards:
   - Severity icon and color
   - Title and description
   - File path + line number
   - Tool that detected it
4. Add filters: by severity, by category
5. Include "Export to PDF" button

My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Reports API at https://bugrit.dev/docs/api-reference/reports

Create a detailed report view page:

1. Fetch GET /api/v1/reports/:reportId
2. Show summary section:
   - Pass rate percentage as progress bar
   - Severity breakdown as colored badges
   - Scan duration
3. Show findings as expandable cards:
   - Severity icon and color
   - Title and description
   - File path + line number
   - Tool that detected it
4. Add filters: by severity, by category
5. Include "Export to PDF" button

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
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                    <code className="text-sm">/api/v1/reports/:reportId</code>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Response Structure</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`{
  "success": true,
  "data": {
    "id": "rpt-abc123",
    "scanId": "scn-xyz789",
    "projectId": "prj-abc123",
    "summary": {
      "critical": 2,
      "high": 5,
      "medium": 12,
      "low": 28,
      "total": 47,
      "passRate": 92,
      "duration": 120000
    },
    "findings": [
      {
        "id": "fnd-001",
        "title": "SQL Injection vulnerability",
        "severity": "critical",
        "category": "security",
        "file": "src/api/users.ts",
        "line": 45,
        "tool": "eslint-security"
      }
    ],
    "generatedAt": "2024-01-15T10:35:00Z"
  }
}`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Data Structure Reference */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Report Data Reference</h2>
        <p className="text-muted-foreground mb-4">
          Understanding the data helps you build better UIs.
        </p>

        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">What Each Field Is For</h3>
            <p className="text-slate-400 text-sm mb-3">
              Quick reference for building your UI.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Reports API at https://bugrit.dev/docs/api-reference/reports

Help me understand the report response structure so I can build a good UI:

1. What fields are in summary vs findings?
2. How should I color code severities?
3. What's the difference between report ID and scan ID?
4. How do I link to the specific line of code?
5. What does passRate represent?

Explain with examples of how to display each field.`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Reports API at https://bugrit.dev/docs/api-reference/reports

Help me understand the report response structure so I can build a good UI:

1. What fields are in summary vs findings?
2. How should I color code severities?
3. What's the difference between report ID and scan ID?
4. How do I link to the specific line of code?
5. What does passRate represent?

Explain with examples of how to display each field.`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800" open>
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Reference
            </summary>
            <div className="p-4 bg-muted/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Field</th>
                    <th className="text-left py-2 px-2">UI Usage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>summary.critical/high/medium/low</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Badge counts, status indicators</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>summary.passRate</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Progress bars, health scores (0-100)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>findings[].severity</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Color: critical=red, high=orange, medium=yellow, low=blue</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>findings[].file + line</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Link directly to code location in your repo</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>findings[].tool</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Show which scanner found it (eslint, semgrep, etc.)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2"><code>generatedAt</code></td>
                    <td className="py-2 px-2 text-muted-foreground">&quot;Last scanned 2 hours ago&quot; relative time</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </section>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why Reports Matter
        </h2>
        <p className="text-muted-foreground mb-4">
          Reports turn raw scan data into <strong>actionable insights</strong>. Here&apos;s what you can build:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Security dashboards:</strong> Show your team the current security posture at a glance</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Embedded widgets:</strong> Display scan status directly in your admin panel</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Trend tracking:</strong> Show improvement (or regression) over time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Executive reports:</strong> Generate non-technical summaries for stakeholders</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
