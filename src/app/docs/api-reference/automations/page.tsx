export default function AutomationsApiPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Automations API</h1>
        <p className="text-lg text-muted-foreground">
          Create, manage, and delete automations that trigger scans automatically based on
          events like git pushes, pull requests, schedules, or custom webhooks.
        </p>
      </div>

      {/* Base URL */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Base URL</h2>
        <code className="block bg-muted p-4 rounded-lg text-sm">
          https://bugrit.dev/api/v1/automations
        </code>
      </section>

      {/* Authentication */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Authentication</h2>
        <p className="text-muted-foreground mb-4">
          All endpoints require an API key with <code className="px-1 bg-muted rounded">automations:read</code> or{' '}
          <code className="px-1 bg-muted rounded">automations:write</code> permissions.
        </p>
        <div className="bg-muted p-4 rounded-lg">
          <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
        </div>
      </section>

      {/* List Automations */}
      <section>
        <h2 className="text-2xl font-bold mb-4">List Automations</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-green-500/20 text-green-600 rounded text-sm font-mono">GET</span>
          <code className="text-sm">/api/v1/automations</code>
        </div>
        <p className="text-muted-foreground mb-4">
          List all automations for your organization.
        </p>

        <h4 className="font-semibold mb-2">Query Parameters</h4>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Parameter</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 px-2"><code>project_id</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2">Filter by project ID</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>enabled</code></td>
              <td className="py-2 px-2">boolean</td>
              <td className="py-2 px-2">Filter by enabled status</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>trigger_type</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2">Filter by trigger type</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>page</code></td>
              <td className="py-2 px-2">number</td>
              <td className="py-2 px-2">Page number (default: 1)</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>per_page</code></td>
              <td className="py-2 px-2">number</td>
              <td className="py-2 px-2">Items per page (default: 20, max: 100)</td>
            </tr>
          </tbody>
        </table>

        <h4 className="font-semibold mb-2">Example Request</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
          <pre className="text-sm">{`curl https://bugrit.dev/api/v1/automations?project_id=proj-abc123 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
        </div>

        <h4 className="font-semibold mb-2">Example Response</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "automations": [
    {
      "id": "auto-xyz789",
      "name": "Scan on push to main",
      "projectId": "proj-abc123",
      "organizationId": "org-def456",
      "trigger": {
        "type": "github_push",
        "config": {
          "repository": "yourorg/yourrepo",
          "branches": ["main", "develop"]
        }
      },
      "action": {
        "type": "scan",
        "config": {
          "platform": "web",
          "tools": "all",
          "failOn": "critical"
        }
      },
      "enabled": true,
      "lastTriggeredAt": "2026-01-22T10:30:00Z",
      "triggerCount": 47,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-22T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 3
  }
}`}</pre>
        </div>
      </section>

      {/* Get Automation */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Get Automation</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-green-500/20 text-green-600 rounded text-sm font-mono">GET</span>
          <code className="text-sm">/api/v1/automations/:automationId</code>
        </div>
        <p className="text-muted-foreground mb-4">
          Retrieve a single automation by ID.
        </p>

        <h4 className="font-semibold mb-2">Example Request</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl https://bugrit.dev/api/v1/automations/auto-xyz789 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
        </div>
      </section>

      {/* Create Automation */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Create Automation</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-blue-500/20 text-blue-600 rounded text-sm font-mono">POST</span>
          <code className="text-sm">/api/v1/automations</code>
        </div>
        <p className="text-muted-foreground mb-4">
          Create a new automation.
        </p>

        <h4 className="font-semibold mb-2">Request Body</h4>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Field</th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-left py-2 px-2">Required</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 px-2"><code>name</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2">Yes</td>
              <td className="py-2 px-2">Display name for the automation</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>projectId</code></td>
              <td className="py-2 px-2">string</td>
              <td className="py-2 px-2">Yes</td>
              <td className="py-2 px-2">Project to run scans against</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>trigger</code></td>
              <td className="py-2 px-2">object</td>
              <td className="py-2 px-2">Yes</td>
              <td className="py-2 px-2">Trigger configuration (see below)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>action</code></td>
              <td className="py-2 px-2">object</td>
              <td className="py-2 px-2">Yes</td>
              <td className="py-2 px-2">Action configuration (see below)</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>enabled</code></td>
              <td className="py-2 px-2">boolean</td>
              <td className="py-2 px-2">No</td>
              <td className="py-2 px-2">Whether automation is active (default: true)</td>
            </tr>
          </tbody>
        </table>

        <h4 className="font-semibold mb-2">Trigger Types</h4>
        <div className="space-y-4 mb-4">
          <div className="p-3 border rounded-lg">
            <code className="text-sm font-semibold">github_push</code>
            <p className="text-sm text-muted-foreground mt-1">Triggers on push to GitHub repository</p>
            <div className="bg-muted p-2 rounded mt-2">
              <pre className="text-xs">{`{
  "type": "github_push",
  "config": {
    "repository": "owner/repo",
    "branches": ["main", "develop"]
  }
}`}</pre>
            </div>
          </div>

          <div className="p-3 border rounded-lg">
            <code className="text-sm font-semibold">github_pr</code>
            <p className="text-sm text-muted-foreground mt-1">Triggers on pull request events</p>
            <div className="bg-muted p-2 rounded mt-2">
              <pre className="text-xs">{`{
  "type": "github_pr",
  "config": {
    "repository": "owner/repo",
    "events": ["opened", "synchronize"],
    "targetBranches": ["main"]
  }
}`}</pre>
            </div>
          </div>

          <div className="p-3 border rounded-lg">
            <code className="text-sm font-semibold">gitlab_push</code>
            <p className="text-sm text-muted-foreground mt-1">Triggers on push to GitLab repository</p>
            <div className="bg-muted p-2 rounded mt-2">
              <pre className="text-xs">{`{
  "type": "gitlab_push",
  "config": {
    "projectPath": "group/project",
    "branches": ["main"]
  }
}`}</pre>
            </div>
          </div>

          <div className="p-3 border rounded-lg">
            <code className="text-sm font-semibold">schedule</code>
            <p className="text-sm text-muted-foreground mt-1">Triggers on a cron schedule</p>
            <div className="bg-muted p-2 rounded mt-2">
              <pre className="text-xs">{`{
  "type": "schedule",
  "config": {
    "cron": "0 2 * * *",
    "timezone": "UTC"
  }
}`}</pre>
            </div>
          </div>

          <div className="p-3 border rounded-lg">
            <code className="text-sm font-semibold">webhook</code>
            <p className="text-sm text-muted-foreground mt-1">Triggers when webhook URL is called</p>
            <div className="bg-muted p-2 rounded mt-2">
              <pre className="text-xs">{`{
  "type": "webhook",
  "config": {}
}
// Returns a unique webhook URL after creation`}</pre>
            </div>
          </div>
        </div>

        <h4 className="font-semibold mb-2">Action Configuration</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
          <pre className="text-sm">{`{
  "type": "scan",
  "config": {
    "platform": "web",           // web, ios, android, desktop
    "tools": "all",              // all, security, quality, or array of tool IDs
    "sourceOverride": {          // Optional: override source from trigger
      "type": "url",
      "targetUrl": "https://staging.example.com"
    },
    "failOn": "critical",        // critical, high, medium, low, or null
    "notifications": {
      "slack": "#security-alerts",
      "email": ["team@example.com"]
    }
  }
}`}</pre>
        </div>

        <h4 className="font-semibold mb-2">Example Request</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/automations \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Scan PRs to main",
    "projectId": "proj-abc123",
    "trigger": {
      "type": "github_pr",
      "config": {
        "repository": "yourorg/yourrepo",
        "events": ["opened", "synchronize"],
        "targetBranches": ["main"]
      }
    },
    "action": {
      "type": "scan",
      "config": {
        "platform": "web",
        "tools": ["security", "quality"],
        "failOn": "critical"
      }
    },
    "enabled": true
  }'`}</pre>
        </div>

        <h4 className="font-semibold mt-4 mb-2">Example Response</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "automation": {
    "id": "auto-new123",
    "name": "Scan PRs to main",
    "projectId": "proj-abc123",
    "organizationId": "org-def456",
    "trigger": {
      "type": "github_pr",
      "config": {
        "repository": "yourorg/yourrepo",
        "events": ["opened", "synchronize"],
        "targetBranches": ["main"]
      }
    },
    "action": {
      "type": "scan",
      "config": {
        "platform": "web",
        "tools": ["security", "quality"],
        "failOn": "critical"
      }
    },
    "webhookUrl": null,
    "enabled": true,
    "triggerCount": 0,
    "createdAt": "2026-01-23T12:00:00Z",
    "updatedAt": "2026-01-23T12:00:00Z"
  }
}`}</pre>
        </div>
      </section>

      {/* Update Automation */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Update Automation</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-600 rounded text-sm font-mono">PATCH</span>
          <code className="text-sm">/api/v1/automations/:automationId</code>
        </div>
        <p className="text-muted-foreground mb-4">
          Update an existing automation. All fields are optional.
        </p>

        <h4 className="font-semibold mb-2">Example Request</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X PATCH https://bugrit.dev/api/v1/automations/auto-xyz789 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "enabled": false,
    "action": {
      "type": "scan",
      "config": {
        "platform": "web",
        "tools": "all",
        "failOn": "high"
      }
    }
  }'`}</pre>
        </div>
      </section>

      {/* Delete Automation */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Delete Automation</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-red-500/20 text-red-600 rounded text-sm font-mono">DELETE</span>
          <code className="text-sm">/api/v1/automations/:automationId</code>
        </div>
        <p className="text-muted-foreground mb-4">
          Permanently delete an automation.
        </p>

        <h4 className="font-semibold mb-2">Example Request</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl -X DELETE https://bugrit.dev/api/v1/automations/auto-xyz789 \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</pre>
        </div>

        <h4 className="font-semibold mt-4 mb-2">Example Response</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "success": true,
  "message": "Automation deleted successfully"
}`}</pre>
        </div>
      </section>

      {/* Trigger History */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Get Trigger History</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-green-500/20 text-green-600 rounded text-sm font-mono">GET</span>
          <code className="text-sm">/api/v1/automations/:automationId/history</code>
        </div>
        <p className="text-muted-foreground mb-4">
          View recent trigger events for an automation.
        </p>

        <h4 className="font-semibold mb-2">Example Response</h4>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "history": [
    {
      "id": "trig-abc123",
      "automationId": "auto-xyz789",
      "triggeredAt": "2026-01-22T10:30:00Z",
      "triggerData": {
        "commitSha": "abc123def456",
        "branch": "main",
        "author": "developer@example.com"
      },
      "scanId": "scn-created123",
      "status": "completed",
      "duration": 180000
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 47
  }
}`}</pre>
        </div>
      </section>

      {/* AI Prompt */}
      <section>
        <h2 className="text-2xl font-bold mb-4">AI Coding Assistant Prompt</h2>
        <p className="text-muted-foreground mb-4">
          Copy this to have your AI assistant work with the Automations API:
        </p>
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap">{`I need to create a Bugrit automation via the API. Here are the details:

API Base: https://bugrit.dev/api/v1/automations
Auth: Bearer token in Authorization header

Help me create an automation that:
1. Triggers on [push to main / PR to main / schedule / webhook]
2. Runs a [security / full / specific tools] scan
3. Fails the build if [critical / high / any] issues are found
4. Notifies [Slack channel / email] on completion

Use curl commands and show me the expected response.`}</pre>
        </div>
      </section>

      {/* Error Codes */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Error Codes</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Code</th>
              <th className="text-left py-2 px-2">Message</th>
              <th className="text-left py-2 px-2">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 px-2"><code>400</code></td>
              <td className="py-2 px-2">Invalid trigger type</td>
              <td className="py-2 px-2">Trigger type not supported</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>400</code></td>
              <td className="py-2 px-2">Invalid cron expression</td>
              <td className="py-2 px-2">Schedule trigger has invalid cron</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>403</code></td>
              <td className="py-2 px-2">Project access denied</td>
              <td className="py-2 px-2">No access to specified project</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code>404</code></td>
              <td className="py-2 px-2">Automation not found</td>
              <td className="py-2 px-2">Automation ID doesn&apos;t exist</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code>429</code></td>
              <td className="py-2 px-2">Automation limit reached</td>
              <td className="py-2 px-2">Max automations for tier reached</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
