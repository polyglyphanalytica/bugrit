'use client';

import { cn } from '@/lib/utils';
import type { Badge } from '@/lib/vibe-score/types';

interface BadgeShowcaseProps {
  badges: Badge[];
  maxDisplay?: number;
  className?: string;
}

export function BadgeShowcase({
  badges,
  maxDisplay = 12,
  className,
}: BadgeShowcaseProps) {
  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  if (badges.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        <p className="text-4xl mb-2">🎯</p>
        <p>No badges earned yet. Complete a scan to start earning badges!</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4', className)}>
      {displayBadges.map((badge) => (
        <BadgeCard key={badge.id} badge={badge} />
      ))}
      {remainingCount > 0 && (
        <div className="flex items-center justify-center p-4 rounded-xl bg-slate-700/30 border border-slate-600">
          <span className="text-slate-400 text-sm">+{remainingCount} more</span>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  const tierColors = {
    bronze: 'from-amber-700 to-amber-900 border-amber-600',
    silver: 'from-slate-400 to-slate-600 border-slate-400',
    gold: 'from-yellow-500 to-amber-600 border-yellow-400',
    platinum: 'from-purple-500 to-indigo-600 border-purple-400',
  };

  const isEarned = badge.earnedAt !== null;

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center p-4 rounded-xl transition-all duration-200',
        isEarned
          ? `bg-gradient-to-br ${tierColors[badge.tier]} border-2`
          : 'bg-slate-800/50 border border-slate-700 opacity-50'
      )}
    >
      {/* Badge icon */}
      <span className="text-3xl mb-2">{badge.icon}</span>

      {/* Badge name */}
      <span className="text-xs font-medium text-white text-center leading-tight">
        {badge.name}
      </span>

      {/* Tier indicator */}
      <span
        className={cn(
          'mt-1 text-[10px] uppercase tracking-wide',
          badge.tier === 'platinum' && 'text-purple-300',
          badge.tier === 'gold' && 'text-yellow-300',
          badge.tier === 'silver' && 'text-slate-300',
          badge.tier === 'bronze' && 'text-amber-400'
        )}
      >
        {badge.tier}
      </span>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
        <p className="text-sm text-white font-medium">{badge.name}</p>
        <p className="text-xs text-slate-400">{badge.description}</p>
        {badge.earnedAt && (
          <p className="text-xs text-slate-500 mt-1">
            Earned {formatDate(badge.earnedAt)}
          </p>
        )}
      </div>

      {/* Progress indicator for unearned badges */}
      {!isEarned && badge.progress && (
        <div className="w-full mt-2">
          <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-400 rounded-full"
              style={{
                width: `${(badge.progress.current / badge.progress.target) * 100}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-1">
            {badge.progress.current}/{badge.progress.target}
          </p>
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Inline badge list for compact display
 */
export function BadgeList({ badges }: { badges: Badge[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.id}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/50 text-sm"
          title={badge.description}
        >
          <span>{badge.icon}</span>
          <span className="text-white">{badge.name}</span>
        </span>
      ))}
    </div>
  );
}
