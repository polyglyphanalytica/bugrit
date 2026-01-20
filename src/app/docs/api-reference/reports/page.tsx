'use client';

export default function ReportsApiPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Reports API</h1>
        <p className="text-lg text-muted-foreground">
          Generate and retrieve detailed reports from your test scans.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Reports turn raw scan data into <strong>actionable insights</strong>. Use this API to build security dashboards, show scan results in your admin panel, or generate PDF reports for stakeholders.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Build a security dashboard:</strong> Show your team the current security posture at a glance</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Embed in your app:</strong> Display scan status and issues directly in your admin panel</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Track progress:</strong> Show trends over time - are you getting more secure or less?</span>
          </li>
        </ul>
      </div>

      {/* Vibe Coding Section */}
      <div className="p-6 bg-slate-950 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white flex items-center gap-2">
          <span>🤖</span> Vibe Coding Prompts
        </h2>
        <p className="text-slate-400 mb-4 text-sm">
          Copy these prompts to display Bugrit reports in your app.
        </p>

        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Security Dashboard Component</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read the Bugrit Reports API documentation at:
https://bugrit.dev/docs/api-reference/reports

Then create a React component that displays security scan results:

1. Fetch from GET /api/v1/scans/{scanId}/report
2. The response contains summary and findings objects (see docs for structure)
3. Show a summary card with:
   - Pass/fail: summary.critical === 0 ? pass : fail
   - Counts: summary.critical, summary.high, summary.medium, summary.low
   - Last scan timestamp from generatedAt
4. Map over findings array to show individual issues with severity, file, line
5. Include a "Run New Scan" button that POSTs to /api/v1/scans

Use my existing component library. Handle loading, error, and empty states.
Store BUGGERED_API_KEY in environment variables.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read the Bugrit Reports API documentation at:\nhttps://bugrit.dev/docs/api-reference/reports\n\nThen create a React component that displays security scan results:\n\n1. Fetch from GET /api/v1/scans/{scanId}/report\n2. The response contains summary and findings objects (see docs for structure)\n3. Show a summary card with:\n   - Pass/fail: summary.critical === 0 ? pass : fail\n   - Counts: summary.critical, summary.high, summary.medium, summary.low\n   - Last scan timestamp from generatedAt\n4. Map over findings array to show individual issues with severity, file, line\n5. Include a "Run New Scan" button that POSTs to /api/v1/scans\n\nUse my existing component library. Handle loading, error, and empty states.\nStore BUGGERED_API_KEY in environment variables.`)}>Copy prompt</button>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Scan History Timeline</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read these Bugrit docs:
- Scans API: https://bugrit.dev/docs/api-reference/scans
- Reports API: https://bugrit.dev/docs/api-reference/reports

Then create a component showing scan history as a timeline:

1. Fetch GET /api/v1/scans?limit=20 to get recent scans array
2. Each scan has: id, status, summary, createdAt, completedAt
3. Display as a timeline or table with:
   - Scan date from createdAt
   - Status field (completed/failed/running)
   - Issue counts from summary.critical/high/medium/low
   - Trend indicator (compare summary.total with previous scan)
4. On click, fetch GET /api/v1/scans/{id}/report for full details
5. Add a chart showing summary.total over time (use Recharts or Chart.js)

Make it responsive. Include empty state for no scans.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read these Bugrit docs:\n- Scans API: https://bugrit.dev/docs/api-reference/scans\n- Reports API: https://bugrit.dev/docs/api-reference/reports\n\nThen create a component showing scan history as a timeline:\n\n1. Fetch GET /api/v1/scans?limit=20 to get recent scans array\n2. Each scan has: id, status, summary, createdAt, completedAt\n3. Display as a timeline or table with:\n   - Scan date from createdAt\n   - Status field (completed/failed/running)\n   - Issue counts from summary.critical/high/medium/low\n   - Trend indicator (compare summary.total with previous scan)\n4. On click, fetch GET /api/v1/scans/{id}/report for full details\n5. Add a chart showing summary.total over time (use Recharts or Chart.js)\n\nMake it responsive. Include empty state for no scans.`)}>Copy prompt</button>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Admin Panel Security Widget</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read the Bugrit Reports API at:
https://bugrit.dev/docs/api-reference/reports

Then add a security status widget to my admin dashboard:

1. Fetch latest scan: GET /api/v1/scans?limit=1
2. Response is array - use scans[0] to get latest
3. Create a compact card showing:
   - Status: scans[0].summary.critical === 0 ? "Secure" (green) : "Issues Found" (red)
   - Badge with scans[0].summary.critical + scans[0].summary.high count
   - Last scan date from scans[0].completedAt
4. On hover/click, show breakdown of all severity counts
5. Link to full report at /security/report/{scans[0].id}
6. Refresh automatically every 5 minutes using setInterval

Keep it small - this is a widget, not a full page.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read the Bugrit Reports API at:\nhttps://bugrit.dev/docs/api-reference/reports\n\nThen add a security status widget to my admin dashboard:\n\n1. Fetch latest scan: GET /api/v1/scans?limit=1\n2. Response is array - use scans[0] to get latest\n3. Create a compact card showing:\n   - Status: scans[0].summary.critical === 0 ? "Secure" (green) : "Issues Found" (red)\n   - Badge with scans[0].summary.critical + scans[0].summary.high count\n   - Last scan date from scans[0].completedAt\n4. On hover/click, show breakdown of all severity counts\n5. Link to full report at /security/report/{scans[0].id}\n6. Refresh automatically every 5 minutes using setInterval\n\nKeep it small - this is a widget, not a full page.`)}>Copy prompt</button>
          </div>
        </div>
      </div>

      {/* Displaying Reports in Your App */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Displaying Reports in Your App</h2>
        <p className="text-muted-foreground mb-4">
          Here&apos;s what you need to build a security dashboard in your app:
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Minimum Requirements</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• API key (get from Settings → API Keys)</li>
              <li>• HTTP client (fetch, axios, etc.)</li>
              <li>• State management for scan status</li>
              <li>• UI components for displaying results</li>
            </ul>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Typical Flow</h4>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. List recent scans → <code>GET /scans</code></li>
              <li>2. Get specific report → <code>GET /scans/:id/report</code></li>
              <li>3. Display summary (critical/high/medium/low)</li>
              <li>4. Show expandable findings list</li>
            </ol>
          </div>
        </div>

        <h4 className="font-semibold mt-6 mb-2">Example: Fetching and Displaying a Report</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`// Fetch the latest scan
const scansRes = await fetch('/api/buggered/scans?limit=1', {
  headers: { 'Authorization': \`Bearer \${process.env.BUGGERED_API_KEY}\` }
});
const { scans } = await scansRes.json();

// Get the full report
if (scans[0]?.status === 'completed') {
  const reportRes = await fetch(\`/api/buggered/scans/\${scans[0].id}/report\`);
  const { report } = await reportRes.json();

  // Display in your UI
  const { summary, findings } = report;
  // summary.critical, summary.high, summary.medium, summary.low
  // findings[].title, findings[].severity, findings[].file, findings[].line
}`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Get Report by Scan</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/scans/:scanId/report</code>
          </div>
          <p className="text-muted-foreground">
            Get or generate a report for a completed scan.
          </p>
          <h4 className="font-semibold mt-4">Example Response</h4>
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
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">List Reports</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/reports</code>
          </div>
          <p className="text-muted-foreground">
            List all reports for your organization.
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
        <h2 className="text-2xl font-bold mb-4">Get Report</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/reports/:reportId</code>
          </div>
          <p className="text-muted-foreground">
            Get a specific report by ID.
          </p>
        </div>
      </section>

      {/* Report Data Structure */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Report Data Structure</h2>
        <p className="text-muted-foreground mb-4">
          Understanding the report structure helps you build better UIs.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Field</th>
              <th className="text-left py-2 px-2">Use For</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>summary.critical/high/medium/low</code></td>
              <td className="py-2 px-2 text-muted-foreground">Badge counts, status indicators</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>summary.passRate</code></td>
              <td className="py-2 px-2 text-muted-foreground">Progress bars, health scores</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>findings[].severity</code></td>
              <td className="py-2 px-2 text-muted-foreground">Color coding (red/orange/yellow/blue)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>findings[].file + line</code></td>
              <td className="py-2 px-2 text-muted-foreground">Link directly to code location</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>generatedAt</code></td>
              <td className="py-2 px-2 text-muted-foreground">&quot;Last scanned X ago&quot; display</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
