export default function CICDIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">CI/CD Integration</h1>
        <p className="text-lg text-muted-foreground">
          Automatically trigger Bugrit scans from your CI/CD pipeline. Get unified
          reports on every push, pull request, or release.
        </p>
      </div>

      {/* Why This Matters */}
      <div className="p-6 bg-primary/10 border-2 border-primary/30 rounded-xl">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>💡</span> Why This Matters
        </h2>
        <p className="text-muted-foreground mb-4">
          Manual security checks get skipped when you&apos;re rushing to ship. CI/CD integration means every single deploy gets scanned automatically—no human discipline required.
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Never forget to scan:</strong> Scans run automatically on every push, PR, or release</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Quality gates:</strong> Block deploys when critical vulnerabilities are found—before they reach production</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">→</span>
            <span><strong>Works everywhere:</strong> GitHub Actions, GitLab CI, CircleCI, Jenkins—we have examples for all of them</span>
          </li>
        </ul>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">GitHub Actions</h2>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`# .github/workflows/buggered.yml
name: Bugrit Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger Bugrit Scan
        run: |
          curl -X POST https://bugrit.dev/api/v1/scans \\
            -H "Authorization: Bearer \${{ secrets.BUGGERED_API_KEY }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "applicationId": "\${{ secrets.BUGGERED_APP_ID }}",
              "sourceType": "github",
              "repoUrl": "https://github.com/\${{ github.repository }}",
              "branch": "\${{ github.ref_name }}",
              "commitSha": "\${{ github.sha }}"
            }' | tee response.json

          SCAN_ID=$(jq -r '.scan.id' response.json)
          echo "SCAN_ID=$SCAN_ID" >> $GITHUB_ENV

      - name: Wait for Scan Completion
        run: |
          while true; do
            STATUS=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGGERED_API_KEY }}" \\
              "https://bugrit.dev/api/v1/scans/\$SCAN_ID" | jq -r '.scan.status')

            if [ "$STATUS" = "completed" ]; then
              echo "Scan completed successfully"
              break
            elif [ "$STATUS" = "failed" ]; then
              echo "Scan failed"
              exit 1
            fi

            echo "Scan status: $STATUS - waiting..."
            sleep 10
          done

      - name: Check for Critical Findings
        run: |
          CRITICAL=$(curl -s -H "Authorization: Bearer \${{ secrets.BUGGERED_API_KEY }}" \\
            "https://bugrit.dev/api/v1/scans/\$SCAN_ID" | jq -r '.scan.summary.critical')

          if [ "$CRITICAL" -gt 0 ]; then
            echo "::error::Found $CRITICAL critical issues"
            exit 1
          fi`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">GitLab CI</h2>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`# .gitlab-ci.yml
buggered-scan:
  image: alpine:latest
  before_script:
    - apk add --no-cache curl jq
  script:
    - |
      RESPONSE=$(curl -X POST https://bugrit.dev/api/v1/scans \\
        -H "Authorization: Bearer $BUGGERED_API_KEY" \\
        -H "Content-Type: application/json" \\
        -d '{
          "applicationId": "'$BUGGERED_APP_ID'",
          "sourceType": "gitlab",
          "repoUrl": "'$CI_PROJECT_URL'",
          "branch": "'$CI_COMMIT_REF_NAME'",
          "commitSha": "'$CI_COMMIT_SHA'"
        }')
      SCAN_ID=$(echo $RESPONSE | jq -r '.scan.id')

      # Poll for completion
      while true; do
        STATUS=$(curl -s -H "Authorization: Bearer $BUGGERED_API_KEY" \\
          "https://bugrit.dev/api/v1/scans/$SCAN_ID" | jq -r '.scan.status')
        [ "$STATUS" = "completed" ] && break
        [ "$STATUS" = "failed" ] && exit 1
        sleep 10
      done
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == "main"`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">CircleCI</h2>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`# .circleci/config.yml
version: 2.1
jobs:
  buggered-scan:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - run:
          name: Trigger Bugrit Scan
          command: |
            curl -X POST https://bugrit.dev/api/v1/scans \\
              -H "Authorization: Bearer \${BUGGERED_API_KEY}" \\
              -H "Content-Type: application/json" \\
              -d '{
                "applicationId": "'\${BUGGERED_APP_ID}'",
                "sourceType": "github",
                "repoUrl": "https://github.com/'\${CIRCLE_PROJECT_USERNAME}'/'\${CIRCLE_PROJECT_REPONAME}'",
                "branch": "'\${CIRCLE_BRANCH}'",
                "commitSha": "'\${CIRCLE_SHA1}'"
              }'

workflows:
  scan-on-push:
    jobs:
      - buggered-scan`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Jenkins</h2>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`// Jenkinsfile
pipeline {
    agent any

    environment {
        BUGGERED_API_KEY = credentials('buggered-api-key')
        BUGGERED_APP_ID = credentials('buggered-app-id')
    }

    stages {
        stage('Bugrit Scan') {
            steps {
                script {
                    def response = sh(
                        script: """
                            curl -X POST https://bugrit.dev/api/v1/scans \\
                              -H "Authorization: Bearer \${BUGGERED_API_KEY}" \\
                              -H "Content-Type: application/json" \\
                              -d '{
                                "applicationId": "\${BUGGERED_APP_ID}",
                                "sourceType": "github",
                                "repoUrl": "\${env.GIT_URL}",
                                "branch": "\${env.GIT_BRANCH}",
                                "commitSha": "\${env.GIT_COMMIT}"
                              }'
                        """,
                        returnStdout: true
                    )
                    echo "Scan triggered: \${response}"
                }
            }
        }
    }
}`}</pre>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Setting Up Secrets</h2>
        <p className="text-muted-foreground mb-4">
          Store your Bugrit credentials securely in your CI provider:
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">CI Service</th>
              <th className="text-left py-2 px-2">Where to Add Secrets</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 px-2">GitHub Actions</td>
              <td className="py-2 px-2 text-muted-foreground">Settings → Secrets and variables → Actions</td>
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
              <td className="py-2 px-2 text-muted-foreground">Manage Jenkins → Manage Credentials</td>
            </tr>
          </tbody>
        </table>
        <p className="text-muted-foreground mt-4">
          Required secrets:
        </p>
        <ul className="list-disc list-inside text-muted-foreground mt-2">
          <li><code>BUGGERED_API_KEY</code> - Your API key from Settings → API Keys</li>
          <li><code>BUGGERED_APP_ID</code> - Your application ID from the dashboard</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Quality Gates</h2>
        <p className="text-muted-foreground mb-4">
          Block deployments when critical issues are found:
        </p>
        <div className="bg-muted p-4 rounded-lg overflow-x-auto">
          <pre className="text-sm">{`# Check scan results and fail if critical issues exist
SUMMARY=$(curl -s -H "Authorization: Bearer $BUGGERED_API_KEY" \\
  "https://bugrit.dev/api/v1/scans/$SCAN_ID")

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
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Webhook Notifications</h2>
        <p className="text-muted-foreground mb-4">
          Instead of polling, configure webhooks to be notified when scans complete.
          Set this up in your application settings on the Bugrit dashboard.
        </p>
      </section>
    </div>
  );
}
