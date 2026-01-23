import { NextRequest, NextResponse } from 'next/server';
import type { SiteCategory } from '@/lib/trust-badge/types';

/**
 * Trust Badge Sites API
 *
 * Register and manage sites for trust badge display.
 * Can be used by AI agents to programmatically register sites.
 */

// GET - List user's registered sites
export async function GET(request: NextRequest) {
  // TODO: Get user from auth
  const userId = request.headers.get('x-user-id') || 'demo-user';

  try {
    const sites = await getUserSites(userId);

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
    console.error('[TrustBadge] List sites error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list sites' },
      { status: 500 }
    );
  }
}

// POST - Register a new site
export async function POST(request: NextRequest) {
  // TODO: Get user from auth
  const userId = request.headers.get('x-user-id') || 'demo-user';

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
    const existingSite = await getSiteByDomain(domain);
    if (existingSite) {
      return NextResponse.json(
        { success: false, error: 'Domain is already registered' },
        { status: 409 }
      );
    }

    // Register the site
    const site = await registerSite(domain, userId, {
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
    console.error('[TrustBadge] Register site error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register site' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Helper functions (TODO: Import from store once available)
// ═══════════════════════════════════════════════════════════════

interface Site {
  id: string;
  domain: string;
  verifiedAt: Date | null;
  metadata: {
    siteName: string;
    description: string;
    category: string;
  };
  latestScan: {
    vibeScore: number;
    grade: string;
    scannedAt: Date;
  } | null;
  badgeConfig: {
    enabled: boolean;
  };
  stats: {
    badgeViews: number;
    badgeClicks: number;
    verificationPageViews: number;
  };
}

async function getUserSites(userId: string): Promise<Site[]> {
  // TODO: Implement actual database query
  return [
    {
      id: 'site_demo123',
      domain: 'example.com',
      verifiedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      metadata: {
        siteName: 'Example Site',
        description: 'A demo website',
        category: 'saas',
      },
      latestScan: {
        vibeScore: 87,
        grade: 'B+',
        scannedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      badgeConfig: {
        enabled: true,
      },
      stats: {
        badgeViews: 1234,
        badgeClicks: 56,
        verificationPageViews: 89,
      },
    },
  ];
}

async function getSiteByDomain(domain: string): Promise<Site | null> {
  // TODO: Implement actual database query
  return null;
}

async function registerSite(
  domain: string,
  userId: string,
  metadata: {
    siteName: string;
    description?: string;
    category: SiteCategory;
    contactEmail?: string;
    privacyPolicyUrl?: string;
  }
): Promise<Site> {
  // TODO: Implement actual database insert
  const siteId = `site_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id: siteId,
    domain: domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, ''),
    verifiedAt: null,
    metadata: {
      siteName: metadata.siteName,
      description: metadata.description || '',
      category: metadata.category,
    },
    latestScan: null,
    badgeConfig: {
      enabled: true,
    },
    stats: {
      badgeViews: 0,
      badgeClicks: 0,
      verificationPageViews: 0,
    },
  };
}

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
