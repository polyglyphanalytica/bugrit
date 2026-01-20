'use client';

export default function VibeCodingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Vibe Coding with Bugrit</h1>
        <p className="text-lg text-muted-foreground">
          Copy-paste these prompts into your AI assistant (Claude, Cursor, Copilot, etc.) to integrate Bugrit into your app without writing code from scratch.
        </p>
      </div>

      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
        <p className="text-sm">
          <strong>Pro tip:</strong> These prompts work best when your AI assistant has access to your codebase.
          Point it at your project folder first, then paste these prompts.
        </p>
      </div>

      {/* Getting Started */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Getting Started</h2>
        <p className="text-muted-foreground">
          First, get your AI assistant familiar with Bugrit&apos;s API.
        </p>

        <PromptCard
          title="Learn the Bugrit API"
          description="Have your AI read our API docs and understand how to integrate"
          prompt={`Read the Bugrit API documentation at these URLs to understand how to integrate:
- Scans API: https://bugrit.dev/docs/api-reference/scans
- Reports API: https://bugrit.dev/docs/api-reference/reports
- Authentication: https://bugrit.dev/docs/authentication

Summarize:
1. How to authenticate (API key in Authorization header)
2. How to trigger a scan (POST /api/v1/scans)
3. How to check scan status (GET /api/v1/scans/{scanId})
4. How to retrieve scan results and reports

Then suggest how we could integrate this into our deployment pipeline.`}
        />
      </section>

      {/* Writing Test Scripts */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Writing Test Scripts</h2>
        <p className="text-muted-foreground">
          Get your AI to write end-to-end tests for your app.
        </p>

        <PromptCard
          title="Generate Web App Tests"
          description="Create Playwright tests for your web application"
          prompt={`Read the Bugrit Playwright integration docs at:
https://bugrit.dev/docs/integrations/playwright

Then look at my web application and write Playwright end-to-end tests that cover:
1. User can load the homepage
2. User can sign up / log in
3. Main user flows work correctly
4. Forms validate properly
5. Error states are handled

Create a tests/ folder with the test files. Use best practices:
- Use page object pattern
- Add descriptive test names
- Include setup and teardown
- Test both happy path and error cases

Output the tests in a format compatible with Bugrit's e2eConfig options.`}
        />

        <PromptCard
          title="Generate Mobile App Tests"
          description="Create tests for your React Native / Flutter app"
          prompt={`Read the Bugrit Appium integration docs at:
https://bugrit.dev/docs/integrations/appium

Then look at my mobile app and write end-to-end tests that cover:
1. App launches successfully
2. User authentication flow
3. Main navigation works
4. Key features function correctly
5. Offline behavior (if applicable)

The tests should work with Appium/WebdriverIO. Include:
- iOS and Android selectors
- Touch gesture handling
- Wait strategies for async operations
- Screenshots on failure

Format for Bugrit's mobileConfig options as documented.`}
        />

        <PromptCard
          title="Generate Desktop App Tests"
          description="Create tests for your Electron/Tauri app"
          prompt={`Read the Bugrit Tauri integration docs at:
https://bugrit.dev/docs/integrations/tauri

Then look at my desktop application and write tests that verify:
1. App launches on all platforms (Mac, Windows, Linux)
2. Window management works
3. Menu items function correctly
4. File system operations work
5. Native features (clipboard, notifications, etc.)

Create tests compatible with Bugrit's testConfig.tauri options. Include platform-specific considerations.`}
        />
      </section>

      {/* Triggering Scans */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Triggering Scans via API</h2>
        <p className="text-muted-foreground">
          Integrate Bugrit scans into your deployment pipeline.
        </p>

        <PromptCard
          title="Add Post-Deploy Scan"
          description="Trigger a Bugrit scan after every deployment"
          prompt={`Read the Bugrit Scans API documentation at:
https://bugrit.dev/docs/api-reference/scans

Then add a post-deployment step that triggers a Bugrit scan:

1. After successful deploy, POST to https://bugrit.dev/api/v1/scans with:
   - applicationId: from env.BUGGERED_APP_ID
   - sourceType: "github" (or "url" for live sites)
   - repoUrl: your repo URL (or targetUrl for live sites)
2. Poll GET /api/v1/scans/{scanId} until status is "completed"
3. Check the summary object for critical/high/medium/low counts
4. Fail the pipeline if summary.critical > 0
5. Post scan summary to Slack/Discord (optional)

Use BUGGERED_API_KEY from environment variable.
Create the integration for my deployment platform (GitHub Actions / Vercel / Netlify / etc.)`}
        />

        <PromptCard
          title="GitHub Action for Bugrit"
          description="Create a reusable GitHub Action"
          prompt={`Read these Bugrit docs:
- Scans API: https://bugrit.dev/docs/api-reference/scans
- CI/CD Integration: https://bugrit.dev/docs/integrations/ci-cd
- Authentication: https://bugrit.dev/docs/authentication

Create a GitHub Action workflow that:

1. Triggers on push to main branch
2. Calls POST /api/v1/scans with sourceType: "github" and my repo URL
3. Polls GET /api/v1/scans/{scanId} every 10 seconds until completed (max 5 minutes)
4. Reads summary.critical and summary.high from the response
5. Comments scan results on the commit
6. Fails the workflow if critical or high severity issues found

Use secrets.BUGGERED_API_KEY for the Authorization: Bearer header.
Include error handling and timeout logic.`}
        />

        <PromptCard
          title="Pre-commit Hook"
          description="Scan code before committing"
          prompt={`Read the Bugrit Scans API at:
https://bugrit.dev/docs/api-reference/scans

Create a pre-commit hook using husky that:

1. Runs a quick Bugrit scan on staged files using POST /api/v1/scans with sourceType: "upload"
2. Polls for completion using GET /api/v1/scans/{scanId}
3. Blocks commit if summary.critical > 0
4. Shows a summary of findings from the response
5. Allows bypass with --no-verify for emergencies

Keep it fast - only scan changed files, not the whole repo.
Use BUGGERED_API_KEY from environment.`}
        />
      </section>

      {/* Consuming Reports */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Displaying Reports in Your App</h2>
        <p className="text-muted-foreground">
          Show Bugrit scan results in your own dashboard.
        </p>

        <PromptCard
          title="Fetch and Display Scan Results"
          description="Build a component to show scan results"
          prompt={`Read these Bugrit API docs:
- Reports API: https://bugrit.dev/docs/api-reference/reports
- Findings API: https://bugrit.dev/docs/api-reference/tests

Create a React component that:

1. Fetches scan report from GET /api/v1/scans/{scanId}/report
2. Displays the summary object with counts grouped by severity (Critical, High, Medium, Low)
3. Maps over the findings array to show tool-specific results
4. Shows each finding with: title, severity, file, line, and tool
5. Includes expandable details for each finding showing description and suggestion
6. Has a summary header with total counts from summary.total

Use my existing UI components and styling.
Handle loading, error, and empty states.
Make it responsive for mobile.`}
        />

        <PromptCard
          title="Security Dashboard Widget"
          description="Add a security status widget to your dashboard"
          prompt={`Read these Bugrit API docs:
- Scans API: https://bugrit.dev/docs/api-reference/scans
- Reports API: https://bugrit.dev/docs/api-reference/reports

Create a dashboard widget that shows:

1. Latest scan status from GET /api/v1/scans?limit=1 - check the status field
2. Trend chart of issues over last 10 scans from GET /api/v1/scans?limit=10
3. Use each scan's summary.critical/high/medium/low for the chart data
4. Breakdown by category (Security, Quality, Dependencies)
5. Quick actions: "Run New Scan" button that POSTs to /api/v1/scans

Match my app's design system.
Use BUGGERED_API_KEY from environment.`}
        />

        <PromptCard
          title="Slack/Discord Bot for Reports"
          description="Get scan results posted to your team chat"
          prompt={`Read the Bugrit Scans API at:
https://bugrit.dev/docs/api-reference/scans

Create a simple bot/webhook integration that:

1. Polls GET /api/v1/scans?limit=1 every few minutes to check for new completed scans
2. When a scan completes (status: "completed"), posts summary to Slack/Discord
3. Format message with:
   - Pass/fail based on summary.critical === 0
   - Critical, high, medium, low counts from summary object
   - Link to full report: https://bugrit.dev/scans/{scanId}
4. Use red color for failures (critical > 0), green for pass
5. Tag relevant team members if summary.critical > 0

Provide setup instructions for both Slack and Discord webhooks.
Use BUGGERED_API_KEY from environment.`}
        />
      </section>

      {/* Advanced Prompts */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Advanced Integrations</h2>
        <p className="text-muted-foreground">
          More sophisticated integrations for power users.
        </p>

        <PromptCard
          title="Auto-fix Security Issues"
          description="Let AI fix issues found by Bugrit"
          prompt={`Read the Bugrit Findings API at:
https://bugrit.dev/docs/api-reference/tests

Look at the Bugrit scan results I'm pasting below and:

1. Parse each finding object - it has: title, severity, file, line, description, suggestion
2. For each security issue (category: "security"), explain what's wrong
3. Read the file at finding.file and go to finding.line
4. Apply the fix from finding.suggestion (or create one if not provided)
5. After fixing, call PATCH /api/v1/findings/{findingId} with status: "resolved"
6. Run the scan again to verify fixes worked

Scan results:
[PASTE YOUR SCAN RESULTS HERE]

Prioritize critical and high severity issues first.
Don't introduce new issues while fixing.`}
        />

        <PromptCard
          title="Custom Scan Configuration"
          description="Create a tailored scanning config"
          prompt={`Read the Bugrit documentation:
- Scans API: https://bugrit.dev/docs/api-reference/scans
- Submitting Apps: https://bugrit.dev/docs/submitting-apps

Create a Bugrit scan configuration for my project that:

1. Reviews the sourceType options: url, github, gitlab, upload, docker, npm, mobile
2. Choose the right sourceType for my stack
3. Configure appropriate options (repoUrl, branch, targetUrl, etc.)
4. Set up ignore patterns for: node_modules, dist, coverage, *.test.ts

Output as a JSON object I can use with POST /api/v1/scans.
My stack: [React/Vue/Angular], [Node/Python/Go], [PostgreSQL/MongoDB]`}
        />

        <PromptCard
          title="Weekly Security Report"
          description="Generate executive summaries"
          prompt={`Read these Bugrit API docs:
- Scans API: https://bugrit.dev/docs/api-reference/scans
- Reports API: https://bugrit.dev/docs/api-reference/reports

Create a script that runs weekly and:

1. Fetches all scans from the past week via GET /api/v1/scans with date filters
2. For each scan, collect summary.critical/high/medium/low counts
3. Generates an executive summary with:
   - Total scans run (array length)
   - Issues found vs resolved (compare with previous week)
   - Top recurring issues
   - Security posture trend (total issues this week vs last week)
4. Formats as HTML email and sends to stakeholders
5. Includes charts/graphs for visual summary

Use BUGGERED_API_KEY from environment.
Use my existing email service for sending.`}
        />
      </section>

      {/* API Quick Reference */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">API Quick Reference</h2>
        <p className="text-muted-foreground">
          Copy these snippets for common API operations. Full docs at{' '}
          <a href="/docs/api-reference/scans" className="text-primary hover:underline">bugrit.dev/docs/api-reference</a>
        </p>

        <div className="bg-muted rounded-lg p-4 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Authentication</h4>
            <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`// All requests need this header
Authorization: Bearer YOUR_API_KEY`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Start a Scan</h4>
            <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`POST /api/v1/scans
{
  "applicationId": "your-app-id",
  "sourceType": "github",
  "repoUrl": "https://github.com/username/repo",
  "branch": "main"
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Check Scan Status</h4>
            <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`GET /api/v1/scans/{scanId}

// Response includes:
// - status: "pending" | "running" | "completed" | "failed"
// - summary: { critical, high, medium, low }
// - reportId: "rpt-xxx" (when completed)`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Get Report</h4>
            <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`GET /api/v1/scans/{scanId}/report

// Response includes:
// - summary: { critical, high, medium, low, total, passRate }
// - findings: [{ title, severity, file, line, tool, suggestion }]`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

function PromptCard({ title, description, prompt }: { title: string; description: string; prompt: string }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-4 bg-muted/50">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="p-4">
        <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
          {prompt}
        </pre>
        <button
          className="mt-3 text-sm text-primary hover:underline"
          onClick={() => {
            if (typeof navigator !== 'undefined') {
              navigator.clipboard.writeText(prompt);
            }
          }}
        >
          Copy prompt
        </button>
      </div>
    </div>
  );
}
