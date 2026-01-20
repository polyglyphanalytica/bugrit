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
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Scanning rings / radar effect */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 2"
        opacity="0.3"
      />
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.5"
      />

      {/* Crosshairs */}
      <line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="16" y1="24" x2="16" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="2" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <line x1="24" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

      {/* Stylized bug - geometric/modern */}
      {/* Bug body - shield-like shape */}
      <path
        d="M16 9 L21 13 L21 19 C21 22 19 24 16 25 C13 24 11 22 11 19 L11 13 L16 9Z"
        fill="currentColor"
      />

      {/* Bug head */}
      <circle cx="16" cy="11" r="2.5" fill="currentColor" />

      {/* Antennae - alert style */}
      <path
        d="M14 9 L12 6 M18 9 L20 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Alert dots on antennae */}
      <circle cx="12" cy="5.5" r="1" fill="currentColor" />
      <circle cx="20" cy="5.5" r="1" fill="currentColor" />

      {/* Legs - simplified, angular */}
      <path
        d="M11 14 L8 12 M11 17 L7 17 M11 20 L8 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M21 14 L24 12 M21 17 L25 17 M21 20 L24 22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Detection highlight on bug body */}
      <path
        d="M14 15 L16 14 L18 15 L18 18 L16 20 L14 18 Z"
        fill="hsl(var(--primary-foreground))"
        opacity="0.3"
      />
    </svg>
  );
}

// Alternative minimal bug icon for very small sizes
function BugritIconMinimal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 2"
        opacity="0.4"
      />

      {/* Bug body - shield shape */}
      <path
        d="M12 6 L16 9 L16 14 C16 16.5 14.5 18 12 19 C9.5 18 8 16.5 8 14 L8 9 L12 6Z"
        fill="currentColor"
      />

      {/* Bug head */}
      <circle cx="12" cy="7.5" r="2" fill="currentColor" />

      {/* Antennae */}
      <path
        d="M10.5 6 L9 4 M13.5 6 L15 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Legs */}
      <path
        d="M8 10 L5.5 8.5 M8 12.5 L5 12.5 M8 15 L5.5 16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 10 L18.5 8.5 M16 12.5 L19 12.5 M16 15 L18.5 16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const sizes = {
  sm: {
    container: 'w-7 h-7 rounded-lg',
    text: 'text-lg',
    useMinimal: true,
  },
  md: {
    container: 'w-9 h-9 rounded-xl',
    text: 'text-xl',
    useMinimal: false,
  },
  lg: {
    container: 'w-12 h-12 rounded-xl',
    text: 'text-2xl',
    useMinimal: false,
  },
};

export function Logo({ showText = true, size = 'md', className, href = '/' }: LogoProps) {
  const sizeConfig = sizes[size];
  const IconComponent = sizeConfig.useMinimal ? BugritIconMinimal : BugritIcon;

  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'bg-gradient-to-br from-red-500 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20',
          sizeConfig.container
        )}
      >
        <IconComponent className="w-full h-full p-1.5 text-white" />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight', sizeConfig.text)}>
          Bug<span className="text-red-500">rit</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export { BugritIcon, BugritIconMinimal };
