'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { TECH_TERMS, getPlainEnglish, getExplanation } from '@/lib/plain-english';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';

interface TechTermProps {
  term: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
  plain?: boolean; // If true, show plain English instead of technical term
}

/**
 * TechTerm component - wraps technical jargon with helpful tooltips
 *
 * Usage:
 * <TechTerm term="SQL injection">SQL injection</TechTerm>
 * or
 * <TechTerm term="SQL injection" /> (uses term as content)
 * or
 * <TechTerm term="SQL injection" plain /> (shows "Database attack" instead)
 */
export function TechTerm({ term, children, showIcon = true, className, plain = false }: TechTermProps) {
  const explanation = getExplanation(term);
  const plainEnglish = getPlainEnglish(term);
  const displayText = plain ? plainEnglish : (children || term);

  // If we don't have an explanation, just render the text
  if (!explanation) {
    return <span className={className}>{displayText}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 border-b border-dashed border-muted-foreground/50 cursor-help',
              className
            )}
          >
            {displayText}
            {showIcon && (
              <HelpCircle className="w-3 h-3 text-muted-foreground opacity-60" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          <div className="space-y-1">
            {plain && term !== plainEnglish && (
              <p className="text-xs text-muted-foreground">
                Technical term: {term}
              </p>
            )}
            {!plain && plainEnglish !== term && (
              <p className="font-medium text-sm">{plainEnglish}</p>
            )}
            <p className="text-sm">{explanation}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
 * A glossary panel showing all technical terms
 */
export function TechGlossary({ className }: { className?: string }) {
  const sortedTerms = Object.entries(TECH_TERMS).sort((a, b) =>
    a[0].toLowerCase().localeCompare(b[0].toLowerCase())
  );

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="font-semibold text-lg">Glossary</h3>
      <div className="grid gap-3">
        {sortedTerms.map(([term, { simple, explanation }]) => (
          <div key={term} className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{term}</span>
              <span className="text-sm text-primary">{simple}</span>
            </div>
            <p className="text-sm text-muted-foreground">{explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
