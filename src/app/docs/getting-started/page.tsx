export default function GettingStartedPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Quick Start</h1>
        <p className="text-lg text-muted-foreground">
          Run your first test or scan in under 5 minutes. Get a unified report combining
          test results and code analysis.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Most developers never set up security scanning because it&apos;s &quot;too complicated.&quot; With Bugrit, you can go from zero to your first security report in under 5 minutes—before you ship code that could get you hacked.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Catch issues before launch:</strong> Run a scan before your first deploy and know exactly what needs fixing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>No config required:</strong> We auto-detect your stack and run the right tools—no YAML files or setup wizards</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>One report, 69 tools:</strong> Instead of setting up ESLint, Prettier, audit-ci, and 22 other tools separately, get everything in one scan</span>
          </li>
        </ul>
      </div>

      {/* NEW: Real-Time Sessions */}
      <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>⚡</span> NEW: Real-Time Results
        </h2>
        <p className="text-muted-foreground mb-4">
          Watch your scan results <strong>stream in live</strong> as each tool completes. No more waiting for all 71 tools to finish!
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-background/80 rounded-lg text-sm">
            <strong className="text-green-600 dark:text-green-400">Before:</strong> Wait 2-5 min, then see all results
          </div>
          <div className="p-3 bg-background/80 rounded-lg text-sm">
            <strong className="text-green-600 dark:text-green-400">Now:</strong> See results the instant each tool finishes
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Use the new <a href="/docs/api-reference/sessions" className="text-primary underline">Sessions API</a> for streaming results with automatic credit refunds for failed tools.
        </p>
      </div>

      {/* Two Paths */}
      <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
        <h2 className="text-xl font-bold mb-4">Choose Your Path</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🧪</span>
              <span className="font-semibold">Run Tests</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Run Playwright, Appium, or Tauri tests on our infrastructure
            </p>
            <a href="#testing" className="text-sm text-primary hover:underline">Jump to testing setup</a>
          </div>
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔍</span>
              <span className="font-semibold">Scan Code</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Analyze your code with 69 security, quality, and performance tools
            </p>
            <a href="#scanning" className="text-sm text-primary hover:underline">Jump to scanning setup</a>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-bold mb-4">1. Create an API Key</h2>
          <p className="text-muted-foreground mb-4">
            Navigate to{' '}
            <a href="/settings/api-keys" className="text-primary hover:underline">
              Settings &rarr; API Keys
            </a>{' '}
            and create a new API key. Copy it immediately as it will only be shown once.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">2. Register Your Application</h2>
          <p className="text-muted-foreground mb-4">
            Create an application to organize your tests and scans:
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/applications \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My App",
    "platform": "web"
  }'`}</pre>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            Platform options: <code className="bg-muted px-1 rounded">web</code>, <code className="bg-muted px-1 rounded">mobile</code>, <code className="bg-muted px-1 rounded">desktop</code>, <code className="bg-muted px-1 rounded">hybrid</code>
          </p>
        </section>

        {/* TESTING PATH */}
        <section id="testing" className="pt-4 border-t">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🧪</span> 3a. Run Tests
          </h2>
          <p className="text-muted-foreground mb-4">
            Submit your code with tests to run them on our infrastructure. Bugrit supports
            Playwright, Appium, and Tauri.
          </p>

          <h4 className="font-semibold mb-2">Playwright (Web E2E)</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
            <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "branch": "main",
    "testConfig": {
      "playwright": {
        "enabled": true,
        "baseUrl": "https://staging.your-app.com",
        "browsers": ["chromium", "firefox", "webkit"]
      }
    }
  }'`}</pre>
          </div>

          <h4 className="font-semibold mb-2">Appium (Mobile)</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
            <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "applicationId=app-abc123" \\
  -F "sourceType=mobile" \\
  -F "appFile=@./MyApp.apk" \\
  -F "testFile=@./tests.zip" \\
  -F 'testConfig={
    "appium": {
      "enabled": true,
      "devices": ["Pixel 8", "iPhone 15 Pro"],
      "osVersions": ["14", "17.0"]
    }
  }'`}</pre>
          </div>

          <h4 className="font-semibold mb-2">Tauri (Desktop)</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/tauri-app",
    "branch": "main",
    "testConfig": {
      "tauri": {
        "enabled": true,
        "platforms": ["windows", "macos", "linux"]
      }
    }
  }'`}</pre>
          </div>
        </section>

        {/* SCANNING PATH */}
        <section id="scanning" className="pt-4 border-t">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <span>🔍</span> 3b. Scan Code
          </h2>
          <p className="text-muted-foreground mb-4">
            Submit your code for analysis with 69 tools covering security, quality, dependencies, and more.
          </p>

          <h4 className="font-semibold mb-2">Option A: Scan a GitHub Repository</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
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

          <h4 className="font-semibold mb-2">Option B: Scan a Live URL</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
            <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "url",
    "targetUrl": "https://your-app.com"
  }'`}</pre>
          </div>

          <h4 className="font-semibold mb-2">Option C: Upload Source Code</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "applicationId=app-abc123" \\
  -F "sourceType=upload" \\
  -F "file=@./source.zip"`}</pre>
          </div>
        </section>

        {/* COMBINED */}
        <section className="pt-4 border-t">
          <h2 className="text-2xl font-bold mb-4">3c. Run Tests AND Scan (Recommended)</h2>
          <p className="text-muted-foreground mb-4">
            Get the full picture by running tests and scanning code in a single request:
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "branch": "main",
    "testConfig": {
      "playwright": {
        "enabled": true,
        "baseUrl": "https://staging.your-app.com",
        "browsers": ["chromium", "firefox"]
      }
    },
    "scanConfig": {
      "enabled": true,
      "tools": "all"
    }
  }'`}</pre>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">4. Check Status</h2>

          {/* NEW: Real-Time Polling */}
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>⚡</span> Recommended: Real-Time Streaming (Sessions API)
            </h4>
            <p className="text-muted-foreground text-sm mb-3">
              See results the moment each tool finishes. Start a session, then poll for live updates:
            </p>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-3">
              <pre className="text-sm">{`# Start a streaming session
curl -X POST https://bugrit.com/api/sessions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target": { "url": "https://your-app.com" },
    "categories": ["security", "code-quality"]
  }'

# Response includes sessionId and poll URLs
# { "sessionId": "sess-abc123", "pollUrls": { ... } }

# Poll for live progress (lightweight)
curl "https://bugrit.com/api/sessions/sess-abc123?progress=true" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Response: { "status": "running", "progress": { "completed": 23, "total": 71, "percentage": 32 } }

# Get only NEW results since last poll (efficient)
curl "https://bugrit.com/api/sessions/sess-abc123?since=2026-01-22T10:30:00Z" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
            </div>
            <p className="text-xs text-muted-foreground">
              <a href="/docs/api-reference/sessions" className="text-primary underline">View full Sessions API docs</a> for details on incremental polling and credit refunds.
            </p>
          </div>

          <h4 className="font-semibold mb-2">Classic: Wait for Completion (Scans API)</h4>
          <p className="text-muted-foreground mb-4">
            Poll the scan status until tests and tools have completed:
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl https://bugrit.com/api/v1/scans/scn-xyz789 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
          </div>
          <p className="text-muted-foreground mt-4">
            Response (completed):
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`{
  "scan": {
    "id": "scn-xyz789",
    "status": "completed",
    "testing": {
      "total": 48,
      "passed": 46,
      "failed": 2,
      "frameworks": ["playwright", "appium"]
    },
    "scanning": {
      "toolsTotal": 69,
      "toolsCompleted": 69,
      "summary": {
        "critical": 2,
        "high": 5,
        "medium": 12,
        "low": 28
      }
    },
    "reportId": "rpt-abc123",
    "completedAt": "2026-01-20T10:30:47Z"
  }
}`}</pre>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">5. View Your Report</h2>
          <p className="text-muted-foreground mb-4">
            Once complete, view your unified report in the{' '}
            <a href="/dashboard" className="text-primary hover:underline">
              Dashboard
            </a>{' '}
            or retrieve it via API:
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl https://bugrit.com/api/v1/reports/rpt-abc123 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
          </div>
          <p className="text-muted-foreground mt-4">
            The unified report includes:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
            <li>Test results from Playwright, Appium, and Tauri with screenshots/videos</li>
            <li>Deduplicated findings from all 69 scanning tools</li>
            <li>AI-generated plain English explanations</li>
            <li>Prioritized issues by severity</li>
            <li>Correlation between test failures and code issues</li>
            <li>Step-by-step remediation guidance</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Testing Docs</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/docs/integrations/playwright" className="text-primary hover:underline">
                    Playwright Integration
                  </a>
                </li>
                <li>
                  <a href="/docs/integrations/appium" className="text-primary hover:underline">
                    Appium Integration
                  </a>
                </li>
                <li>
                  <a href="/docs/integrations/tauri" className="text-primary hover:underline">
                    Tauri Integration
                  </a>
                </li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Scanning & More</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/docs/api-reference/sessions" className="text-primary hover:underline flex items-center gap-1">
                    <span className="text-green-500">⚡</span> Sessions API (Real-Time)
                  </a>
                </li>
                <li>
                  <a href="/docs/submitting-apps" className="text-primary hover:underline">
                    All Submission Methods
                  </a>
                </li>
                <li>
                  <a href="/docs/reports" className="text-primary hover:underline">
                    Understanding AI Reports
                  </a>
                </li>
                <li>
                  <a href="/docs/integrations/ci-cd" className="text-primary hover:underline">
                    CI/CD Integration
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
