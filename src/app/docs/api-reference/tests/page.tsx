'use client';

export default function FindingsApiPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Findings API</h1>
        <p className="text-lg text-muted-foreground">
          Retrieve and manage findings from your scans. Findings are the individual issues
          discovered by our 69 analysis tools.
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

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Findings are the individual vulnerabilities and issues in your code. This API lets you build custom workflows around them—automatically create tickets, block deployments, or track resolution over time.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Auto-create tickets:</strong> When a critical finding is detected, automatically create a GitHub issue or Jira ticket</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Block risky deploys:</strong> Check for critical findings before deploy and fail the pipeline if any exist</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Track fix velocity:</strong> Monitor how quickly your team resolves findings over time</span>
          </li>
        </ul>
      </div>

      {/* Quick Start Prompts */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quick Start Prompts</h2>
        <p className="text-muted-foreground mb-4">
          Common tasks for working with security findings.
        </p>

        <div className="space-y-6">
          {/* Auto-Create GitHub Issues */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🎫</span> Auto-Create GitHub Issues for Critical Findings
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Automatically create GitHub issues when critical security issues are found.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Create a script that auto-creates GitHub issues for critical findings:

1. Fetch GET /api/v1/findings?scanId={scanId}&severity=critical
2. For each finding in response.findings array:
   - Check if GitHub issue already exists (search by title)
   - If not, create issue with:
     - Title: "[Security] {finding.title}"
     - Body: finding.description, finding.file, finding.line, finding.suggestion
     - Labels: ["security", "critical", "bugrit"]
3. After creating, PATCH /api/v1/findings/{findingId} with status: "open"
4. Log summary: "Created X issues"

Use GITHUB_TOKEN and BUGRIT_API_KEY from environment.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Create a script that auto-creates GitHub issues for critical findings:

1. Fetch GET /api/v1/findings?scanId={scanId}&severity=critical
2. For each finding in response.findings array:
   - Check if GitHub issue already exists (search by title)
   - If not, create issue with:
     - Title: "[Security] {finding.title}"
     - Body: finding.description, finding.file, finding.line, finding.suggestion
     - Labels: ["security", "critical", "bugrit"]
3. After creating, PATCH /api/v1/findings/{findingId} with status: "open"
4. Log summary: "Created X issues"

Use GITHUB_TOKEN and BUGRIT_API_KEY from environment.
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
                  <h4 className="font-semibold mb-2">Findings Response Structure</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`{
  "findings": [
    {
      "id": "fnd-001",
      "scanId": "scn-xyz789",
      "title": "SQL Injection vulnerability",
      "description": "User input passed directly to SQL query",
      "severity": "critical",
      "category": "security",
      "tool": "semgrep",
      "file": "src/api/users.ts",
      "line": 45,
      "code": "db.query(\`SELECT * FROM users WHERE id = \${userId}\`)",
      "suggestion": "Use parameterized queries",
      "cwe": "CWE-89"
    }
  ],
  "pagination": { "total": 2, "limit": 50, "offset": 0 }
}`}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Findings List Component */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📋</span> Findings List Component with Filters
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Build a filterable list of security findings for your dashboard.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Create a findings list component:

1. Accept scanId as a prop
2. Fetch GET /api/v1/findings?scanId={scanId}
3. Add filter dropdowns for:
   - severity: critical, high, medium, low, info
   - category: security, quality, performance, accessibility
4. Display findings as cards showing:
   - Severity badge (red/orange/yellow/blue)
   - finding.title and finding.file:finding.line
   - Expandable section with finding.description and finding.suggestion
5. Add action buttons to update status:
   - "Mark Fixed" → PATCH with status: "resolved"
   - "False Positive" → PATCH with status: "false_positive"
6. Use pagination from response (total, limit, offset)

Use my existing component library.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Create a findings list component:

1. Accept scanId as a prop
2. Fetch GET /api/v1/findings?scanId={scanId}
3. Add filter dropdowns for:
   - severity: critical, high, medium, low, info
   - category: security, quality, performance, accessibility
4. Display findings as cards showing:
   - Severity badge (red/orange/yellow/blue)
   - finding.title and finding.file:finding.line
   - Expandable section with finding.description and finding.suggestion
5. Add action buttons to update status:
   - "Mark Fixed" → PATCH with status: "resolved"
   - "False Positive" → PATCH with status: "false_positive"
6. Use pagination from response (total, limit, offset)

Use my existing component library.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>

          {/* AI Auto-Fix */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🤖</span> AI-Powered Auto-Fix
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Let your AI assistant fix the vulnerabilities in your code.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Look at the findings from my Bugrit scan and fix them:

1. Fetch GET /api/v1/findings?scanId={scanId}&severity=critical
2. For each finding:
   - Read the file at finding.file
   - Go to finding.line and review finding.code snippet
   - Understand the vulnerability from finding.description and finding.cwe
   - Apply the fix from finding.suggestion
3. After fixing, PATCH /api/v1/findings/{findingId} with:
   - status: "resolved"
   - note: "Fixed by AI assistant"
4. Summarize what was fixed

Prioritize security issues first. Don't introduce new issues.
The scan ID is: [PASTE_SCAN_ID_HERE]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Look at the findings from my Bugrit scan and fix them:

1. Fetch GET /api/v1/findings?scanId={scanId}&severity=critical
2. For each finding:
   - Read the file at finding.file
   - Go to finding.line and review finding.code snippet
   - Understand the vulnerability from finding.description and finding.cwe
   - Apply the fix from finding.suggestion
3. After fixing, PATCH /api/v1/findings/{findingId} with:
   - status: "resolved"
   - note: "Fixed by AI assistant"
4. Summarize what was fixed

Prioritize security issues first. Don't introduce new issues.
The scan ID is: [PASTE_SCAN_ID_HERE]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>

          {/* Deploy Gate */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🚫</span> Block Deploy if Critical Issues Exist
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Add a pre-deploy check that fails if unresolved critical issues exist.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Add a pre-deploy check to my CI/CD pipeline:

1. Get the latest scan: GET /api/v1/scans?limit=1
2. Fetch critical findings: GET /api/v1/findings?scanId={scanId}&severity=critical
3. Filter out resolved/false_positive (only count status: "open")
4. If any unresolved critical findings exist:
   - Print list of findings with file:line locations
   - Exit with error code 1 (fail the build)
5. If all clear, continue with deploy

Add this as a script or GitHub Action step.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Add a pre-deploy check to my CI/CD pipeline:

1. Get the latest scan: GET /api/v1/scans?limit=1
2. Fetch critical findings: GET /api/v1/findings?scanId={scanId}&severity=critical
3. Filter out resolved/false_positive (only count status: "open")
4. If any unresolved critical findings exist:
   - Print list of findings with file:line locations
   - Exit with error code 1 (fail the build)
5. If all clear, continue with deploy

Add this as a script or GitHub Action step.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* List Findings */}
      <section>
        <h2 className="text-2xl font-bold mb-4">List Findings</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Get All Findings for a Scan</h3>
            <p className="text-slate-400 text-sm mb-3">
              Retrieve all security and quality findings from a scan.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Build a function to fetch and display findings:

1. Call GET /api/v1/findings?scanId={scanId}
2. Accept optional filters: severity, category, tool
3. Return the findings array with pagination info
4. Group findings by severity for display
5. Calculate totals for dashboard summary

Handle errors and empty results gracefully.
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Build a function to fetch and display findings:

1. Call GET /api/v1/findings?scanId={scanId}
2. Accept optional filters: severity, category, tool
3. Return the findings array with pagination info
4. Group findings by severity for display
5. Calculate totals for dashboard summary

Handle errors and empty results gracefully.
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
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                  <code className="text-sm">/api/v1/findings</code>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Query Parameters</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Parameter</th>
                      <th className="text-left py-2 px-2">Type</th>
                      <th className="text-left py-2 px-2">Required</th>
                      <th className="text-left py-2 px-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>scanId</code></td>
                      <td className="py-2 px-2">string</td>
                      <td className="py-2 px-2">Yes</td>
                      <td className="py-2 px-2 text-muted-foreground">Scan ID to get findings for</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>severity</code></td>
                      <td className="py-2 px-2">string</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">critical, high, medium, low, info</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>category</code></td>
                      <td className="py-2 px-2">string</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">security, quality, performance, accessibility</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-2"><code>tool</code></td>
                      <td className="py-2 px-2">string</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">Filter by source tool (e.g., semgrep, eslint)</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2"><code>limit</code></td>
                      <td className="py-2 px-2">integer</td>
                      <td className="py-2 px-2">No</td>
                      <td className="py-2 px-2 text-muted-foreground">Max results (default: 50)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example Response</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`{
  "findings": [
    {
      "id": "fnd-001",
      "scanId": "scn-xyz789",
      "title": "SQL Injection vulnerability",
      "description": "User input is passed directly to SQL query without sanitization",
      "severity": "critical",
      "category": "security",
      "tool": "semgrep",
      "file": "src/api/users.ts",
      "line": 45,
      "code": "db.query(\`SELECT * FROM users WHERE id = \${userId}\`)",
      "suggestion": "Use parameterized queries to prevent SQL injection",
      "cwe": "CWE-89",
      "deduplicated": true,
      "duplicateCount": 2
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 50,
    "offset": 0
  }
}`}</pre>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* Get Finding Details */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Get Finding Details</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/findings/:findingId</code>
          </div>
          <p className="text-muted-foreground">
            Get detailed information about a specific finding, including AI-generated
            explanation and remediation steps.
          </p>
          <h4 className="font-semibold mt-4">Response includes</h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Full finding details and context</li>
            <li>AI-generated plain English explanation</li>
            <li>Step-by-step remediation guidance</li>
            <li>Related findings from other tools (if deduplicated)</li>
            <li>Code snippet with highlighted issue</li>
          </ul>
        </div>
      </section>

      {/* Update Finding Status */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Update Finding Status</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Mark Finding as Resolved or False Positive</h3>
            <p className="text-slate-400 text-sm mb-3">
              Update the status of findings as you fix them.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Add status update buttons to my findings view:

1. "Mark Fixed" button calls:
   PATCH /api/v1/findings/{findingId}
   Body: { "status": "resolved", "note": "Fixed in commit abc123" }

2. "False Positive" button calls:
   PATCH /api/v1/findings/{findingId}
   Body: { "status": "false_positive", "note": "Test data, not real" }

3. "Accept Risk" button calls:
   PATCH /api/v1/findings/{findingId}
   Body: { "status": "accepted", "note": "Risk accepted by team" }

Update the UI optimistically, refresh findings list on success.
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Findings API at https://bugrit.com/docs/api-reference/tests

Add status update buttons to my findings view:

1. "Mark Fixed" button calls:
   PATCH /api/v1/findings/{findingId}
   Body: { "status": "resolved", "note": "Fixed in commit abc123" }

2. "False Positive" button calls:
   PATCH /api/v1/findings/{findingId}
   Body: { "status": "false_positive", "note": "Test data, not real" }

3. "Accept Risk" button calls:
   PATCH /api/v1/findings/{findingId}
   Body: { "status": "accepted", "note": "Risk accepted by team" }

Update the UI optimistically, refresh findings list on success.
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
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-sm font-mono">PATCH</span>
                  <code className="text-sm">/api/v1/findings/:findingId</code>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
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
                      <td className="py-2 px-2"><code>status</code></td>
                      <td className="py-2 px-2">string</td>
                      <td className="py-2 px-2 text-muted-foreground">open, resolved, false_positive, accepted</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2"><code>note</code></td>
                      <td className="py-2 px-2">string</td>
                      <td className="py-2 px-2 text-muted-foreground">Optional note explaining the status change</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example Request</h4>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">{`curl -X PATCH https://bugrit.com/api/v1/findings/fnd-001 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "false_positive",
    "note": "This is test data, not a real vulnerability"
  }'`}</pre>
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* Severity Reference */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Severity Levels</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Severity</th>
              <th className="text-left py-2 px-2">Color</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>critical</code></td>
              <td className="py-2 px-2"><span className="inline-block w-4 h-4 bg-red-500 rounded"></span> Red</td>
              <td className="py-2 px-2 text-muted-foreground">Immediate action required. Security vulnerabilities, data exposure risks.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>high</code></td>
              <td className="py-2 px-2"><span className="inline-block w-4 h-4 bg-orange-500 rounded"></span> Orange</td>
              <td className="py-2 px-2 text-muted-foreground">Should be addressed soon. Significant security or quality issues.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>medium</code></td>
              <td className="py-2 px-2"><span className="inline-block w-4 h-4 bg-yellow-500 rounded"></span> Yellow</td>
              <td className="py-2 px-2 text-muted-foreground">Plan to address. Code quality, performance, or minor security issues.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>low</code></td>
              <td className="py-2 px-2"><span className="inline-block w-4 h-4 bg-blue-500 rounded"></span> Blue</td>
              <td className="py-2 px-2 text-muted-foreground">Nice to fix. Style issues, minor improvements.</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>info</code></td>
              <td className="py-2 px-2"><span className="inline-block w-4 h-4 bg-slate-400 rounded"></span> Gray</td>
              <td className="py-2 px-2 text-muted-foreground">Informational. Best practice suggestions.</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Category Reference */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Finding Categories</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Category</th>
              <th className="text-left py-2 px-2">What Gets Checked</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>security</code></td>
              <td className="py-2 px-2 text-muted-foreground">SQL injection, XSS, hardcoded secrets, vulnerable dependencies</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>quality</code></td>
              <td className="py-2 px-2 text-muted-foreground">Code complexity, unused code, type safety, best practices</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>performance</code></td>
              <td className="py-2 px-2 text-muted-foreground">Page load speed, bundle size, render blocking, memory leaks</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>accessibility</code></td>
              <td className="py-2 px-2 text-muted-foreground">WCAG compliance, screen reader support, keyboard navigation</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>standards</code></td>
              <td className="py-2 px-2 text-muted-foreground">Code formatting, naming conventions, documentation</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
