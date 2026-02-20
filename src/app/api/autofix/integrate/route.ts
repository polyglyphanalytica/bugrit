/**
 * Integration API
 *
 * POST /api/autofix/integrate — Generate Bugrit integration code and push to branch
 *
 * Uses the user's BYOK AI provider key to generate integration code,
 * then pushes it to a branch on their GitHub repo.
 *
 * SECURITY: Uses only the user's own BYOK keys — Bugrit platform keys
 * are never used for user-facing AI generation.
 *
 * Enterprise tier only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { requireEnterpriseTier } from '@/lib/autofix/gate';
import { getAutofixSettings } from '@/lib/autofix/engine';
import { getDecryptedKey } from '@/lib/autofix/keys';
import { getGitHubToken } from '@/lib/autofix/github';
import { generateAndPushIntegration } from '@/lib/autofix/integrations';
import { IntegrationTarget } from '@/lib/autofix/types';
import { checkAutofixRateLimit } from '@/lib/autofix/rate-limit';
import { logger } from '@/lib/logger';

const VALID_TARGETS: IntegrationTarget[] = [
  'ci_cd', 'pre_commit', 'api_client', 'webhook', 'monitoring', 'custom',
];

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    // Enterprise tier gate
    const gateResult = await requireEnterpriseTier(userId);
    if (gateResult) return gateResult;

    const rl = checkAutofixRateLimit(userId, 'integrate');
    if (rl) return rl;

    const body = await request.json();
    const { target, appId, repoOwner, repoName, language, framework, packageManager, customPrompt } = body;

    // Validate required fields
    if (!target || !appId || !repoOwner || !repoName || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: target, appId, repoOwner, repoName, language' },
        { status: 400 }
      );
    }

    if (!VALID_TARGETS.includes(target)) {
      return NextResponse.json(
        { error: `Invalid target. Must be one of: ${VALID_TARGETS.join(', ')}` },
        { status: 400 }
      );
    }

    if (target === 'custom' && !customPrompt) {
      return NextResponse.json(
        { error: 'customPrompt is required when target is "custom"' },
        { status: 400 }
      );
    }

    // Validate string lengths
    if (language.length > 50 || (framework && framework.length > 50)) {
      return NextResponse.json({ error: 'Invalid field length' }, { status: 400 });
    }

    // Load user's autofix settings (contains their AI provider config)
    const settings = await getAutofixSettings(userId);
    if (!settings.enabled || !settings.provider) {
      return NextResponse.json(
        { error: 'Autofix is not enabled or no AI provider configured. Set up in Settings > Autofix.' },
        { status: 400 }
      );
    }

    // Decrypt the user's own AI key/OAuth token (strict ownership check inside getDecryptedKey)
    const { credential, authMethod } = await getDecryptedKey(settings.provider.keyId, userId);

    // Get the user's GitHub token
    const githubToken = await getGitHubToken(userId);

    // Generate integration code and push to branch
    const result = await generateAndPushIntegration({
      userId,
      providerId: settings.provider.providerId,
      apiKey: credential,
      model: settings.provider.model,
      authMethod,
      request: {
        target,
        framework,
        language,
        packageManager,
        appId,
        repoOwner,
        repoName,
        customPrompt,
      },
      githubToken,
      branchPrefix: settings.github.branchPrefix.replace('autofix', 'integrate'),
      createPR: settings.github.createPR,
    });

    return NextResponse.json({
      message: `Integration generated and pushed to branch`,
      branch: result.branch,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      filesCreated: result.filesCreated,
      explanation: result.explanation,
    }, { status: 201 });
  } catch (error) {
    logger.error('Integration generation failed', { error });
    const message = error instanceof Error ? error.message : 'Failed to generate integration';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
