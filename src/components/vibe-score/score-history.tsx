'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ScoreHistoryProps {
  history: { date: Date; score: number }[];
  className?: string;
}

export function ScoreHistory({ history, className }: ScoreHistoryProps) {
  const { points, minScore, maxScore, avgScore } = useMemo(() => {
    if (history.length === 0) {
      return { points: '', minScore: 0, maxScore: 100, avgScore: 0 };
    }

    const scores = history.map((h) => h.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Normalize scores for SVG path (0-100 range, with padding)
    const padding = 10;
    const range = max - min || 1;

    const normalizedPoints = history.map((h, i) => {
      const x = (i / (history.length - 1)) * 100;
      const y = 100 - ((h.score - min) / range) * (100 - padding * 2) - padding;
      return `${x},${y}`;
    });

    return {
      points: normalizedPoints.join(' '),
      minScore: min,
      maxScore: max,
      avgScore: avg,
    };
  }, [history]);

  if (history.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        <p>No history yet. Scan regularly to track your progress!</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-slate-800/50 border border-slate-700 p-4', className)}>
      {/* Stats row */}
      <div className="flex justify-between mb-4 text-sm">
        <div>
          <span className="text-slate-400">Low: </span>
          <span className="text-white font-medium">{minScore}</span>
        </div>
        <div>
          <span className="text-slate-400">Avg: </span>
          <span className="text-white font-medium">{avgScore}</span>
        </div>
        <div>
          <span className="text-slate-400">High: </span>
          <span className="text-white font-medium">{maxScore}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-32">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#334155" strokeWidth="0.5" />

          {/* Area fill */}
          <polygon
            points={`0,100 ${points} 100,100`}
            fill="url(#gradient)"
            opacity="0.3"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots for each data point */}
          {history.map((h, i) => {
            const x = (i / (history.length - 1)) * 100;
            const range = maxScore - minScore || 1;
            const y = 100 - ((h.score - minScore) / range) * 80 - 10;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill="#a855f7"
                className="hover:r-3 transition-all"
              />
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Date labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500 -mb-5">
          <span>{formatShortDate(history[0].date)}</span>
          <span>{formatShortDate(history[history.length - 1].date)}</span>
        </div>
      </div>
    </div>
  );
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}
