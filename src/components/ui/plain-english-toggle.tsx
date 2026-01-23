'use client';

import { usePlainEnglish } from '@/contexts/plain-english-context';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, BookOpen, Code } from 'lucide-react';

interface PlainEnglishToggleProps {
  showLabel?: boolean;
  className?: string;
}

/**
 * Toggle for switching between Plain English and Technical modes
 */
export function PlainEnglishToggle({ showLabel = true, className }: PlainEnglishToggleProps) {
  const { plainMode, togglePlainMode } = usePlainEnglish();

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && (
          <div className="flex items-center gap-1.5">
            {plainMode ? (
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Code className="w-4 h-4 text-muted-foreground" />
            )}
            <Label htmlFor="plain-english" className="text-sm cursor-pointer">
              {plainMode ? 'Plain English' : 'Technical'}
            </Label>
          </div>
        )}

        <Switch
          id="plain-english"
          checked={plainMode}
          onCheckedChange={togglePlainMode}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground">
              <HelpCircle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">
              {plainMode
                ? 'Plain English mode shows simple explanations instead of technical jargon.'
                : 'Technical mode shows industry-standard terminology for security professionals.'}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact version for nav/header
 */
export function PlainEnglishToggleCompact({ className }: { className?: string }) {
  const { plainMode, togglePlainMode } = usePlainEnglish();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={togglePlainMode}
            className={`p-2 rounded-lg hover:bg-muted transition-colors ${className}`}
            aria-label={plainMode ? 'Switch to technical mode' : 'Switch to plain English mode'}
          >
            {plainMode ? (
              <BookOpen className="w-5 h-5" />
            ) : (
              <Code className="w-5 h-5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">
            {plainMode ? 'Plain English mode (click for technical)' : 'Technical mode (click for plain English)'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
