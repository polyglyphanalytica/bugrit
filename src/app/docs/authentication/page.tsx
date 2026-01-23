'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function AuthenticationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Authentication</h1>
        <p className="text-lg text-muted-foreground">
          Get your API key and start automating security scans.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'Add to CI/CD',
            description: 'Automate scans in your pipeline',
            prompt: `Read the Bugrit Authentication docs at https://bugrit.com/docs/authentication

Set up Bugrit API authentication in my CI/CD:

1. Store BUGRIT_API_KEY as a secret
2. Add header: Authorization: Bearer {API_KEY}
3. Trigger scans after deploy
4. Fail build if critical issues found

My CI platform: [GitHub Actions / GitLab CI / etc.]`
          },
          {
            label: 'Create API Client',
            description: 'Build a reusable API wrapper',
            prompt: `Read the Bugrit Authentication docs at https://bugrit.com/docs/authentication

Create a Bugrit API client for my app:

1. Store API key in environment variable BUGRIT_API_KEY
2. Create helper function that adds auth header
3. Handle 401 errors (invalid/expired key)
4. Handle 403 errors (missing permissions)
5. Add retry logic for rate limits

My stack: [YOUR_STACK]`
          },
          {
            label: 'Multi-Environment',
            description: 'Different keys per environment',
            prompt: `Read the Bugrit Authentication docs at https://bugrit.com/docs/authentication

Set up separate API keys for each environment:

1. Create 3 keys: dev, staging, production
2. Configure each with minimum permissions needed
3. Store in environment-specific .env files
4. Verify keys work before deploy

Show me how to create and manage these keys.`
          },
        ]}
      />

      {/* Quick Start */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>🔑</span> Quick Start
        </h2>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>
              Go to{' '}
              <a href="/settings/api-keys" className="text-primary hover:underline">
                Settings → API Keys
              </a>{' '}
              to create a key
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Copy the key (it starts with <code className="bg-muted px-1 py-0.5 rounded">bg_</code>)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Add to your requests as <code className="bg-muted px-1 py-0.5 rounded">Authorization: Bearer YOUR_KEY</code></span>
          </li>
        </ol>
      </div>

      {/* Example */}
      <div className="p-4 bg-muted/50 rounded-xl">
        <h3 className="font-semibold mb-3">Example Request</h3>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl https://bugrit.com/api/v1/projects \\
  -H "Authorization: Bearer bg_your_api_key_here"`}</pre>
        </div>
      </div>

      {/* Technical Reference - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Technical Reference
        </summary>
        <div className="p-4 bg-muted/30 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Permissions</h3>
            <p className="text-muted-foreground text-sm mb-3">
              Select the minimum permissions your integration needs:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Permission</th>
                    <th className="text-left py-2 px-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>projects:read</code></td>
                    <td className="py-2 px-2 text-muted-foreground">List and view projects</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>projects:write</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Create, update, delete projects</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>scans:read</code></td>
                    <td className="py-2 px-2 text-muted-foreground">List and view scans</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>scans:write</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Create and cancel scans</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>findings:read</code></td>
                    <td className="py-2 px-2 text-muted-foreground">View scan findings</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>findings:write</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Update finding status</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2"><code>reports:read</code></td>
                    <td className="py-2 px-2 text-muted-foreground">View generated reports</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2"><code>reports:write</code></td>
                    <td className="py-2 px-2 text-muted-foreground">Generate new reports</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Permission Presets</h3>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Read Only</h4>
                <p className="text-muted-foreground text-sm">
                  <code>projects:read</code>, <code>scans:read</code>, <code>findings:read</code>, <code>reports:read</code>
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Execute</h4>
                <p className="text-muted-foreground text-sm">
                  All read + <code>projects:write</code>, <code>scans:write</code>, <code>findings:write</code>
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-1">Full Access</h4>
                <p className="text-muted-foreground text-sm">
                  All permissions including <code>reports:write</code>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Error Responses</h3>
            <div className="space-y-3">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">401 - Invalid API Key</p>
                <pre className="text-xs text-muted-foreground">{`{"error": {"code": "INVALID_API_KEY", "message": "Invalid or expired API key"}}`}</pre>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">403 - Missing Permission</p>
                <pre className="text-xs text-muted-foreground">{`{"error": {"code": "FORBIDDEN", "message": "Missing required permission: projects:write"}}`}</pre>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Security Best Practices</h3>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Never expose API keys in client-side code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use environment variables in CI/CD</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Create separate keys for different environments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Revoke keys immediately if compromised</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use minimum permissions necessary</span>
              </li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
