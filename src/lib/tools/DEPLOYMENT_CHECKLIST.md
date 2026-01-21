# Tool Deployment Checklist

A comprehensive checklist for deploying new scanning tools to the Bugrit platform.
All items must be completed for a tool to be production-ready.

## 1. Tool Registry (`src/lib/tools/registry.ts`)

- [ ] Add tool entry to `TOOL_REGISTRY` array with:
  - `id`: Unique kebab-case identifier (e.g., `'my-tool'`)
  - `name`: Human-readable name
  - `description`: Brief description of what the tool does
  - `category`: One of `ToolCategory` values
  - `npm` or `docker`: Package/image name
  - `languages`: Array of supported languages
  - `filePatterns`: Glob patterns for applicable files
  - `credits`: Credit cost for running this tool (0-5, can be fractional)

```typescript
{
  id: 'my-tool',
  name: 'My Tool',
  description: 'Description of what it scans',
  category: 'security',
  docker: 'my-tool:latest',
  languages: ['javascript', 'typescript'],
  filePatterns: ['*.js', '*.ts'],
  credits: 1.5,
}
```

## 2. Docker Configuration (`src/lib/deploy/cloud-build.ts`)

- [ ] Add Docker tool configuration to `DOCKER_TOOLS`:
  - `image`: Docker image path
  - `timeout`: Maximum execution time in seconds
  - `memory`: Memory allocation (e.g., `'2Gi'`)
  - `buildSteps`: Function returning Cloud Build steps array

```typescript
'my-tool': {
  image: 'gcr.io/bugrit/my-tool:latest',
  timeout: 300,
  memory: '2Gi',
  buildSteps: (target: string, outputPath: string) => [
    {
      name: 'gcr.io/bugrit/my-tool:latest',
      args: ['scan', target, '-o', outputPath],
    },
  ],
},
```

- [ ] Add output file mapping to `outputFiles`:

```typescript
'my-tool': 'my-tool-results.json',
```

## 3. Integration Class (`src/lib/integrations/cloud-build/index.ts`)

- [ ] Add tool metadata to `TOOL_METADATA`:

```typescript
'my-tool': {
  category: 'security',
  description: 'My Tool description',
  website: 'https://mytool.io/',
  targetType: 'source', // or 'url' or 'image'
},
```

- [ ] Create integration class extending `CloudBuildIntegration`:

```typescript
export class CloudBuildMyToolIntegration extends CloudBuildIntegration {
  name = 'My Tool (Cloud)';
  toolId: DockerToolId = 'my-tool';

  protected normalizeOutput(output: unknown): AuditFinding[] {
    const findings: AuditFinding[] = [];
    // Parse tool-specific output format
    const data = output as { /* tool output type */ };

    for (const issue of data.issues || []) {
      findings.push(this.createFinding({
        title: issue.title,
        description: issue.description,
        severity: this.mapSeverity(issue.severity),
        file: issue.file,
        line: issue.line,
        ruleId: issue.ruleId,
        tags: ['my-tool', 'category'],
      }));
    }
    return findings;
  }
}
```

- [ ] Add instance to `CLOUD_BUILD_INTEGRATIONS` array:

```typescript
new CloudBuildMyToolIntegration(),
```

## 4. Orchestrator Integration (`src/lib/integrations/orchestrator.ts`)

- [ ] Verify tool is picked up via `CLOUD_BUILD_INTEGRATIONS` spread
- [ ] No manual changes needed if using cloud-build integration

## 5. AI Report Aggregator (`src/lib/integrations/ai/index.ts`)

- [ ] Verify tool category has weight in `CATEGORY_WEIGHTS`:
  - security: 1.0
  - code-quality: 0.7
  - accessibility: 0.8
  - performance: 0.6
  - dependencies: 0.9
  - mobile: 0.85
  - api-security: 0.9
  - cloud-native: 0.85
  - ai-ml: 0.9

- [ ] Findings are automatically aggregated by the intelligence engine

## 6. Billing Integration (`src/lib/subscriptions/credits.ts`)

- [ ] Tool credits are read from `registry.ts` - no separate config needed
- [ ] Verify credit cost is appropriate:
  - 0: Free tools (linting, formatting)
  - 0.5-1: Basic scanning tools
  - 1-3: Standard security tools
  - 3-5: Premium/compute-intensive tools

## 7. API Types (`src/lib/api/types.ts`)

- [ ] Add tool to `AVAILABLE_TOOLS` array
- [ ] Add tool to appropriate category array if categorized
- [ ] Update `ToolCategory` type if new category

## 8. Wizard/Recommendation Engine (`src/lib/wizard/recommendation-engine.ts`)

- [ ] Add tool to relevant category in `WIZARD_TOOL_RECOMMENDATIONS`
- [ ] Set appropriate `defaultEnabled` value
- [ ] Configure `minCredits` threshold for recommendation

## 9. Documentation Updates

### Main Docs (`src/app/docs/page.tsx`)
- [ ] Update tool count in header (currently 52)
- [ ] Add to appropriate category section
- [ ] List new languages/platforms if applicable

### Pricing Docs (`src/app/docs/pricing/page.tsx`)
- [ ] Add credit cost to category table
- [ ] Update example calculations if needed

### API Reference (`src/app/docs/api-reference/scans/page.tsx`)
- [ ] Update tool count references
- [ ] Add to source type list if new type

### Tools Page (`src/app/docs/tools/page.tsx`)
- [ ] Add detailed tool description
- [ ] Document configuration options
- [ ] Add example findings

## 10. Static Content Updates

### Homepage (`src/app/page.tsx`)
- [ ] Tool shows in correct category (auto from registry)
- [ ] Credit cost displays correctly

### Pricing Page (`src/app/pricing/page.tsx`)
- [ ] Tool category shows in credit costs section
- [ ] Update tool count if significant

## 11. Docker Image Deployment

- [ ] Build Docker image:
```bash
docker build -t gcr.io/bugrit/my-tool:latest -f tools/my-tool/Dockerfile .
```

- [ ] Push to container registry:
```bash
docker push gcr.io/bugrit/my-tool:latest
```

- [ ] Test image locally:
```bash
docker run --rm gcr.io/bugrit/my-tool:latest --version
```

## 12. Testing

- [ ] Unit test for integration class output parsing
- [ ] Integration test with sample codebase
- [ ] Verify findings appear in scan results
- [ ] Verify credits are calculated correctly
- [ ] Verify AI report includes tool findings
- [ ] Test API endpoint returns tool in available list

## 13. Monitoring & Alerting

- [ ] Add tool to Cloud Build monitoring dashboard
- [ ] Configure timeout alerts
- [ ] Set up failure rate monitoring

## Quick Reference: File Locations

| Component | File Path |
|-----------|-----------|
| Tool Registry | `src/lib/tools/registry.ts` |
| Docker Config | `src/lib/deploy/cloud-build.ts` |
| Integration Class | `src/lib/integrations/cloud-build/index.ts` |
| Orchestrator | `src/lib/integrations/orchestrator.ts` |
| AI Intelligence | `src/lib/integrations/ai/index.ts` |
| Credit Billing | `src/lib/subscriptions/credits.ts` |
| API Types | `src/lib/api/types.ts` |
| Wizard Engine | `src/lib/wizard/recommendation-engine.ts` |
| Main Docs | `src/app/docs/page.tsx` |
| Pricing Docs | `src/app/docs/pricing/page.tsx` |
| API Docs | `src/app/docs/api-reference/scans/page.tsx` |
| Homepage | `src/app/page.tsx` |
| Pricing Page | `src/app/pricing/page.tsx` |

## Automated Verification Script

Run this to verify all required files are updated:

```bash
#!/bin/bash
TOOL_ID="my-tool"

echo "Checking tool deployment for: $TOOL_ID"

# Check registry
grep -q "id: '$TOOL_ID'" src/lib/tools/registry.ts && echo "✓ Registry" || echo "✗ Registry"

# Check Docker config
grep -q "'$TOOL_ID':" src/lib/deploy/cloud-build.ts && echo "✓ Docker config" || echo "✗ Docker config"

# Check integration metadata
grep -q "'$TOOL_ID':" src/lib/integrations/cloud-build/index.ts && echo "✓ Integration metadata" || echo "✗ Integration metadata"

# Check integration class export
grep -q "CloudBuild.*${TOOL_ID}.*Integration" src/lib/integrations/cloud-build/index.ts && echo "✓ Integration class" || echo "✗ Integration class"

# Check API types
grep -q "'$TOOL_ID'" src/lib/api/types.ts && echo "✓ API types" || echo "✗ API types"

echo "Done!"
```

## Notes

- Always coordinate credit pricing with product team
- New categories require updates to multiple files
- Docker images should be versioned for rollback capability
- Test with large repositories to verify timeout settings
