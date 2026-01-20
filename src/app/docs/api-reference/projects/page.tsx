'use client';

export default function ProjectsApiPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Projects API</h1>
        <p className="text-lg text-muted-foreground">
          Create and manage projects to organize your scans and test results by app.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          If you&apos;re building multiple apps or have different environments (staging, production), projects keep everything organized. Each project tracks its own scan history, so you can see security trends over time.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Track each app separately:</strong> Your SaaS, mobile app, and marketing site each get their own security history</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Environment-specific scanning:</strong> Create projects for staging and production to compare security posture</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Team organization:</strong> Give different teams access to different projects</span>
          </li>
        </ul>
      </div>

      {/* Vibe Coding Section */}
      <div className="p-6 bg-slate-950 rounded-xl">
        <h2 className="text-xl font-bold mb-3 text-white flex items-center gap-2">
          <span>🤖</span> Vibe Coding Prompts
        </h2>
        <p className="text-slate-300 mb-4 text-sm">
          Copy these prompts into your AI assistant to implement project management.
        </p>

        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Auto-Create Project on First Deploy</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read the Bugrit Projects API documentation at:
https://bugrit.dev/docs/api-reference/projects

Then add logic to automatically create a Bugrit project if one doesn't exist:

1. On deploy, call GET /api/v1/projects to list existing projects
2. Response contains data array with projects - each has id, name, platforms
3. Search for project.name matching env.APP_NAME
4. If not found, POST /api/v1/projects with (see docs for all fields):
   - name: env.APP_NAME (required)
   - platforms: ["web"] (required - adjust for your app type)
   - repositoryUrl: env.GITHUB_REPO_URL (optional)
5. Store the returned project.id in .buggered-config.json
6. Use this project ID as applicationId when triggering scans

Use BUGGERED_API_KEY from environment. Handle errors gracefully.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read the Bugrit Projects API documentation at:\nhttps://bugrit.dev/docs/api-reference/projects\n\nThen add logic to automatically create a Bugrit project if one doesn't exist:\n\n1. On deploy, call GET /api/v1/projects to list existing projects\n2. Response contains data array with projects - each has id, name, platforms\n3. Search for project.name matching env.APP_NAME\n4. If not found, POST /api/v1/projects with (see docs for all fields):\n   - name: env.APP_NAME (required)\n   - platforms: ["web"] (required - adjust for your app type)\n   - repositoryUrl: env.GITHUB_REPO_URL (optional)\n5. Store the returned project.id in .buggered-config.json\n6. Use this project ID as applicationId when triggering scans\n\nUse BUGGERED_API_KEY from environment. Handle errors gracefully.`)}>Copy prompt</button>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg">
            <h4 className="text-white font-semibold mb-2">Project Dashboard Component</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`First, read these Bugrit API docs:
- Projects API: https://bugrit.dev/docs/api-reference/projects
- Scans API: https://bugrit.dev/docs/api-reference/scans

Then create a React component that lists all Bugrit projects:

1. Fetch GET /api/v1/projects - response has data array and pagination object
2. Each project has: id, name, description, platforms, repositoryUrl, createdAt
3. Display each project as a card showing:
   - project.name and project.description
   - project.platforms array (show web/ios/android icons)
   - Fetch GET /api/v1/scans?applicationId={project.id}&limit=1 for last scan
   - Show scan status and summary.critical + summary.high count
4. On click, navigate to project detail page with scan history
5. "New Project" button opens modal that POSTs to /api/v1/projects
6. Include loading, error, and empty states

Match my existing UI components and design system.`}</pre>
            <button className="mt-2 text-xs text-primary hover:underline" onClick={() => navigator.clipboard.writeText(`First, read these Bugrit API docs:\n- Projects API: https://bugrit.dev/docs/api-reference/projects\n- Scans API: https://bugrit.dev/docs/api-reference/scans\n\nThen create a React component that lists all Bugrit projects:\n\n1. Fetch GET /api/v1/projects - response has data array and pagination object\n2. Each project has: id, name, description, platforms, repositoryUrl, createdAt\n3. Display each project as a card showing:\n   - project.name and project.description\n   - project.platforms array (show web/ios/android icons)\n   - Fetch GET /api/v1/scans?applicationId={project.id}&limit=1 for last scan\n   - Show scan status and summary.critical + summary.high count\n4. On click, navigate to project detail page with scan history\n5. "New Project" button opens modal that POSTs to /api/v1/projects\n6. Include loading, error, and empty states\n\nMatch my existing UI components and design system.`)}>Copy prompt</button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">List Projects</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/projects</code>
          </div>
          <p className="text-muted-foreground">
            Returns a list of all projects in your organization.
          </p>
          <h4 className="font-semibold">Query Parameters</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Parameter</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-2"><code>page</code></td>
                <td className="py-2 px-2">integer</td>
                <td className="py-2 px-2 text-muted-foreground">Page number (default: 1)</td>
              </tr>
              <tr>
                <td className="py-2 px-2"><code>per_page</code></td>
                <td className="py-2 px-2">integer</td>
                <td className="py-2 px-2 text-muted-foreground">Items per page (max: 100, default: 20)</td>
              </tr>
            </tbody>
          </table>
          <h4 className="font-semibold mt-4">Example Response</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`{
  "success": true,
  "data": [
    {
      "id": "prj-abc123",
      "name": "My App",
      "description": "Main web application",
      "platforms": ["web", "ios"],
      "repositoryUrl": "https://github.com/org/repo",
      "defaultBranch": "main",
      "organizationId": "org-xyz789",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 1
  }
}`}</pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Create Project</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm font-mono">POST</span>
            <code className="text-sm">/api/v1/projects</code>
          </div>
          <p className="text-muted-foreground">
            Creates a new project in your organization.
          </p>
          <h4 className="font-semibold">Request Body</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Field</th>
                <th className="text-left py-2 px-2">Type</th>
                <th className="text-left py-2 px-2">Required</th>
                <th className="text-left py-2 px-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-2"><code>name</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">Yes</td>
                <td className="py-2 px-2 text-muted-foreground">Project name</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>platforms</code></td>
                <td className="py-2 px-2">string[]</td>
                <td className="py-2 px-2">Yes</td>
                <td className="py-2 px-2 text-muted-foreground">Array of: web, ios, android, desktop</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>description</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">No</td>
                <td className="py-2 px-2 text-muted-foreground">Project description</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-2"><code>repositoryUrl</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">No</td>
                <td className="py-2 px-2 text-muted-foreground">GitHub repository URL</td>
              </tr>
              <tr>
                <td className="py-2 px-2"><code>defaultBranch</code></td>
                <td className="py-2 px-2">string</td>
                <td className="py-2 px-2">No</td>
                <td className="py-2 px-2 text-muted-foreground">Default branch name (default: main)</td>
              </tr>
            </tbody>
          </table>
          <h4 className="font-semibold mt-4">Example Request</h4>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/projects \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My App",
    "platforms": ["web", "ios"],
    "description": "Main web application",
    "repositoryUrl": "https://github.com/org/repo"
  }'`}</pre>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Get Project</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
            <code className="text-sm">/api/v1/projects/:projectId</code>
          </div>
          <p className="text-muted-foreground">
            Returns details for a specific project.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Update Project</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-sm font-mono">PUT</span>
            <code className="text-sm">/api/v1/projects/:projectId</code>
          </div>
          <p className="text-muted-foreground">
            Updates an existing project. Only include fields you want to update.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Delete Project</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-sm font-mono">DELETE</span>
            <code className="text-sm">/api/v1/projects/:projectId</code>
          </div>
          <p className="text-muted-foreground">
            Permanently deletes a project and all associated scans and test results.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Platform Restrictions</h2>
        <p className="text-muted-foreground mb-4">
          Platform access is restricted by subscription tier:
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Tier</th>
              <th className="text-left py-2 px-2">Platforms</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2">Free</td>
              <td className="py-2 px-2 text-muted-foreground">web only</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2">Pro</td>
              <td className="py-2 px-2 text-muted-foreground">web, ios, android</td>
            </tr>
            <tr>
              <td className="py-2 px-2">Business</td>
              <td className="py-2 px-2 text-muted-foreground">web, ios, android, desktop</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
