'use client';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  badge?: string;
  title: string;
  titleGradient?: string;
  description?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function SectionHeading({
  badge,
  title,
  titleGradient,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' && 'mx-auto text-center',
        align === 'right' && 'ml-auto text-right',
        className
      )}
    >
      {badge && (
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200 mb-6 animate-fade-up">
          {badge}
        </div>
      )}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 animate-fade-up delay-100 fill-both text-foreground">
        {titleGradient ? (
          <>
            {title.split(titleGradient)[0]}
            <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
              {titleGradient}
            </span>
            {title.split(titleGradient)[1]}
          </>
        ) : (
          title
        )}
      </h2>
      {description && (
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed animate-fade-up delay-200 fill-both">
          {description}
        </p>
      )}
    </div>
  );
}
