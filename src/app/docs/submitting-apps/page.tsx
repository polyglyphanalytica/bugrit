export default function SubmittingAppsDocPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">Submitting Applications</h1>
        <p className="text-lg text-muted-foreground">
          Multiple ways to point Bugrit at your application for analysis.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Your code lives in different places—GitHub, local files, Docker containers. Bugrit meets you where you are with 7 different ways to submit code for scanning.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>GitHub/GitLab integration:</strong> Connect once, scan on every push automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Scan deployed apps:</strong> Point us at a live URL and we&apos;ll crawl and analyze it</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Mobile binaries:</strong> Upload APK/IPA files to scan before App Store submission</span>
          </li>
        </ul>
      </div>

      <section className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
        <p className="text-muted-foreground">
          You can submit your application for scanning through the <strong>dashboard UI</strong> or
          the <strong>REST API</strong>. All methods trigger the same 69-tool analysis and produce
          the same unified report.
        </p>
      </section>

      {/* Submission Methods Overview */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Supported Input Methods</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Live URL</h4>
            <p className="text-sm text-muted-foreground">
              Point to a deployed web application. We crawl and analyze it live.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">GitHub Repository</h4>
            <p className="text-sm text-muted-foreground">
              Connect public or private GitHub repos. We clone and analyze the source.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">GitLab Repository</h4>
            <p className="text-sm text-muted-foreground">
              Works with GitLab.com and self-hosted GitLab instances.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">ZIP Upload</h4>
            <p className="text-sm text-muted-foreground">
              Upload a ZIP file containing your source code directly.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Docker Image</h4>
            <p className="text-sm text-muted-foreground">
              Pull from Docker Hub or private registries for container analysis.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">npm Package</h4>
            <p className="text-sm text-muted-foreground">
              Analyze packages directly from the npm registry.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Mobile Binary (APK/IPA)</h4>
            <p className="text-sm text-muted-foreground">
              Upload Android APK or iOS IPA files for mobile-specific analysis.
            </p>
          </div>
        </div>
      </section>

      {/* UI Method */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Via Dashboard UI</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
            <div>
              <h4 className="font-semibold">Navigate to Applications</h4>
              <p className="text-sm text-muted-foreground">
                Go to <code className="px-1 py-0.5 bg-muted rounded">/applications</code> and select your application.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
            <div>
              <h4 className="font-semibold">Click "New Scan"</h4>
              <p className="text-sm text-muted-foreground">
                Opens the scan configuration page with all input method options.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
            <div>
              <h4 className="font-semibold">Select Input Method</h4>
              <p className="text-sm text-muted-foreground">
                Choose from URL, GitHub, GitLab, Upload, Docker, npm, or Mobile.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">4</div>
            <div>
              <h4 className="font-semibold">Start Scan</h4>
              <p className="text-sm text-muted-foreground">
                Click "Start Scan" and watch 69 tools analyze your application in under 60 seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* API Method */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Via API</h2>
        <p className="text-muted-foreground mb-4">
          Use the Scans API for CI/CD integration or programmatic access.
        </p>

        {/* URL */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Scan a Live URL</h3>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "applicationId": "app-abc123",
  "sourceType": "url",
  "targetUrl": "https://your-app.com"
}`}</pre>
          </div>
        </div>

        {/* GitHub */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Scan a GitHub Repository</h3>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "applicationId": "app-abc123",
  "sourceType": "github",
  "repoUrl": "https://github.com/username/repo",
  "branch": "main",
  "accessToken": "ghp_xxxx"  // Optional, for private repos
}`}</pre>
          </div>
        </div>

        {/* GitLab */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Scan a GitLab Repository</h3>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "applicationId": "app-abc123",
  "sourceType": "gitlab",
  "repoUrl": "https://gitlab.com/username/repo",
  "branch": "main",
  "accessToken": "glpat-xxxx"  // Optional, for private repos
}`}</pre>
          </div>
        </div>

        {/* Upload */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Upload Source Code (ZIP)</h3>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="applicationId"

app-abc123
--boundary
Content-Disposition: form-data; name="sourceType"

upload
--boundary
Content-Disposition: form-data; name="file"; filename="source.zip"
Content-Type: application/zip

<binary data>
--boundary--`}</pre>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Or using curl:
          </p>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto mt-2">
            <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "applicationId=app-abc123" \\
  -F "sourceType=upload" \\
  -F "file=@./source.zip"`}</pre>
          </div>
        </div>

        {/* Docker */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Scan a Docker Image</h3>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "applicationId": "app-abc123",
  "sourceType": "docker",
  "dockerImage": "username/image-name",
  "dockerTag": "latest",
  "registryUrl": "registry.example.com",  // Optional
  "registryCredentials": "user:token"     // Optional
}`}</pre>
          </div>
        </div>

        {/* npm */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Scan an npm Package</h3>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`POST /api/v1/scans
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "applicationId": "app-abc123",
  "sourceType": "npm",
  "npmPackage": "@scope/package-name",
  "npmVersion": "latest"  // or specific version like "1.2.3"
}`}</pre>
          </div>
        </div>

        {/* Mobile */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Scan a Mobile Binary</h3>
          <div className="bg-muted p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">{`curl -X POST https://bugrit.dev/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "applicationId=app-abc123" \\
  -F "sourceType=mobile" \\
  -F "platform=android" \\
  -F "file=@./app-release.apk"

# For iOS:
curl -X POST https://bugrit.dev/api/v1/scans \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "applicationId=app-abc123" \\
  -F "sourceType=mobile" \\
  -F "platform=ios" \\
  -F "file=@./App.ipa"`}</pre>
          </div>
        </div>
      </section>

      {/* Response */}
      <section>
        <h2 className="text-2xl font-bold mb-4">API Response</h2>
        <p className="text-muted-foreground mb-4">
          All scan requests return the same response format:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`{
  "scan": {
    "id": "scn-xyz789",
    "applicationId": "app-abc123",
    "status": "running",
    "sourceType": "github",
    "createdAt": "2026-01-19T10:30:00Z",
    "estimatedCompletion": "2026-01-19T10:31:00Z"
  }
}`}</pre>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Poll <code className="px-1 py-0.5 bg-muted rounded">GET /api/v1/scans/:id</code> or
          use webhooks to get notified when the scan completes.
        </p>
      </section>

      {/* CI/CD Integration */}
      <section>
        <h2 className="text-2xl font-bold mb-4">CI/CD Integration</h2>
        <p className="text-muted-foreground mb-4">
          Example GitHub Actions workflow:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`name: Bugrit Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create source archive
        run: zip -r source.zip . -x ".git/*"

      - name: Submit to Bugrit
        run: |
          SCAN_ID=$(curl -s -X POST https://bugrit.dev/api/v1/scans \\
            -H "Authorization: Bearer \${{ secrets.BUGGERED_API_KEY }}" \\
            -F "applicationId=\${{ vars.BUGGERED_APP_ID }}" \\
            -F "sourceType=upload" \\
            -F "file=@./source.zip" | jq -r '.scan.id')

          echo "Scan started: $SCAN_ID"
          echo "SCAN_ID=$SCAN_ID" >> $GITHUB_ENV

      - name: Wait for results
        run: |
          while true; do
            STATUS=$(curl -s \\
              -H "Authorization: Bearer \${{ secrets.BUGGERED_API_KEY }}" \\
              "https://bugrit.dev/api/v1/scans/$SCAN_ID" | jq -r '.scan.status')

            if [ "$STATUS" = "completed" ]; then
              echo "Scan complete!"
              break
            elif [ "$STATUS" = "failed" ]; then
              echo "Scan failed"
              exit 1
            fi

            sleep 5
          done

      - name: Get report
        run: |
          curl -s \\
            -H "Authorization: Bearer \${{ secrets.BUGGERED_API_KEY }}" \\
            "https://bugrit.dev/api/v1/scans/$SCAN_ID/report"`}</pre>
        </div>
      </section>

      {/* Limits */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Limits</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">Resource</th>
              <th className="text-left py-2 px-2">Starter</th>
              <th className="text-left py-2 px-2">Pro</th>
              <th className="text-left py-2 px-2">Business</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2">Scans per month</td>
              <td className="py-2 px-2 text-muted-foreground">10</td>
              <td className="py-2 px-2 text-muted-foreground">50</td>
              <td className="py-2 px-2 text-muted-foreground">200</td>
            </tr>
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
      </section>
    </div>
  );
}
