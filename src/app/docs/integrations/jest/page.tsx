export default function JestIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Jest Unit Tests</h1>
        <p className="text-lg text-muted-foreground">
          Include your Jest tests with your code submission. Bugrit will run
          them alongside our 150 analysis modules and include results in your unified report.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Unit tests catch logic bugs. Security scans catch vulnerabilities. Running both together gives you complete confidence—your code is secure AND it does what you intended.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>One report:</strong> Unit test results alongside security findings—see the full picture</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Coverage tracking:</strong> Know which code paths lack tests and might hide bugs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Auto-detect:</strong> We find your jest.config.js and run tests automatically—no extra config</span>
          </li>
        </ul>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <ol className="space-y-3 text-muted-foreground">
          <li><strong>1.</strong> Include your Jest tests in your repository or upload</li>
          <li><strong>2.</strong> Bugrit detects <code className="bg-muted px-1 py-0.5 rounded">jest.config.js</code> or package.json test scripts</li>
          <li><strong>3.</strong> We run your tests in an isolated Node.js environment</li>
          <li><strong>4.</strong> Results appear in your unified report alongside security, quality, and performance findings</li>
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Project Setup</h2>
        <p className="text-muted-foreground mb-4">
          Bugrit will automatically detect and run Jest tests if your project includes
          a valid configuration. Here&apos;s a typical setup:
        </p>

        <h4 className="font-semibold mb-2">jest.config.js</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverage: true,
  coverageReporters: ['json', 'text'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Scan with Jest Tests</h2>
        <p className="text-muted-foreground mb-4">
          When you submit code that includes Jest tests, Bugrit automatically
          runs them as part of the scan:
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
    "unitTestConfig": {
      "enabled": true,
      "coverage": true
    }
  }'`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Unit Test Configuration Options</h2>
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
              <td className="py-2 px-2 text-muted-foreground">Enable unit test execution (default: auto-detect)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>coverage</code></td>
              <td className="py-2 px-2">boolean</td>
              <td className="py-2 px-2 text-muted-foreground">Collect code coverage (default: true)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>testMatch</code></td>
              <td className="py-2 px-2">array</td>
              <td className="py-2 px-2 text-muted-foreground">Override test file patterns</td>
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
          Jest test results appear in your unified report under the Unit Tests section:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "report": {
    "id": "rpt-abc123",
    "unitTests": {
      "framework": "jest",
      "summary": {
        "total": 45,
        "passed": 43,
        "failed": 2,
        "skipped": 0,
        "duration": 8450
      },
      "coverage": {
        "lines": 87.5,
        "branches": 82.3,
        "functions": 91.2,
        "statements": 88.1
      },
      "failures": [
        {
          "name": "UserService › should validate email format",
          "file": "src/services/user.test.js",
          "error": "Expected 'invalid' to throw ValidationError",
          "line": 45
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
        <h2 className="text-2xl font-bold mb-4">Coverage Integration</h2>
        <p className="text-muted-foreground mb-4">
          When coverage is enabled, Bugrit analyzes your test coverage and
          includes it in the quality assessment:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Files with low coverage are flagged in findings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Critical code paths without tests are highlighted</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Coverage trends are tracked across scans</span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Environment Variables</h2>
        <p className="text-muted-foreground mb-4">
          If your tests require environment variables, configure them in your
          application settings or pass them with the scan:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "applicationId": "app-abc123",
    "sourceType": "github",
    "repoUrl": "https://github.com/yourorg/yourrepo",
    "unitTestConfig": {
      "enabled": true,
      "env": {
        "NODE_ENV": "test",
        "DATABASE_URL": "{{ secrets.TEST_DATABASE_URL }}"
      }
    }
  }'`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Supported Test Frameworks</h2>
        <p className="text-muted-foreground mb-4">
          In addition to Jest, Bugrit supports these unit testing frameworks:
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Framework</th>
              <th className="text-left py-2 px-2">Config File</th>
              <th className="text-left py-2 px-2">Languages</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2">Jest</td>
              <td className="py-2 px-2 text-muted-foreground">jest.config.js</td>
              <td className="py-2 px-2 text-muted-foreground">JavaScript, TypeScript</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2">Vitest</td>
              <td className="py-2 px-2 text-muted-foreground">vitest.config.ts</td>
              <td className="py-2 px-2 text-muted-foreground">JavaScript, TypeScript</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2">Mocha</td>
              <td className="py-2 px-2 text-muted-foreground">.mocharc.json</td>
              <td className="py-2 px-2 text-muted-foreground">JavaScript, TypeScript</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2">pytest</td>
              <td className="py-2 px-2 text-muted-foreground">pytest.ini</td>
              <td className="py-2 px-2 text-muted-foreground">Python</td>
            </tr>
            <tr>
              <td className="py-2 px-2">Go test</td>
              <td className="py-2 px-2 text-muted-foreground">*_test.go files</td>
              <td className="py-2 px-2 text-muted-foreground">Go</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Keep tests fast - Bugrit has a 5-minute timeout for all unit tests</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Use meaningful test names - they appear in your report</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Mock external services to ensure consistent results</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Aim for at least 80% coverage on critical code paths</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
