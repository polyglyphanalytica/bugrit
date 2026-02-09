'use client';

import { Card, CardContent } from '@/components/ui/card';
import { usePlainEnglish } from '@/contexts/plain-english-context';
import { cn } from '@/lib/utils';
import {
  PartyPopper,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

interface ScanCelebrationProps {
  criticalCount: number;
  recommendedCount: number;
  optionalCount: number;
  wins: string[];
  previousScanStats?: {
    critical: number;
    recommended: number;
  };
  className?: string;
}

/**
 * ScanCelebration - Shows positive feedback and wins from the scan
 */
export function ScanCelebration({
  criticalCount,
  recommendedCount,
  optionalCount,
  wins,
  previousScanStats,
  className,
}: ScanCelebrationProps) {
  const { plainMode } = usePlainEnglish();
  const totalIssues = criticalCount + recommendedCount + optionalCount;

  // Determine the overall status and message
  const getStatus = () => {
    if (criticalCount === 0 && recommendedCount === 0) {
      return {
        type: 'excellent' as const,
        icon: <PartyPopper className="w-8 h-8" />,
        title: plainMode ? 'Your code looks great!' : 'Excellent!',
        message: 'No critical or recommended fixes needed. Just some optional improvements.',
        color: 'text-green-600',
        bg: 'bg-green-500/10 border-green-500/30',
      };
    }

    if (criticalCount === 0) {
      return {
        type: 'good' as const,
        icon: <ShieldCheck className="w-8 h-8" />,
        title: plainMode ? 'No urgent issues!' : 'Looking Good',
        message: 'No critical security issues found. Some improvements recommended.',
        color: 'text-blue-600',
        bg: 'bg-blue-500/10 border-blue-500/30',
      };
    }

    if (criticalCount <= 3) {
      return {
        type: 'attention' as const,
        icon: <AlertCircle className="w-8 h-8" />,
        title: plainMode ? `${criticalCount} things need your attention` : `${criticalCount} Critical Issues`,
        message: 'We found a few important issues to fix. The good news: they\'re fixable!',
        color: 'text-orange-600',
        bg: 'bg-orange-500/10 border-orange-500/30',
      };
    }

    return {
      type: 'action' as const,
      icon: <AlertCircle className="w-8 h-8" />,
      title: plainMode ? 'Some work needed here' : `${criticalCount} Critical Issues`,
      message: 'We found issues that need attention. Let\'s tackle them one by one.',
      color: 'text-red-600',
      bg: 'bg-red-500/10 border-red-500/30',
    };
  };

  const status = getStatus();

  // Calculate improvement if we have previous stats
  const improvement = previousScanStats
    ? {
        critical: previousScanStats.critical - criticalCount,
        recommended: previousScanStats.recommended - recommendedCount,
      }
    : null;

  return (
    <Card className={cn('overflow-hidden', status.bg, className)}>
      <CardContent className="py-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn('p-3 rounded-xl bg-background/50', status.color)}>
            {status.icon}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h2 className={cn('text-xl font-bold', status.color)}>{status.title}</h2>
            <p className="text-muted-foreground mt-1">{status.message}</p>

            {/* Wins */}
            {wins.length > 0 && (
              <div className="mt-4 space-y-1">
                {wins.map((win, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{win}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Improvement from last scan */}
            {improvement && (improvement.critical > 0 || improvement.recommended > 0) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>
                  {improvement.critical > 0 && `${improvement.critical} fewer critical issues`}
                  {improvement.critical > 0 && improvement.recommended > 0 && ' and '}
                  {improvement.recommended > 0 && `${improvement.recommended} fewer warnings`}
                  {' since your last scan!'}
                </span>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="text-right text-sm">
            <div className="text-muted-foreground">Total issues</div>
            <div className="text-2xl font-bold">{totalIssues}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * FirstScanCelebration - Special message for first-time users
 */
export function FirstScanCelebration({ className }: { className?: string }) {
  return (
    <Card className={cn('bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30', className)}>
      <CardContent className="py-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/20">
            <PartyPopper className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Welcome to Bugrit!</h2>
            <p className="text-muted-foreground mt-1">
              You just ran your first scan. We checked your code against 100+ security and quality tools.
              Now let&apos;s see what we found and make your app even better.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * NoIssuesFound - Celebrate a clean scan
 */
export function NoIssuesFound({ className }: { className?: string }) {
  return (
    <Card className={cn('bg-green-500/10 border-green-500/30', className)}>
      <CardContent className="py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <PartyPopper className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">All Clear!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your code passed all our checks. No security issues, no critical bugs, no accessibility problems.
          You&apos;re ready to ship!
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-600 font-medium">
            All tools ran successfully
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
