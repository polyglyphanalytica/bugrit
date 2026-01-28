import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { VibeScoreCard } from '@/components/vibe-score/score-card';
import type { VibeScore } from '@/lib/vibe-score/types';
import { getDb } from '@/lib/firestore';

/**
 * Verification Landing Page
 *
 * Shown when visitors click the trust badge on a website.
 * Includes:
 * - Site metadata and verification status
 * - High-level scan report
 * - Sales pitch for Bugrit
 * - CTA to scan your own website
 */

interface PageProps {
  params: Promise<{
    siteId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getVerifiedSite(siteId);

  if (!site) {
    return { title: 'Site Not Found - Bugrit' };
  }

  return {
    title: `${site.metadata.siteName} - Verified by Bugrit`,
    description: `${site.metadata.siteName} has been scanned for security and quality. Vibe Score: ${site.latestScan?.vibeScore || 'N/A'}/100`,
    openGraph: {
      title: `${site.metadata.siteName} is Verified by Bugrit`,
      description: `This website has been scanned with 150 security and quality modules. Current Vibe Score: ${site.latestScan?.vibeScore || 'N/A'}/100`,
      images: [`https://bugrit.dev/api/og/verified/${siteId}`],
    },
  };
}

export default async function VerifiedSitePage({ params }: PageProps) {
  const { siteId } = await params;
  const site = await getVerifiedSite(siteId);

  if (!site) {
    notFound();
  }

  // Track page view (async)
  trackVerificationPageView(siteId).catch(console.error);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950">
      {/* Hero Section */}
      <header className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-white">
              Bugrit
            </Link>
            <Link
              href="/scan"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
            >
              Scan Your Site
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Verification Badge */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-sm font-medium mb-6">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7V12C3 17.5 7.5 21.5 12 23C16.5 21.5 21 17.5 21 12V7L12 2Z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M9 12L11 14L15 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Verified by Bugrit
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            {site.metadata.siteName}
          </h1>
          <p className="text-xl text-slate-400">
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-400 transition-colors"
            >
              {site.domain}
            </a>
          </p>
        </div>

        {/* Vibe Score Card */}
        {site.latestScan && (
          <div className="mb-12">
            <VibeScoreCard
              score={site.latestScan.vibeScore}
              grade={site.latestScan.grade as VibeScore['grade']}
              components={site.latestScan.components}
              trend={site.latestScan.trend}
              size="large"
            />
          </div>
        )}

        {/* Scan Summary */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Scan Summary</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              label="Last Scanned"
              value={formatRelativeTime(site.latestScan?.scannedAt || new Date())}
              icon="📅"
            />
            <SummaryCard
              label="Tools Used"
              value="118"
              icon="🔧"
            />
            <SummaryCard
              label="Critical Issues"
              value={site.latestScan?.findingsSummary.critical.toString() || '0'}
              icon="🔴"
              highlight={site.latestScan?.findingsSummary.critical === 0 ? 'green' : 'red'}
            />
            <SummaryCard
              label="Category"
              value={site.metadata.category}
              icon="🏷️"
            />
          </div>

          {/* What was checked */}
          <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">What We Checked</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: '🔒', label: 'Security Vulnerabilities', description: 'SQL injection, XSS, secrets' },
                { icon: '♿', label: 'Accessibility', description: 'WCAG 2.1 compliance' },
                { icon: '⚡', label: 'Performance', description: 'Load times, bundle size' },
                { icon: '📦', label: 'Dependencies', description: 'Outdated/vulnerable packages' },
                { icon: '✨', label: 'Code Quality', description: 'Best practices, maintainability' },
                { icon: '📚', label: 'Documentation', description: 'README, code comments' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-sm text-slate-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About the Site */}
        {site.metadata.description && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">About This Site</h2>
            <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6">
              <p className="text-slate-300">{site.metadata.description}</p>
              {site.metadata.privacyPolicyUrl && (
                <a
                  href={site.metadata.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-purple-400 hover:text-purple-300"
                >
                  View Privacy Policy →
                </a>
              )}
            </div>
          </section>
        )}

        {/* Sales Pitch / CTA */}
        <section className="rounded-2xl bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/30 p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Want This Badge on Your Website?
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Show your visitors you take security and quality seriously.
            Bugrit scans your codebase with <strong>150 security and quality modules</strong>,
            gives you a Vibe Score, and provides a trust badge you can display.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <FeatureCard
              icon="🔍"
              title="118 Tools"
              description="Security, accessibility, performance, and quality scanners"
            />
            <FeatureCard
              icon="⚡"
              title="Ship It Mode"
              description="30-second scans for critical issues before you deploy"
            />
            <FeatureCard
              icon="🤖"
              title="AI-Powered Fixes"
              description="Get automated code fixes, not just reports"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/scan"
              className="px-8 py-4 bg-purple-600 text-white text-lg font-semibold rounded-xl hover:bg-purple-500 transition-colors"
            >
              Scan Your Website Free
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-slate-700 text-white text-lg font-semibold rounded-xl hover:bg-slate-600 transition-colors"
            >
              View Pricing
            </Link>
          </div>

          <p className="mt-6 text-slate-400 text-sm">
            Free tier includes 3 scans/month. No credit card required.
          </p>
        </section>

        {/* Trust indicators */}
        <section className="mt-12 text-center">
          <p className="text-slate-500 text-sm mb-4">Trusted by developers at</p>
          <div className="flex items-center justify-center gap-8 opacity-50">
            {['Vercel', 'Supabase', 'Clerk', 'Resend', 'Railway'].map((company) => (
              <span key={company} className="text-slate-400 font-semibold">
                {company}
              </span>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">
              © 2024 Bugrit. Secure code, ship confidently.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/docs" className="text-slate-400 hover:text-white text-sm">
                Docs
              </Link>
              <Link href="/privacy" className="text-slate-400 hover:text-white text-sm">
                Privacy
              </Link>
              <Link href="/terms" className="text-slate-400 hover:text-white text-sm">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════

function SummaryCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: string;
  highlight?: 'green' | 'red';
}) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p
        className={`text-xl font-bold ${
          highlight === 'green'
            ? 'text-green-400'
            : highlight === 'red'
            ? 'text-red-400'
            : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/30">
      <span className="text-3xl mb-3 block">{icon}</span>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Data fetching (TODO: Move to store)
// ═══════════════════════════════════════════════════════════════

interface VerifiedSite {
  id: string;
  domain: string;
  metadata: {
    siteName: string;
    description: string;
    category: string;
    privacyPolicyUrl?: string;
  };
  latestScan: {
    vibeScore: number;
    grade: string;
    scannedAt: Date;
    components: {
      security: number;
      quality: number;
      accessibility: number;
      performance: number;
      dependencies: number;
      documentation: number;
    };
    trend: {
      direction: 'up' | 'down' | 'stable';
      delta: number;
      previousScore: number | null;
    };
    findingsSummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  } | null;
}

async function getVerifiedSite(siteId: string): Promise<VerifiedSite | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const doc = await db.collection('trustBadgeSites').doc(siteId).get();
    if (!doc.exists) return null;

    const data = doc.data()!;
    return {
      id: doc.id,
      domain: data.domain,
      metadata: {
        siteName: data.siteName || data.domain,
        description: data.description || '',
        category: data.category || 'Website',
        privacyPolicyUrl: data.privacyPolicyUrl,
      },
      latestScan: data.latestScan ? {
        vibeScore: data.latestScan.vibeScore,
        grade: data.latestScan.grade,
        scannedAt: data.latestScan.scannedAt?.toDate?.() || new Date(data.latestScan.scannedAt),
        components: data.latestScan.components || {
          security: 0, quality: 0, accessibility: 0,
          performance: 0, dependencies: 0, documentation: 0,
        },
        trend: data.latestScan.trend || { direction: 'stable', delta: 0, previousScore: null },
        findingsSummary: data.latestScan.findingsSummary || { critical: 0, high: 0, medium: 0, low: 0 },
      } : null,
    };
  } catch (error) {
    console.error('Failed to fetch verified site:', error);
    return null;
  }
}

async function trackVerificationPageView(siteId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  try {
    await db.collection('trustBadgeSites').doc(siteId).update({
      pageViews: (await import('firebase-admin/firestore')).FieldValue.increment(1),
      lastViewedAt: new Date(),
    });
  } catch {
    // Non-critical — silently ignore tracking failures
  }
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}
