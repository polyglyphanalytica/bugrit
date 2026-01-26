# Bugrit Features Documentation

Complete documentation for all Bugrit features, including API access and AI agent prompts.

---

## Table of Contents

1. [Vibe Score System](#1-vibe-score-system)
2. [One-Click Fixes](#2-one-click-fixes)
3. [AI Review & Merge](#3-ai-review--merge)
4. [Ship It Mode](#4-ship-it-mode)
5. [GitHub Action](#5-github-action)
6. [Learning Mode](#6-learning-mode)
7. [Repo Health Profile](#7-repo-health-profile)
8. [Team Features](#8-team-features)
9. [Explain My Codebase](#9-explain-my-codebase)
10. [Trust Badge System](#10-trust-badge-system)
11. [Notifications](#11-notifications)
12. [Build Your Own Dashboard](#12-build-your-own-dashboard)

---

## 1. Vibe Score System

A comprehensive 0-100 score that measures your codebase health across six dimensions.

### Score Components

| Component | Weight | What It Measures |
|-----------|--------|------------------|
| Security | 30% | Vulnerabilities, secrets exposure, OWASP compliance |
| Code Quality | 25% | Linting, complexity, duplication, maintainability |
| Accessibility | 15% | WCAG compliance, a11y best practices |
| Performance | 15% | Load times, bundle size, Core Web Vitals |
| Dependencies | 10% | Outdated packages, known vulnerabilities |
| Documentation | 5% | README quality, inline comments, API docs |

### Grade Scale

| Score | Grade | Description |
|-------|-------|-------------|
| 90-100 | A+ | Exceptional - production ready |
| 80-89 | A/A- | Excellent - minor improvements |
| 70-79 | B+/B | Good - some issues to address |
| 60-69 | B-/C+ | Fair - needs attention |
| 50-59 | C/C- | Below average - significant issues |
| 0-49 | D/F | Poor - major rework needed |

### Achievements

Earn badges for specific accomplishments:

- **Secret Keeper** - No exposed secrets
- **Lint Free** - Zero linting errors
- **Speed Demon** - Performance score 90+
- **Fort Knox** - Security score 95+
- **Accessibility Champion** - A11y score 90+
- **Fresh Dependencies** - All packages up to date
- **Well Documented** - Documentation score 80+
- **Bug Hunter** - Fixed 10+ issues
- **Consistent** - Style consistency 95%+
- **Test Champion** - 80%+ code coverage
- **Zero Vulnerabilities** - No known CVEs
- **Mobile First** - Mobile performance 90+
- **Bundle Master** - Bundle size optimized
- **Type Safe** - 100% TypeScript coverage
- **CI/CD Hero** - All pipelines passing

### API Access

```bash
# Get Vibe Score for a scan
GET /api/v1/scans/{scanId}/vibe-score

# Response
{
  "score": 87,
  "grade": "B+",
  "components": {
    "security": { "score": 92, "weight": 0.30 },
    "codeQuality": { "score": 85, "weight": 0.25 },
    "accessibility": { "score": 88, "weight": 0.15 },
    "performance": { "score": 82, "weight": 0.15 },
    "dependencies": { "score": 90, "weight": 0.10 },
    "documentation": { "score": 75, "weight": 0.05 }
  },
  "achievements": ["Secret Keeper", "Lint Free"],
  "trend": "improving"
}
```

---

## 2. One-Click Fixes

AI-powered automatic fix generation for identified issues.

### How It Works

1. Bugrit scans your code and identifies issues
2. AI analyzes each issue and generates a fix
3. Fixes are pushed to a new branch: `bugrit/fixes-{scanId}`
4. You review and merge the fixes

### Fix Output

Each fix includes:
- **Description** - What the fix does
- **Unified Diff** - The exact code change
- **Before/After** - Code snippets for comparison
- **Explanation** - Why this fix works
- **Confidence** - High/Medium/Low

### API Access

```bash
# Generate fix for a specific finding
POST /api/v1/fixes/generate
Content-Type: application/json

{
  "findingId": "finding-123",
  "scanId": "scan-456",
  "context": {
    "framework": "nextjs",
    "styleGuide": "airbnb"
  }
}

# Response
{
  "canFix": true,
  "confidence": "high",
  "fix": {
    "description": "Sanitize user input to prevent XSS",
    "diff": "--- a/src/components/Comment.tsx\n+++ b/src/components/Comment.tsx\n...",
    "beforeCode": "dangerouslySetInnerHTML={{ __html: comment }}",
    "afterCode": "dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment) }}",
    "explanation": "Using DOMPurify to sanitize HTML prevents XSS attacks..."
  }
}

# Batch generate fixes
POST /api/v1/fixes/batch
Content-Type: application/json

{
  "scanId": "scan-456",
  "findingIds": ["finding-1", "finding-2", "finding-3"]
}
```

### AI Agent Prompt

Copy this to your AI assistant to apply fixes:

```
Fix the following issues in my codebase:

## src/api/users.ts
- **CRITICAL**: SQL Injection vulnerability (line 42)
  User input is concatenated directly into SQL query

## src/components/Comment.tsx
- **HIGH**: Cross-Site Scripting (XSS) (line 18)
  Using dangerouslySetInnerHTML without sanitization

Please provide the fixed code for each file.
```

---

## 3. AI Review & Merge

AI agent prompt for reviewing and merging fix branches.

### How It Works

1. Bugrit generates fixes and pushes to a branch
2. Get the review prompt from the UI or API
3. Give the prompt to your AI coding assistant
4. AI reviews changes, runs tests, and merges if safe

### API Access

```bash
# Get full review prompt
GET /api/fixes/review-prompt?scanId={scanId}&format=full

# Get quick review prompt
GET /api/fixes/review-prompt?scanId={scanId}&format=quick

# Get as JSON (includes metadata)
GET /api/fixes/review-prompt?scanId={scanId}&response=json
```

### Sample Review Prompt

```markdown
# Review and Merge Bugrit Fix Branch

## Repository Information
- **Repository**: https://github.com/example/repo
- **Base Branch**: `main`
- **Fix Branch**: `bugrit/fixes-abc123`

## Issues Fixed (15 total)
- Critical: 2
- High: 5
- Medium: 6
- Low: 2

## Your Task

### Step 1: Fetch and Review
git fetch origin bugrit/fixes-abc123
git diff main...origin/bugrit/fixes-abc123

### Step 2: Run Tests
git checkout bugrit/fixes-abc123
npm test && npm run build

### Step 3: Merge if Tests Pass
git checkout main
git merge origin/bugrit/fixes-abc123 --no-ff
git push origin main
```

### Web UI

Access at: `/scans/{scanId}/review-prompt`

---

## 4. Ship It Mode

Tiered scanning for different time constraints.

### Scan Tiers

| Mode | Duration | What's Scanned |
|------|----------|----------------|
| **Quick Check** | ~30s | Critical security only (SQLi, XSS, secrets) |
| **Standard** | ~3min | Security + linting + dependencies |
| **Deep Dive** | ~10min | Full 150-module scan |
| **Paranoid** | ~30min | Everything + manual review suggestions |

### API Access

```bash
# Start a quick scan
POST /api/v1/scans
Content-Type: application/json

{
  "repoUrl": "https://github.com/user/repo",
  "mode": "quick"  # quick | standard | deep | paranoid
}

# Check scan status
GET /api/v1/scans/{scanId}
```

### Configuration

```yaml
# .bugrit.yml in your repo
scan:
  mode: standard

  # Override for CI
  ci_mode: quick

  # Skip specific tools
  skip:
    - lighthouse
    - sitespeed
```

---

## 5. GitHub Action

One-line integration for CI/CD pipelines.

### Quick Start

```yaml
# .github/workflows/bugrit.yml
name: Bugrit Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bugrit/scan-action@v1
        with:
          api-key: ${{ secrets.BUGRIT_API_KEY }}
```

### Configuration Options

```yaml
- uses: bugrit/scan-action@v1
  with:
    api-key: ${{ secrets.BUGRIT_API_KEY }}

    # Scan mode
    mode: standard  # quick | standard | deep | paranoid

    # Fail conditions
    fail-on: critical  # critical | high | medium | low | none

    # Specific tools
    tools: security,lint,deps

    # Upload results as artifact
    upload-results: true

    # Post comment on PR
    comment-on-pr: true

    # Minimum Vibe Score to pass
    min-score: 70
```

### Outputs

```yaml
- uses: bugrit/scan-action@v1
  id: bugrit

- run: |
    echo "Score: ${{ steps.bugrit.outputs.score }}"
    echo "Grade: ${{ steps.bugrit.outputs.grade }}"
    echo "Issues: ${{ steps.bugrit.outputs.issue-count }}"
    echo "Report: ${{ steps.bugrit.outputs.report-url }}"
```

---

## 6. Learning Mode

Educational content explaining each finding and how to prevent it.

### Content Types

Each finding includes:
- **What It Is** - Plain English explanation
- **Why It Matters** - Real-world impact
- **How To Fix** - Step-by-step guide
- **Code Examples** - Before/after
- **Prevention** - How to avoid in future
- **Resources** - Links to learn more

### API Access

```bash
# Get learning content for a finding type
GET /api/v1/learning/{findingType}

# Example: GET /api/v1/learning/sql-injection

# Response
{
  "type": "sql-injection",
  "title": "SQL Injection",
  "severity": "critical",
  "content": {
    "whatItIs": "SQL injection allows attackers to execute arbitrary SQL...",
    "whyItMatters": "Attackers can read, modify, or delete your entire database...",
    "howToFix": [
      "Use parameterized queries",
      "Use an ORM like Prisma or TypeORM",
      "Validate and sanitize all user input"
    ],
    "codeExample": {
      "vulnerable": "db.query(`SELECT * FROM users WHERE id = ${userId}`)",
      "secure": "db.query('SELECT * FROM users WHERE id = ?', [userId])"
    },
    "resources": [
      { "title": "OWASP SQL Injection", "url": "https://owasp.org/..." }
    ]
  }
}

# Get all available learning topics
GET /api/v1/learning
```

---

## 7. Repo Health Profile

Public profile page showing your repository's health status.

### Features

- Public URL: `bugrit.dev/health/{owner}/{repo}`
- Embeddable SVG badge
- Scan history graph
- Issue breakdown by category
- Trend indicators

### Badge API

```bash
# Get SVG badge
GET /api/badge/{owner}/{repo}

# With options
GET /api/badge/{owner}/{repo}?style=flat&label=Vibe%20Score

# Embed in README
![Vibe Score](https://bugrit.dev/api/badge/owner/repo)
```

### Badge Styles

| Style | Example |
|-------|---------|
| `flat` | ![flat](https://img.shields.io/badge/vibe-87-green?style=flat) |
| `flat-square` | ![flat-square](https://img.shields.io/badge/vibe-87-green?style=flat-square) |
| `plastic` | ![plastic](https://img.shields.io/badge/vibe-87-green?style=plastic) |
| `for-the-badge` | ![for-the-badge](https://img.shields.io/badge/vibe-87-green?style=for-the-badge) |

---

## 8. Team Features

Collaborate with your team on code quality.

### Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full access, billing, delete team |
| **Admin** | Manage members, configure settings |
| **Member** | Run scans, view results |
| **Viewer** | View results only |

### Security Policies

Configure team-wide security policies:

```json
{
  "minVibeScore": 70,
  "blockOnCritical": true,
  "requireReview": ["security", "accessibility"],
  "autoFix": {
    "enabled": true,
    "maxSeverity": "medium"
  }
}
```

### API Access

```bash
# Create a team
POST /api/v1/teams
Content-Type: application/json

{
  "name": "My Team",
  "slug": "my-team"
}

# Invite member
POST /api/v1/teams/{teamId}/invites
Content-Type: application/json

{
  "email": "dev@example.com",
  "role": "member"
}

# Get team dashboard
GET /api/v1/teams/{teamId}/dashboard

# Response
{
  "team": { "id": "...", "name": "My Team" },
  "stats": {
    "totalScans": 150,
    "averageScore": 82,
    "issuesFixed": 423,
    "trend": "+5%"
  },
  "recentScans": [...],
  "topIssues": [...]
}
```

---

## 9. Explain My Codebase

AI-powered codebase analysis and documentation.

### What It Generates

- **Architecture Overview** - High-level structure
- **Key Components** - Main modules explained
- **Data Flow** - How data moves through the app
- **Dependencies** - Why each dep is used
- **Getting Started** - Onboarding guide
- **Patterns Used** - Design patterns identified

### API Access

```bash
# Generate codebase explanation
POST /api/v1/explain
Content-Type: application/json

{
  "repoUrl": "https://github.com/user/repo",
  "focus": "architecture"  # architecture | security | performance | all
}

# Response
{
  "summary": "This is a Next.js 14 application using App Router...",
  "architecture": {
    "type": "monolith",
    "framework": "Next.js 14",
    "patterns": ["App Router", "Server Components", "API Routes"]
  },
  "components": [
    {
      "path": "src/components",
      "purpose": "Reusable UI components",
      "key_files": ["Button.tsx", "Modal.tsx", "Form.tsx"]
    }
  ],
  "dataFlow": "User requests → API Routes → Firestore → Response",
  "gettingStarted": [
    "1. Clone the repository",
    "2. Run npm install",
    "3. Copy .env.example to .env.local",
    "4. Run npm run dev"
  ]
}
```

### AI Agent Prompt

```
Analyze my codebase and explain:
1. The overall architecture and design patterns
2. How the main components work together
3. The data flow from user input to database
4. Any security considerations I should know about
5. How to onboard a new developer

Repository: https://github.com/user/repo
```

---

## 10. Trust Badge System

Embeddable badge for websites scanned by Bugrit.

### How It Works

1. Register your website in Bugrit dashboard
2. Get the embed code
3. Add to your website
4. Badge dynamically shows your current Vibe Score

### Badge Modes

| Mode | When | Display |
|------|------|---------|
| **Verified** | Valid scan + subscription | "Checked for Safety [SCORE] by Bugrit" |
| **Advertising** | No scan or no subscription | "A Vibe Coder's Best Friend - Bugrit" |

### Embed Code

```html
<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="site_abc123"
  data-size="medium"
  data-theme="auto"
  data-position="inline"
  async></script>
```

### Configuration Options

| Attribute | Values | Dimensions |
|-----------|--------|------------|
| `data-size` | small, medium, large | 120×40, 160×52, 200×64 |
| `data-theme` | light, dark, auto | — |
| `data-position` | inline, fixed-bottom-right, fixed-bottom-left | — |

### API Access

```bash
# Register a site
POST /api/trust-badge/sites
Content-Type: application/json

{
  "domain": "example.com",
  "siteName": "My Website"
}

# Get embed code
GET /api/trust-badge/embed?siteId={siteId}

# Verify badge (called by embed.js)
GET /api/trust-badge/verify?siteId={siteId}&origin=https://example.com
```

### AI Agent Prompt for Integration

```
# Add Bugrit Trust Badge to example.com

Add this script just before </body>:

<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="site_abc123"
  data-size="medium"
  data-theme="auto"
  data-position="inline"
  async></script>

## Badge Behavior

**If verified:** Shows "Checked for Safety [SCORE] by Bugrit" → Links to verification page
**If not verified:** Shows "A Vibe Coder's Best Friend - Bugrit" → Links to Bugrit homepage

The badge cannot be faked - it fetches the real score from Bugrit's API.
```

---

## 11. Notifications

Multi-channel notification system for staying informed about scan results, security alerts, and more.

### Notification Channels

| Channel | Description | Default |
|---------|-------------|---------|
| **Email** | Delivered via Resend API | On |
| **In-App** | Bell icon in dashboard nav | On |
| **Push** | Mobile/desktop via FCM | Off (opt-in) |

### Notification Event Types

| Event | Description | Transactional |
|-------|-------------|---------------|
| `scan_completed` | Scan finished with results | No |
| `scan_failed` | Scan encountered an error | No |
| `test_completed` | Test run finished | No |
| `test_failed` | Test execution failed | No |
| `fix_branch_ready` | AI-generated fixes are ready | No |
| `weekly_summary` | Weekly activity digest | No |
| `security_alert` | Critical/high severity findings | Yes |
| `credit_low` | Credits running low | Yes |
| `subscription_update` | Billing/plan changes | Yes |
| `team_invite` | Invited to join a team | Yes |

**Transactional notifications** always include email and cannot be fully disabled.

### API Access

```bash
# Get user notifications
GET /api/notifications

# Response
{
  "notifications": [
    {
      "id": "notif_abc123",
      "type": "scan_completed",
      "title": "Scan completed - 5 findings",
      "message": "Your scan of my-app found 5 issues...",
      "severity": "success",
      "actionUrl": "/scans/scan_123",
      "read": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "unreadCount": 3
}

# Mark notification as read
POST /api/notifications
Content-Type: application/json

{
  "action": "markRead",
  "notificationId": "notif_abc123"
}

# Mark all as read
POST /api/notifications
Content-Type: application/json

{
  "action": "markAllRead"
}

# Delete old notifications (used by cron)
DELETE /api/notifications?olderThanDays=30
```

### Notification Preferences API

```bash
# Get notification preferences
GET /api/notifications/preferences

# Response
{
  "globalEnabled": true,
  "quietHoursEnabled": false,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00",
  "timezone": "America/New_York",
  "channels": {
    "email": {
      "enabled": true,
      "digestMode": "immediate"
    },
    "inApp": {
      "enabled": true,
      "showBadge": true,
      "playSound": false
    },
    "push": {
      "enabled": false,
      "deviceTokens": []
    }
  },
  "events": {
    "scan_completed": {
      "enabled": true,
      "channels": ["email", "in_app"]
    },
    "security_alert": {
      "enabled": true,
      "channels": ["email", "in_app", "push"]
    }
  }
}

# Update notification preferences
PATCH /api/notifications/preferences
Content-Type: application/json

{
  "globalEnabled": true,
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00",
  "channels": {
    "email": {
      "enabled": true,
      "digestMode": "daily"
    }
  },
  "events": {
    "weekly_summary": {
      "enabled": false,
      "channels": []
    }
  }
}

# Initialize preferences during signup
POST /api/notifications/preferences/init
Authorization: Bearer {firebase_id_token}
Content-Type: application/json

{
  "emailEnabled": true,
  "pushEnabled": false
}
```

### Quiet Hours

Configure times when non-urgent notifications are held:

- Transactional notifications (security alerts, billing) bypass quiet hours
- In-app notifications are always delivered (just stored)
- Held notifications are delivered when quiet hours end

### Email Digest Modes

| Mode | Description |
|------|-------------|
| `immediate` | Send each notification as it happens |
| `daily` | Bundle into daily digest at 9am |
| `weekly` | Bundle into weekly digest on Mondays |

### Settings UI

Manage preferences at: **Settings → Notifications**

- Toggle global notifications on/off
- Configure quiet hours with timezone
- Enable/disable individual channels
- Customize per-event notification preferences
- Register devices for push notifications

---

## 12. Build Your Own Dashboard

Complete AI prompt for building a **fully functional Bugrit dashboard** inside your own application. This covers the entire feature set including billing, credits, tests, scans, and notifications.

### Overview

Copy this comprehensive prompt to your AI coding assistant (Claude, Cursor, GitHub Copilot, etc.) to build a complete Bugrit-integrated dashboard. The only feature that requires redirect to Bugrit is Stripe payment processing.

### Full Integration Prompt

````markdown
# Build a Complete Bugrit-Integrated Dashboard

Create a fully functional dashboard that integrates with the Bugrit API. This dashboard should replicate the complete Bugrit experience including billing, credits, scans, tests, fixes, and notifications.

## Environment Setup

```env
BUGRIT_API_KEY=your_api_key_here
BUGRIT_API_URL=https://bugrit.dev/api
BUGRIT_APP_URL=https://bugrit.dev
```

All API calls require the API key in the Authorization header:
```typescript
const headers = {
  'Authorization': `Bearer ${process.env.BUGRIT_API_KEY}`,
  'Content-Type': 'application/json'
};
```

---

## 1. BILLING & CREDITS SYSTEM

Credits are the currency for running scans. Always check credits before starting scans.

### Get Billing Status

```typescript
GET /api/billing/status

// Response:
{
  "tier": "pro",                    // free | starter | pro | business | enterprise
  "tierName": "Pro",
  "credits": {
    "remaining": 4250,              // Available credits
    "included": 5000,               // Monthly allocation
    "used": 750,                    // Used this period
    "rollover": 0,                  // Rolled over from last month
    "percentUsed": 15               // Usage percentage
  },
  "subscription": {
    "status": "active",             // active | canceled | past_due | none
    "renewsAt": "2024-02-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "limits": {
    "maxProjects": 25,
    "maxRepoSize": 500000,          // Lines of code
    "aiFeatures": ["summary", "fix_suggestions", "priority_scoring"]
  },
  "canScan": true,                  // Has credits or overage enabled
  "needsUpgrade": false,            // Low credits, no overage
  "overageEnabled": true            // Can exceed credits (billed extra)
}
```

**UI Requirements:**
- Display credit balance prominently in header/sidebar
- Show progress bar of credits used vs included
- Warning banner when credits < 10% remaining
- "Upgrade" button when needsUpgrade is true

### Estimate Scan Cost (REQUIRED before running scans)

```typescript
POST /api/billing/estimate
{
  "repoUrl": "https://github.com/user/repo",       // Optional if projectId provided
  "projectId": "proj_abc123",                      // Optional
  "estimatedLines": 50000,                         // Optional - auto-estimated if omitted
  "config": {
    "categories": ["security", "linting", "accessibility"],
    "aiFeatures": {
      "summary": true,
      "fixSuggestions": true
    }
  }
}

// Response:
{
  "estimate": {
    "total": 125,                   // Total credits needed
    "breakdown": {
      "base": 50,                   // Base scan cost
      "tools": {
        "security": 30,
        "linting": 20,
        "accessibility": 15
      },
      "ai": {
        "summary": 5,
        "fix_suggestions": 5
      }
    },
    "warnings": []
  },
  "canAfford": true,                // User has enough credits
  "currentBalance": 4250,
  "overageAmount": 0,               // Credits that would be overage
  "overageCost": 0,                 // Cost in dollars if overage
  "warnings": ["Repo size unknown. Estimate assumes small repo."]
}
```

**UI Requirements:**
- Show estimate breakdown before confirming scan
- Display warning if canAfford is false
- Show overage cost if applicable
- Allow user to adjust categories to reduce cost

### Get Usage History

```typescript
GET /api/billing/usage?period=current&include=both&limit=50

// Response:
{
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "summary": {
    "totalScans": 23,
    "totalCreditsUsed": 750,
    "totalLinesScanned": 1250000,
    "totalIssuesFound": 142,
    "byCategory": {
      "security": { "scans": 23, "credits": 300, "issues": 45 },
      "linting": { "scans": 20, "credits": 200, "issues": 67 },
      "accessibility": { "scans": 15, "credits": 150, "issues": 30 }
    },
    "byAIFeature": {
      "summary": { "uses": 23, "credits": 50 },
      "fix_suggestions": { "uses": 45, "credits": 50 }
    },
    "topProjects": [
      { "projectId": "proj_1", "projectName": "my-app", "scans": 10, "credits": 350 }
    ]
  },
  "transactions": [
    {
      "id": "txn_abc",
      "timestamp": "2024-01-15T10:30:00Z",
      "type": "scan",               // scan | purchase | refund | bonus
      "amount": -45,                // Negative = debit, positive = credit
      "balanceAfter": 4250,
      "details": { "scanId": "scan_123" }
    }
  ]
}
```

**UI Requirements:**
- Usage dashboard with charts (by category, over time)
- Transaction history table with filters
- Top projects by credit consumption
- Export to CSV option

### Purchase Credits / Upgrade (Redirect to Bugrit)

```typescript
// For purchasing credits or upgrading subscription, redirect to Bugrit
const purchaseUrl = `${BUGRIT_APP_URL}/settings/billing?action=purchase&returnUrl=${encodeURIComponent(window.location.href)}`;
window.location.href = purchaseUrl;

// For specific tier upgrade:
const upgradeUrl = `${BUGRIT_APP_URL}/settings/billing?action=upgrade&tier=pro&returnUrl=${encodeURIComponent(window.location.href)}`;
window.location.href = upgradeUrl;
```

**UI Requirements:**
- "Buy Credits" button opens Bugrit billing page
- "Upgrade Plan" button with tier selection
- Return URL brings user back after purchase

---

## 2. PROJECT MANAGEMENT

### List Projects

```typescript
GET /api/v1/projects?page=1&per_page=20

// Response:
{
  "data": [
    {
      "id": "proj_abc123",
      "name": "my-awesome-app",
      "repositoryUrl": "https://github.com/user/my-awesome-app",
      "platform": "web",            // web | ios | android | desktop
      "lastScanAt": "2024-01-15T10:30:00Z",
      "lastScore": 87,
      "totalScans": 23,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "perPage": 20, "total": 5 }
}
```

### Create Project

```typescript
POST /api/v1/projects
{
  "name": "my-new-project",
  "repositoryUrl": "https://github.com/user/repo",
  "platform": "web",
  "description": "My awesome project"
}

// Response:
{
  "data": {
    "id": "proj_new123",
    "name": "my-new-project",
    ...
  }
}
```

**UI Requirements:**
- Project list with search/filter
- Project cards showing last score, scan count
- "New Project" modal with repo URL input
- Click project to see scan history

---

## 3. SCAN MANAGEMENT

### Start a Scan (with credit check)

```typescript
// STEP 1: Estimate cost first
const estimate = await fetch('/api/billing/estimate', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    projectId: 'proj_abc123',
    config: {
      categories: ['security', 'linting', 'accessibility'],
      mode: 'standard',             // quick | standard | deep | paranoid
      aiFeatures: { summary: true, fixSuggestions: true }
    }
  })
});

// STEP 2: If can afford, start scan
if (estimate.canAfford) {
  const scan = await fetch('/api/v1/scans', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      projectId: 'proj_abc123',
      platform: 'web',
      branch: 'main',               // Optional
      commitSha: 'abc123',          // Optional
      config: {
        mode: 'standard',
        categories: ['security', 'linting', 'accessibility', 'performance'],
        aiFeatures: {
          summary: true,
          fixSuggestions: true,
          priorityScoring: true
        }
      }
    })
  });
}

// Response:
{
  "data": {
    "id": "scan_xyz789",
    "status": "queued",             // queued | running | completed | failed
    "projectId": "proj_abc123",
    "creditsReserved": 125,
    "estimatedDuration": 180,       // Seconds
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Scan Modes

| Mode | Duration | Categories | AI Features | Credits |
|------|----------|------------|-------------|---------|
| quick | ~30s | Security only | None | ~20 |
| standard | ~3min | Security, Linting, Deps | Summary | ~50-100 |
| deep | ~10min | All 11 categories | All | ~150-300 |
| paranoid | ~30min | All + manual suggestions | All + explanations | ~300-500 |

### Scan Categories

```typescript
const CATEGORIES = [
  'security',       // OWASP, secrets, vulnerabilities
  'linting',        // ESLint, code style
  'dependencies',   // Outdated packages, CVEs
  'accessibility',  // WCAG compliance
  'performance',    // Bundle size, Core Web Vitals
  'quality',        // Complexity, duplication
  'documentation',  // README, inline docs
  'git',            // Commit hygiene, branch protection
  'mobile',         // iOS/Android specific
  'api-security',   // API endpoint security
  'cloud-native'    // Container, K8s security
];
```

### Poll Scan Status

```typescript
GET /api/v1/scans/{scanId}

// Response when running:
{
  "data": {
    "id": "scan_xyz789",
    "status": "running",
    "progress": 45,                 // Percentage
    "currentStep": "Running security scanners...",
    "startedAt": "2024-01-15T10:30:05Z"
  }
}

// Response when completed:
{
  "data": {
    "id": "scan_xyz789",
    "status": "completed",
    "vibeScore": 87,
    "grade": "B+",
    "summary": {
      "totalFindings": 23,
      "critical": 0,
      "high": 3,
      "medium": 12,
      "low": 8
    },
    "creditsCharged": 118,
    "duration": 165,
    "completedAt": "2024-01-15T10:32:50Z"
  }
}
```

**Polling implementation:**
```typescript
async function pollScan(scanId: string, onUpdate: (scan) => void) {
  const poll = async () => {
    const res = await fetch(`/api/v1/scans/${scanId}`, { headers });
    const { data: scan } = await res.json();
    onUpdate(scan);

    if (scan.status === 'running' || scan.status === 'queued') {
      setTimeout(poll, 3000); // Poll every 3 seconds
    }
  };
  poll();
}
```

### List Scans

```typescript
GET /api/v1/scans?project_id=proj_abc&status=completed&page=1&per_page=20

// Response:
{
  "data": [
    {
      "id": "scan_xyz789",
      "projectId": "proj_abc123",
      "status": "completed",
      "vibeScore": 87,
      "grade": "B+",
      "findingsCount": 23,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "perPage": 20, "total": 23 }
}
```

---

## 4. VIBE SCORE & FINDINGS

### Get Vibe Score

```typescript
GET /api/v1/scans/{scanId}/vibe-score

// Response:
{
  "score": 87,
  "grade": "B+",
  "components": {
    "security": { "score": 92, "weight": 0.30, "findings": 3 },
    "codeQuality": { "score": 85, "weight": 0.25, "findings": 8 },
    "accessibility": { "score": 88, "weight": 0.15, "findings": 4 },
    "performance": { "score": 82, "weight": 0.15, "findings": 5 },
    "dependencies": { "score": 90, "weight": 0.10, "findings": 2 },
    "documentation": { "score": 75, "weight": 0.05, "findings": 1 }
  },
  "achievements": ["Secret Keeper", "Lint Free", "Fresh Dependencies"],
  "trend": "improving",             // improving | declining | stable
  "previousScore": 82
}
```

**UI Requirements:**
- Large circular gauge (0-100) with animated fill
- Letter grade badge with color coding
- Radar/spider chart for 6 components
- Achievement badges with tooltips
- Trend arrow with previous score

### Get Findings

```typescript
GET /api/v1/scans/{scanId}/findings?severity=critical,high&category=security&page=1&per_page=50

// Response:
{
  "data": [
    {
      "id": "finding_abc123",
      "title": "SQL Injection Vulnerability",
      "description": "User input is concatenated directly into SQL query without sanitization.",
      "severity": "critical",       // critical | high | medium | low
      "category": "security",
      "file": "src/api/users.ts",
      "line": 42,
      "column": 15,
      "codeSnippet": "const query = `SELECT * FROM users WHERE id = ${userId}`;",
      "fixAvailable": true,
      "learnMoreUrl": "/learning/sql-injection",
      "cweId": "CWE-89",
      "effort": "low",              // low | medium | high
      "metadata": {
        "tool": "semgrep",
        "rule": "javascript.sql-injection"
      }
    }
  ],
  "pagination": { "page": 1, "perPage": 50, "total": 23 },
  "facets": {
    "severity": { "critical": 0, "high": 3, "medium": 12, "low": 8 },
    "category": { "security": 5, "linting": 10, "accessibility": 8 }
  }
}
```

**UI Requirements:**
- Findings table with sortable columns
- Severity filter chips (with counts)
- Category filter dropdown
- Click row to expand details
- Code snippet with syntax highlighting
- "Generate Fix" button for fixable issues

---

## 5. ONE-CLICK FIXES

### Generate Fix

```typescript
POST /api/v1/fixes/generate
{
  "findingId": "finding_abc123",
  "scanId": "scan_xyz789"
}

// Response:
{
  "canFix": true,
  "confidence": "high",             // high | medium | low
  "creditsRequired": 2,
  "fix": {
    "description": "Use parameterized queries to prevent SQL injection",
    "diff": "--- a/src/api/users.ts\n+++ b/src/api/users.ts\n@@ -42,1 +42,1 @@\n-const query = `SELECT * FROM users WHERE id = ${userId}`;\n+const query = 'SELECT * FROM users WHERE id = ?';",
    "beforeCode": "const query = `SELECT * FROM users WHERE id = ${userId}`;",
    "afterCode": "const query = 'SELECT * FROM users WHERE id = ?';",
    "explanation": "Parameterized queries separate SQL code from data, preventing attackers from injecting malicious SQL. The ? placeholder is safely escaped by the database driver.",
    "additionalChanges": [
      { "file": "src/api/users.ts", "line": 43, "change": "Add userId to query parameters array" }
    ]
  }
}
```

### Apply Fixes (Batch)

```typescript
POST /api/v1/fixes/apply
{
  "scanId": "scan_xyz789",
  "findingIds": ["finding_abc123", "finding_def456", "finding_ghi789"],
  "branchName": "bugrit/fixes-xyz789",  // Optional, auto-generated if omitted
  "commitMessage": "fix: Apply Bugrit security fixes",  // Optional
  "createPR": true                      // Create pull request
}

// Response:
{
  "success": true,
  "branch": "bugrit/fixes-xyz789",
  "branchUrl": "https://github.com/user/repo/tree/bugrit/fixes-xyz789",
  "pullRequest": {
    "number": 42,
    "url": "https://github.com/user/repo/pull/42",
    "title": "fix: Apply Bugrit security fixes (3 issues)"
  },
  "appliedFixes": 3,
  "skippedFixes": 0,
  "creditsCharged": 6
}
```

**UI Requirements:**
- Fix preview modal with diff viewer
- Before/after code comparison
- Confidence badge
- Batch selection checkboxes
- "Apply Selected" button with count
- Progress indicator during apply

---

## 6. TEST MANAGEMENT

### List Test Cases

```typescript
GET /api/v1/tests?scanId=scan_xyz789&page=1&per_page=50

// Response:
{
  "data": [
    {
      "id": "tc_abc123",
      "name": "User Login Flow",
      "suite": "Authentication",
      "status": "passed",           // passed | failed | skipped | error
      "duration": 2340,             // Milliseconds
      "platform": "web",
      "steps": [
        "Navigate to login page",
        "Enter credentials",
        "Click submit",
        "Verify dashboard loads"
      ],
      "lastRunAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "perPage": 50, "total": 45 }
}
```

### Run Tests

```typescript
POST /api/test-runs
{
  "testCaseId": "tc_abc123",
  "testCaseName": "User Login Flow",
  "runnerType": "playwright",       // playwright | appium | tauri-driver
  "config": {
    "browser": "chromium",
    "headless": true,
    "viewport": { "width": 1280, "height": 720 }
  },
  "code": "// Optional: custom test code override"
}

// Response:
{
  "id": "run_xyz789",
  "status": "running",
  "testCaseId": "tc_abc123",
  "testCaseName": "User Login Flow",
  "startedAt": "2024-01-15T10:30:00Z"
}
```

### Get Test Run Results

```typescript
GET /api/test-runs/{runId}

// Response:
{
  "id": "run_xyz789",
  "status": "passed",               // running | passed | failed | error
  "testCaseId": "tc_abc123",
  "testCaseName": "User Login Flow",
  "duration": 4523,                 // Milliseconds
  "startedAt": "2024-01-15T10:30:00Z",
  "completedAt": "2024-01-15T10:30:04Z",
  "logs": [
    "✓ Navigated to login page",
    "✓ Entered credentials",
    "✓ Clicked submit",
    "✓ Dashboard loaded successfully"
  ],
  "screenshots": [
    { "step": "login_page", "url": "https://storage.bugrit.dev/screenshots/..." },
    { "step": "dashboard", "url": "https://storage.bugrit.dev/screenshots/..." }
  ],
  "error": null                     // Error message if failed
}
```

### Submit Test Results (from CI/CD)

```typescript
POST /api/v1/tests
{
  "projectId": "proj_abc123",
  "platform": "web",
  "branch": "main",
  "commitSha": "abc123def",
  "testCases": [
    {
      "name": "User Login",
      "suite": "Auth",
      "status": "passed",
      "duration": 1234
    },
    {
      "name": "Password Reset",
      "suite": "Auth",
      "status": "failed",
      "duration": 2345,
      "error": "Timeout waiting for email"
    }
  ]
}

// Response:
{
  "scanId": "scan_tests_xyz",
  "status": "completed",
  "summary": {
    "total": 2,
    "passed": 1,
    "failed": 1,
    "skipped": 0
  }
}
```

**UI Requirements:**
- Test suite tree view (collapsible)
- Test case list with status badges
- "Run" button for individual tests
- "Run All" button for suite
- Real-time log streaming during run
- Screenshot gallery for visual tests

---

## 7. NOTIFICATIONS

### Get Notifications

```typescript
GET /api/notifications

// Response:
{
  "notifications": [
    {
      "id": "notif_abc",
      "type": "scan_completed",
      "title": "Scan completed - 3 critical issues",
      "message": "Your scan of my-app found 3 critical and 5 high severity issues.",
      "severity": "warning",        // info | success | warning | error
      "actionUrl": "/scans/scan_xyz789",
      "actionLabel": "View Report",
      "read": false,
      "createdAt": "2024-01-15T10:32:50Z"
    }
  ],
  "unreadCount": 3
}
```

### Mark as Read

```typescript
POST /api/notifications
{
  "action": "markRead",
  "notificationId": "notif_abc"
}

// Or mark all:
POST /api/notifications
{
  "action": "markAllRead"
}
```

### Get/Update Preferences

```typescript
GET /api/notifications/preferences

PATCH /api/notifications/preferences
{
  "globalEnabled": true,
  "quietHoursEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00",
  "channels": {
    "email": { "enabled": true, "digestMode": "daily" },
    "inApp": { "enabled": true, "showBadge": true },
    "push": { "enabled": true }
  },
  "events": {
    "scan_completed": { "enabled": true, "channels": ["in_app"] },
    "scan_failed": { "enabled": true, "channels": ["email", "in_app"] },
    "security_alert": { "enabled": true, "channels": ["email", "in_app", "push"] },
    "credit_low": { "enabled": true, "channels": ["email", "in_app"] }
  }
}
```

**UI Requirements:**
- Bell icon in header with unread badge
- Dropdown panel showing recent notifications
- Click to navigate, mark as read
- Settings page for preferences
- Poll every 30 seconds for updates

---

## 8. TEAM MANAGEMENT

### Get Team Dashboard

```typescript
GET /api/v1/teams/{teamId}/dashboard

// Response:
{
  "team": {
    "id": "team_abc",
    "name": "Engineering",
    "memberCount": 8
  },
  "stats": {
    "totalScans": 150,
    "averageScore": 82,
    "issuesFixed": 423,
    "creditsUsed": 2340,
    "trend": "+5%"
  },
  "recentScans": [...],
  "topIssues": [
    { "type": "sql-injection", "count": 12 },
    { "type": "xss", "count": 8 }
  ],
  "memberActivity": [
    { "userId": "user_1", "name": "Alice", "scansThisWeek": 5 }
  ]
}
```

### Invite Team Member

```typescript
POST /api/v1/teams/{teamId}/invites
{
  "email": "newdev@company.com",
  "role": "member"                  // owner | admin | member | viewer
}
```

---

## UI COMPONENTS TO BUILD

### 1. Dashboard Home
- Credit balance card with usage bar
- Quick scan button with cost estimate
- Recent scans list with scores
- Team activity feed (if team)
- Notification bell

### 2. Projects Page
- Project grid/list view
- Search and filter
- New project modal
- Project cards with last score

### 3. Scan Page
- Scan configuration wizard:
  1. Select project/enter URL
  2. Choose categories (with credit cost)
  3. Select AI features (with credit cost)
  4. Review total cost
  5. Confirm and start
- Progress indicator during scan
- Results page with Vibe Score

### 4. Findings Page
- Severity filter pills
- Category dropdown
- Searchable table
- Fix preview modal
- Batch fix selection

### 5. Tests Page
- Test suite tree
- Run controls
- Live log viewer
- Screenshot viewer

### 6. Billing Page
- Credit balance
- Usage charts
- Transaction history
- Upgrade/purchase buttons (redirect to Bugrit)

### 7. Settings Page
- Notification preferences
- API key display
- Team management

---

## POLLING & REAL-TIME

```typescript
// Scan status polling
function useScanPolling(scanId: string) {
  const [scan, setScan] = useState(null);

  useEffect(() => {
    if (!scanId) return;

    const poll = async () => {
      const res = await fetch(`/api/v1/scans/${scanId}`, { headers });
      const data = await res.json();
      setScan(data.data);

      if (data.data.status === 'running' || data.data.status === 'queued') {
        setTimeout(poll, 3000);
      }
    };
    poll();
  }, [scanId]);

  return scan;
}

// Notifications polling
function useNotifications() {
  const [notifications, setNotifications] = useState({ items: [], unread: 0 });

  useEffect(() => {
    const poll = async () => {
      const res = await fetch('/api/notifications', { headers });
      const data = await res.json();
      setNotifications({ items: data.notifications, unread: data.unreadCount });
    };

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  return notifications;
}

// Credit balance polling (less frequent)
function useCreditBalance() {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const poll = async () => {
      const res = await fetch('/api/billing/status', { headers });
      setBalance(await res.json());
    };

    poll();
    const interval = setInterval(poll, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  return balance;
}
```

---

## ERROR HANDLING

```typescript
async function apiCall(url: string, options?: RequestInit) {
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const error = await res.json();

    switch (res.status) {
      case 401:
        // Redirect to API key setup or login
        window.location.href = '/settings/api-key';
        break;
      case 402:
        // Insufficient credits - show upgrade modal
        showUpgradeModal(error.message);
        break;
      case 403:
        toast.error('Access denied');
        break;
      case 404:
        toast.error('Resource not found');
        break;
      case 429:
        toast.error('Rate limited. Please wait and try again.');
        break;
      default:
        toast.error(error.message || 'An error occurred');
    }

    throw new Error(error.message);
  }

  return res.json();
}
```

---

## STYLING GUIDE

- **Severity colors:**
  - Critical: red-600 (#dc2626)
  - High: orange-500 (#f97316)
  - Medium: yellow-500 (#eab308)
  - Low: blue-500 (#3b82f6)

- **Status colors:**
  - Success/Passed: green-500 (#22c55e)
  - Failed/Error: red-500 (#ef4444)
  - Running: blue-500 (#3b82f6)
  - Queued: gray-400 (#9ca3af)

- **Grade colors:**
  - A+/A/A-: green-500
  - B+/B/B-: lime-500
  - C+/C/C-: yellow-500
  - D/F: red-500

- Use loading skeletons during API calls
- Toast notifications for actions
- Confirm dialogs for destructive actions
````

### Quick Start Prompt

For a minimal implementation, use this condensed version:

```
Build a React/Next.js dashboard for Bugrit API integration with these features:

1. **Credit Balance** - GET /api/billing/status, show remaining credits in header
2. **Scan Cost Estimate** - POST /api/billing/estimate before running scans
3. **Project List** - GET /api/v1/projects, display as cards with last score
4. **Start Scan** - POST /api/v1/scans with category/mode selection
5. **Scan Results** - GET /api/v1/scans/{id} with polling, show Vibe Score gauge
6. **Findings Table** - GET /api/v1/scans/{id}/findings, filter by severity
7. **Generate Fix** - POST /api/v1/fixes/generate, show diff preview
8. **Notifications** - GET /api/notifications, bell icon with badge

For payments, redirect to: https://bugrit.dev/settings/billing?returnUrl={currentUrl}

Use Tailwind CSS and shadcn/ui. Show credit cost before every scan.
```

---

## API Authentication

All API endpoints require authentication:

```bash
# Using API Key (recommended for automation)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://bugrit.dev/api/v1/scans

# Using session cookie (browser)
# Automatically included when logged in
```

### Get Your API Key

1. Go to Dashboard → Settings → API Keys
2. Click "Create New Key"
3. Copy the key (shown only once)
4. Store securely in your CI/CD secrets

---

## Rate Limits

| Tier | Requests/min | Scans/day |
|------|--------------|-----------|
| Free | 10 | 5 |
| Pro | 60 | 50 |
| Team | 120 | 200 |
| Enterprise | 300 | Unlimited |

---

## Support

- **Documentation**: https://bugrit.dev/docs
- **API Reference**: https://bugrit.dev/docs/api
- **GitHub Issues**: https://github.com/bugrit/bugrit/issues
- **Email**: support@bugrit.dev
- **Discord**: https://discord.gg/bugrit
