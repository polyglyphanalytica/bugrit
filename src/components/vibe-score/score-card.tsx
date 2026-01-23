'use client';

import { cn } from '@/lib/utils';
import type { VibeScore, VibeGrade } from '@/lib/vibe-score/types';

interface VibeScoreCardProps {
  score: number;
  grade: VibeGrade;
  components: VibeScore['components'];
  trend?: VibeScore['trend'];
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function VibeScoreCard({
  score,
  grade,
  components,
  trend,
  size = 'medium',
  className,
}: VibeScoreCardProps) {
  const gradeColor = getGradeColor(grade);

  return (
    <div
      className={cn(
        'rounded-2xl bg-slate-800/50 border border-slate-700 backdrop-blur-sm',
        size === 'small' && 'p-4',
        size === 'medium' && 'p-6',
        size === 'large' && 'p-8',
        className
      )}
    >
      {/* Main Score */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          {/* Circular progress background */}
          <svg
            className={cn(
              size === 'small' && 'w-24 h-24',
              size === 'medium' && 'w-32 h-32',
              size === 'large' && 'w-48 h-48'
            )}
            viewBox="0 0 100 100"
          >
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-700"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={gradeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${score * 2.83} 283`}
              transform="rotate(-90 50 50)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Score number in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                'font-bold text-white',
                size === 'small' && 'text-2xl',
                size === 'medium' && 'text-4xl',
                size === 'large' && 'text-6xl'
              )}
            >
              {score}
            </span>
            <span
              className={cn(
                'font-semibold',
                size === 'small' && 'text-sm',
                size === 'medium' && 'text-base',
                size === 'large' && 'text-xl'
              )}
              style={{ color: gradeColor }}
            >
              {grade}
            </span>
          </div>
        </div>
      </div>

      {/* Trend indicator */}
      {trend && trend.previousScore !== null && (
        <div className="flex items-center justify-center mb-6">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
              trend.direction === 'up' && 'bg-green-500/20 text-green-400',
              trend.direction === 'down' && 'bg-red-500/20 text-red-400',
              trend.direction === 'stable' && 'bg-slate-500/20 text-slate-400'
            )}
          >
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.direction === 'stable' && '→'}
            {trend.delta > 0 ? '+' : ''}
            {trend.delta} from last scan
          </span>
        </div>
      )}

      {/* Component scores */}
      <div className="grid grid-cols-2 gap-3">
        <ComponentScore label="Security" score={components.security} icon="🔒" />
        <ComponentScore label="Quality" score={components.quality} icon="✨" />
        <ComponentScore label="A11y" score={components.accessibility} icon="♿" />
        <ComponentScore label="Performance" score={components.performance} icon="⚡" />
        <ComponentScore label="Dependencies" score={components.dependencies} icon="📦" />
        <ComponentScore label="Docs" score={components.documentation} icon="📚" />
      </div>
    </div>
  );
}

function ComponentScore({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon: string;
}) {
  const color = getScoreColor(score);

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/30">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-xs font-medium text-white">{score}</span>
        </div>
        <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function getGradeColor(grade: VibeGrade): string {
  if (grade.startsWith('A')) return '#4ade80'; // Green
  if (grade.startsWith('B')) return '#a3e635'; // Lime
  if (grade.startsWith('C')) return '#facc15'; // Yellow
  if (grade === 'D') return '#fb923c'; // Orange
  return '#f87171'; // Red
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#4ade80'; // Green
  if (score >= 80) return '#a3e635'; // Lime
  if (score >= 70) return '#facc15'; // Yellow
  if (score >= 60) return '#fb923c'; // Orange
  return '#f87171'; // Red
}
