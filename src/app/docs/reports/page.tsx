export default function ReportsDocPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">AI Reports</h1>
        <p className="text-lg text-muted-foreground">
          Testing results + Code scanning findings = One unified, AI-powered report.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Running 115 tools gives you 115 different reports in 115 different formats. Our AI combines everything into one readable report with plain English explanations—no security PhD required.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Stop context switching:</strong> One report instead of checking ESLint, npm audit, Lighthouse, and 22 other dashboards</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Understand every issue:</strong> &quot;SQL injection in login form&quot; instead of &quot;CWE-89 violation detected&quot;</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Fix faster:</strong> Copy the AI-generated fix prompt into Claude or Copilot and resolve issues in seconds</span>
          </li>
        </ul>
      </div>

      <section className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
        <h2 className="text-xl font-bold mb-3">Two Report Sections, One View</h2>
        <p className="text-muted-foreground mb-4">
          Bugrit combines your test results (Playwright, Appium, Tauri) and code scanning findings
          (115 tools) into a single unified report. No more switching between dashboards.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🧪</span>
              <span className="font-semibold">Testing Report</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Test pass/fail status, browser/device results, screenshots, videos, and failure analysis
            </p>
          </div>
          <div className="p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🔍</span>
              <span className="font-semibold">Scanning Report</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Deduplicated findings from 115 tools, prioritized issues, plain English explanations
            </p>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* TESTING REPORT SECTION */}
      {/* ========================================== */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>🧪</span> Testing Report
        </h2>
        <p className="text-muted-foreground mb-6">
          Test results from Playwright, Appium, and Tauri are aggregated with screenshots, videos, and failure analysis.
        </p>

        {/* Testing Report Mockup */}
        <div className="border rounded-xl overflow-hidden bg-card">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Testing Report</h3>
                <p className="text-sm text-muted-foreground">E-Commerce App • Jan 20, 2026</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">3 frameworks</div>
                <div className="text-sm text-muted-foreground">Test time: 4m 32s</div>
              </div>
            </div>
            {/* Test Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">156</div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">4</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">2</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">97%</div>
                <div className="text-xs text-muted-foreground">Pass Rate</div>
              </div>
            </div>
          </div>

          {/* Framework Breakdown */}
          <div className="p-6 border-b">
            <h4 className="font-semibold mb-4">Framework Results</h4>
            <div className="space-y-4">
              {/* Playwright Results */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🌐</span>
                    <span className="font-semibold">Playwright (Web)</span>
                  </div>
                  <span className="text-sm text-green-600 font-medium">48/50 passed</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">Chrome</div>
                    <div className="text-xs text-muted-foreground">16/17 passed</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">Firefox</div>
                    <div className="text-xs text-muted-foreground">16/17 passed</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">WebKit</div>
                    <div className="text-xs text-muted-foreground">16/16 passed</div>
                  </div>
                </div>
              </div>

              {/* Appium Results */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <span className="font-semibold">Appium (Mobile)</span>
                  </div>
                  <span className="text-sm text-green-600 font-medium">86/88 passed</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">iOS (iPhone 15 Pro)</div>
                    <div className="text-xs text-muted-foreground">43/44 passed</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">Android (Pixel 8)</div>
                    <div className="text-xs text-muted-foreground">43/44 passed</div>
                  </div>
                </div>
              </div>

              {/* Tauri Results */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💻</span>
                    <span className="font-semibold">Tauri (Desktop)</span>
                  </div>
                  <span className="text-sm text-green-600 font-medium">22/24 passed</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">Windows</div>
                    <div className="text-xs text-muted-foreground">8/8 passed</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">macOS</div>
                    <div className="text-xs text-muted-foreground">7/8 passed</div>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="font-medium">Linux</div>
                    <div className="text-xs text-muted-foreground">7/8 passed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Failures */}
          <div className="p-6 border-b">
            <h4 className="font-semibold mb-4 text-red-600">Failed Tests (4)</h4>
            <div className="space-y-4">
              {/* Failure 1 */}
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">should complete checkout with Apple Pay</span>
                  <span className="text-xs text-muted-foreground">Playwright - Chrome, Firefox</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Timeout waiting for Apple Pay button. The payment modal failed to appear within 30 seconds.
                </p>
                <div className="flex gap-2">
                  <button className="text-xs text-primary hover:underline">View Screenshot</button>
                  <button className="text-xs text-primary hover:underline">View Video</button>
                  <button className="text-xs text-primary hover:underline">View Trace</button>
                </div>
              </div>

              {/* Failure 2 */}
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">should login with Face ID</span>
                  <span className="text-xs text-muted-foreground">Appium - iOS, Android</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Biometric prompt not detected. The Face ID authentication dialog did not appear.
                </p>
                <div className="flex gap-2">
                  <button className="text-xs text-primary hover:underline">View Screenshot</button>
                  <button className="text-xs text-primary hover:underline">View Video</button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="p-6 bg-muted/30">
            <h4 className="font-semibold mb-3">AI Analysis</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Root cause identified:</strong> Both checkout and biometric failures are related to
              third-party payment/auth services not being properly mocked in the test environment.
              The Apple Pay and Face ID tests are attempting to connect to real services instead of
              test stubs. Consider adding mock implementations for payment and biometric providers
              in your test configuration.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* CODE SCANNING REPORT SECTION */}
      {/* ========================================== */}
      <section>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span>🔍</span> Code Scanning Report
        </h2>
        <p className="text-muted-foreground mb-6">
          115 analysis tools run in parallel. Findings are deduplicated, conflicts resolved, and presented in plain English.
        </p>

        {/* Scanning Report Mockup */}
        <div className="border rounded-xl overflow-hidden bg-card">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Code Scanning Report</h3>
                <p className="text-sm text-muted-foreground">E-Commerce App • Jan 20, 2026</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">115 tools completed</div>
                <div className="text-sm text-muted-foreground">Scan time: 47s</div>
              </div>
            </div>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">3</div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">7</div>
                <div className="text-xs text-muted-foreground">High</div>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">12</div>
                <div className="text-xs text-muted-foreground">Medium</div>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">28</div>
                <div className="text-xs text-muted-foreground">Low</div>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="p-6 border-b">
            <h4 className="font-semibold mb-3">AI Summary</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your application has <strong>3 critical security issues</strong> that need immediate attention.
              The authentication system has an SQL injection vulnerability in the login endpoint.
              Additionally, 4 of the high-priority issues are related to the same missing input
              validation in your API routes—fixing the shared validation logic will resolve all 4.
              Performance is good, but there's an N+1 query in the product listing that's causing
              slow page loads.
            </p>
          </div>

          {/* Deduplication Example */}
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">Deduplicated</span>
              <span className="text-sm text-muted-foreground">12 tool findings → 1 issue</span>
            </div>
            <p className="text-sm text-muted-foreground">
              ESLint, Biome, Secretlint, and audit-ci all flagged variations of
              the same SQL injection issue. Shown once below with full context.
            </p>
          </div>

          {/* Priority Issues */}
          <div className="p-6 border-b">
            <h4 className="font-semibold mb-4">Priority Issues</h4>
            <div className="space-y-4">
              {/* Issue 1 - Critical */}
              <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">Critical</span>
                  <span className="font-medium">SQL Injection in Login</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Your login form directly inserts user input into a SQL query. An attacker could
                  enter a specially crafted username to bypass authentication or extract your entire
                  user database.
                </p>
                <div className="text-xs text-muted-foreground">
                  <strong>Location:</strong> src/api/auth/login.ts:47
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>Detected by:</strong> ESLint Security, Secretlint, audit-ci (deduplicated)
                </div>
              </div>

              {/* Issue 2 - High with grouping */}
              <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-medium">High</span>
                  <span className="font-medium">Missing Input Validation</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">4 related issues</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Four API endpoints accept user input without validation. They all use the same
                  request handler pattern. Adding validation to the shared handler will fix all four.
                </p>
                <div className="text-xs text-muted-foreground">
                  <strong>Root cause:</strong> src/middleware/api-handler.ts missing schema validation
                </div>
              </div>
            </div>
          </div>

          {/* Tools Run */}
          <div className="p-6">
            <h4 className="font-semibold mb-3">Tools Executed (115)</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-muted text-xs rounded">ESLint</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">Biome</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">Stylelint</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">Prettier</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">Secretlint</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">audit-ci</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">axe-core</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">Lighthouse</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">TypeScript</span>
              <span className="px-2 py-1 bg-muted text-xs rounded">+ 16 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* COMBINED REPORT VIEW */}
      {/* ========================================== */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Combined Report View</h2>
        <p className="text-muted-foreground mb-4">
          When you run both tests and scans, the unified report shows everything together with
          AI-powered correlation between test failures and code issues.
        </p>
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <h4 className="font-semibold mb-3">AI Correlation Example</h4>
          <p className="text-sm text-muted-foreground">
            "Your Playwright checkout test is failing because the payment form validation is missing.
            The same validation issue was detected by ESLint and Biome in your code scan. Fixing
            <code className="mx-1 px-1 bg-muted rounded">src/components/PaymentForm.tsx:47</code>
            will likely resolve both the test failure and the 2 code scanning findings."
          </p>
        </div>
      </section>

      {/* AI Features */}
      <section>
        <h2 className="text-2xl font-bold mb-4">AI Features</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Deduplication</h4>
            <p className="text-sm text-muted-foreground">
              When multiple tools flag the same issue, you see it once—not multiple times with different descriptions.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Conflict Resolution</h4>
            <p className="text-sm text-muted-foreground">
              When tools disagree (Tool A says it's fine, Tool B says it's critical),
              the AI weighs evidence and gives you one clear recommendation.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Plain English</h4>
            <p className="text-sm text-muted-foreground">
              No more deciphering cryptic error codes. "Your login form is vulnerable to
              SQL injection" instead of "CWE-89 detected in auth.js:47".
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Root Cause Analysis</h4>
            <p className="text-sm text-muted-foreground">
              5 failing tests might share 1 root cause. The report groups related
              issues so you fix the source, not the symptoms.
            </p>
          </div>
        </div>
      </section>

      {/* AI Fix Prompts */}
      <section>
        <h2 className="text-2xl font-bold mb-4">AI Fix Prompts</h2>
        <p className="text-muted-foreground mb-4">
          Each issue includes a ready-to-use prompt you can paste into Claude, Copilot, or Cursor
          to get an immediate fix suggestion.
        </p>
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Example prompt for the SQL injection issue:</span>
            <button className="text-xs text-primary hover:underline">Copy</button>
          </div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{`Fix the SQL injection vulnerability in src/api/auth/login.ts:47.

Current code uses string interpolation:
const query = \`SELECT * FROM users WHERE email = '\${email}'\`;

Replace with parameterized query using the project's existing
database client (Prisma). Ensure the fix maintains the current
error handling behavior.`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Generate Reports via API</h2>
        <p className="text-muted-foreground mb-4">
          Trigger tests and scans programmatically and retrieve the unified report.
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`# Start a scan with tests enabled
POST /api/v1/scans
{
  "applicationId": "app-abc123",
  "sourceType": "github",
  "repoUrl": "https://github.com/org/repo",
  "testConfig": {
    "playwright": { "enabled": true, "browsers": ["chromium", "firefox"] },
    "appium": { "enabled": true, "devices": ["iPhone 15 Pro"] }
  }
}

# Get the unified report
GET /api/v1/reports/rpt-xyz789
Authorization: Bearer YOUR_API_KEY`}</pre>
        </div>
      </section>
    </div>
  );
}
