/**
 * Trust Badge Types
 *
 * Embeddable badge system for websites scanned by Bugrit.
 */

export interface TrustBadgeConfig {
  siteId: string;
  domain: string;
  size: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
  position?: 'inline' | 'fixed-bottom-right' | 'fixed-bottom-left';
}

export interface RegisteredSite {
  id: string;
  domain: string;
  verifiedAt: Date | null;
  ownerId: string;

  // Site metadata (editable by owner)
  metadata: {
    siteName: string;
    description: string;
    logoUrl?: string;
    category: SiteCategory;
    contactEmail?: string;
    privacyPolicyUrl?: string;
  };

  // Latest scan info
  latestScan: {
    scanId: string;
    vibeScore: number;
    grade: string;
    scannedAt: Date;
    findingsSummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  } | null;

  // Badge settings
  badgeConfig: {
    enabled: boolean;
    allowedDomains: string[]; // Domains where badge can be embedded
    size: 'small' | 'medium' | 'large';
    theme: 'light' | 'dark' | 'auto';
  };

  // Stats
  stats: {
    badgeViews: number;
    badgeClicks: number;
    verificationPageViews: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

export type SiteCategory =
  | 'ecommerce'
  | 'saas'
  | 'blog'
  | 'portfolio'
  | 'nonprofit'
  | 'education'
  | 'healthcare'
  | 'finance'
  | 'government'
  | 'other';

export const SITE_CATEGORY_LABELS: Record<SiteCategory, string> = {
  ecommerce: 'E-Commerce',
  saas: 'SaaS / Web App',
  blog: 'Blog / Content',
  portfolio: 'Portfolio',
  nonprofit: 'Non-Profit',
  education: 'Education',
  healthcare: 'Healthcare',
  finance: 'Finance',
  government: 'Government',
  other: 'Other',
};

export const BADGE_SIZES = {
  small: { width: 120, height: 40 },
  medium: { width: 160, height: 52 },
  large: { width: 200, height: 64 },
} as const;

/**
 * Generate a verification token for domain ownership
 */
export function generateVerificationToken(domain: string, siteId: string): string {
  // In production, use proper HMAC signing
  const data = `${domain}:${siteId}:${Date.now()}`;
  return Buffer.from(data).toString('base64url');
}

/**
 * Generate the embed script for a site
 */
export function generateEmbedScript(siteId: string, config: Partial<TrustBadgeConfig>): string {
  const size = config.size || 'medium';
  const theme = config.theme || 'auto';
  const position = config.position || 'inline';

  return `<!-- Bugrit Trust Badge -->
<script>
(function() {
  var s = document.createElement('script');
  s.src = 'https://bugrit.dev/badge/embed.js';
  s.async = true;
  s.dataset.siteId = '${siteId}';
  s.dataset.size = '${size}';
  s.dataset.theme = '${theme}';
  s.dataset.position = '${position}';
  document.head.appendChild(s);
})();
</script>
<!-- End Bugrit Trust Badge -->`;
}

/**
 * Generate AI-friendly prompt for embedding the badge
 */
export function generateAIPrompt(siteId: string, domain: string): string {
  return `Add the Bugrit Trust Badge to my website.

Site ID: ${siteId}
Domain: ${domain}

Instructions:
1. Add this script tag just before </body>:

<script src="https://bugrit.dev/badge/embed.js"
  data-site-id="${siteId}"
  data-size="medium"
  data-theme="auto"
  async></script>

2. Optionally, add a container where you want the badge to appear:
<div id="bugrit-badge"></div>

3. If no container is found, the badge will appear as a fixed widget in the bottom-right corner.

Available options:
- data-size: "small" | "medium" | "large"
- data-theme: "light" | "dark" | "auto"
- data-position: "inline" | "fixed-bottom-right" | "fixed-bottom-left"

The badge will automatically display our current Vibe Score and link to our verification page on Bugrit.`;
}
