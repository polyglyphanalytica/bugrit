'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  getFixGuidance,
  generateAIPrompt,
  formatAIPrompt,
  getSeverityLabel,
} from '@/lib/plain-english';
import { usePlainEnglish } from '@/contexts/plain-english-context';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Copy,
  Check,
  Sparkles,
  FileCode,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

export interface Finding {
  id: string;
  severity: 'error' | 'warning' | 'info' | 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
  toolName?: string;
}

interface FindingCardProps {
  finding: Finding;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * FindingCard - Displays a single finding with fix guidance and AI prompt
 */
export function FindingCard({ finding, className, defaultExpanded = false }: FindingCardProps) {
  const { plainMode } = usePlainEnglish();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const fixGuidance = finding.rule ? getFixGuidance(finding.rule) : null;

  // Generate AI prompt
  const aiPrompt = fixGuidance
    ? formatAIPrompt(fixGuidance.aiPrompt, {
        file: finding.file,
        line: finding.line,
        rule: finding.rule,
        message: finding.message,
      })
    : generateAIPrompt(finding);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityIcon = () => {
    const severity = finding.severity;
    if (severity === 'error' || severity === 'critical' || severity === 'high') {
      return <AlertCircle className="w-4 h-4" />;
    }
    if (severity === 'warning' || severity === 'medium') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <Info className="w-4 h-4" />;
  };

  const getSeverityStyles = () => {
    const severity = finding.severity;
    if (severity === 'error' || severity === 'critical') {
      return 'border-red-500/50 bg-red-500/5';
    }
    if (severity === 'high') {
      return 'border-orange-500/50 bg-orange-500/5';
    }
    if (severity === 'warning' || severity === 'medium') {
      return 'border-yellow-500/50 bg-yellow-500/5';
    }
    return 'border-blue-500/50 bg-blue-500/5';
  };

  const getBadgeVariant = () => {
    const severity = finding.severity;
    if (severity === 'error' || severity === 'critical') return 'destructive';
    if (severity === 'high') return 'default';
    if (severity === 'warning' || severity === 'medium') return 'outline';
    return 'secondary';
  };

  return (
    <Card className={cn('overflow-hidden', getSeverityStyles(), className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                {/* Severity icon */}
                <div className={cn(
                  'mt-0.5 p-1.5 rounded-full',
                  (finding.severity === 'error' || finding.severity === 'critical') && 'bg-red-500/20 text-red-600',
                  finding.severity === 'high' && 'bg-orange-500/20 text-orange-600',
                  (finding.severity === 'warning' || finding.severity === 'medium') && 'bg-yellow-500/20 text-yellow-600',
                  (finding.severity === 'info' || finding.severity === 'low') && 'bg-blue-500/20 text-blue-600'
                )}>
                  {getSeverityIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={getBadgeVariant()} className="text-xs">
                      {plainMode ? getSeverityLabel(finding.severity, true) : finding.severity}
                    </Badge>
                    {finding.toolName && (
                      <span className="text-xs text-muted-foreground">
                        {finding.toolName}
                      </span>
                    )}
                  </div>

                  <p className="font-medium text-sm">{finding.message}</p>

                  {finding.file && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <FileCode className="w-3 h-3" />
                      {finding.file}
                      {finding.line && `:${finding.line}`}
                      {finding.column && `:${finding.column}`}
                    </p>
                  )}
                </div>

                {/* Expand indicator */}
                <ChevronDown className={cn(
                  'w-5 h-5 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180'
                )} />
              </div>
            </CardContent>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-4 space-y-4 bg-muted/30">
            {/* Fix Guidance */}
            {fixGuidance && (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold mb-1">What this means</h4>
                  <p className="text-sm text-muted-foreground">{fixGuidance.what}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1">Why it matters</h4>
                  <p className="text-sm text-muted-foreground">{fixGuidance.why}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1">How to fix it</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    {fixGuidance.how.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {/* Suggestion */}
            {finding.suggestion && !fixGuidance && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Suggestion</h4>
                <p className="text-sm text-muted-foreground">{finding.suggestion}</p>
              </div>
            )}

            {/* AI Fix Prompt */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Fix with AI
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyPrompt();
                  }}
                  className="h-7 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Prompt
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Copy this prompt and paste it into Cursor, Copilot, Claude, or your AI coding assistant:
              </p>
              <div className="bg-muted rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                {aiPrompt}
              </div>
            </div>

            {/* Rule link */}
            {finding.rule && (
              <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1">
                <span>Rule:</span>
                <code className="bg-muted px-1 py-0.5 rounded">{finding.rule}</code>
                <a
                  href={`https://google.com/search?q=${encodeURIComponent(finding.rule + ' rule explanation')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/**
 * Compact finding row for lists
 */
interface FindingRowProps {
  finding: Finding;
  onClick?: () => void;
}

export function FindingRow({ finding, onClick }: FindingRowProps) {
  const { plainMode } = usePlainEnglish();

  const getSeverityColor = () => {
    const severity = finding.severity;
    if (severity === 'error' || severity === 'critical') return 'text-red-600';
    if (severity === 'high') return 'text-orange-600';
    if (severity === 'warning' || severity === 'medium') return 'text-yellow-600';
    return 'text-blue-600';
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-3"
    >
      <span className={cn('text-xs font-medium uppercase w-16', getSeverityColor())}>
        {plainMode ? getSeverityLabel(finding.severity, true) : finding.severity}
      </span>
      <span className="flex-1 text-sm truncate">{finding.message}</span>
      {finding.file && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {finding.file}
          {finding.line && `:${finding.line}`}
        </span>
      )}
    </button>
  );
}
