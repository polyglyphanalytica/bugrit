/**
 * Bugrit Integration Generator
 *
 * Uses the AI provider abstraction layer to generate full Bugrit
 * integration code for the user's app — CI/CD pipelines, pre-commit
 * hooks, API clients, webhook handlers, and monitoring setups.
 *
 * All generated files are pushed to a branch on the user's repo
 * via the same GitHub integration used for autofix.
 *
 * Enterprise tier only.
 */

import { AIProviderID, IntegrationRequest, IntegrationTarget, GeneratedIntegration } from './types';
import { generateFixWithProvider } from './providers';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// Integration Prompt Builders
// ═══════════════════════════════════════════════════════════════

const BUGRIT_API_DOCS = `
Bugrit API Reference (v1):
- Base URL: https://bugrit.com/api/v1
- Auth: Bearer token via API key (header: Authorization: Bearer <API_KEY>)

Endpoints:
  POST /api/v1/scans         — Start a scan (body: { projectId, platform, sourceType, repoUrl, branch })
  GET  /api/v1/scans/:id     — Get scan status and results
  GET  /api/v1/scans         — List scans for a project (query: ?projectId=xxx&limit=20)
  POST /api/v1/automations   — Create automation (body: { name, projectId, trigger, action, enabled })
  GET  /api/v1/automations   — List automations
  PATCH /api/v1/automations/:id — Update automation
  DELETE /api/v1/automations/:id — Delete automation
  GET  /api/v1/projects      — List projects
  POST /api/v1/projects      — Create project

Webhook payload (POST to your endpoint):
  {
    "event": "scan.completed" | "scan.failed",
    "scanId": "string",
    "projectId": "string",
    "status": "completed" | "failed",
    "summary": { "totalFindings": number, "errors": number, "warnings": number, "info": number },
    "reportUrl": "string",
    "timestamp": "ISO 8601 string"
  }
`.trim();

function buildIntegrationPrompt(req: IntegrationRequest): string {
  const targetDescriptions: Record<IntegrationTarget, string> = {
    ci_cd: 'CI/CD pipeline integration (GitHub Actions, GitLab CI, or similar)',
    pre_commit: 'Git pre-commit hook that runs Bugrit scan before each commit',
    api_client: 'API client library/wrapper for the Bugrit REST API',
    webhook: 'Webhook handler that receives and processes Bugrit scan result notifications',
    monitoring: 'Continuous monitoring setup that schedules and tracks Bugrit scans',
    custom: req.customPrompt || 'Custom Bugrit integration',
  };

  const frameworkContext = req.framework
    ? `The app uses the **${req.framework}** framework.`
    : '';

  const existingFilesList = req.existingFiles
    ? Array.from(req.existingFiles.entries())
        .map(([path, content]) => `### ${path}\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``)
        .join('\n\n')
    : '';

  return `You are a senior DevOps and integration engineer. Generate complete, production-ready code to integrate Bugrit (a security and code quality scanning platform) into a ${req.language} application.

## Integration Target
${targetDescriptions[req.target]}

## Repository
- Owner: ${req.repoOwner}
- Repo: ${req.repoName}
- Language: ${req.language}
${frameworkContext}
${req.packageManager ? `- Package manager: ${req.packageManager}` : ''}
- Bugrit App ID: ${req.appId}

## Bugrit API
${BUGRIT_API_DOCS}

${existingFilesList ? `## Existing Files (for context)\n${existingFilesList}` : ''}

## Instructions
Generate the integration as a JSON response with this exact structure:
{
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "full file content",
      "description": "what this file does"
    }
  ],
  "instructions": "Step-by-step setup instructions in markdown",
  "explanation": "One paragraph explaining what was generated"
}

Requirements:
1. Use environment variables for secrets (BUGRIT_API_KEY, BUGRIT_PROJECT_ID). Never hardcode them.
2. Include error handling and retries for API calls.
3. Follow ${req.language} best practices and idiomatic patterns.
4. Include comments explaining key sections.
5. Make files production-ready — no placeholder TODOs.
6. Return ONLY valid JSON, no markdown fences or extra text.`;
}

// ═══════════════════════════════════════════════════════════════
// Integration Generator
// ═══════════════════════════════════════════════════════════════

export async function generateIntegration(
  providerId: AIProviderID,
  apiKey: string,
  model: string,
  req: IntegrationRequest
): Promise<GeneratedIntegration> {
  const prompt = buildIntegrationPrompt(req);

  // Use the same provider abstraction but with a specialized request
  const result = await generateFixWithProvider(providerId, apiKey, model, {
    finding: {
      id: `integration-${req.target}`,
      tool: 'bugrit-integration',
      severity: 'info',
      title: `Generate Bugrit ${req.target} integration`,
      description: prompt,
    },
    fileContent: '',
    filePath: `integration-${req.target}.json`,
    language: 'json',
  });

  if (!result.success || !result.fixedContent) {
    throw new Error(result.error || 'Failed to generate integration code');
  }

  // Parse the JSON response from the AI
  try {
    // Strip markdown fences if AI wrapped response in them
    let jsonStr = result.fixedContent;
    jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

    const parsed = JSON.parse(jsonStr) as GeneratedIntegration;

    if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
      throw new Error('AI response missing files array');
    }

    // Validate each file has required fields
    for (const file of parsed.files) {
      if (!file.path || !file.content) {
        throw new Error(`Invalid file entry: missing path or content`);
      }
    }

    return parsed;
  } catch (parseError) {
    logger.error('Failed to parse integration response', { providerId, target: req.target, error: parseError });
    throw new Error('AI returned invalid integration format. Please try again.');
  }
}

/**
 * Generate integration and push to a branch on the user's repo.
 * Returns the branch name and optionally a PR URL.
 */
export async function generateAndPushIntegration(params: {
  userId: string;
  providerId: AIProviderID;
  apiKey: string;
  model: string;
  request: IntegrationRequest;
  githubToken: string;
  branchPrefix?: string;
  createPR?: boolean;
}): Promise<{
  branch: string;
  prUrl?: string;
  prNumber?: number;
  filesCreated: string[];
  explanation: string;
}> {
  const { userId, providerId, apiKey, model, request, githubToken, branchPrefix = 'bugrit/integrate', createPR = true } = params;

  // 1. Generate integration code via AI
  const integration = await generateIntegration(providerId, apiKey, model, request);

  // 2. Push to branch via GitHub API (reuse autofix github module)
  const { pushFixBranch, getRepoInfo } = await import('./github');

  const repoInfo = await getRepoInfo(githubToken, request.repoOwner, request.repoName);
  const branchName = `${branchPrefix}/${request.target}`;

  // Convert integration files to fix format for pushFixBranch
  const fixes = integration.files.map(f => ({
    findingId: `integration-${request.target}`,
    file: f.path,
    originalContent: '',
    fixedContent: f.content,
    explanation: f.description,
    confidence: 'high' as const,
  }));

  const result = await pushFixBranch({
    token: githubToken,
    owner: request.repoOwner,
    repo: request.repoName,
    baseBranch: repoInfo.defaultBranch,
    branchName,
    scanId: `integration-${request.target}-${Date.now()}`,
    fixes,
    createPR,
    prTitle: `Add Bugrit ${request.target} integration`,
    prBody: buildIntegrationPRBody(request, integration),
  });

  logger.info('Integration pushed to branch', {
    userId,
    target: request.target,
    branch: result.branch,
    files: integration.files.map(f => f.path),
  });

  return {
    branch: result.branch,
    prUrl: result.prUrl,
    prNumber: result.prNumber,
    filesCreated: integration.files.map(f => f.path),
    explanation: integration.explanation,
  };
}

function buildIntegrationPRBody(req: IntegrationRequest, integration: GeneratedIntegration): string {
  const fileList = integration.files
    .map(f => `- \`${f.path}\` — ${f.description}`)
    .join('\n');

  return `## Bugrit Integration: ${req.target}

${integration.explanation}

### Files Added
${fileList}

### Setup Instructions
${integration.instructions}

---
*Generated by [Bugrit](https://bugrit.com) Autofix — AI-powered integration assistant*`;
}
