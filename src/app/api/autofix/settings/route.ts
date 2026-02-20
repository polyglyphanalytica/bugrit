/**
 * Autofix Settings API
 *
 * GET  /api/autofix/settings — Get current autofix settings
 * PUT  /api/autofix/settings — Update autofix settings (including auto-run toggle)
 *
 * Enterprise tier only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { getAutofixSettings, updateAutofixSettings } from '@/lib/autofix/engine';
import { requireEnterpriseTier } from '@/lib/autofix/gate';
import { AI_PROVIDERS, AIProviderID } from '@/lib/autofix/types';
import { checkAutofixRateLimit } from '@/lib/autofix/rate-limit';
import { logger } from '@/lib/logger';

const VALID_PROVIDERS = new Set(Object.keys(AI_PROVIDERS));
const VALID_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const gateResult = await requireEnterpriseTier(userId);
    if (gateResult) return gateResult;

    const rl = checkAutofixRateLimit(userId, 'settings');
    if (rl) return rl;

    const settings = await getAutofixSettings(userId);

    return NextResponse.json({
      settings,
      providers: AI_PROVIDERS,
    });
  } catch (error) {
    logger.error('Autofix settings GET failed', { error });
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const gateResult = await requireEnterpriseTier(userId);
    if (gateResult) return gateResult;

    const rl = checkAutofixRateLimit(userId, 'settings');
    if (rl) return rl;

    const body = await request.json();

    // Validate provider if specified
    if (body.provider) {
      if (!VALID_PROVIDERS.has(body.provider.providerId)) {
        return NextResponse.json({ error: `Invalid provider: ${body.provider.providerId}` }, { status: 400 });
      }
      const providerConfig = AI_PROVIDERS[body.provider.providerId as AIProviderID];
      if (!providerConfig.models.includes(body.provider.model)) {
        return NextResponse.json({ error: `Invalid model: ${body.provider.model}` }, { status: 400 });
      }
      if (!body.provider.keyId) {
        return NextResponse.json({ error: 'Provider requires a keyId' }, { status: 400 });
      }
      // Validate auth method (default: api_key for backwards compat)
      const authMethod = body.provider.authMethod || 'api_key';
      if (authMethod !== 'api_key' && authMethod !== 'oauth_token') {
        return NextResponse.json({ error: 'authMethod must be "api_key" or "oauth_token"' }, { status: 400 });
      }
      body.provider.authMethod = authMethod;
    }

    // Validate github settings if specified
    if (body.github) {
      if (body.github.minSeverity && !VALID_SEVERITIES.has(body.github.minSeverity)) {
        return NextResponse.json({ error: `Invalid severity: ${body.github.minSeverity}` }, { status: 400 });
      }
      if (body.github.maxFindings !== undefined) {
        const max = Number(body.github.maxFindings);
        if (isNaN(max) || max < 1 || max > 100) {
          return NextResponse.json({ error: 'maxFindings must be between 1 and 100' }, { status: 400 });
        }
        body.github.maxFindings = max;
      }
      if (body.github.branchPrefix) {
        // Sanitize branch prefix
        body.github.branchPrefix = body.github.branchPrefix
          .replace(/[^a-zA-Z0-9/_-]/g, '')
          .substring(0, 50);
      }
    }

    const settings = await updateAutofixSettings(userId, {
      enabled: body.enabled,
      autoRun: body.autoRun,
      provider: body.provider,
      github: body.github,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    logger.error('Autofix settings PUT failed', { error });
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
