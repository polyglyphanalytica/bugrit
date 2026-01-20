import { GlassCard } from '@/components/ui/glass-card';

export default function BillingApiDocs() {
  return (
    <div className="container-wide py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Billing API</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Check balances, get quotes, and track usage programmatically. Perfect for integrating Bugrit into your own apps.
        </p>

        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <p className="text-muted-foreground mb-4">
            The Billing API lets you build custom integrations that show users their credit balance,
            estimate scan costs before running, and track usage over time. This enables you to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
            <li>Display real-time credit balance in your dashboard</li>
            <li>Show users exactly what a scan will cost before they click &quot;Run&quot;</li>
            <li>Let users toggle tools on/off and see cost updates instantly</li>
            <li>Track usage patterns and spending over time</li>
          </ul>
        </section>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Authentication</h2>
          <p className="text-muted-foreground mb-4">
            All billing endpoints require authentication via API key or Bearer token:
          </p>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950">
            <pre>{`curl -H "x-api-key: your_api_key" \\
  https://bugrit.dev/api/billing/status

# Or with Bearer token
curl -H "Authorization: Bearer your_token" \\
  https://bugrit.dev/api/billing/status`}</pre>
          </GlassCard>
        </section>

        {/* GET /api/billing/status */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get Billing Status</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/billing/status</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Returns complete billing status including subscription tier, credit balance, and account limits.
          </p>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`{
  "tier": "pro",
  "tierName": "Pro",
  "credits": {
    "remaining": 153,
    "included": 200,
    "used": 47,
    "rollover": 0,
    "percentUsed": 24
  },
  "subscription": {
    "status": "active",
    "renewsAt": "2024-02-15T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "limits": {
    "maxProjects": 10,
    "maxRepoSize": 150000,
    "aiFeatures": ["summary", "issue_explanations", "priority_scoring"]
  },
  "canScan": true,
  "needsUpgrade": false,
  "overageEnabled": true
}`}</pre>
          </GlassCard>
        </section>

        {/* POST /api/billing/quote */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get Quote</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/billing/quote</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Get a detailed cost quote before running a scan. Returns all available options,
            current balance, and calculated estimate. Use this to build dynamic pricing UIs.
          </p>

          <h4 className="font-semibold mb-2">Request Body</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto mb-4">
            <pre>{`{
  "projectId": "proj_123",           // Optional: for known repos
  "estimatedLines": 50000,           // Optional: lines of code
  "estimatedIssues": 100,            // Optional: for AI cost estimate
  "config": {
    "categories": ["linting", "security", "dependencies"],
    "aiFeatures": ["summary", "issue_explanations"]
  }
}`}</pre>
          </GlassCard>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`{
  "options": {
    "categories": [
      {
        "id": "linting",
        "name": "Linting & Formatting",
        "description": "Code style, formatting, and best practices",
        "tools": ["ESLint", "Biome", "Stylelint", "Prettier"],
        "creditCost": 0,
        "included": true
      },
      {
        "id": "security",
        "name": "Security",
        "description": "Vulnerabilities, secrets, and security issues",
        "tools": ["ESLint Security", "Audit CI", "Secretlint", "Lockfile Lint"],
        "creditCost": 1,
        "included": false
      },
      // ... more categories
    ],
    "aiFeatures": [
      {
        "id": "summary",
        "name": "Scan Summary",
        "description": "AI-generated overview of all findings",
        "creditCost": 1,
        "perIssue": false,
        "available": true
      },
      {
        "id": "issue_explanations",
        "name": "Issue Explanations",
        "description": "Detailed AI explanation for each issue found",
        "creditCost": 2,
        "perIssue": true,
        "available": true
      },
      // ... more features
    ],
    "linesCostPer10K": 1,
    "baseScanCost": 1
  },
  "balance": {
    "remaining": 153,
    "included": 200,
    "used": 47,
    "percentUsed": 24
  },
  "estimate": {
    "breakdown": {
      "base": 1,
      "lines": 5,
      "tools": { "security": 1 },
      "ai": { "summary": 1, "issue_explanations": 4 }
    },
    "total": 12,
    "warnings": ["AI issue_explanations cost estimated for ~100 issues"]
  },
  "canAfford": true,
  "overage": null,
  "hints": {
    "suggestedCategories": ["linting", "security", "dependencies", "quality"],
    "maxAffordableCredits": 153
  }
}`}</pre>
          </GlassCard>
        </section>

        {/* GET /api/billing/quote (simple) */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Quick Balance Check</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/billing/quote</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Quick endpoint to check current credit balance without full quote calculation.
          </p>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950">
            <pre>{`{
  "balance": {
    "remaining": 153,
    "included": 200,
    "used": 47
  },
  "tier": "pro",
  "overageEnabled": true
}`}</pre>
          </GlassCard>
        </section>

        {/* GET /api/billing/usage */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get Usage</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/billing/usage</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Returns usage summary and transaction history for a billing period.
          </p>

          <h4 className="font-semibold mb-2">Query Parameters</h4>
          <div className="space-y-2 mb-4">
            <div className="flex gap-4">
              <code className="text-sm bg-muted px-2 py-1 rounded">period</code>
              <span className="text-muted-foreground text-sm">&quot;current&quot; | &quot;previous&quot; | ISO date (default: current)</span>
            </div>
            <div className="flex gap-4">
              <code className="text-sm bg-muted px-2 py-1 rounded">include</code>
              <span className="text-muted-foreground text-sm">&quot;summary&quot; | &quot;transactions&quot; | &quot;both&quot; (default: both)</span>
            </div>
            <div className="flex gap-4">
              <code className="text-sm bg-muted px-2 py-1 rounded">limit</code>
              <span className="text-muted-foreground text-sm">Number of transactions (default: 50, max: 200)</span>
            </div>
          </div>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "summary": {
    "totalScans": 12,
    "totalCreditsUsed": 47,
    "totalLinesScanned": 185000,
    "totalIssuesFound": 234,
    "byCategory": {
      "linting": { "scans": 12, "credits": 0, "issues": 89 },
      "security": { "scans": 10, "credits": 10, "issues": 23 },
      // ... more categories
    },
    "topProjects": [
      { "projectId": "proj_1", "projectName": "my-app", "scans": 8, "credits": 32 }
    ]
  },
  "transactions": [
    {
      "id": "txn_1",
      "timestamp": "2024-01-15T10:30:00Z",
      "type": "scan",
      "amount": -5,
      "balanceAfter": 153,
      "details": {
        "scanId": "scan_abc123",
        "breakdown": { "base": 1, "lines": 2, "tools": { "security": 1 }, "ai": { "summary": 1 } }
      }
    }
  ]
}`}</pre>
          </GlassCard>
        </section>

        {/* SDK Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">JavaScript SDK</h2>
          <p className="text-muted-foreground mb-4">
            Use our client SDK for easier integration:
          </p>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`import { BugritClient } from '@bugrit/client';

const client = new BugritClient({
  apiKey: process.env.BUGRIT_API_KEY,
});

// Get balance
const status = await client.getStatus();
console.log(\`Credits: \${status.credits.remaining}/\${status.credits.included}\`);

// Get quote before scan
const quote = await client.getQuote({
  estimatedLines: 50000,
  config: {
    categories: ['linting', 'security'],
    aiFeatures: ['summary'],
  },
});

// Show cost to user
console.log(\`This scan will cost \${quote.estimate.total} credits\`);
if (quote.overage) {
  console.log(\`Overage: \${quote.overage.credits} credits = $\${quote.overage.cost}\`);
}

// Run scan if user confirms
if (userConfirmed && quote.canAfford) {
  const scan = await client.runScan({
    projectId: 'my-project',
    config: quote.config,
  });
}`}</pre>
          </GlassCard>
        </section>

        {/* Credit Costs Reference */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Credit Costs Reference</h2>

          <h4 className="font-semibold mb-2 mt-6">Base Costs</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Credits</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Base scan cost</td>
                  <td className="text-right">1</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Per 10,000 lines of code</td>
                  <td className="text-right">1</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold mb-2 mt-6">Tool Categories</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Category</th>
                  <th className="text-right py-2">Credits</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Linting & Formatting</td>
                  <td className="text-right text-green-400">Free</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Dependencies</td>
                  <td className="text-right text-green-400">Free</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Code Quality</td>
                  <td className="text-right text-green-400">Free</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Documentation</td>
                  <td className="text-right text-green-400">Free</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Git</td>
                  <td className="text-right text-green-400">Free</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Security</td>
                  <td className="text-right">1</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Accessibility</td>
                  <td className="text-right">2</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Performance (Lighthouse)</td>
                  <td className="text-right">3</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold mb-2 mt-6">AI Features</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-right py-2">Credits</th>
                  <th className="text-right py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Scan Summary</td>
                  <td className="text-right">1</td>
                  <td className="text-right text-muted-foreground">Per scan</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Issue Explanations</td>
                  <td className="text-right">2</td>
                  <td className="text-right text-muted-foreground">Per 50 issues</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Fix Suggestions</td>
                  <td className="text-right">3</td>
                  <td className="text-right text-muted-foreground">Per 50 issues</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Priority Scoring</td>
                  <td className="text-right">1</td>
                  <td className="text-right text-muted-foreground">Per scan</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
