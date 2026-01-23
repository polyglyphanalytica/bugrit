'use client';

import { VibePromptTabs } from '@/components/docs/vibe-prompt';

export default function CICDIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">CI/CD Integration</h1>
        <p className="text-lg text-muted-foreground">
          Automatically scan your code on every push, PR, or release.
        </p>
      </div>

      {/* Vibe Coding Prompts First */}
      <VibePromptTabs
        prompts={[
          {
            label: 'GitHub Actions',
            description: 'Scan on every PR',
            prompt: `Read the Bugrit CI/CD docs at https://bugrit.com/docs/integrations/ci-cd

Create a GitHub Action that scans on every PR:

1. Trigger on: pull_request to main
2. POST to /api/v1/scans with GitHub repo info
3. Poll until scan completes
4. Add PR comment with scan summary
5. FAIL if critical issues found

Use secrets.BUGRIT_API_KEY and secrets.BUGRIT_APP_ID.`
          },
          {
            label: 'GitLab CI',
            description: 'Scan in GitLab pipeline',
            prompt: `Read the Bugrit CI/CD docs at https://bugrit.com/docs/integrations/ci-cd

Create a GitLab CI job that scans my code:

1. Add job to .gitlab-ci.yml
2. POST to /api/v1/scans with GitLab repo info
3. Poll until scan completes
4. Block merge if critical issues found

Use CI variables: BUGRIT_API_KEY, BUGRIT_APP_ID.`
          },
          {
            label: 'Quality Gate',
            description: 'Block bad deploys',
            prompt: `Read the Bugrit CI/CD docs at https://bugrit.com/docs/integrations/ci-cd

Add a quality gate to my pipeline:

1. After Bugrit scan completes
2. Check summary.critical and summary.high
3. FAIL if critical > 0
4. FAIL if high > 5
5. Print summary of findings

My CI: [GitHub Actions / GitLab CI / CircleCI / Jenkins]`
          },
        ]}
      />

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Manual security checks get skipped when you&apos;re rushing. CI/CD integration means
          every deploy gets scanned automatically—no human discipline required.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Never forget:</strong> Scans run automatically on every push</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Quality gates:</strong> Block deploys when critical issues found</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Works everywhere:</strong> GitHub, GitLab, CircleCI, Jenkins</span>
          </li>
        </ul>
      </div>

      {/* Secrets Setup */}
      <div className="p-4 bg-muted/50 rounded-xl">
        <h3 className="font-semibold mb-3">Required Secrets</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><code className="bg-muted px-1 py-0.5 rounded">BUGRIT_API_KEY</code> - From Settings → API Keys</li>
          <li><code className="bg-muted px-1 py-0.5 rounded">BUGRIT_APP_ID</code> - From your application dashboard</li>
        </ul>
      </div>

      {/* Technical Reference - Collapsed */}
      <details className="border rounded-xl overflow-hidden">
        <summary className="p-4 cursor-pointer font-semibold hover:bg-muted/50">
          Configuration Examples
        </summary>
        <div className="p-4 bg-muted/30 space-y-6">
          <div>
            <h3 className="font-semibold mb-3">GitHub Actions</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`# .github/workflows/bugrit.yml
name: Bugrit Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger Scan
        run: |
          curl -X POST https://bugrit.com/api/v1/scans \\
            -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "applicationId": "\${{ secrets.BUGRIT_APP_ID }}",
              "sourceType": "github",
              "repoUrl": "https://github.com/\${{ github.repository }}",
              "branch": "\${{ github.ref_name }}"
            }' | tee response.json

          SCAN_ID=$(jq -r '.scan.id' response.json)
          echo "SCAN_ID=$SCAN_ID" >> $GITHUB_ENV

      - name: Wait for Completion
        run: |
          while true; do
            STATUS=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
              "https://bugrit.com/api/v1/scans/\$SCAN_ID" | jq -r '.scan.status')
            [ "$STATUS" = "completed" ] && break
            [ "$STATUS" = "failed" ] && exit 1
            sleep 10
          done

      - name: Check Findings
        run: |
          CRITICAL=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGRIT_API_KEY }}" \\
            "https://bugrit.com/api/v1/scans/\$SCAN_ID" | jq -r '.scan.summary.critical')
          [ "$CRITICAL" -gt 0 ] && exit 1 || exit 0`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">GitLab CI</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`# .gitlab-ci.yml
bugrit-scan:
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq
  script:
    - |
      RESPONSE=$(curl -X POST https://bugrit.com/api/v1/scans \\
        -H "Authorization: Bearer $BUGRIT_API_KEY" \\
        -H "Content-Type: application/json" \\
        -d '{
          "applicationId": "'$BUGRIT_APP_ID'",
          "sourceType": "gitlab",
          "repoUrl": "'$CI_PROJECT_URL'",
          "branch": "'$CI_COMMIT_REF_NAME'"
        }')
      SCAN_ID=$(echo $RESPONSE | jq -r '.scan.id')

      # Poll for completion
      while true; do
        STATUS=$(curl -s -H "Authorization: Bearer $BUGRIT_API_KEY" \\
          "https://bugrit.com/api/v1/scans/$SCAN_ID" | jq -r '.scan.status')
        [ "$STATUS" = "completed" ] && break
        [ "$STATUS" = "failed" ] && exit 1
        sleep 10
      done
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">CircleCI</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`# .circleci/config.yml
version: 2.1
jobs:
  bugrit-scan:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - run:
          name: Trigger Bugrit Scan
          command: |
            curl -X POST https://bugrit.com/api/v1/scans \\
              -H "Authorization: Bearer \${BUGRIT_API_KEY}" \\
              -H "Content-Type: application/json" \\
              -d '{
                "applicationId": "'\${BUGRIT_APP_ID}'",
                "sourceType": "github",
                "repoUrl": "https://github.com/'\${CIRCLE_PROJECT_USERNAME}'/'\${CIRCLE_PROJECT_REPONAME}'",
                "branch": "'\${CIRCLE_BRANCH}'"
              }'

workflows:
  scan-on-push:
    jobs:
      - bugrit-scan`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Quality Gate Script</h3>
            <div className="bg-muted p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">{`# Check results and fail if critical issues exist
SUMMARY=$(curl -s -H "Authorization: Bearer $BUGRIT_API_KEY" \\
  "https://bugrit.com/api/v1/scans/$SCAN_ID")

CRITICAL=$(echo $SUMMARY | jq -r '.scan.summary.critical')
HIGH=$(echo $SUMMARY | jq -r '.scan.summary.high')

if [ "$CRITICAL" -gt 0 ]; then
  echo "BLOCKED: $CRITICAL critical issues found"
  exit 1
fi

if [ "$HIGH" -gt 5 ]; then
  echo "BLOCKED: Too many high-severity issues ($HIGH)"
  exit 1
fi

echo "Quality gate passed"`}</pre>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Where to Add Secrets</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">CI Service</th>
                    <th className="text-left py-2 px-2">Location</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-2">GitHub Actions</td>
                    <td className="py-2 px-2 text-muted-foreground">Settings → Secrets → Actions</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2">GitLab CI</td>
                    <td className="py-2 px-2 text-muted-foreground">Settings → CI/CD → Variables</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2">CircleCI</td>
                    <td className="py-2 px-2 text-muted-foreground">Project Settings → Environment Variables</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2">Jenkins</td>
                    <td className="py-2 px-2 text-muted-foreground">Manage Jenkins → Credentials</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
