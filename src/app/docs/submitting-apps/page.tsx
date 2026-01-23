'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function SubmittingAppsDocPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Submitting Applications</h1>
        <p className="text-lg text-muted-foreground">
          7 ways to point Bugrit at your code for analysis.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'Scan GitHub',
            description: 'Scan my repo from GitHub',
            prompt: `Read the Bugrit docs at https://bugrit.com/docs/submitting-apps

Scan my GitHub repository with Bugrit:

1. POST to /api/v1/scans with:
   - sourceType: "github"
   - repoUrl: my GitHub repo URL
   - branch: "main"
2. Poll until scan completes
3. Show me the results

My repo: [YOUR_REPO_URL]`
          },
          {
            label: 'Scan Live URL',
            description: 'Scan my deployed app',
            prompt: `Read the Bugrit docs at https://bugrit.com/docs/submitting-apps

Scan my live deployed application:

1. POST to /api/v1/scans with:
   - sourceType: "url"
   - targetUrl: my app URL
2. Wait for scan to complete
3. Show critical and high issues

My URL: [YOUR_APP_URL]`
          },
          {
            label: 'Scan Mobile App',
            description: 'Scan APK or IPA file',
            prompt: `Read the Bugrit docs at https://bugrit.com/docs/submitting-apps

Scan my mobile app binary:

1. POST to /api/v1/scans with:
   - sourceType: "mobile"
   - platform: "ios" or "android"
   - Upload the APK/IPA file
2. Wait for mobile-specific analysis
3. Show security findings

My file: [APP_FILE_PATH]`
          },
        ]}
      />

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Your code lives in different places. Bugrit meets you where you are.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>GitHub/GitLab:</strong> Connect once, scan on every push</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Live URLs:</strong> Point us at a deployed app and we&apos;ll crawl it</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Mobile:</strong> Upload APK/IPA before App Store submission</span>
          </li>
        </ul>
      </div>

      {/* Quick Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="p-3 border rounded-lg">
          <h4 className="font-semibold text-sm">Live URL</h4>
          <p className="text-xs text-muted-foreground">Scan deployed web apps</p>
        </div>
        <div className="p-3 border rounded-lg">
          <h4 className="font-semibold text-sm">GitHub</h4>
          <p className="text-xs text-muted-foreground">Public or private repos</p>
        </div>
        <div className="p-3 border rounded-lg">
          <h4 className="font-semibold text-sm">GitLab</h4>
          <p className="text-xs text-muted-foreground">GitLab.com or self-hosted</p>
        </div>
        <div className="p-3 border rounded-lg">
          <h4 className="font-semibold text-sm">ZIP Upload</h4>
          <p className="text-xs text-muted-foreground">Upload source directly</p>
        </div>
        <div className="p-3 border rounded-lg">
          <h4 className="font-semibold text-sm">Docker</h4>
          <p className="text-xs text-muted-foreground">Container images</p>
        </div>
        <div className="p-3 border rounded-lg">
          <h4 className="font-semibold text-sm">npm Package</h4>
          <p className="text-xs text-muted-foreground">From npm registry</p>
        </div>
        <div className="p-3 border rounded-lg">
          <h4 className="font-semibold text-sm">Mobile Binary</h4>
          <p className="text-xs text-muted-foreground">APK or IPA files</p>
        </div>
      </div>

      {/* Technical Reference - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          API Examples
        </summary>
        <div className="p-4 bg-muted/30 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Scan a Live URL</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY

{
  "applicationId": "app-abc123",
  "sourceType": "url",
  "targetUrl": "https://your-app.com"
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Scan a GitHub Repository</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY

{
  "applicationId": "app-abc123",
  "sourceType": "github",
  "repoUrl": "https://github.com/username/repo",
  "branch": "main",
  "accessToken": "ghp_xxxx"  // For private repos
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Upload Source Code (ZIP)</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "applicationId=app-abc123" \\
  -F "sourceType=upload" \\
  -F "file=@./source.zip"`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Scan a Docker Image</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY

{
  "applicationId": "app-abc123",
  "sourceType": "docker",
  "dockerImage": "username/image-name",
  "dockerTag": "latest"
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Scan an npm Package</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY

{
  "applicationId": "app-abc123",
  "sourceType": "npm",
  "npmPackage": "@scope/package-name",
  "npmVersion": "latest"
}`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Scan a Mobile Binary</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`curl -X POST https://bugrit.com/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "applicationId=app-abc123" \\
  -F "sourceType=mobile" \\
  -F "platform=android" \\
  -F "file=@./app-release.apk"`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Response</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`{
  "scan": {
    "id": "scn-xyz789",
    "applicationId": "app-abc123",
    "status": "running",
    "sourceType": "github"
  }
}`}</pre>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Poll <code className="px-1 py-0.5 bg-muted rounded">GET /api/v1/scans/:id</code> until status is &quot;completed&quot;.
            </p>
          </div>
        </div>
      </details>

      {/* Limits - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Limits by Plan
        </summary>
        <div className="p-4 bg-muted/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Resource</th>
                  <th className="text-left py-2 px-2">Solo</th>
                  <th className="text-left py-2 px-2">Scale</th>
                  <th className="text-left py-2 px-2">Business</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-2">Max upload size</td>
                  <td className="py-2 px-2 text-muted-foreground">50 MB</td>
                  <td className="py-2 px-2 text-muted-foreground">100 MB</td>
                  <td className="py-2 px-2 text-muted-foreground">500 MB</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-2">Concurrent scans</td>
                  <td className="py-2 px-2 text-muted-foreground">1</td>
                  <td className="py-2 px-2 text-muted-foreground">3</td>
                  <td className="py-2 px-2 text-muted-foreground">10</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">Report retention</td>
                  <td className="py-2 px-2 text-muted-foreground">14 days</td>
                  <td className="py-2 px-2 text-muted-foreground">30 days</td>
                  <td className="py-2 px-2 text-muted-foreground">90 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  );
}
