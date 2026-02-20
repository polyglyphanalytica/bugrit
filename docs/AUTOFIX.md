# AI Autofix

AI-powered code fixes pushed directly to your repository. Bring your own API key (BYOK) from any supported AI provider, and Bugrit generates fixes for scan findings, pushes them to a branch, and optionally opens a pull request.

**Tier:** Enterprise only.

---

## How It Works

1. Run a scan on your repository
2. Autofix analyzes each finding using your AI provider
3. Fixes are generated with explanations and confidence scores
4. All fixes are pushed to a single branch (e.g. `bugrit/autofix-{scanId}`)
5. A pull request is optionally created for review

Autofix can also be configured to run automatically after every scan.

---

## Supported AI Providers

| Provider | Models | Auth Methods |
|----------|--------|--------------|
| **Claude** (Anthropic) | claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001, claude-opus-4-6 | API key |
| **Gemini** (Google) | gemini-2.5-flash, gemini-2.5-pro | API key |
| **OpenAI** | gpt-4o, gpt-4o-mini, o3-mini | API key |
| **Grok** (xAI) | grok-3, grok-3-mini | API key |
| **DeepSeek** | deepseek-chat, deepseek-reasoner | API key |
| **GitHub Copilot** | gpt-4o, claude-sonnet-4-5-20250929 | OAuth token |

All keys are encrypted at rest with AES-256-GCM. Bugrit never uses your keys for anything other than generating fixes for your scans.

---

## Getting Started

### 1. Add an AI Provider Key

```bash
POST /api/autofix/keys
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "providerId": "claude",
  "apiKey": "sk-ant-...",
  "label": "My Claude key",
  "authMethod": "api_key"
}
```

The key is validated against the provider before storage.

### 2. Configure Autofix Settings

```bash
PUT /api/autofix/settings
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "enabled": true,
  "autoRun": false,
  "provider": {
    "providerId": "claude",
    "model": "claude-sonnet-4-5-20250929",
    "keyId": "<key-id-from-step-1>"
  },
  "github": {
    "createPR": true,
    "branchPrefix": "bugrit/autofix",
    "minSeverity": "high",
    "maxFindings": 25
  }
}
```

### 3. Trigger Autofix

```bash
POST /api/autofix
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "scanId": "scan-abc123",
  "appId": "app-xyz789",
  "repoOwner": "your-org",
  "repoName": "your-repo"
}
```

Response:

```json
{
  "jobId": "job-123456",
  "status": "queued",
  "message": "Autofix job started"
}
```

---

## API Reference

All endpoints require authentication (Bearer token or API key) and an Enterprise subscription.

### POST /api/autofix

Trigger an autofix job for a completed scan.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scanId` | string | Yes | ID of a completed scan |
| `appId` | string | Yes | Bugrit project/app ID |
| `repoOwner` | string | Yes | GitHub repository owner |
| `repoName` | string | Yes | GitHub repository name |

**Response (201):**

```json
{
  "jobId": "job-123456",
  "status": "queued",
  "message": "Autofix job started"
}
```

### GET /api/autofix

Retrieve autofix jobs.

**Query parameters:**

| Param | Description |
|-------|-------------|
| `jobId` | Get a specific job by ID |
| `scanId` | Get all jobs for a specific scan |
| _(none)_ | Get all recent jobs for the authenticated user |

**Response:**

```json
{
  "jobs": [
    {
      "id": "job-123456",
      "status": "completed",
      "provider": "claude",
      "model": "claude-sonnet-4-5-20250929",
      "progress": {
        "totalFindings": 12,
        "fixedCount": 10,
        "skippedCount": 1,
        "failedCount": 1
      },
      "result": {
        "branch": "bugrit/autofix-scan-abc123",
        "prUrl": "https://github.com/org/repo/pull/42",
        "prNumber": 42,
        "filesChanged": 8,
        "summary": "Fixed 10 of 12 findings"
      },
      "createdAt": "2026-01-15T10:00:00Z",
      "completedAt": "2026-01-15T10:02:30Z"
    }
  ]
}
```

### GET /api/autofix/settings

Get current autofix settings and available AI providers.

**Response:**

```json
{
  "settings": {
    "enabled": true,
    "autoRun": false,
    "provider": { "providerId": "claude", "model": "claude-sonnet-4-5-20250929", "keyId": "key-abc" },
    "github": { "createPR": true, "branchPrefix": "bugrit/autofix", "minSeverity": "high", "maxFindings": 25 }
  },
  "providers": { "claude": { ... }, "openai": { ... }, ... }
}
```

### PUT /api/autofix/settings

Update autofix settings. All fields are optional — only provided fields are updated.

**Request body:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable autofix |
| `autoRun` | boolean | Auto-trigger after each scan |
| `provider` | object | `{ providerId, model, keyId, authMethod }` |
| `github.createPR` | boolean | Auto-create pull request |
| `github.branchPrefix` | string | Branch name prefix (max 50 chars) |
| `github.minSeverity` | string | Minimum severity to fix: `critical`, `high`, `medium`, `low` |
| `github.maxFindings` | number | Max findings per run (1-100) |

### POST /api/autofix/keys

Store an encrypted AI provider key.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `providerId` | string | Yes | One of: `claude`, `gemini`, `openai`, `grok`, `deepseek`, `copilot` |
| `apiKey` | string | Yes | The API key or OAuth token (10-2000 chars) |
| `label` | string | Yes | Display label (max 100 chars) |
| `authMethod` | string | No | `api_key` (default) or `oauth_token` |

**Response (201):**

```json
{
  "key": {
    "id": "key-abc123",
    "providerId": "claude",
    "keyPrefix": "sk-ant-a...",
    "label": "My Claude key",
    "authMethod": "api_key",
    "createdAt": "2026-01-15T10:00:00Z"
  },
  "message": "API key stored successfully"
}
```

### GET /api/autofix/keys

List stored keys (masked for security).

### DELETE /api/autofix/keys?keyId=xxx

Delete a stored key.

### POST /api/autofix/integrate

Generate integration code (CI/CD, pre-commit hooks, API clients, webhooks, monitoring) and push to a branch.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target` | string | Yes | `ci_cd`, `pre_commit`, `api_client`, `webhook`, `monitoring`, `custom` |
| `appId` | string | Yes | Bugrit project ID |
| `repoOwner` | string | Yes | GitHub repo owner |
| `repoName` | string | Yes | GitHub repo name |
| `language` | string | Yes | Programming language (max 50 chars) |
| `framework` | string | No | Framework (e.g. `nextjs`, `express`) |
| `packageManager` | string | No | Package manager (e.g. `npm`, `pip`) |
| `customPrompt` | string | No | Required when target is `custom` |

**Response (201):**

```json
{
  "message": "Integration generated and pushed to branch",
  "branch": "bugrit/integrate-ci-cd",
  "prUrl": "https://github.com/org/repo/pull/43",
  "prNumber": 43,
  "filesCreated": 2,
  "explanation": "Created GitHub Actions workflow..."
}
```

---

## Job Status Lifecycle

```
queued → fetching_code → generating_fixes → pushing_branch → creating_pr → completed
                                                                          → failed
```

Jobs can fail at any stage. The `error` field on the job object describes the failure.

---

## Rate Limits

Autofix endpoints are rate-limited per user:

| Endpoint | Limit |
|----------|-------|
| POST /api/autofix (trigger job) | 5 requests / minute |
| POST /api/autofix/integrate | 5 requests / minute |
| GET endpoints | 30 requests / minute |
| Settings & key management | 20 requests / minute |

Exceeding the limit returns HTTP 429 with a `Retry-After` header.

---

## Cost Controls

- **minSeverity** — only fix findings at or above this severity (default: `high`)
- **maxFindings** — cap the number of findings processed per job (default: 25, max: 100)
- **autoRun** — disable to manually trigger autofix instead of running after every scan

These settings help manage AI API costs since fixes use your own provider keys.

---

## Security

- API keys encrypted with AES-256-GCM before storage
- Keys are never logged or exposed in responses (only prefix shown)
- Strict ownership checks — users can only access their own keys and jobs
- Provider key validation on storage (test call to verify the key works)
- Enterprise tier gate prevents unauthorized access
