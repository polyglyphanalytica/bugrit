'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
}

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant = 'primary', size = 'md', glow = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'relative inline-flex items-center justify-center font-medium transition-all duration-300 ease-out',
          'rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none',

          // Variant styles
          variant === 'primary' && [
            'bg-gradient-to-r from-primary to-accent text-white',
            'hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5',
            'active:translate-y-0',
          ],
          variant === 'secondary' && [
            'bg-secondary text-secondary-foreground',
            'hover:bg-secondary/80',
          ],
          variant === 'outline' && [
            'border-2 border-primary/30 bg-transparent text-foreground',
            'hover:border-primary hover:bg-primary hover:text-white',
          ],
          variant === 'ghost' && [
            'bg-transparent text-foreground',
            'hover:bg-primary/10 hover:text-primary',
          ],

          // Size styles
          size === 'sm' && 'px-4 py-2 text-sm gap-1.5',
          size === 'md' && 'px-6 py-3 text-sm gap-2',
          size === 'lg' && 'px-8 py-4 text-base gap-2',
          size === 'xl' && 'px-10 py-5 text-lg gap-3',

          // Glow effect
          glow && variant === 'primary' && 'shadow-glow hover:shadow-glow-lg',

          className
        )}
        {...props}
      >
        {/* Shimmer effect on hover */}
        {variant === 'primary' && (
          <span className="absolute inset-0 rounded-xl overflow-hidden">
            <span className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </span>
        )}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </button>
    );
  }
);

GradientButton.displayName = 'GradientButton';
