'use client';

export default function FindingsApiPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Findings API</h1>
        <p className="text-lg text-muted-foreground">
          Retrieve and manage findings from your scans. Findings are the individual issues
          discovered by our 25 analysis tools.
        </p>
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

      {/* Vibe Coding Section */}
      <div className="p-6 bg-slate-950 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white flex items-center gap-2">
          <span>🤖</span> Vibe Coding Prompts
        </h2>
        <p className="text-slate-400 mb-4 text-sm">
          Copy these prompts into your AI assistant to work with findings.
        </p>

        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Auto-Create GitHub Issues for Critical Findings</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read the Bugrit Findings API documentation at:
https://bugrit.dev/docs/api-reference/tests

Then create a script that auto-creates GitHub issues for critical findings:

1. Fetch findings from GET /api/v1/findings?scanId={scanId}&severity=critical
2. Response contains findings array - each has: id, title, description, severity, file, line, suggestion
3. For each finding, check if a GitHub issue already exists (search by finding.title)
4. If no issue exists, create one with:
   - Title: "[Security] {finding.title}"
   - Body: Include finding.description, finding.file, finding.line, and finding.suggestion
   - Labels: ["security", "critical", "buggered"]
5. After creating, update finding status via PATCH /api/v1/findings/{finding.id} with status: "open"
6. Log how many issues were created

Use GITHUB_TOKEN and BUGGERED_API_KEY from environment.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read the Bugrit Findings API documentation at:\nhttps://bugrit.dev/docs/api-reference/tests\n\nThen create a script that auto-creates GitHub issues for critical findings:\n\n1. Fetch findings from GET /api/v1/findings?scanId={scanId}&severity=critical\n2. Response contains findings array - each has: id, title, description, severity, file, line, suggestion\n3. For each finding, check if a GitHub issue already exists (search by finding.title)\n4. If no issue exists, create one with:\n   - Title: "[Security] {finding.title}"\n   - Body: Include finding.description, finding.file, finding.line, and finding.suggestion\n   - Labels: ["security", "critical", "buggered"]\n5. After creating, update finding status via PATCH /api/v1/findings/{finding.id} with status: "open"\n6. Log how many issues were created\n\nUse GITHUB_TOKEN and BUGGERED_API_KEY from environment.`)}>Copy prompt</button>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Findings List Component with Filters</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read the Bugrit Findings API documentation at:
https://bugrit.dev/docs/api-reference/tests

Then create a React component that displays findings from a Bugrit scan:

1. Accept scanId as a prop
2. Fetch GET /api/v1/findings?scanId={scanId}
3. Response has findings array and pagination object
4. Each finding contains: id, title, description, severity, category, tool, file, line, suggestion
5. Add filter controls using query params:
   - severity: critical, high, medium, low, info
   - category: security, quality, performance, accessibility
6. Display findings as a list with:
   - Severity badge (color-coded based on finding.severity)
   - finding.title and finding.file:finding.line location
   - Expandable details showing finding.description and finding.suggestion
7. Add status update via PATCH /api/v1/findings/{finding.id} with status: "resolved" or "false_positive"
8. Use pagination.total, pagination.limit, pagination.offset for paging

Match my existing design system. Handle loading, error, and empty states.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read the Bugrit Findings API documentation at:\nhttps://bugrit.dev/docs/api-reference/tests\n\nThen create a React component that displays findings from a Bugrit scan:\n\n1. Accept scanId as a prop\n2. Fetch GET /api/v1/findings?scanId={scanId}\n3. Response has findings array and pagination object\n4. Each finding contains: id, title, description, severity, category, tool, file, line, suggestion\n5. Add filter controls using query params:\n   - severity: critical, high, medium, low, info\n   - category: security, quality, performance, accessibility\n6. Display findings as a list with:\n   - Severity badge (color-coded based on finding.severity)\n   - finding.title and finding.file:finding.line location\n   - Expandable details showing finding.description and finding.suggestion\n7. Add status update via PATCH /api/v1/findings/{finding.id} with status: "resolved" or "false_positive"\n8. Use pagination.total, pagination.limit, pagination.offset for paging\n\nMatch my existing design system. Handle loading, error, and empty states.`)}>Copy prompt</button>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">AI-Powered Auto-Fix</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read the Bugrit Findings API documentation at:
https://bugrit.dev/docs/api-reference/tests

Then look at the Bugrit findings and fix them:

1. Fetch findings from GET /api/v1/findings?scanId={scanId}&severity=critical
2. Response contains findings array with: id, title, description, file, line, code, suggestion, cwe
3. For each finding:
   - Read the file at finding.file
   - Go to finding.line and review finding.code snippet
   - Understand the vulnerability from finding.description and finding.cwe
   - Apply the fix from finding.suggestion (or create appropriate fix if not provided)
4. After fixing, call PATCH /api/v1/findings/{finding.id} with:
   - status: "resolved"
   - note: "Fixed by AI assistant"
5. Trigger new scan via POST /api/v1/scans to verify fixes worked
6. Summarize what was fixed and any remaining issues

Prioritize category: "security" issues. Don't introduce new issues while fixing.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read the Bugrit Findings API documentation at:\nhttps://bugrit.dev/docs/api-reference/tests\n\nThen look at the Bugrit findings and fix them:\n\n1. Fetch findings from GET /api/v1/findings?scanId={scanId}&severity=critical\n2. Response contains findings array with: id, title, description, file, line, code, suggestion, cwe\n3. For each finding:\n   - Read the file at finding.file\n   - Go to finding.line and review finding.code snippet\n   - Understand the vulnerability from finding.description and finding.cwe\n   - Apply the fix from finding.suggestion (or create appropriate fix if not provided)\n4. After fixing, call PATCH /api/v1/findings/{finding.id} with:\n   - status: "resolved"\n   - note: "Fixed by AI assistant"\n5. Trigger new scan via POST /api/v1/scans to verify fixes worked\n6. Summarize what was fixed and any remaining issues\n\nPrioritize category: "security" issues. Don't introduce new issues while fixing.`)}>Copy prompt</button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">List Findings</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/findings</code>
          </div>
          <p className="text-muted-foreground">
            List all findings for a scan. Filter by severity, tool, or category.
          </p>

          <h4 className="font-semibold">Query Parameters</h4>
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

          <h4 className="font-semibold mt-4">Example Request</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl "https://bugrit.dev/api/v1/findings?scanId=scn-xyz789&severity=critical" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
          </div>

          <h4 className="font-semibold mt-4">Example Response</h4>
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
    },
    {
      "id": "fnd-002",
      "scanId": "scn-xyz789",
      "title": "Hardcoded API key detected",
      "description": "API key is hardcoded in source code",
      "severity": "critical",
      "category": "security",
      "tool": "trivy",
      "file": "src/config.ts",
      "line": 12,
      "suggestion": "Move API keys to environment variables"
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
      </section>

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

      <section>
        <h2 className="text-2xl font-bold mb-4">Update Finding Status</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-sm font-mono">PATCH</span>
            <code className="text-sm">/api/v1/findings/:findingId</code>
          </div>
          <p className="text-muted-foreground">
            Update the status of a finding. Mark as resolved, false positive, or add notes.
          </p>

          <h4 className="font-semibold">Request Body</h4>
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

          <h4 className="font-semibold mt-4">Example</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X PATCH https://bugrit.dev/api/v1/findings/fnd-001 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "false_positive",
    "note": "This is test data, not a real vulnerability"
  }'`}</pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Finding Severity Levels</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Severity</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2"><code>critical</code></td>
              <td className="py-2 px-2 text-muted-foreground">Immediate action required. Security vulnerabilities, data exposure risks.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>high</code></td>
              <td className="py-2 px-2 text-muted-foreground">Should be addressed soon. Significant security or quality issues.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>medium</code></td>
              <td className="py-2 px-2 text-muted-foreground">Plan to address. Code quality, performance, or minor security issues.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>low</code></td>
              <td className="py-2 px-2 text-muted-foreground">Nice to fix. Style issues, minor improvements.</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>info</code></td>
              <td className="py-2 px-2 text-muted-foreground">Informational. Best practice suggestions.</td>
            </tr>
          </tbody>
        </table>
      </section>

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
