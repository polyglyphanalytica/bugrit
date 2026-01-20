import { GlassCard } from '@/components/ui/glass-card';
import Link from 'next/link';

export default function BillingApiDocs() {
  return (
    <div className="container-wide py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Billing API</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Check balances, get quotes, purchase credits, and manage subscriptions programmatically.
        </p>

        {/* Why It Matters */}
        <section className="mb-12 p-6 bg-primary/5 border border-primary/20 rounded-xl">
          <h2 className="text-xl font-bold mb-3">Why It Matters</h2>
          <p className="text-muted-foreground mb-4">
            The Billing API enables you to build seamless credit management into your workflow.
            Instead of manually checking balances or being surprised by scan costs, you can:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li><strong>Prevent failed scans</strong> - Check balance before running, not after</li>
            <li><strong>Manage costs predictably</strong> - Get quotes and let users toggle features</li>
            <li><strong>Never run out unexpectedly</strong> - Auto top-up keeps your workflow uninterrupted</li>
            <li><strong>Integrate with your tools</strong> - Build credit checks into CI/CD pipelines</li>
          </ul>
        </section>

        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <p className="text-muted-foreground mb-4">
            The Billing API lets you manage your account&apos;s credits and subscription programmatically using your API key.
            All endpoints return data for your authenticated account only. Use these endpoints to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
            <li>Check your current credit balance and subscription status</li>
            <li>Get a cost estimate before running a scan</li>
            <li>View your usage history and transaction details</li>
            <li>Purchase additional credit packages</li>
            <li>Configure automatic top-ups to avoid running out of credits</li>
            <li>Access the billing portal to manage payment methods</li>
          </ul>
          <p className="text-muted-foreground">
            For information on how pricing is calculated, see the{' '}
            <Link href="/docs/pricing" className="text-primary hover:underline">
              Pricing Guide
            </Link>
            .
          </p>
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

        {/* GET /api/credit-packages */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get Credit Packages</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/credit-packages</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Returns all available credit packages for purchase. No authentication required.
          </p>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`{
  "packages": [
    {
      "id": "starter-pack",
      "name": "Starter Pack",
      "description": "Perfect for trying out premium features",
      "credits": 25,
      "price": 5,
      "currency": "usd",
      "isFeatured": false
    },
    {
      "id": "pro-pack",
      "name": "Pro Pack",
      "description": "Great value for regular users",
      "credits": 100,
      "price": 16,
      "currency": "usd",
      "isFeatured": true
    },
    {
      "id": "power-pack",
      "name": "Power Pack",
      "description": "For power users and small teams",
      "credits": 500,
      "price": 60,
      "currency": "usd",
      "isFeatured": false
    },
    {
      "id": "enterprise-pack",
      "name": "Enterprise Pack",
      "description": "Best value for high-volume usage",
      "credits": 2000,
      "price": 200,
      "currency": "usd",
      "isFeatured": false
    }
  ]
}`}</pre>
          </GlassCard>
        </section>

        {/* POST /api/billing/purchase-credits */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Purchase Credits</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/billing/purchase-credits</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Initiates a credit package purchase. Returns a Stripe checkout URL for payment.
          </p>

          <h4 className="font-semibold mb-2">Request Body</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto mb-4">
            <pre>{`{
  "packageId": "pro-pack"
}`}</pre>
          </GlassCard>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_...",
  "sessionId": "cs_live_..."
}`}</pre>
          </GlassCard>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              After successful payment, credits are automatically added to the user&apos;s account.
              The webhook handles credit allocation and sends a confirmation email.
            </p>
          </div>
        </section>

        {/* GET /api/settings/subscription */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get Subscription Status</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/settings/subscription</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Returns detailed subscription information including usage limits and auto top-up settings.
          </p>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`{
  "subscription": {
    "tier": "pro",
    "status": "active",
    "currentPeriodEnd": "2024-02-15T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "usage": {
    "credits": {
      "used": 47,
      "limit": 200,
      "rollover": 25
    },
    "projects": {
      "used": 5,
      "limit": 10
    },
    "teamMembers": {
      "used": 3,
      "limit": 5
    }
  },
  "autoTopup": {
    "enabled": true,
    "triggerThreshold": 10,
    "packageId": "pro-pack",
    "maxPerMonth": 3,
    "purchasesThisMonth": 1
  }
}`}</pre>
          </GlassCard>
        </section>

        {/* POST /api/settings/subscription/auto-topup */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Configure Auto Top-up</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/settings/subscription/auto-topup</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Configure automatic credit purchases when balance falls below a threshold.
            Requires a payment method on file.
          </p>

          <h4 className="font-semibold mb-2">Request Body</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto mb-4">
            <pre>{`{
  "enabled": true,
  "triggerThreshold": 10,   // Trigger when credits fall below this
  "packageId": "pro-pack",  // Which package to purchase
  "maxPerMonth": 3          // Maximum auto-purchases per month
}`}</pre>
          </GlassCard>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`{
  "success": true,
  "autoTopup": {
    "enabled": true,
    "triggerThreshold": 10,
    "packageId": "pro-pack",
    "maxPerMonth": 3
  }
}`}</pre>
          </GlassCard>

          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-200">
              <strong>Note:</strong> Auto top-up requires a valid payment method. If the payment
              fails, the user will be notified and auto top-up will be temporarily disabled until
              the payment method is updated.
            </p>
          </div>
        </section>

        {/* POST /api/billing/portal */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Open Billing Portal</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/billing/portal</code>
          </div>
          <p className="text-muted-foreground mb-4">
            Returns a URL to the Stripe Customer Portal where users can manage their
            subscription, payment methods, and billing history.
          </p>

          <h4 className="font-semibold mb-2">Response</h4>
          <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
            <pre>{`{
  "url": "https://billing.stripe.com/p/session/..."
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

        {/* Vibe Coding Prompts */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">AI Prompts for Vibe Coding</h2>
          <p className="text-muted-foreground mb-6">
            Copy these prompts to quickly integrate billing features into your app using AI coding assistants.
          </p>

          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Credit Balance Display</h4>
              <p className="text-sm text-muted-foreground mb-3">Add a credit balance indicator to your app header</p>
              <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
                <pre>{`Create a React component that displays my Bugrit credit balance in the app header.
Use the Bugrit API at /api/billing/status with my API key in the x-api-key header.
Show credits as "X / Y credits" with a progress bar.
When credits fall below 20%, show a yellow warning.
When credits fall below 10%, show a red warning with a "Buy Credits" button.
The button should link to /settings/subscription.`}</pre>
              </GlassCard>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Pre-Scan Cost Estimator</h4>
              <p className="text-sm text-muted-foreground mb-3">Show users what a scan will cost before running it</p>
              <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
                <pre>{`Create a React component that estimates scan cost before running.
Call POST /api/billing/quote with the scan configuration.
Display a breakdown showing: base cost, lines cost, tool costs, and AI feature costs.
Show the total and whether the user can afford it.
Include toggles for each premium tool category (security, accessibility, performance)
and AI features (summary, explanations, fix suggestions).
Update the cost estimate live as users toggle options.
Show a "Run Scan" button that's disabled if user can't afford it.`}</pre>
              </GlassCard>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">CI/CD Credit Check</h4>
              <p className="text-sm text-muted-foreground mb-3">Add a credit check to your CI pipeline</p>
              <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
                <pre>{`Write a shell script for CI/CD that checks Bugrit credits before running a scan.
Use curl to call GET /api/billing/status with the BUGRIT_API_KEY env var.
Parse the JSON response to get credits.remaining.
If credits < 5, print a warning and exit with code 0 (soft fail).
If credits < 1, print an error and exit with code 1 (hard fail).
Otherwise, print "Credits OK: X remaining" and continue.
This prevents CI from failing mid-scan due to insufficient credits.`}</pre>
              </GlassCard>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Auto Top-up Settings Page</h4>
              <p className="text-sm text-muted-foreground mb-3">Build a settings page for auto top-up configuration</p>
              <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
                <pre>{`Create a React settings component for configuring auto top-up.
Fetch current settings from GET /api/settings/subscription.
Fetch available packages from GET /api/credit-packages.
Include:
- Toggle to enable/disable auto top-up
- Number input for trigger threshold (when to top up)
- Dropdown to select which credit package to buy
- Number input for max purchases per month (1-10)
On save, POST to /api/settings/subscription/auto-topup.
Show success/error toast notifications.
Add a note that auto top-up requires a payment method on file.`}</pre>
              </GlassCard>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Usage Analytics Dashboard</h4>
              <p className="text-sm text-muted-foreground mb-3">Create a dashboard showing credit usage patterns</p>
              <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
                <pre>{`Create a React dashboard showing Bugrit usage analytics.
Fetch data from GET /api/billing/usage?include=both.
Display:
1. A summary card: total scans, total credits used, total issues found
2. A bar chart showing credits used by category (linting, security, etc)
3. A line chart showing daily credit usage over the billing period
4. A table of recent transactions with scan details
5. Top projects by credit usage
Use Recharts or Chart.js for visualizations.
Add a dropdown to switch between current and previous billing period.`}</pre>
              </GlassCard>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Credit Purchase Flow</h4>
              <p className="text-sm text-muted-foreground mb-3">Build a complete credit purchase UI</p>
              <GlassCard className="p-4 font-mono text-xs bg-slate-950 overflow-x-auto">
                <pre>{`Create a React component for purchasing Bugrit credit packages.
Fetch packages from GET /api/credit-packages.
Display packages as cards showing name, credits, price, and price per credit.
Highlight the "isFeatured" package with a "Best Value" badge.
When user clicks a package:
1. Show a confirmation modal with package details
2. On confirm, POST to /api/billing/purchase-credits with packageId
3. Redirect to the returned checkoutUrl for Stripe payment
4. Handle the success/canceled query params on return
Show loading states and error handling throughout.`}</pre>
              </GlassCard>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
