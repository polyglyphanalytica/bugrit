import { VibePromptTabs } from '@/components/docs/vibe-prompt';

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

      {/* VIBE CODING PROMPTS - FIRST */}
      <VibePromptTabs
        prompts={[
          {
            label: 'Scan My Code',
            description: 'Security scan a GitHub repository or live URL',
            prompt: `Help me set up Bugrit to scan my code for security issues.

1. First, I need to create an API key at https://bugrit.dev/settings/api-keys

2. Then register my app and run a scan. Here's what I want:
   - Repository: [MY_GITHUB_REPO_URL]
   - Branch: main
   - Run all 150 security and quality modules

3. Use this API call:
   POST https://bugrit.com/api/v1/scans
   Headers: Authorization: Bearer MY_API_KEY
   Body: {
     "sourceType": "github",
     "repoUrl": "[MY_GITHUB_REPO_URL]",
     "branch": "main",
     "scanConfig": { "tools": "all" }
   }

4. Poll GET /api/v1/scans/{scanId} until status is "completed"

5. Show me the results summary with critical/high/medium/low counts

Please help me run this scan and explain any issues found.`,
          },
          {
            label: 'Run Playwright Tests',
            description: 'Run E2E tests on Bugrit infrastructure',
            prompt: `Help me run my Playwright tests on Bugrit's cloud infrastructure.

1. First, I need an API key from https://bugrit.dev/settings/api-keys

2. My setup:
   - Repository: [MY_GITHUB_REPO_URL]
   - Staging URL: [MY_STAGING_URL]
   - I want to test on Chromium, Firefox, and WebKit

3. Use this API call:
   POST https://bugrit.com/api/v1/scans
   Headers: Authorization: Bearer MY_API_KEY
   Body: {
     "sourceType": "github",
     "repoUrl": "[MY_GITHUB_REPO_URL]",
     "branch": "main",
     "testConfig": {
       "playwright": {
         "enabled": true,
         "baseUrl": "[MY_STAGING_URL]",
         "browsers": ["chromium", "firefox", "webkit"]
       }
     }
   }

4. Wait for completion and show me the test results with any failures.

Help me set this up and run the tests.`,
          },
          {
            label: 'Full Scan + Tests',
            description: 'Run both tests and security scan together',
            prompt: `Help me run a complete Bugrit scan with both Playwright tests AND security scanning.

1. Get API key from https://bugrit.dev/settings/api-keys

2. My setup:
   - Repository: [MY_GITHUB_REPO_URL]
   - Staging URL: [MY_STAGING_URL]
   - Run Playwright on all browsers
   - Run all 150 security/quality modules

3. Use this combined API call:
   POST https://bugrit.com/api/v1/scans
   Headers: Authorization: Bearer MY_API_KEY
   Body: {
     "sourceType": "github",
     "repoUrl": "[MY_GITHUB_REPO_URL]",
     "branch": "main",
     "testConfig": {
       "playwright": {
         "enabled": true,
         "baseUrl": "[MY_STAGING_URL]",
         "browsers": ["chromium", "firefox"]
       }
     },
     "scanConfig": {
       "enabled": true,
       "tools": "all"
     }
   }

4. Poll for completion, then show me:
   - Test results (passed/failed)
   - Security findings by severity
   - Top issues to fix first

Help me run this and create a fix plan for any issues.`,
          },
          {
            label: 'Mobile (Appium)',
            description: 'Test mobile app on real devices',
            prompt: `Help me test my mobile app using Bugrit's Appium infrastructure.

1. Get API key from https://bugrit.dev/settings/api-keys

2. My setup:
   - App file: ./MyApp.apk (or .ipa for iOS)
   - Test files: ./tests/ directory with Appium tests
   - Devices: Pixel 8, iPhone 15 Pro
   - OS versions: Android 14, iOS 17

3. Upload and run tests:
   POST https://bugrit.com/api/v1/scans
   Headers: Authorization: Bearer MY_API_KEY
   Form data:
     - sourceType: mobile
     - appFile: @./MyApp.apk
     - testFile: @./tests.zip
     - testConfig: {
         "appium": {
           "enabled": true,
           "devices": ["Pixel 8", "iPhone 15 Pro"],
           "osVersions": ["14", "17.0"]
         }
       }

4. Show me results with screenshots of any failures.

Help me set this up for my mobile app.`,
          },
        ]}
      />

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
            <span><strong>One report, 150 modules:</strong> Instead of setting up ESLint, Prettier, audit-ci, and 22 other modules separately, get everything in one scan</span>
          </li>
        </ul>
      </div>

      {/* Technical Details Below */}
      <details className="group">
        <summary className="cursor-pointer text-lg font-semibold flex items-center gap-2 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          View Technical Details & Code Examples
        </summary>

        <div className="mt-4 space-y-6 pl-4 border-l-2 border-muted">
          {/* NEW: Real-Time Sessions */}
          <div className="p-6 bg-gradient-to-br from-green-500/20 to-green-500/5 border-2 border-green-500/40 rounded-xl">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span>⚡</span> NEW: Real-Time Results
            </h2>
            <p className="text-muted-foreground mb-4">
              Watch your scan results <strong>stream in live</strong> as each module completes. No more waiting for all 150 modules to finish!
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

          <section id="scanning" className="pt-4 border-t">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span>🔍</span> 3. Scan Code
            </h2>
            <p className="text-muted-foreground mb-4">
              Submit your code for analysis with 150 modules covering security, quality, dependencies, and more.
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

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Check Status</h2>
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
    "scanning": {
      "toolsTotal": 150,
      "toolsCompleted": 150,
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
              <li>Deduplicated findings from all 150 scanning modules</li>
              <li>AI-generated plain English explanations</li>
              <li>Prioritized issues by severity</li>
              <li>Step-by-step remediation guidance</li>
            </ul>
          </section>
        </div>
      </details>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Set Up Automation</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Automatically scan on every push or PR
            </p>
            <a href="/docs/clever-automation" className="text-sm text-primary hover:underline">
              Clever Automation Guide →
            </a>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Add Trust Badge</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Show your Vibe Score on your website
            </p>
            <a href="/dashboard/trust-badge" className="text-sm text-primary hover:underline">
              Configure Trust Badge →
            </a>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Fix Issues Automatically</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Let AI generate fixes for your issues
            </p>
            <a href="/docs/vibe-coding" className="text-sm text-primary hover:underline">
              Vibe Coding Guide →
            </a>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">API Reference</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Full API documentation
            </p>
            <a href="/docs/api-reference/scans" className="text-sm text-primary hover:underline">
              Scans API Reference →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
