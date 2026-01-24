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
| **Deep Dive** | ~10min | Full 118-tool scan |
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

Complete AI prompt for building a custom dashboard using Bugrit's API suite.

### Overview

This section provides a comprehensive prompt you can give to your AI coding assistant (Claude, Cursor, etc.) to build a dashboard that integrates with Bugrit's APIs. Copy the entire prompt below.

### Full Integration Prompt

````markdown
# Build a Bugrit-Integrated Dashboard

Create a dashboard application that integrates with the Bugrit API to display code quality metrics, security scans, and notifications. Use the following API reference and requirements.

## Authentication

All API calls require an API key in the Authorization header:
```
Authorization: Bearer YOUR_BUGRIT_API_KEY
```

Store the API key in environment variables:
```
BUGRIT_API_KEY=your_api_key_here
BUGRIT_API_URL=https://bugrit.dev/api/v1
```

## Core Features to Implement

### 1. Scan Management

**Start a new scan:**
```typescript
POST /scans
{
  "repoUrl": "https://github.com/user/repo",
  "mode": "standard" // quick | standard | deep | paranoid
}
// Returns: { scanId: "scan_abc123", status: "queued" }
```

**Get scan status and results:**
```typescript
GET /scans/{scanId}
// Returns scan details with findings when complete
```

**List recent scans:**
```typescript
GET /scans?limit=20
// Returns array of scan summaries
```

### 2. Vibe Score Display

**Get Vibe Score for a scan:**
```typescript
GET /scans/{scanId}/vibe-score
// Returns:
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

**Display requirements:**
- Large circular score gauge (0-100)
- Letter grade badge (A+ through F)
- Breakdown chart showing 6 components
- Achievement badges with tooltips
- Trend indicator (improving/declining/stable)

### 3. Findings List

**Get findings for a scan:**
```typescript
GET /scans/{scanId}/findings?severity=critical,high&limit=50
// Returns array of findings with:
// - id, title, description, severity, file, line
// - category (security, quality, a11y, perf, deps, docs)
// - fixAvailable (boolean)
```

**Display requirements:**
- Filterable by severity (critical/high/medium/low)
- Filterable by category
- Sortable by severity, file, or date
- Click to expand for full details
- "Generate Fix" button for fixable issues

### 4. One-Click Fixes

**Generate a fix:**
```typescript
POST /fixes/generate
{
  "findingId": "finding_123",
  "scanId": "scan_456"
}
// Returns:
{
  "canFix": true,
  "confidence": "high",
  "fix": {
    "description": "Sanitize user input",
    "diff": "--- a/file.ts\n+++ b/file.ts\n...",
    "beforeCode": "...",
    "afterCode": "...",
    "explanation": "..."
  }
}
```

**Apply fixes to branch:**
```typescript
POST /fixes/apply
{
  "scanId": "scan_456",
  "findingIds": ["finding_1", "finding_2"],
  "branchName": "bugrit/fixes-abc123"
}
// Returns: { branchUrl: "...", prUrl: "..." }
```

**Display requirements:**
- Show diff with syntax highlighting
- Before/after code comparison
- Confidence indicator
- Batch selection for multiple fixes
- "Apply Selected" button

### 5. Notifications Center

**Get notifications:**
```typescript
GET /notifications
// Returns:
{
  "notifications": [
    {
      "id": "notif_abc",
      "type": "scan_completed",
      "title": "Scan completed",
      "message": "Found 5 issues",
      "severity": "success",
      "actionUrl": "/scans/scan_123",
      "read": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "unreadCount": 3
}
```

**Mark as read:**
```typescript
POST /notifications
{ "action": "markRead", "notificationId": "notif_abc" }

// Or mark all:
POST /notifications
{ "action": "markAllRead" }
```

**Get/update preferences:**
```typescript
GET /notifications/preferences
PATCH /notifications/preferences
{
  "channels": {
    "email": { "enabled": true, "digestMode": "daily" },
    "inApp": { "enabled": true },
    "push": { "enabled": false }
  },
  "events": {
    "scan_completed": { "enabled": true, "channels": ["email", "in_app"] }
  }
}
```

**Display requirements:**
- Bell icon with unread count badge
- Dropdown/panel showing recent notifications
- Click to navigate to related item
- Mark as read on click
- Link to full settings page

### 6. Test Runs (Optional)

**Run a test:**
```typescript
POST /test-runs
{
  "testCaseId": "tc_123",
  "testCaseName": "Login Flow",
  "runnerType": "playwright"
}
```

**Get test results:**
```typescript
GET /test-runs/{testRunId}
// Returns status, duration, logs, screenshots
```

### 7. Team Dashboard (Optional)

**Get team stats:**
```typescript
GET /teams/{teamId}/dashboard
// Returns:
{
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

## UI Components to Build

1. **Dashboard Home**
   - Summary cards (total scans, avg score, issues fixed)
   - Recent scans list with status badges
   - Quick scan button

2. **Scan Detail Page**
   - Vibe Score gauge
   - Findings table with filters
   - Fix generation panel
   - Scan metadata (repo, branch, date, duration)

3. **Notification Bell**
   - Icon in header/nav
   - Badge with unread count
   - Dropdown with notification list
   - Settings link

4. **Settings Pages**
   - API key management
   - Notification preferences
   - Team settings (if applicable)

## Polling & Real-time Updates

For scan status, poll every 5 seconds while status is "running":
```typescript
const pollScan = async (scanId: string) => {
  const scan = await fetch(`/scans/${scanId}`);
  if (scan.status === 'running') {
    setTimeout(() => pollScan(scanId), 5000);
  }
};
```

For notifications, poll every 30 seconds:
```typescript
setInterval(async () => {
  const { unreadCount } = await fetch('/notifications');
  updateBadge(unreadCount);
}, 30000);
```

## Error Handling

Handle these HTTP status codes:
- 401: Redirect to login / show "API key invalid"
- 403: Show "Insufficient permissions"
- 404: Show "Resource not found"
- 429: Show "Rate limited, try again later"
- 500: Show "Server error, please retry"

## Styling Recommendations

- Use color coding for severity: red (critical), orange (high), yellow (medium), blue (low)
- Use green for passing/success, red for failing/error
- Show loading skeletons during API calls
- Toast notifications for actions (fix applied, settings saved)
````

### Quick Start Prompt

For a simpler starting point, use this condensed version:

```
Build a React dashboard that:

1. Connects to Bugrit API (https://bugrit.dev/api/v1) with API key auth
2. Shows a list of scans with their Vibe Scores
3. Displays findings for each scan, filterable by severity
4. Has a notification bell showing unread count
5. Allows starting new scans via URL input

API endpoints needed:
- GET /scans - list scans
- POST /scans - start scan
- GET /scans/{id} - scan details
- GET /scans/{id}/vibe-score - get score
- GET /scans/{id}/findings - get findings
- GET /notifications - get notifications
- POST /notifications - mark as read

Use Tailwind CSS and shadcn/ui components.
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
