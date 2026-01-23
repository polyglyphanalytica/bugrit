'use client';

import * as React from 'react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { TECH_TERMS, getPlainEnglish, getExplanation } from '@/lib/plain-english';
import { cn } from '@/lib/utils';
import { HelpCircle, X } from 'lucide-react';

interface TechTermProps {
  term: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
  plain?: boolean; // If true, show plain English instead of technical term
}

/**
 * TechTerm component - wraps technical jargon with helpful explanations
 *
 * Mobile-friendly: Uses tap-to-open popover instead of hover tooltip
 * Desktop: Shows on hover (via CSS) or click
 *
 * Usage:
 * <TechTerm term="SQL injection">SQL injection</TechTerm>
 * or
 * <TechTerm term="SQL injection" /> (uses term as content)
 * or
 * <TechTerm term="SQL injection" plain /> (shows "Database attack" instead)
 */
export function TechTerm({ term, children, showIcon = true, className, plain = false }: TechTermProps) {
  const [isOpen, setIsOpen] = useState(false);
  const explanation = getExplanation(term);
  const plainEnglish = getPlainEnglish(term);
  const displayText = plain ? plainEnglish : (children || term);

  // If we don't have an explanation, just render the text
  if (!explanation) {
    return <span className={className}>{displayText}</span>;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 border-b border-dashed border-muted-foreground/50',
            'cursor-help hover:border-primary hover:text-primary transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 rounded-sm',
            className
          )}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Learn about ${term}`}
        >
          {displayText}
          {showIcon && (
            <HelpCircle className="w-3 h-3 text-muted-foreground opacity-60" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 sm:w-80 p-0"
        side="top"
        align="center"
        sideOffset={8}
      >
        <div className="p-3">
          {/* Header with close button for mobile */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              {plain && term !== plainEnglish && (
                <p className="text-xs text-muted-foreground">
                  Technical term: <span className="font-medium">{term}</span>
                </p>
              )}
              {!plain && plainEnglish !== term && (
                <p className="font-semibold text-primary text-sm">{plainEnglish}</p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 -mr-1 -mt-1 rounded hover:bg-muted text-muted-foreground sm:hidden"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{explanation}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Inline definition - shows explanation inline on mobile, tooltip on desktop
 * Good for critical terms that users must understand
 */
interface InlineDefinitionProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
}

export function InlineDefinition({ term, children, className }: InlineDefinitionProps) {
  const [expanded, setExpanded] = useState(false);
  const explanation = getExplanation(term);
  const plainEnglish = getPlainEnglish(term);
  const displayText = children || term;

  if (!explanation) {
    return <span className={className}>{displayText}</span>;
  }

  return (
    <span className={cn('inline', className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'inline-flex items-center gap-1 border-b border-dashed border-primary/50',
          'text-primary hover:border-primary transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-sm'
        )}
      >
        {displayText}
        <HelpCircle className="w-3 h-3 opacity-70" />
      </button>
      {expanded && (
        <span className="block sm:inline sm:ml-1 mt-1 sm:mt-0 p-2 sm:p-0 bg-muted sm:bg-transparent rounded sm:rounded-none text-sm text-muted-foreground">
          <span className="hidden sm:inline">— </span>
          <span className="font-medium text-foreground">{plainEnglish}:</span>{' '}
          {explanation}
          <button
            onClick={() => setExpanded(false)}
            className="ml-2 text-primary hover:underline text-xs"
          >
            (hide)
          </button>
        </span>
      )}
    </span>
  );
}

/**
 * Helper component to render text with all tech terms automatically linked
 */
interface AutoTermsProps {
  text: string;
  plain?: boolean;
  className?: string;
}

export function AutoTerms({ text, plain = false, className }: AutoTermsProps) {
  // Find and replace technical terms with TechTerm components
  const terms = Object.keys(TECH_TERMS).sort((a, b) => b.length - a.length);

  let result: React.ReactNode[] = [text];

  for (const term of terms) {
    const newResult: React.ReactNode[] = [];
    for (const part of result) {
      if (typeof part === 'string') {
        const regex = new RegExp(`\\b(${term})\\b`, 'gi');
        const splits = part.split(regex);
        splits.forEach((split, index) => {
          if (split.toLowerCase() === term.toLowerCase()) {
            newResult.push(
              <TechTerm key={`${term}-${index}`} term={term} plain={plain} showIcon={false}>
                {split}
              </TechTerm>
            );
          } else if (split) {
            newResult.push(split);
          }
        });
      } else {
        newResult.push(part);
      }
    }
    result = newResult;
  }

  return <span className={className}>{result}</span>;
}

/**
 * A glossary panel showing all technical terms - mobile optimized
 */
export function TechGlossary({ className }: { className?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const sortedTerms = Object.entries(TECH_TERMS)
    .filter(([term, { simple }]) =>
      term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      simple.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="font-semibold text-lg">Glossary</h3>
        <input
          type="search"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg bg-background w-full sm:w-48"
        />
      </div>
      <div className="grid gap-2 sm:gap-3">
        {sortedTerms.map(([term, { simple, explanation }]) => (
          <div key={term} className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
              <span className="font-medium">{term}</span>
              <span className="text-sm text-primary">{simple}</span>
            </div>
            <p className="text-sm text-muted-foreground">{explanation}</p>
          </div>
        ))}
        {sortedTerms.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No terms found matching &quot;{searchQuery}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
