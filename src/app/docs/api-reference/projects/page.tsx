'use client';

export default function ProjectsApiPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Projects API</h1>
        <p className="text-lg text-muted-foreground">
          Create and manage projects to organize your scans and test results by app.
        </p>
      </div>

      {/* Not a Developer Section */}
      <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40 rounded-xl">
        <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
          <span>🎯</span> Not a Developer? Start Here
        </h2>
        <p className="text-muted-foreground mb-4">
          You don&apos;t need to write code yourself. Copy the prompts below and paste them into
          <strong> Claude</strong>, <strong>ChatGPT</strong>, <strong>Cursor</strong>, or any AI coding assistant.
          Your AI will read the docs and build what you need.
        </p>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 1:</strong> Copy a prompt below
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 2:</strong> Paste into your AI assistant
          </div>
          <div className="p-3 bg-background/80 rounded-lg">
            <strong>Step 3:</strong> AI builds it for you
          </div>
        </div>
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

      {/* Quick Start Prompts */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quick Start Prompts</h2>
        <p className="text-muted-foreground mb-4">
          Common tasks for managing projects.
        </p>

        <div className="space-y-6">
          {/* Auto-Create Project */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🚀</span> Auto-Create Project on First Deploy
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Automatically create a Bugrit project if it doesn&apos;t exist when you deploy.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Projects API at https://bugrit.com/docs/api-reference/projects

Add logic to automatically create a Bugrit project if one doesn't exist:

1. On deploy, call GET /api/v1/projects to list existing projects
2. Search for project.name matching env.APP_NAME
3. If not found, POST /api/v1/projects with:
   - name: env.APP_NAME (required)
   - platforms: ["web"] (adjust for your app)
   - repositoryUrl: env.GITHUB_REPO_URL (optional)
4. Store the returned project.id in .bugrit-config.json
5. Use this project ID as applicationId when triggering scans

Use BUGRIT_API_KEY from environment. Handle errors gracefully.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Projects API at https://bugrit.com/docs/api-reference/projects

Add logic to automatically create a Bugrit project if one doesn't exist:

1. On deploy, call GET /api/v1/projects to list existing projects
2. Search for project.name matching env.APP_NAME
3. If not found, POST /api/v1/projects with:
   - name: env.APP_NAME (required)
   - platforms: ["web"] (adjust for your app)
   - repositoryUrl: env.GITHUB_REPO_URL (optional)
4. Store the returned project.id in .bugrit-config.json
5. Use this project ID as applicationId when triggering scans

Use BUGRIT_API_KEY from environment. Handle errors gracefully.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
            <details className="border-t border-slate-800">
              <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
                👩‍💻 Technical Details (for developers)
              </summary>
              <div className="p-4 bg-muted/30 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Create Project Example</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/projects \\
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
              </div>
            </details>
          </div>

          {/* Project Dashboard */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>📊</span> Project Dashboard Component
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Build a dashboard showing all your projects and their security status.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read these Bugrit API docs:
- Projects: https://bugrit.com/docs/api-reference/projects
- Scans: https://bugrit.com/docs/api-reference/scans

Create a React component that lists all Bugrit projects:

1. Fetch GET /api/v1/projects
2. For each project, display a card showing:
   - project.name and project.description
   - Platform icons (web/ios/android from project.platforms)
   - Fetch latest scan: GET /api/v1/scans?applicationId={project.id}&limit=1
   - Show scan status and issue counts (summary.critical + summary.high)
3. On click, navigate to project detail page
4. "New Project" button opens modal with form:
   - name (required), platforms (checkbox), description, repositoryUrl
   - Submit: POST /api/v1/projects
5. Include loading, error, and empty states

Use my existing component library.
My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read these Bugrit API docs:
- Projects: https://bugrit.com/docs/api-reference/projects
- Scans: https://bugrit.com/docs/api-reference/scans

Create a React component that lists all Bugrit projects:

1. Fetch GET /api/v1/projects
2. For each project, display a card showing:
   - project.name and project.description
   - Platform icons (web/ios/android from project.platforms)
   - Fetch latest scan: GET /api/v1/scans?applicationId={project.id}&limit=1
   - Show scan status and issue counts (summary.critical + summary.high)
3. On click, navigate to project detail page
4. "New Project" button opens modal with form:
   - name (required), platforms (checkbox), description, repositoryUrl
   - Submit: POST /api/v1/projects
5. Include loading, error, and empty states

Use my existing component library.
My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>

          {/* Multi-Environment Setup */}
          <div className="border rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-950">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <span>🌍</span> Multi-Environment Setup
              </h3>
              <p className="text-slate-400 text-sm mb-3">
                Create separate projects for staging and production environments.
              </p>
              <div className="bg-slate-900 p-4 rounded-lg">
                <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Projects API at https://bugrit.com/docs/api-reference/projects

Set up multi-environment Bugrit projects:

1. Create three projects via POST /api/v1/projects:
   - "MyApp - Development" (platforms: ["web"])
   - "MyApp - Staging" (platforms: ["web"])
   - "MyApp - Production" (platforms: ["web"])
2. Store project IDs in environment variables:
   - BUGRIT_PROJECT_DEV, BUGRIT_PROJECT_STAGING, BUGRIT_PROJECT_PROD
3. In CI/CD, use the appropriate project ID based on branch:
   - develop → BUGRIT_PROJECT_DEV
   - staging → BUGRIT_PROJECT_STAGING
   - main → BUGRIT_PROJECT_PROD
4. Create a comparison dashboard showing security posture across environments

My stack: [YOUR_STACK]`}</pre>
              </div>
              <button
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                onClick={() => copyToClipboard(`Read the Bugrit Projects API at https://bugrit.com/docs/api-reference/projects

Set up multi-environment Bugrit projects:

1. Create three projects via POST /api/v1/projects:
   - "MyApp - Development" (platforms: ["web"])
   - "MyApp - Staging" (platforms: ["web"])
   - "MyApp - Production" (platforms: ["web"])
2. Store project IDs in environment variables:
   - BUGRIT_PROJECT_DEV, BUGRIT_PROJECT_STAGING, BUGRIT_PROJECT_PROD
3. In CI/CD, use the appropriate project ID based on branch:
   - develop → BUGRIT_PROJECT_DEV
   - staging → BUGRIT_PROJECT_STAGING
   - main → BUGRIT_PROJECT_PROD
4. Create a comparison dashboard showing security posture across environments

My stack: [YOUR_STACK]`)}
              >
                📋 Copy Prompt
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* List Projects */}
      <section>
        <h2 className="text-2xl font-bold mb-4">List Projects</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Get All Your Projects</h3>
            <p className="text-slate-400 text-sm mb-3">
              Fetch a list of all projects in your organization.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Projects API at https://bugrit.com/docs/api-reference/projects

Create a function to list all projects:

1. Call GET /api/v1/projects
2. Response has data array with projects and pagination object
3. Each project has: id, name, description, platforms, repositoryUrl, createdAt
4. Return projects sorted by most recently updated
5. Handle pagination if needed (page, per_page params)

My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Projects API at https://bugrit.com/docs/api-reference/projects

Create a function to list all projects:

1. Call GET /api/v1/projects
2. Response has data array with projects and pagination object
3. Each project has: id, name, description, platforms, repositoryUrl, createdAt
4. Return projects sorted by most recently updated
5. Handle pagination if needed (page, per_page params)

My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800" open>
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Reference
            </summary>
            <div className="p-4 bg-muted/30 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
                  <code className="text-sm">/api/v1/projects</code>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Query Parameters</h4>
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
              </div>
              <div>
                <h4 className="font-semibold mb-2">Example Response</h4>
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
            </div>
          </details>
        </div>
      </section>

      {/* Create Project */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Create Project</h2>
        <div className="border rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-950">
            <h3 className="text-white font-semibold mb-2">Create a New Project</h3>
            <p className="text-slate-400 text-sm mb-3">
              Add a new project to your organization.
            </p>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-slate-300 text-sm whitespace-pre-wrap">{`Read the Bugrit Projects API at https://bugrit.com/docs/api-reference/projects

Add a "Create Project" form to my app:

1. Form fields:
   - name (required): text input
   - platforms (required): checkbox group (web, ios, android, desktop)
   - description: textarea
   - repositoryUrl: URL input
   - defaultBranch: text input (default: "main")
2. On submit, POST /api/v1/projects with form data
3. Show success message with new project ID
4. Redirect to project detail page
5. Handle validation errors from API

Use my existing form components.
My stack: [YOUR_STACK]`}</pre>
            </div>
            <button
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
              onClick={() => copyToClipboard(`Read the Bugrit Projects API at https://bugrit.com/docs/api-reference/projects

Add a "Create Project" form to my app:

1. Form fields:
   - name (required): text input
   - platforms (required): checkbox group (web, ios, android, desktop)
   - description: textarea
   - repositoryUrl: URL input
   - defaultBranch: text input (default: "main")
2. On submit, POST /api/v1/projects with form data
3. Show success message with new project ID
4. Redirect to project detail page
5. Handle validation errors from API

Use my existing form components.
My stack: [YOUR_STACK]`)}
            >
              📋 Copy Prompt
            </button>
          </div>
          <details className="border-t border-slate-800">
            <summary className="p-4 cursor-pointer text-sm text-muted-foreground hover:bg-muted/50">
              👩‍💻 Technical Details (for developers)
            </summary>
            <div className="p-4 bg-muted/30 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-sm font-mono">POST</span>
                  <code className="text-sm">/api/v1/projects</code>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Request Body</h4>
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
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* Get/Update/Delete Project */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Project Operations</h2>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm font-mono">GET</span>
              <code className="text-sm">/api/v1/projects/:projectId</code>
            </div>
            <p className="text-muted-foreground text-sm">Returns details for a specific project.</p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-sm font-mono">PUT</span>
              <code className="text-sm">/api/v1/projects/:projectId</code>
            </div>
            <p className="text-muted-foreground text-sm">Updates an existing project. Only include fields you want to update.</p>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-sm font-mono">DELETE</span>
              <code className="text-sm">/api/v1/projects/:projectId</code>
            </div>
            <p className="text-muted-foreground text-sm">Permanently deletes a project and all associated scans and test results.</p>
          </div>
        </div>
      </section>

      {/* Platform Restrictions */}
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
