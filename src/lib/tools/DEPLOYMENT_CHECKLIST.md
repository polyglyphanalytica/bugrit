# Tool Deployment Checklist

A comprehensive checklist for deploying new scanning tools to the Bugrit platform.
All items must be completed for a tool to be production-ready.

**Current Tool Counts:**
- Total: 150 modules (66 npm/direct + 79 Docker + 5 AI)
- Last updated: January 2026

---

## Deployment Paths

There are **two deployment paths** depending on tool type:

| Path | Tool Type | Runtime | Examples |
|------|-----------|---------|----------|
| **Path A** | Native JS (npm) | Node.js worker | ESLint, Prettier, Secretlint |
| **Path B** | Docker containers | Google Cloud Build | Semgrep, Trivy, OWASP ZAP |

**How to choose:**
- Use **Path A (npm)** if the tool is a Node.js package that runs locally
- Use **Path B (Docker)** if the tool requires a specific runtime (Python, Go, Ruby) or system dependencies

---

## Common Steps (Both Paths)

### 1. Tool Registry (`src/lib/tools/registry.ts`)

**Required for ALL tools** - This is the source of truth.

- [ ] Add tool entry to `TOOL_REGISTRY` array with:
  - `id`: Unique kebab-case identifier (e.g., `'my-tool'`)
  - `name`: Human-readable name
  - `description`: Brief description of what the tool does
  - `category`: One of `ToolCategory` values (see below)
  - `npm` OR `docker`: Package name or Docker image (not both)
  - `dependencies`: Additional npm packages needed (npm tools only)
  - `languages`: Array of supported languages (optional)
  - `filePatterns`: Glob patterns for applicable files (optional)
  - `credits`: Credit cost for running this tool (0-5, can be fractional)

**Valid categories:**
```typescript
'linting' | 'security' | 'dependencies' | 'accessibility' |
'quality' | 'documentation' | 'git' | 'performance' |
'mobile' | 'api-security' | 'cloud-native'
```

**Example (npm tool):**
```typescript
{
  id: 'my-linter',
  name: 'My Linter',
  description: 'Lints code for issues',
  category: 'linting',
  npm: 'my-linter',
  dependencies: ['my-linter-preset'],
  languages: ['javascript', 'typescript'],
  filePatterns: ['**/*.js', '**/*.ts'],
  credits: 0,
}
```

**Example (Docker tool):**
```typescript
{
  id: 'my-scanner',
  name: 'My Scanner',
  description: 'Scans for vulnerabilities',
  category: 'security',
  docker: 'my-scanner/my-scanner:latest',
  languages: ['python', 'go'],
  credits: 2,
}
```

### 2. API Types (`src/lib/api/types.ts`)

**Required for ALL tools** - Enables API discoverability.

- [ ] Add tool ID to `AVAILABLE_TOOLS` array in the appropriate category section
- [ ] Verify `ToolCategory` type includes tool's category

```typescript
export const AVAILABLE_TOOLS = [
  // ... existing tools ...
  'my-tool',  // Add in appropriate category section
] as const;
```

### 3. Billing (`src/lib/subscriptions/credits.ts`)

- [ ] Credits are read from registry.ts - no separate config needed
- [ ] Verify credit cost is appropriate:

| Credits | Tool Type | Examples |
|---------|-----------|----------|
| 0 | Free (linting, formatting) | ESLint, Prettier |
| 0.5-1 | Basic scanning | Secretlint, npm-audit |
| 1-2 | Standard security | Bandit, Gosec, ShellCheck |
| 2-3 | Advanced scanning | Semgrep, Trivy, Checkov |
| 3-5 | Premium/compute-intensive | OWASP ZAP, MobSF, Lighthouse |

---

## Path A: Native JS Tools (npm)

For tools that run as npm packages in the Node.js worker.

### A4. Node Integration (`src/lib/integrations/node/index.ts`)

- [ ] Create integration class implementing `ToolIntegration`
- [ ] Implement `run()` method to execute the npm tool
- [ ] Implement output normalization to `AuditFinding[]` format
- [ ] Add instance to `NODE_INTEGRATIONS` export array

```typescript
export class MyLinterIntegration implements ToolIntegration {
  name = 'My Linter';
  category: ToolCategory = 'linting';

  async run(target: AuditTarget): Promise<AuditResult> {
    // Execute npm tool and normalize output
  }
}
```

### A5. Package Installation

- [ ] Add to `package.json` dependencies (or devDependencies)
- [ ] Test installation: `npm install`
- [ ] Verify tool runs: `npx my-linter --version`

---

## Path B: Docker Tools (Cloud Build)

For tools that run as Docker containers via Google Cloud Build.

### B4. Docker Configuration (`src/lib/deploy/cloud-build.ts`)

- [ ] Add configuration to `DOCKER_TOOLS` object:

```typescript
'my-scanner': {
  image: 'my-scanner/my-scanner:latest',
  timeout: '600s',
  memory: '4GB',
  buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
    {
      name: 'gcr.io/cloud-builders/gsutil',
      args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
    },
    {
      name: 'my-scanner/my-scanner:latest',
      args: ['scan', '/workspace/source', '-o', 'json', '--output', '/workspace/my-scanner-report.json'],
    },
    {
      name: 'gcr.io/cloud-builders/gsutil',
      args: ['cp', '/workspace/my-scanner-report.json', `gs://${outputBucket}/${jobId}/my-scanner-report.json`],
    },
  ],
},
```

- [ ] Add output file mapping to `outputFiles` in `fetchResults()`:

```typescript
'my-scanner': 'my-scanner-report.json',
```

### B5. Integration Metadata (`src/lib/integrations/cloud-build/index.ts`)

- [ ] Add to `TOOL_METADATA` object:

```typescript
'my-scanner': {
  category: 'security',
  description: 'My Scanner description',
  website: 'https://my-scanner.io/',
  targetType: 'source',  // or 'url' or 'image'
},
```

### B6. Integration Class (`src/lib/integrations/cloud-build/index.ts`)

- [ ] Create class extending `CloudBuildIntegration`:

```typescript
export class CloudBuildMyScannerIntegration extends CloudBuildIntegration {
  name = 'My Scanner (Cloud)';
  toolId: DockerToolId = 'my-scanner';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    const data = output as { issues?: Array<{ title: string; severity: string; file: string; line: number; message: string }> };

    for (const issue of data.issues || []) {
      findings.push(this.createFinding({
        title: issue.title,
        description: issue.message,
        severity: this.mapSeverity(issue.severity),
        file: issue.file,
        line: issue.line,
        tags: ['my-scanner'],
      }));
    }
    return findings;
  }
}
```

- [ ] Add instance to `CLOUD_BUILD_INTEGRATIONS` array at bottom of file:

```typescript
export const CLOUD_BUILD_INTEGRATIONS: ToolIntegration[] = [
  // ... existing integrations ...
  new CloudBuildMyScannerIntegration(),
];
```

---

## Optional Steps (Both Paths)

### 7. Wizard/Recommendation Engine (`src/lib/wizard/recommendation-engine.ts`)

If tool should appear in the scan recommendation wizard:

- [ ] Add to `TOOL_DATABASE` array with:
  - Full tool metadata
  - Time estimates
  - Tags for filtering
  - Applicable app types/languages

### 8. AI Report Aggregator (`src/lib/integrations/ai/index.ts`)

- [ ] Verify tool category has weight in `CATEGORY_WEIGHTS`:

| Category | Weight | Description |
|----------|--------|-------------|
| security | 1.0 | Highest priority |
| dependencies | 0.9 | Supply chain security |
| api-security | 0.9 | API vulnerabilities |
| mobile | 0.85 | Mobile app security |
| cloud-native | 0.85 | K8s/IaC security |
| accessibility | 0.8 | WCAG compliance |
| code-quality | 0.7 | Maintainability |
| performance | 0.6 | Speed metrics |

### 9. Documentation Updates

Update these files to reflect the new tool:

| File | What to Update |
|------|----------------|
| `src/app/docs/page.tsx` | Tool count in header, category section |
| `src/app/docs/pricing/page.tsx` | Credit cost in category table |
| `src/app/docs/api-reference/scans/page.tsx` | Tool count references |
| `src/app/docs/tools/page.tsx` | Detailed tool description |
| `src/app/page.tsx` | Tool count on homepage |
| `src/app/pricing/page.tsx` | Tool count in pricing section |

---

## Testing Checklist

### Functional Tests

- [ ] Unit test for output parsing (normalizeOutput)
- [ ] Integration test with sample codebase
- [ ] Verify findings appear in scan results
- [ ] Verify findings have correct severity mapping
- [ ] Test edge cases (empty results, malformed output)

### End-to-End Tests

- [ ] Run scan via API and verify tool runs
- [ ] Verify credits are deducted correctly
- [ ] Verify AI report includes tool findings
- [ ] Test API endpoint returns tool in available list
- [ ] Verify webhook fires with tool findings

### Docker-Specific Tests (Path B only)

- [ ] Test image builds: `docker build -t my-scanner .`
- [ ] Test image runs locally: `docker run --rm my-scanner --version`
- [ ] Test with Cloud Build: trigger manual build
- [ ] Verify timeout is appropriate for large codebases

---

## Monitoring & Alerting

- [ ] Add tool to Cloud Build monitoring dashboard (Docker tools)
- [ ] Configure timeout alerts
- [ ] Set up failure rate monitoring
- [ ] Add to health check endpoint

---

## Quick Reference: File Locations

| Component | File Path | Path A | Path B |
|-----------|-----------|--------|--------|
| Tool Registry | `src/lib/tools/registry.ts` | Required | Required |
| API Types | `src/lib/api/types.ts` | Required | Required |
| Credit Billing | `src/lib/subscriptions/credits.ts` | Auto | Auto |
| Node Integration | `src/lib/integrations/node/index.ts` | Required | - |
| Docker Config | `src/lib/deploy/cloud-build.ts` | - | Required |
| Cloud Build Integration | `src/lib/integrations/cloud-build/index.ts` | - | Required |
| Orchestrator | `src/lib/integrations/orchestrator.ts` | Auto | Auto |
| AI Intelligence | `src/lib/integrations/ai/index.ts` | Verify | Verify |
| Wizard Engine | `src/lib/wizard/recommendation-engine.ts` | Optional | Optional |
| Main Docs | `src/app/docs/page.tsx` | Update | Update |
| Pricing Docs | `src/app/docs/pricing/page.tsx` | Update | Update |
| API Docs | `src/app/docs/api-reference/scans/page.tsx` | Update | Update |
| Homepage | `src/app/page.tsx` | Update | Update |
| Pricing Page | `src/app/pricing/page.tsx` | Update | Update |

---

## Automated Verification Script

Run this script to verify all required files are updated:

```bash
#!/bin/bash
TOOL_ID="${1:-my-tool}"
TOOL_TYPE="${2:-docker}"  # 'npm' or 'docker'

echo "========================================="
echo "Tool Deployment Verification: $TOOL_ID"
echo "Type: $TOOL_TYPE"
echo "========================================="

# Common checks
echo ""
echo "=== Common Requirements ==="
grep -q "id: '$TOOL_ID'" src/lib/tools/registry.ts && echo "✓ Registry" || echo "✗ Registry"
grep -q "'$TOOL_ID'" src/lib/api/types.ts && echo "✓ API Types" || echo "✗ API Types"

if [ "$TOOL_TYPE" = "docker" ]; then
  echo ""
  echo "=== Docker Path (Path B) ==="
  grep -q "'$TOOL_ID':" src/lib/deploy/cloud-build.ts && echo "✓ Docker config" || echo "✗ Docker config"
  grep -q "'$TOOL_ID':" src/lib/integrations/cloud-build/index.ts && echo "✓ Integration metadata" || echo "✗ Integration metadata"
  grep -qi "CloudBuild.*$(echo $TOOL_ID | sed 's/-//g').*Integration" src/lib/integrations/cloud-build/index.ts && echo "✓ Integration class" || echo "✗ Integration class"
elif [ "$TOOL_TYPE" = "npm" ]; then
  echo ""
  echo "=== npm Path (Path A) ==="
  grep -q "$TOOL_ID" package.json && echo "✓ package.json" || echo "✗ package.json"
  grep -qi "$(echo $TOOL_ID | sed 's/-//g').*Integration" src/lib/integrations/node/index.ts && echo "✓ Node integration" || echo "✗ Node integration"
fi

echo ""
echo "=== Optional (check manually) ==="
grep -q "'$TOOL_ID'" src/lib/wizard/recommendation-engine.ts && echo "✓ Wizard engine" || echo "○ Wizard engine (optional)"

echo ""
echo "Done! Check any ✗ items above."
```

Usage:
```bash
# For Docker tool
./verify-tool.sh my-scanner docker

# For npm tool
./verify-tool.sh my-linter npm
```

---

## Compliance Matrix

Use this matrix to verify all 150 modules are properly deployed:

| Tool ID | Registry | API Types | Integration | Wizard | Docs |
|---------|----------|-----------|-------------|--------|------|
| eslint | ✓ | ✓ | Node | ✓ | ✓ |
| semgrep | ✓ | ✓ | CloudBuild | ✓ | ✓ |
| ... | ... | ... | ... | ... | ... |

Generate this matrix with:
```bash
node scripts/verify-all-tools.js
```

---

## Notes

- Always coordinate credit pricing with product team
- New categories require updates to multiple files including the ToolCategory type
- Docker images should be versioned for rollback capability
- Test with large repositories to verify timeout settings
- Keep tool counts updated across all documentation

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-23 | Updated tool counts: 100 → 115 (added 15 more tools: Pyright, nbqa, eslint-plugin-vue, eslint-plugin-react, scalafmt, Scalafix, HLint, Buf, angular-eslint, ScanCode, Licensee, Cosign, Safety, sqlcheck, pgFormatter) | Claude |
| 2026-01-23 | Updated tool counts: 88 → 100 (added 12 more tools: lockfile-lint, audit-ci, webhint, accessibility-checker, Clair, Falco, Slither, Error Prone, Credo, Steampipe, SonarScanner, Infer) | Claude |
| 2026-01-23 | Updated tool counts: 79 → 88 (added 9 more tools: html-validate, textlint, npm-check-updates, yamllint, Bearer, Pylint, Dart Analyzer, ktlint, Prowler) | Claude |
| 2026-01-23 | Updated tool counts: 68 → 79 (added 11 new tools) | Claude |
| 2026-01-21 | Added dual-path checklist, compliance matrix | Claude |
| 2026-01-20 | Initial checklist creation | Claude |
