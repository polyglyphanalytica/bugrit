'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gradient?: boolean;
  glow?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hover = false, gradient = false, glow = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Clean white card
          'relative rounded-2xl',
          'bg-white dark:bg-gray-900',
          'border border-gray-100 dark:border-gray-800',
          'shadow-card',
          'transition-all duration-300',

          // Hover effect
          hover && [
            'hover:-translate-y-1',
            'hover:shadow-card-hover',
            'hover:border-gray-200 dark:hover:border-gray-700',
          ],

          // Gradient border
          gradient && [
            'before:absolute before:-inset-[1px] before:rounded-[inherit]',
            'before:bg-gradient-to-br before:from-orange-200/40 before:via-transparent before:to-orange-100/30',
            'before:-z-10',
          ],

          // Glow effect
          glow && 'hover:shadow-glow',

          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
