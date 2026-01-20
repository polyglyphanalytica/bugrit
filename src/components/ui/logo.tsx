'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LogoProps {
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  href?: string;
}

function BugritIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-label="Bugrit logo"
    >
      <defs>
        <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="16" cy="16" r="15" fill="url(#logo-bg)" />
      {/* Bug icon - stylized B that looks like a bug */}
      <path
        d="M10 8h8c2.2 0 4 1.8 4 4v0c0 1.5-.8 2.8-2 3.5c1.2.7 2 2 2 3.5v0c0 2.2-1.8 4-4 4h-8v-15z M13 11v3h5c.6 0 1-.4 1-1v-1c0-.6-.4-1-1-1h-5z M13 17v3h5c.6 0 1-.4 1-1v-1c0-.6-.4-1-1-1h-5z"
        fill="white"
      />
      {/* Bug antennae */}
      <circle cx="11" cy="6" r="1.5" fill="white" />
      <circle cx="17" cy="5" r="1.5" fill="white" />
      <line
        x1="11"
        y1="6"
        x2="12"
        y2="9"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="5"
        x2="15"
        y2="9"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
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
