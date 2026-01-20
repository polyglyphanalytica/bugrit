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
        <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 mb-6 animate-fade-up">
          {badge}
        </div>
      )}
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-up delay-100 fill-both">
        {titleGradient ? (
          <>
            {title.split(titleGradient)[0]}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {titleGradient}
            </span>
            {title.split(titleGradient)[1]}
          </>
        ) : (
          title
        )}
      </h2>
      {description && (
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-up delay-200 fill-both">
          {description}
        </p>
      )}
    </div>
  );
}
