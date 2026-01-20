export default function PlaywrightIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Playwright E2E Tests</h1>
        <p className="text-lg text-muted-foreground">
          Include your Playwright tests with your code submission. Bugrit will run
          them alongside our 25 analysis tools and include results in your unified report.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Code analysis catches potential bugs. E2E tests catch actual bugs. Running both together gives you complete coverage—know your code is secure AND that it actually works.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>One report:</strong> Test results and code analysis findings in a single unified view</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>All browsers:</strong> Chrome, Firefox, Safari tested on our infrastructure—no local setup needed</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Screenshots and videos:</strong> When tests fail, you get visual evidence to debug faster</span>
          </li>
        </ul>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <ol className="space-y-3 text-muted-foreground">
          <li><strong>1.</strong> Include your Playwright tests in your repository or upload</li>
          <li><strong>2.</strong> Bugrit detects <code className="bg-muted px-1 py-0.5 rounded">playwright.config.ts</code> automatically</li>
          <li><strong>3.</strong> We run your tests in isolated browser environments</li>
          <li><strong>4.</strong> Results appear in your unified report alongside security, quality, and performance findings</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Project Setup</h2>
        <p className="text-muted-foreground mb-4">
          Bugrit will automatically detect and run Playwright tests if your project includes
          a valid configuration file. Here&apos;s a typical setup:
        </p>

        <h4 className="font-semibold mb-2">playwright.config.ts</h4>
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
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Scan with Playwright Tests</h2>
        <p className="text-muted-foreground mb-4">
          When you submit code that includes Playwright tests, specify a target URL
          for the E2E tests to run against:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "branch": "main",
    "e2eConfig": {
      "enabled": true,
      "baseUrl": "https://staging.your-app.com",
      "browsers": ["chromium", "firefox"]
    }
  }'`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">E2E Configuration Options</h2>
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
              <td className="py-2 px-2 text-muted-foreground">Enable E2E test execution (default: auto-detect)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>baseUrl</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2 text-muted-foreground">URL for tests to run against</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>browsers</code></td>
              <td className="py-2 px-2">array</td>
              <td className="py-2 px-2 text-muted-foreground">Browsers to test: chromium, firefox, webkit</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>testDir</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2 text-muted-foreground">Override test directory (default: from config)</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>timeout</code></td>
              <td className="py-2 px-2">number</td>
              <td className="py-2 px-2 text-muted-foreground">Max test timeout in ms (default: 30000)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Report Output</h2>
        <p className="text-muted-foreground mb-4">
          Playwright test results appear in your unified report under the E2E Testing section:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "report": {
    "id": "rpt-abc123",
    "e2eTests": {
      "framework": "playwright",
      "summary": {
        "total": 24,
        "passed": 22,
        "failed": 2,
        "skipped": 0,
        "duration": 45230
      },
      "browsers": {
        "chromium": { "passed": 8, "failed": 0 },
        "firefox": { "passed": 7, "failed": 1 },
        "webkit": { "passed": 7, "failed": 1 }
      },
      "failures": [
        {
          "name": "should complete checkout flow",
          "browser": "firefox",
          "error": "Timeout waiting for payment confirmation",
          "screenshot": "https://cdn.bugrit.dev/scn-xyz/checkout-failure.png",
          "video": "https://cdn.bugrit.dev/scn-xyz/checkout-failure.webm"
        }
      ]
    },
    "findings": [...],
    "security": {...},
    "quality": {...}
  }
}`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Environment Variables</h2>
        <p className="text-muted-foreground mb-4">
          If your tests require environment variables, you can configure them securely
          in your application settings or pass them with the scan:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "e2eConfig": {
      "enabled": true,
      "baseUrl": "https://staging.your-app.com",
      "env": {
        "TEST_USER_EMAIL": "test@example.com",
        "TEST_USER_PASSWORD": "{{ secrets.TEST_PASSWORD }}"
      }
    }
  }'`}</pre>
        </div>
        <p className="text-muted-foreground mt-2 text-sm">
          Use <code className="bg-muted px-1 py-0.5 rounded">{'{{ secrets.NAME }}'}</code> to reference
          secrets stored in your application settings.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Keep tests fast - Bugrit has a 5-minute timeout per test file</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Use meaningful test names - they appear in your report</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Configure retries for flaky tests in your config</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Test against a staging environment, not production</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
