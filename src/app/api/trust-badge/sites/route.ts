import { NextRequest, NextResponse } from 'next/server';
import type { SiteCategory } from '@/lib/trust-badge/types';
import {
  registerSite as dbRegisterSite,
  getSitesByOwner,
  getSiteByDomain as dbGetSiteByDomain,
} from '@/lib/trust-badge/store';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

/**
 * Trust Badge Sites API
 *
 * Register and manage sites for trust badge display.
 * Can be used by AI agents to programmatically register sites.
 */

// GET - List user's registered sites
export async function GET(request: NextRequest) {
  // Authenticate user
  const authResult = requireAuthenticatedUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const userId = authResult;

  try {
    const sites = await getSitesByOwner(userId);

    return NextResponse.json({
      success: true,
      sites: sites.map((site) => ({
        id: site.id,
        domain: site.domain,
        siteName: site.metadata.siteName,
        vibeScore: site.latestScan?.vibeScore || null,
        grade: site.latestScan?.grade || null,
        lastScannedAt: site.latestScan?.scannedAt?.toISOString() || null,
        verified: site.verifiedAt !== null,
        badgeEnabled: site.badgeConfig.enabled,
        stats: site.stats,
      })),
    });
  } catch (error) {
    logger.error('[TrustBadge] List sites error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to list sites' },
      { status: 500 }
    );
  }
}

// POST - Register a new site
export async function POST(request: NextRequest) {
  // Authenticate user
  const authResult = requireAuthenticatedUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const userId = authResult;

  try {
    const body = await request.json();

    const { domain, siteName, description, category, contactEmail, privacyPolicyUrl } = body;

    // Validate required fields
    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain is required' },
        { status: 400 }
      );
    }

    if (!siteName) {
      return NextResponse.json(
        { success: false, error: 'Site name is required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories: SiteCategory[] = [
      'ecommerce', 'saas', 'blog', 'portfolio', 'nonprofit',
      'education', 'healthcare', 'finance', 'government', 'other',
    ];

    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Use one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if domain already registered
    const existingSite = await dbGetSiteByDomain(domain);
    if (existingSite) {
      return NextResponse.json(
        { success: false, error: 'Domain is already registered' },
        { status: 409 }
      );
    }

    // Register the site
    const site = await dbRegisterSite(domain, userId, {
      siteName,
      description,
      category: category || 'other',
      contactEmail,
      privacyPolicyUrl,
    });

    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        domain: site.domain,
        siteName: site.metadata.siteName,
      },
      // Include setup instructions
      setup: {
        embedScript: generateEmbedScript(site.id),
        verificationUrl: `https://bugrit.dev/verified/${site.id}`,
        configurationUrl: `https://bugrit.dev/dashboard/trust-badge`,
        aiPrompt: generateAIPrompt(site.id, site.domain),
      },
      nextSteps: [
        'Scan your website at https://bugrit.dev/scan',
        'Add the embed script to your website',
        'Verify domain ownership for full trust badge features',
      ],
    }, { status: 201 });
  } catch (error) {
    logger.error('[TrustBadge] Register site error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to register site' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

function generateEmbedScript(siteId: string): string {
  return `<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="medium"
  data-theme="auto"
  async></script>`;
}

function generateAIPrompt(siteId: string, domain: string): string {
  return `Add the Bugrit Trust Badge to ${domain}.

Add this script before </body>:

<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="medium"
  data-theme="auto"
  async></script>

This displays a security badge showing your site's Vibe Score.`;
}
