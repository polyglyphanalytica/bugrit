'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function PlaywrightIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Playwright E2E Tests</h1>
        <p className="text-lg text-muted-foreground">
          Include your Playwright tests with your code. Bugrit runs them alongside
          115 analysis tools and includes results in your unified report.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'Write Tests',
            description: 'Generate E2E tests for my app',
            prompt: `Read the Bugrit Playwright docs at https://bugrit.com/docs/integrations/playwright

Look at my web application and write Playwright E2E tests:

1. User can load the homepage
2. User can sign up / log in
3. Main user flows work correctly
4. Forms validate properly
5. Error states are handled

Create a tests/ folder with the test files.
Use page object pattern and descriptive test names.
My stack: [YOUR_STACK]`
          },
          {
            label: 'Scan with Tests',
            description: 'Run tests during Bugrit scan',
            prompt: `Read the Bugrit docs:
- Playwright: https://bugrit.com/docs/integrations/playwright
- Scans API: https://bugrit.com/docs/api-reference/scans

Set up Bugrit to run my Playwright tests during scans:

1. POST to /api/v1/scans with e2eConfig:
   - enabled: true
   - baseUrl: my staging URL
   - browsers: ["chromium", "firefox"]
2. Check report.e2eTests for results
3. Fail build if tests fail

My stack: [YOUR_STACK]`
          },
          {
            label: 'CI Integration',
            description: 'Add to GitHub Actions',
            prompt: `Read the Bugrit Playwright integration docs at https://bugrit.com/docs/integrations/playwright

Add Playwright tests to my CI pipeline:

1. Create GitHub Action that runs on PR
2. Start staging environment
3. Trigger Bugrit scan with e2eConfig
4. Post test results as PR comment
5. Fail if any tests fail

Use secrets.BUGRIT_API_KEY. Include screenshots on failure.`
          },
        ]}
      />

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Code analysis catches potential bugs. E2E tests catch actual bugs.
          Running both together gives you complete coverage.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>One report:</strong> Test results and code analysis in a single unified view</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>All browsers:</strong> Chrome, Firefox, Safari tested on our infrastructure</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Visual evidence:</strong> Screenshots and videos when tests fail</span>
          </li>
        </ul>
      </div>

      {/* How It Works - Simple */}
      <div className="p-4 bg-muted/50 rounded-xl">
        <h3 className="font-semibold mb-3">How It Works</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li><strong>1.</strong> Include Playwright tests in your repo</li>
          <li><strong>2.</strong> Bugrit detects <code className="bg-muted px-1 py-0.5 rounded">playwright.config.ts</code> automatically</li>
          <li><strong>3.</strong> We run your tests in isolated browser environments</li>
          <li><strong>4.</strong> Results appear in your unified report</li>
        </ol>
      </div>

      {/* Technical Reference - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Technical Reference
        </summary>
        <div className="p-4 bg-muted/30 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Example Config</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">API Request with E2E</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "e2eConfig": {
      "enabled": true,
      "baseUrl": "https://staging.your-app.com",
      "browsers": ["chromium", "firefox"]
    }
  }'`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">E2E Config Options</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Option</th>
                    <th className="text-left py-2 px-2">Type</th>
                    <th className="text-left py-2 px-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>enabled</code></td>
                    <td className="py-2 px-2">boolean</td>
                    <td className="py-2 px-2 text-muted-foreground">Enable E2E tests (default: auto-detect)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>baseUrl</code></td>
                    <td className="py-2 px-2">string</td>
                    <td className="py-2 px-2 text-muted-foreground">URL to test against</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>browsers</code></td>
                    <td className="py-2 px-2">array</td>
                    <td className="py-2 px-2 text-muted-foreground">chromium, firefox, webkit</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2"><code>timeout</code></td>
                    <td className="py-2 px-2">number</td>
                    <td className="py-2 px-2 text-muted-foreground">Max test timeout in ms</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Report Output</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`{
  "e2eTests": {
    "framework": "playwright",
    "summary": {
      "total": 24,
      "passed": 22,
      "failed": 2,
      "duration": 45230
    },
    "failures": [
      {
        "name": "should complete checkout",
        "browser": "firefox",
        "error": "Timeout waiting for payment",
        "screenshot": "https://cdn.bugrit.com/..."
      }
    ]
  }
}`}</pre>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
