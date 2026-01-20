'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  href?: string;
}

function BugIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bug body */}
      <ellipse cx="12" cy="14" rx="6" ry="7" />
      {/* Bug head */}
      <circle cx="12" cy="6" r="3" />
      {/* Antennae */}
      <path
        d="M10 4 L8 1 M14 4 L16 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Legs left */}
      <path
        d="M6 11 L2 9 M6 14 L2 14 M6 17 L2 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Legs right */}
      <path
        d="M18 11 L22 9 M18 14 L22 14 M18 17 L22 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Wing line */}
      <line x1="12" y1="8" x2="12" y2="20" stroke="hsl(var(--primary))" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

const sizes = {
  sm: {
    icon: 'w-6 h-6',
    container: 'w-7 h-7 rounded-md',
    text: 'text-lg',
    bugSize: 'w-4 h-4',
  },
  md: {
    icon: 'w-8 h-8',
    container: 'w-8 h-8 rounded-lg',
    text: 'text-xl',
    bugSize: 'w-5 h-5',
  },
  lg: {
    icon: 'w-12 h-12',
    container: 'w-12 h-12 rounded-xl',
    text: 'text-2xl',
    bugSize: 'w-7 h-7',
  },
};

export function Logo({ showText = true, size = 'md', className, href = '/' }: LogoProps) {
  const sizeConfig = sizes[size];

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'bg-gradient-to-br from-primary to-accent flex items-center justify-center',
          sizeConfig.container
        )}
      >
        <BugIcon className={cn('text-white', sizeConfig.bugSize)} />
      </div>
      {showText && <span className={cn('font-bold', sizeConfig.text)}>Bugrit</span>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export { BugIcon };
