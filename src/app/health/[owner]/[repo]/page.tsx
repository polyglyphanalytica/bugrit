import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VibeScoreCard } from '@/components/vibe-score/score-card';
import { BadgeShowcase } from '@/components/vibe-score/badge-showcase';
import { ScoreHistory } from '@/components/vibe-score/score-history';
import { EmbedCode } from '@/components/vibe-score/embed-code';
import { getDb } from '@/lib/firestore';

/**
 * Public Repo Health Profile Page
 *
 * Shows the public health status of a repository including:
 * - Current Vibe Score
 * - Badges earned
 * - Score history trend
 * - Embeddable badge code
 */

interface PageProps {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params;
  const profile = await getRepoProfile(owner, repo);

  const score = profile?.vibeScore?.overall ?? 0;
  const grade = profile?.vibeScore?.grade ?? 'N/A';

  return {
    title: `${owner}/${repo} - Vibe Score | Bugrit`,
    description: `Code health profile for ${owner}/${repo}. Vibe Score: ${score}/100 (${grade})`,
    openGraph: {
      title: `${owner}/${repo} Vibe Score: ${score}`,
      description: `This repository has a Vibe Score of ${score}/100 (${grade}). See security, quality, and accessibility status.`,
      images: [
        {
          url: `https://bugrit.dev/api/og/${owner}/${repo}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${owner}/${repo} Vibe Score: ${score}`,
      description: `Code health profile with security, quality, and accessibility status.`,
    },
  };
}

export default async function RepoHealthPage({ params }: PageProps) {
  const { owner, repo } = await params;

  // TODO: Fetch actual profile data
  const profile = await getRepoProfile(owner, repo);

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">
            {owner}/{repo}
          </h1>
          <p className="text-slate-400">
            Last scanned {formatRelativeTime(profile.lastScanAt)}
          </p>
        </header>

        {/* Main Score Card */}
        <div className="mb-12">
          <VibeScoreCard
            score={profile.vibeScore.overall}
            grade={profile.vibeScore.grade}
            components={profile.vibeScore.components}
            trend={profile.vibeScore.trend}
            size="large"
          />
        </div>

        {/* Badges Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            Badges Earned
          </h2>
          <BadgeShowcase badges={profile.badges} />
        </section>

        {/* Score History */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            Score History (30 days)
          </h2>
          <ScoreHistory history={profile.scoreHistory} />
        </section>

        {/* Embed Code */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">
            Add to Your README
          </h2>
          <EmbedCode owner={owner} repo={repo} />
        </section>

        {/* Footer */}
        <footer className="text-center text-slate-500 text-sm">
          <p>
            Powered by <a href="https://bugrit.dev" className="text-purple-400 hover:underline">Bugrit</a>
            {' '}- 150 modules for code health
          </p>
        </footer>
      </div>
    </div>
  );
}

async function getRepoProfile(owner: string, repo: string) {
  const db = getDb();
  if (!db) return null;

  try {
    // Look up by owner/repo combination
    const snapshot = await db.collection('projects')
      .where('owner', '==', owner)
      .where('repo', '==', repo)
      .where('isPublic', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      repoUrl: data.repoUrl || `https://github.com/${owner}/${repo}`,
      repoName: repo,
      owner,
      vibeScore: data.vibeScore || {
        overall: 0,
        grade: 'N/A',
        components: { security: 0, quality: 0, accessibility: 0, performance: 0, dependencies: 0, documentation: 0 },
        trend: { direction: 'stable', delta: 0, previousScore: null },
        percentile: 0,
        breakdown: { deductions: [], bonuses: [], maxScore: 100, rawScore: 0 },
      },
      lastScanAt: data.lastScanAt?.toDate?.() || new Date(data.lastScanAt || Date.now()),
      badges: (data.badges || []).map((b: any) => ({
        ...b,
        earnedAt: b.earnedAt?.toDate?.() || new Date(b.earnedAt || Date.now()),
      })),
      scoreHistory: (data.scoreHistory || []).map((h: any) => ({
        date: h.date?.toDate?.() || new Date(h.date || Date.now()),
        score: h.score || 0,
      })),
      isPublic: data.isPublic ?? true,
      showBadges: data.showBadges ?? true,
      showScore: data.showScore ?? true,
      showTrend: data.showTrend ?? true,
      badgeUrl: `https://bugrit.dev/api/badge/${owner}/${repo}`,
    };
  } catch (error) {
    console.error('Failed to fetch repo profile:', error);
    return null;
  }
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}
