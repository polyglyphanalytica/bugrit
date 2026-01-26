'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function ReportsDocPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">AI Reports</h1>
        <p className="text-lg text-muted-foreground">
          Testing results + Code scanning findings = One unified, AI-powered report.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'Get Report',
            description: 'Fetch and display scan results',
            prompt: `Read the Bugrit Reports docs at https://bugrit.com/docs/reports

Create a component to display Bugrit scan results:

1. Fetch report from GET /api/v1/scans/{scanId}/report
2. Show summary: critical/high/medium/low counts
3. List findings grouped by severity
4. Show each finding: title, file, line, description
5. Include AI-generated fix prompts for each issue

My stack: [YOUR_STACK]`
          },
          {
            label: 'Slack Summary',
            description: 'Post results to Slack',
            prompt: `Read the Bugrit Reports docs at https://bugrit.com/docs/reports

Create a Slack notification for scan results:

1. GET /api/v1/scans/{scanId}/report when scan completes
2. Format message with:
   - Pass/fail based on critical count
   - Issue counts by severity
   - Link to full report
3. Red color if critical > 0, green if passing
4. Post to Slack webhook

Use BUGRIT_API_KEY and SLACK_WEBHOOK_URL.`
          },
          {
            label: 'Fix Issues',
            description: 'Auto-fix with AI',
            prompt: `Read the Bugrit Reports docs at https://bugrit.com/docs/reports

Take the Bugrit scan results and fix the issues:

1. Parse the findings array from the report
2. For each critical/high finding:
   - Read the file at finding.file
   - Go to finding.line
   - Apply the fix from finding.suggestion
3. Verify fixes don't break anything
4. Commit with descriptive message

Start with critical issues first.`
          },
        ]}
      />

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Running 150 modules with 5,000+ individual scans gives you massive amounts of data. Our AI combines everything
          into one readable report with plain English explanations—no security PhD required.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Stop context switching:</strong> One report instead of 22 dashboards</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Understand every issue:</strong> &quot;SQL injection in login form&quot; not &quot;CWE-89&quot;</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Fix faster:</strong> Copy the AI fix prompt into Claude and resolve in seconds</span>
          </li>
        </ul>
      </div>

      {/* Report Overview */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🧪</span>
            <span className="font-semibold">Testing Report</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Test pass/fail status, screenshots, videos, and failure analysis
          </p>
        </div>
        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔍</span>
            <span className="font-semibold">Scanning Report</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Deduplicated findings from 150 modules (5,000+ scans) with plain English explanations
          </p>
        </div>
      </div>

      {/* Technical Reference - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Report Structure & API
        </summary>
        <div className="p-4 bg-muted/30 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Get Report</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`GET /api/v1/scans/{scanId}/report
Authorization: Bearer YOUR_API_KEY`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Response Structure</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`{
  "report": {
    "id": "rpt-abc123",
    "summary": {
      "critical": 3,
      "high": 7,
      "medium": 12,
      "low": 28,
      "total": 50,
      "passRate": 85
    },
    "findings": [
      {
        "id": "fnd-xyz",
        "severity": "critical",
        "title": "SQL Injection in Login",
        "description": "User input directly inserted into SQL query",
        "file": "src/api/auth/login.ts",
        "line": 47,
        "tool": "eslint-security",
        "suggestion": "Use parameterized query"
      }
    ],
    "e2eTests": {
      "total": 156,
      "passed": 152,
      "failed": 4
    }
  }
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">AI Features</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Deduplication</h4>
                <p className="text-sm text-muted-foreground">
                  12 tools flag the same issue → shown once
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Conflict Resolution</h4>
                <p className="text-sm text-muted-foreground">
                  Tools disagree → AI picks the right answer
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Plain English</h4>
                <p className="text-sm text-muted-foreground">
                  &quot;SQL injection&quot; not &quot;CWE-89 violation&quot;
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Root Cause</h4>
                <p className="text-sm text-muted-foreground">
                  5 issues share 1 cause → grouped together
                </p>
              </div>
            </div>
          </div>
        </div>
      </details>

      {/* Example Report - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Example Report Mockup
        </summary>
        <div className="p-4 bg-muted/30">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 border-b rounded-t-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Scan Report</h3>
                <p className="text-sm text-muted-foreground">E-Commerce App • Jan 20, 2026</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>150 modules, 5,000+ scans</div>
                <div>Scan time: 47s</div>
              </div>
            </div>
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
            <p className="text-muted-foreground text-sm">
              Your application has <strong>3 critical security issues</strong> that need immediate attention.
              The authentication system has an SQL injection vulnerability. 4 high-priority issues share
              the same missing input validation—fixing the shared logic will resolve all 4.
            </p>
          </div>

          {/* Sample Finding */}
          <div className="p-6">
            <h4 className="font-semibold mb-4">Priority Issue</h4>
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-medium">Critical</span>
                <span className="font-medium">SQL Injection in Login</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Your login form directly inserts user input into a SQL query. An attacker could
                bypass authentication or extract your entire user database.
              </p>
              <div className="text-xs text-muted-foreground">
                <strong>Location:</strong> src/api/auth/login.ts:47
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
