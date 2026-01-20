'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  href?: string;
}

function BugritIcon({ className, id = 'logo' }: { className?: string; id?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-label="Bugrit logo"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* Background rounded square */}
      <rect x="1" y="1" width="30" height="30" rx="8" fill={`url(#${id}-bg)`} />
      {/* Bug body - oval */}
      <ellipse cx="16" cy="18" rx="7" ry="8" fill="white" />
      {/* Bug head */}
      <circle cx="16" cy="9" r="4" fill="white" />
      {/* Bug shell line (center) */}
      <line x1="16" y1="11" x2="16" y2="25" stroke={`url(#${id}-bg)`} strokeWidth="1.5" strokeLinecap="round" />
      {/* Bug shell lines (horizontal segments) */}
      <line x1="10" y1="15" x2="22" y2="15" stroke={`url(#${id}-bg)`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="19" x2="22.5" y2="19" stroke={`url(#${id}-bg)`} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10.5" y1="23" x2="21.5" y2="23" stroke={`url(#${id}-bg)`} strokeWidth="1.5" strokeLinecap="round" />
      {/* Bug antennae */}
      <line x1="14" y1="6" x2="11" y2="2" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="6" x2="21" y2="2" stroke="white" strokeWidth="2" strokeLinecap="round" />
      {/* Antenna tips */}
      <circle cx="10.5" cy="1.5" r="1.5" fill="white" />
      <circle cx="21.5" cy="1.5" r="1.5" fill="white" />
      {/* Bug eyes */}
      <circle cx="14" cy="8.5" r="1.2" fill={`url(#${id}-bg)`} />
      <circle cx="18" cy="8.5" r="1.2" fill={`url(#${id}-bg)`} />
      {/* Bug legs */}
      <line x1="9" y1="14" x2="5" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="18" x2="4" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="22" x2="5" y2="25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="23" y1="14" x2="27" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="23" y1="18" x2="28" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="23" y1="22" x2="27" y2="25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const sizes = {
  sm: {
    icon: 'w-7 h-7',
    text: 'text-lg',
  },
  md: {
    icon: 'w-9 h-9',
    text: 'text-xl',
  },
  lg: {
    icon: 'w-12 h-12',
    text: 'text-2xl',
  },
};

export function Logo({ showText = true, size = 'md', className, href = '/' }: LogoProps) {
  const sizeConfig = sizes[size];

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BugritIcon className={cn(sizeConfig.icon, 'flex-shrink-0')} />
      {showText && (
        <span
          className={cn(
            'font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent',
            sizeConfig.text
          )}
        >
          Bugrit
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export { BugritIcon };
