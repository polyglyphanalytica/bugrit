export default function AuthenticationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Authentication</h1>
        <p className="text-lg text-muted-foreground">
          Learn how to authenticate your API requests using API keys.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          API keys let you automate scans in your CI/CD pipeline. Instead of manually clicking &quot;scan&quot; before every deploy, set it up once and never think about it again.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Automate security checks:</strong> Add one API call to your deploy script and every push gets scanned automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Block bad deploys:</strong> Fail builds when critical vulnerabilities are detected—before they reach production</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Use AI to integrate:</strong> Copy our vibe coding prompts and let your AI assistant wire everything up</span>
          </li>
        </ul>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">API Keys</h2>
        <p className="text-muted-foreground mb-4">
          All API requests require authentication using an API key. You can create and manage API
          keys from the{' '}
          <a href="/settings/api-keys" className="text-primary hover:underline">
            API Keys
          </a>{' '}
          page in your dashboard.
        </p>
        <p className="text-muted-foreground mb-4">
          API keys start with the prefix <code className="bg-muted px-1 py-0.5 rounded">bg_</code>{' '}
          and look like this:
        </p>
        <code className="block bg-muted p-4 rounded-lg text-sm">
          bg_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
        </code>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Using Your API Key</h2>
        <p className="text-muted-foreground mb-4">
          Include your API key in the <code className="bg-muted px-1 py-0.5 rounded">Authorization</code>{' '}
          header with a <code className="bg-muted px-1 py-0.5 rounded">Bearer</code> prefix:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl https://bugrit.com/api/v1/projects \\
  -H "Authorization: Bearer bg_your_api_key_here"`}</pre>
        </div>
        <p className="text-muted-foreground mt-4">
          Alternatively, you can use the <code className="bg-muted px-1 py-0.5 rounded">x-api-key</code>{' '}
          header:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`curl https://bugrit.com/api/v1/projects \\
  -H "x-api-key: bg_your_api_key_here"`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Permissions</h2>
        <p className="text-muted-foreground mb-4">
          API keys can have different permissions. When creating a key, select the permissions your
          integration needs:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Permission</th>
                <th className="text-left py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4"><code>projects:read</code></td>
                <td className="py-3 px-4 text-muted-foreground">List and view projects</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4"><code>projects:write</code></td>
                <td className="py-3 px-4 text-muted-foreground">Create, update, delete projects</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4"><code>scans:read</code></td>
                <td className="py-3 px-4 text-muted-foreground">List and view scans</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4"><code>scans:write</code></td>
                <td className="py-3 px-4 text-muted-foreground">Create and update scans</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4"><code>findings:read</code></td>
                <td className="py-3 px-4 text-muted-foreground">View scan findings</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4"><code>findings:write</code></td>
                <td className="py-3 px-4 text-muted-foreground">Update finding status (resolve, false positive)</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4"><code>reports:read</code></td>
                <td className="py-3 px-4 text-muted-foreground">View generated reports</td>
              </tr>
              <tr>
                <td className="py-3 px-4"><code>reports:write</code></td>
                <td className="py-3 px-4 text-muted-foreground">Generate new reports</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Permission Presets</h2>
        <p className="text-muted-foreground mb-4">
          For convenience, we offer permission presets:
        </p>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Read Only</h4>
            <p className="text-muted-foreground text-sm">
              <code>projects:read</code>, <code>scans:read</code>, <code>findings:read</code>, <code>reports:read</code>
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Execute</h4>
            <p className="text-muted-foreground text-sm">
              All read permissions plus <code>projects:write</code>, <code>scans:write</code>, <code>findings:write</code>
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Full Access</h4>
            <p className="text-muted-foreground text-sm">
              All permissions including <code>reports:write</code>
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Security Best Practices</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Never expose API keys in client-side code or public repositories</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Use environment variables to store API keys in your CI/CD pipelines</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Create separate API keys for different environments (development, staging, production)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Revoke keys immediately if they may have been compromised</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>Use the minimum permissions necessary for each integration</span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Error Responses</h2>
        <p className="text-muted-foreground mb-4">
          Invalid or missing authentication returns a 401 error:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid or expired API key"
  }
}`}</pre>
        </div>
        <p className="text-muted-foreground mt-4">
          Missing permissions return a 403 error:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Missing required permission: projects:write"
  }
}`}</pre>
        </div>
      </section>
    </div>
  );
}
