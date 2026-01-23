'use client';

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

        {/* For Non-Engineers */}
        <section className="mb-12 p-6 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/30 rounded-xl">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span>🎯</span> Not a Developer? Start Here
          </h2>
          <p className="text-muted-foreground mb-4">
            You don&apos;t need to write code to add Bugrit billing features to your app.
            Copy the prompts below and paste them into <strong>Claude, ChatGPT, Cursor, or any AI coding assistant</strong>.
            The AI will write the code for you.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-background/50 rounded-full text-sm">Works with Claude</span>
            <span className="px-3 py-1 bg-background/50 rounded-full text-sm">Works with ChatGPT</span>
            <span className="px-3 py-1 bg-background/50 rounded-full text-sm">Works with Cursor</span>
            <span className="px-3 py-1 bg-background/50 rounded-full text-sm">Works with Copilot</span>
          </div>
        </section>

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

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* GET /api/billing/status */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get Billing Status</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/billing/status</code>
          </div>
          <p className="text-muted-foreground mb-6">
            Returns complete billing status including subscription tier, credit balance, and account limits.
          </p>

          {/* Vibe Coding Prompt */}
          <div className="mb-6 p-5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h4 className="font-semibold text-white">Copy this prompt to your AI assistant</h4>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Add a credit balance display to my app header.

Use the Bugrit API: GET /api/billing/status
Pass the API key in the "x-api-key" header (stored in BUGRIT_API_KEY env var).

The response has this structure:
- credits.remaining: number of credits left
- credits.included: total credits in plan
- credits.percentUsed: percentage used (0-100)
- tier: current plan name
- canScan: whether user can run scans
- needsUpgrade: whether they're running low

Display as "X / Y credits" with a progress bar.
Show yellow warning when percentUsed > 80.
Show red warning with "Buy Credits" link when percentUsed > 90.
Refresh every 60 seconds.`}</pre>
            </div>
            <button
              className="mt-3 text-xs text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(`Add a credit balance display to my app header.

Use the Bugrit API: GET /api/billing/status
Pass the API key in the "x-api-key" header (stored in BUGRIT_API_KEY env var).

The response has this structure:
- credits.remaining: number of credits left
- credits.included: total credits in plan
- credits.percentUsed: percentage used (0-100)
- tier: current plan name
- canScan: whether user can run scans
- needsUpgrade: whether they're running low

Display as "X / Y credits" with a progress bar.
Show yellow warning when percentUsed > 80.
Show red warning with "Buy Credits" link when percentUsed > 90.
Refresh every 60 seconds.`)}
            >
              📋 Copy prompt
            </button>
          </div>

          {/* Technical Details (collapsed by default mentally) */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-4">
              📖 Show technical details and full response structure
            </summary>
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
          </details>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* POST /api/billing/quote */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Get Cost Quote Before Scanning</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/billing/quote</code>
          </div>
          <p className="text-muted-foreground mb-6">
            Get a detailed cost quote before running a scan. Shows all available options
            and calculates the exact credit cost so users can make informed decisions.
          </p>

          {/* Vibe Coding Prompt */}
          <div className="mb-6 p-5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h4 className="font-semibold text-white">Copy this prompt to your AI assistant</h4>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Create a "scan cost estimator" component that shows users what a scan will cost before they run it.

Use the Bugrit API: POST /api/billing/quote
Pass API key in "x-api-key" header.

Send this request body:
{
  "estimatedLines": 50000,
  "config": {
    "categories": ["linting", "security"],
    "aiFeatures": ["summary"]
  }
}

The response includes:
- options.categories: array of tool categories with creditCost for each
- options.aiFeatures: array of AI features with creditCost for each
- balance.remaining: user's current credits
- estimate.total: total cost for this scan
- estimate.breakdown: cost breakdown (base, lines, tools, ai)
- canAfford: boolean - can they run this scan?
- overage: if they'll go over, shows extra cost

Build a UI with:
1. Toggles for each tool category (security, accessibility, performance)
2. Toggles for AI features (summary, explanations, fix suggestions)
3. Live-updating cost estimate as user toggles options
4. Show breakdown: "Base: 1 + Lines: 5 + Security: 1 = 7 credits"
5. Green "Run Scan" button if canAfford is true
6. Red "Insufficient Credits" message with upgrade link if false
7. If there's overage, show: "This will use 3 overage credits ($0.90)"

Update the estimate on every toggle change.`}</pre>
            </div>
            <button
              className="mt-3 text-xs text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(`Create a "scan cost estimator" component that shows users what a scan will cost before they run it.

Use the Bugrit API: POST /api/billing/quote
Pass API key in "x-api-key" header.

Send this request body:
{
  "estimatedLines": 50000,
  "config": {
    "categories": ["linting", "security"],
    "aiFeatures": ["summary"]
  }
}

The response includes:
- options.categories: array of tool categories with creditCost for each
- options.aiFeatures: array of AI features with creditCost for each
- balance.remaining: user's current credits
- estimate.total: total cost for this scan
- estimate.breakdown: cost breakdown (base, lines, tools, ai)
- canAfford: boolean - can they run this scan?
- overage: if they'll go over, shows extra cost

Build a UI with:
1. Toggles for each tool category (security, accessibility, performance)
2. Toggles for AI features (summary, explanations, fix suggestions)
3. Live-updating cost estimate as user toggles options
4. Show breakdown: "Base: 1 + Lines: 5 + Security: 1 = 7 credits"
5. Green "Run Scan" button if canAfford is true
6. Red "Insufficient Credits" message with upgrade link if false
7. If there's overage, show: "This will use 3 overage credits ($0.90)"

Update the estimate on every toggle change.`)}
            >
              📋 Copy prompt
            </button>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-4">
              📖 Show technical details and full response structure
            </summary>
            <div className="space-y-4">
              <h4 className="font-semibold">Request Body</h4>
              <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
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

              <h4 className="font-semibold">Response</h4>
              <GlassCard className="p-4 font-mono text-sm bg-slate-950 overflow-x-auto">
                <pre>{`{
  "options": {
    "categories": [
      {
        "id": "linting",
        "name": "Linting & Formatting",
        "creditCost": 0,
        "included": true
      },
      {
        "id": "security",
        "name": "Security",
        "creditCost": 1,
        "included": false
      },
      {
        "id": "accessibility",
        "name": "Accessibility",
        "creditCost": 4,
        "included": false
      },
      {
        "id": "performance",
        "name": "Performance",
        "creditCost": 5,
        "included": false
      }
    ],
    "aiFeatures": [
      { "id": "summary", "creditCost": 1, "perIssue": false },
      { "id": "issue_explanations", "creditCost": 0.1, "perIssue": true },
      { "id": "fix_suggestions", "creditCost": 0.15, "perIssue": true }
    ],
    "linesCostPer10K": 1,
    "baseScanCost": 1
  },
  "balance": {
    "remaining": 153,
    "included": 200,
    "used": 47
  },
  "estimate": {
    "breakdown": {
      "base": 1,
      "lines": 5,
      "tools": { "security": 1 },
      "ai": { "summary": 1 }
    },
    "total": 8
  },
  "canAfford": true,
  "overage": null
}`}</pre>
              </GlassCard>
            </div>
          </details>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* GET /api/billing/usage */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">View Usage History</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/billing/usage</code>
          </div>
          <p className="text-muted-foreground mb-6">
            Returns usage summary and transaction history. See where your credits went.
          </p>

          {/* Vibe Coding Prompt */}
          <div className="mb-6 p-5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h4 className="font-semibold text-white">Copy this prompt to your AI assistant</h4>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Create a usage analytics dashboard for Bugrit credits.

Use the Bugrit API: GET /api/billing/usage?include=both
Pass API key in "x-api-key" header.
Add ?period=previous to see last month's data.

The response includes:
- summary.totalScans: number of scans run
- summary.totalCreditsUsed: credits consumed
- summary.totalIssuesFound: issues detected
- summary.byCategory: credits per tool category (linting, security, etc.)
- summary.topProjects: which projects used most credits
- transactions: array of individual credit transactions

Build a dashboard with:
1. Summary cards: Total Scans, Credits Used, Issues Found
2. Bar chart showing credits by category (use Recharts or Chart.js)
3. Pie chart of top projects by credit usage
4. Transaction table with: date, type, credits, scan details
5. Dropdown to switch between "Current Period" and "Previous Period"

Make it look professional with cards and proper spacing.`}</pre>
            </div>
            <button
              className="mt-3 text-xs text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(`Create a usage analytics dashboard for Bugrit credits.

Use the Bugrit API: GET /api/billing/usage?include=both
Pass API key in "x-api-key" header.
Add ?period=previous to see last month's data.

The response includes:
- summary.totalScans: number of scans run
- summary.totalCreditsUsed: credits consumed
- summary.totalIssuesFound: issues detected
- summary.byCategory: credits per tool category (linting, security, etc.)
- summary.topProjects: which projects used most credits
- transactions: array of individual credit transactions

Build a dashboard with:
1. Summary cards: Total Scans, Credits Used, Issues Found
2. Bar chart showing credits by category (use Recharts or Chart.js)
3. Pie chart of top projects by credit usage
4. Transaction table with: date, type, credits, scan details
5. Dropdown to switch between "Current Period" and "Previous Period"

Make it look professional with cards and proper spacing.`)}
            >
              📋 Copy prompt
            </button>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground mb-4">
              📖 Show technical details and query parameters
            </summary>
            <div className="space-y-4">
              <h4 className="font-semibold">Query Parameters</h4>
              <div className="space-y-2 mb-4">
                <div className="flex gap-4">
                  <code className="text-sm bg-muted px-2 py-1 rounded">period</code>
                  <span className="text-muted-foreground text-sm">&quot;current&quot; | &quot;previous&quot; | ISO date</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-sm bg-muted px-2 py-1 rounded">include</code>
                  <span className="text-muted-foreground text-sm">&quot;summary&quot; | &quot;transactions&quot; | &quot;both&quot;</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-sm bg-muted px-2 py-1 rounded">limit</code>
                  <span className="text-muted-foreground text-sm">Number of transactions (default: 50, max: 200)</span>
                </div>
              </div>

              <h4 className="font-semibold">Response</h4>
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
      "security": { "scans": 10, "credits": 10, "issues": 23 }
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
      "details": { "scanId": "scan_abc123" }
    }
  ]
}`}</pre>
              </GlassCard>
            </div>
          </details>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* Auto Top-up */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Configure Auto Top-up</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/settings/subscription/auto-topup</code>
          </div>
          <p className="text-muted-foreground mb-6">
            Never run out of credits. Configure automatic purchases when balance falls low.
          </p>

          {/* Vibe Coding Prompt */}
          <div className="mb-6 p-5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h4 className="font-semibold text-white">Copy this prompt to your AI assistant</h4>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Create an auto top-up settings page for Bugrit credits.

First, fetch current settings:
GET /api/settings/subscription (returns current autoTopup config)

And available credit packages:
GET /api/credit-packages (returns array of packages with id, name, credits, price)

Build a settings form with:
1. Toggle switch: "Enable Auto Top-up"
2. Number input: "Top up when credits fall below" (default: 10)
3. Dropdown: "Package to purchase" (show packages from API)
4. Number input: "Maximum purchases per month" (1-10, default: 3)
5. Save button

On save, POST to /api/settings/subscription/auto-topup with:
{
  "enabled": true,
  "triggerThreshold": 10,
  "packageId": "pro-pack",
  "maxPerMonth": 3
}

Show success toast on save.
Add a note: "Requires a payment method on file."
Link to billing portal if no payment method.`}</pre>
            </div>
            <button
              className="mt-3 text-xs text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(`Create an auto top-up settings page for Bugrit credits.

First, fetch current settings:
GET /api/settings/subscription (returns current autoTopup config)

And available credit packages:
GET /api/credit-packages (returns array of packages with id, name, credits, price)

Build a settings form with:
1. Toggle switch: "Enable Auto Top-up"
2. Number input: "Top up when credits fall below" (default: 10)
3. Dropdown: "Package to purchase" (show packages from API)
4. Number input: "Maximum purchases per month" (1-10, default: 3)
5. Save button

On save, POST to /api/settings/subscription/auto-topup with:
{
  "enabled": true,
  "triggerThreshold": 10,
  "packageId": "pro-pack",
  "maxPerMonth": 3
}

Show success toast on save.
Add a note: "Requires a payment method on file."
Link to billing portal if no payment method.`)}
            >
              📋 Copy prompt
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* Purchase Credits */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Purchase Credit Packages</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/billing/purchase-credits</code>
          </div>
          <p className="text-muted-foreground mb-6">
            Let users buy additional credit packages. Returns a Stripe checkout URL.
          </p>

          {/* Vibe Coding Prompt */}
          <div className="mb-6 p-5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h4 className="font-semibold text-white">Copy this prompt to your AI assistant</h4>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Create a credit purchase page for Bugrit.

First, fetch available packages:
GET /api/credit-packages

Response is array of packages:
- id: package identifier
- name: display name (e.g., "Pro Pack")
- credits: number of credits
- price: price in dollars
- isFeatured: highlight this one

Build a page with:
1. Grid of package cards showing: name, credits, price, price per credit
2. Highlight the "isFeatured" package with a "Best Value" badge
3. Click a package → show confirmation modal
4. On confirm, POST to /api/billing/purchase-credits with { "packageId": "selected-id" }
5. Response has { "checkoutUrl": "..." } - redirect user there
6. After payment, user returns to your app with ?success=true or ?canceled=true

Handle the return URL:
- If ?success=true, show "Thanks! Credits added to your account"
- If ?canceled=true, show "Purchase canceled"

Add loading spinners during API calls.`}</pre>
            </div>
            <button
              className="mt-3 text-xs text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(`Create a credit purchase page for Bugrit.

First, fetch available packages:
GET /api/credit-packages

Response is array of packages:
- id: package identifier
- name: display name (e.g., "Pro Pack")
- credits: number of credits
- price: price in dollars
- isFeatured: highlight this one

Build a page with:
1. Grid of package cards showing: name, credits, price, price per credit
2. Highlight the "isFeatured" package with a "Best Value" badge
3. Click a package → show confirmation modal
4. On confirm, POST to /api/billing/purchase-credits with { "packageId": "selected-id" }
5. Response has { "checkoutUrl": "..." } - redirect user there
6. After payment, user returns to your app with ?success=true or ?canceled=true

Handle the return URL:
- If ?success=true, show "Thanks! Credits added to your account"
- If ?canceled=true, show "Purchase canceled"

Add loading spinners during API calls.`)}
            >
              📋 Copy prompt
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* CI/CD Integration */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">CI/CD Pipeline Integration</h2>
          <p className="text-muted-foreground mb-6">
            Add credit checks to your CI/CD pipeline so builds don&apos;t fail mid-scan.
          </p>

          {/* Vibe Coding Prompt */}
          <div className="mb-6 p-5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h4 className="font-semibold text-white">Copy this prompt to your AI assistant</h4>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Write a shell script for CI/CD that checks Bugrit credits before running a scan.

The script should:
1. Call GET https://bugrit.com/api/billing/status
2. Pass the BUGRIT_API_KEY environment variable in the x-api-key header
3. Parse the JSON response to get credits.remaining

Decision logic:
- If credits < 1: Print "ERROR: No credits remaining" and exit 1 (fail build)
- If credits < 5: Print "WARNING: Low credits (X remaining)" but continue
- Otherwise: Print "Credits OK: X remaining" and continue

Use curl and jq for JSON parsing.
Make sure it works in GitHub Actions, GitLab CI, and CircleCI.

Also create a GitHub Actions workflow step I can copy-paste.`}</pre>
            </div>
            <button
              className="mt-3 text-xs text-primary hover:underline"
              onClick={() => navigator.clipboard.writeText(`Write a shell script for CI/CD that checks Bugrit credits before running a scan.

The script should:
1. Call GET https://bugrit.com/api/billing/status
2. Pass the BUGRIT_API_KEY environment variable in the x-api-key header
3. Parse the JSON response to get credits.remaining

Decision logic:
- If credits < 1: Print "ERROR: No credits remaining" and exit 1 (fail build)
- If credits < 5: Print "WARNING: Low credits (X remaining)" but continue
- Otherwise: Print "Credits OK: X remaining" and continue

Use curl and jq for JSON parsing.
Make sure it works in GitHub Actions, GitLab CI, and CircleCI.

Also create a GitHub Actions workflow step I can copy-paste.`)}
            >
              📋 Copy prompt
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* Credit Costs Reference */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Credit Costs Reference</h2>
          <p className="text-muted-foreground mb-6">
            Quick reference for how credits are calculated.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Base Costs</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Base scan cost</td>
                    <td className="text-right font-mono">1 credit</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Per 10,000 lines of code</td>
                    <td className="text-right font-mono">1 credit</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Tool Categories</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Linting, Quality, Docs, Git</td>
                    <td className="text-right text-green-400 font-mono">Free</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Security</td>
                    <td className="text-right font-mono">1 credit</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Accessibility</td>
                    <td className="text-right font-mono">4 credits</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2">Performance</td>
                    <td className="text-right font-mono">5 credits</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold mb-3">AI Features</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Scan Summary</td>
                  <td className="text-right font-mono">1 credit per scan</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Priority Scoring</td>
                  <td className="text-right font-mono">1 credit per scan</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Issue Explanations</td>
                  <td className="text-right font-mono">0.1 credit per issue</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Fix Suggestions</td>
                  <td className="text-right font-mono">0.15 credit per issue</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            See the full <Link href="/docs/pricing" className="text-primary hover:underline">Pricing Guide</Link> for detailed explanations.
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        {/* Authentication */}
        {/* ═══════════════════════════════════════════════════════════════════════════ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Authentication</h2>
          <p className="text-muted-foreground mb-4">
            All billing endpoints require an API key. Get yours from Settings → API Keys.
          </p>

          <div className="mb-6 p-5 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <h4 className="font-semibold text-white">Tell your AI assistant</h4>
            </div>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`When calling Bugrit APIs, always:
1. Store the API key in environment variable BUGRIT_API_KEY
2. Pass it in the "x-api-key" header
3. Never hardcode the API key in source code
4. Add .env to .gitignore`}</pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
