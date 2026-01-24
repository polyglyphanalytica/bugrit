'use client';

import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  /** Type of loading indicator to show */
  variant?: 'spinner' | 'skeleton' | 'dots';
  /** Size of the loading indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Optional text to display below the loader */
  text?: string;
  /** Additional CSS classes */
  className?: string;
  /** Number of skeleton rows to show (for skeleton variant) */
  rows?: number;
}

/**
 * A flexible loading state component
 */
export function LoadingState({
  variant = 'spinner',
  size = 'md',
  text,
  className,
  rows = 3,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('w-full', {
              'h-4': size === 'sm',
              'h-6': size === 'md',
              'h-8': size === 'lg',
            })}
            style={{ width: `${100 - i * 10}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                'rounded-full bg-primary animate-bounce',
                {
                  'h-2 w-2': size === 'sm',
                  'h-3 w-3': size === 'md',
                  'h-4 w-4': size === 'lg',
                }
              )}
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        {text && (
          <p className={cn('text-muted-foreground', textSizes[size])}>{text}</p>
        )}
      </div>
    );
  }

  // Default: spinner
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className={cn('text-muted-foreground', textSizes[size])}>{text}</p>
      )}
    </div>
  );
}

/**
 * Full page loading state
 */
export function PageLoadingState({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <LoadingState size="lg" text={text} />
    </div>
  );
}

/**
 * Card loading skeleton
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 space-y-4', className)}>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/**
 * Table loading skeleton
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
