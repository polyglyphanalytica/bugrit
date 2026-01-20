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
          // Base glass effect
          'relative rounded-3xl',
          'bg-white/80 dark:bg-slate-900/80',
          'backdrop-blur-xl',
          'border border-gray-200 dark:border-slate-700',
          'shadow-lg dark:shadow-2xl',
          'transition-all duration-300',

          // Hover effect
          hover && [
            'hover:-translate-y-1',
            'hover:shadow-xl dark:hover:shadow-2xl',
            'hover:border-gray-300 dark:hover:border-slate-600',
          ],

          // Gradient border
          gradient && [
            'before:absolute before:-inset-[1px] before:rounded-[inherit]',
            'before:bg-gradient-to-br before:from-primary/20 before:via-transparent before:to-accent/20',
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
