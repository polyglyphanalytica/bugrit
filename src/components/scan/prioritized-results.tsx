'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FindingCard, Finding } from './finding-card';
import { ScanCelebration } from './scan-celebration';
import { usePlainEnglish } from '@/contexts/plain-english-context';
import { CATEGORY_AI_PROMPTS, getCategoryLabel } from '@/lib/plain-english';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  Filter,
} from 'lucide-react';

interface ToolResult {
  toolId: string;
  toolName: string;
  category: string;
  success: boolean;
  findings: Finding[];
}

interface PrioritizedResultsProps {
  results: ToolResult[];
  summary: {
    totalFindings: number;
    critical?: number;
    high?: number;
    errors: number;
    warnings: number;
    medium?: number;
    low?: number;
    info: number;
  };
  className?: string;
}

type PriorityLevel = 'critical' | 'recommended' | 'optional';

/**
 * PrioritizedResults - Shows scan results organized by priority
 * Instead of showing 50+ findings at once, prioritizes what matters
 */
export function PrioritizedResults({ results, summary, className }: PrioritizedResultsProps) {
  const { plainMode } = usePlainEnglish();
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | 'all'>('critical');
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null);

  // Flatten and categorize all findings
  const categorizedFindings = useMemo(() => {
    const allFindings: (Finding & { toolName: string; category: string })[] = [];

    results.forEach((result) => {
      result.findings.forEach((finding) => {
        allFindings.push({
          ...finding,
          toolName: result.toolName,
          category: result.category,
        });
      });
    });

    // Sort by severity
    const severityOrder = ['critical', 'error', 'high', 'warning', 'medium', 'low', 'info'];
    allFindings.sort((a, b) => {
      return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
    });

    return {
      critical: allFindings.filter((f) =>
        ['critical', 'error', 'high'].includes(f.severity)
      ),
      recommended: allFindings.filter((f) =>
        ['warning', 'medium'].includes(f.severity)
      ),
      optional: allFindings.filter((f) =>
        ['info', 'low'].includes(f.severity)
      ),
      all: allFindings,
    };
  }, [results]);

  // Get findings by category for "fix all" prompts
  const findingsByCategory = useMemo(() => {
    const byCategory: Record<string, Finding[]> = {};
    results.forEach((result) => {
      if (!byCategory[result.category]) {
        byCategory[result.category] = [];
      }
      byCategory[result.category].push(...result.findings);
    });
    return byCategory;
  }, [results]);

  const copyBulkPrompt = async (category: string) => {
    const findings = findingsByCategory[category] || [];
    const findingsText = findings
      .slice(0, 20) // Limit to avoid too long prompts
      .map((f) => `- ${f.message}${f.file ? ` (${f.file}:${f.line})` : ''}`)
      .join('\n');

    const template = CATEGORY_AI_PROMPTS[category] || CATEGORY_AI_PROMPTS.quality;
    const prompt = template.replace('{{findings}}', findingsText);

    await navigator.clipboard.writeText(prompt);
    setCopiedCategory(category);
    setTimeout(() => setCopiedCategory(null), 2000);
  };

  const criticalCount = categorizedFindings.critical.length;
  const recommendedCount = categorizedFindings.recommended.length;
  const optionalCount = categorizedFindings.optional.length;
  const totalCount = categorizedFindings.all.length;

  // Check for wins (things we DIDN'T find)
  const wins = [];
  const hasSecurityFindings = results.some(
    (r) => r.category === 'security' && r.findings.length > 0
  );
  if (!hasSecurityFindings) {
    wins.push('No major security vulnerabilities found');
  }

  const hasSecretLeaks = results.some(
    (r) =>
      r.toolName.toLowerCase().includes('secret') ||
      r.toolName.toLowerCase().includes('gitleak') &&
      r.findings.length > 0
  );
  if (!hasSecretLeaks) {
    wins.push('No exposed passwords or API keys');
  }

  const hasCriticalDeps = results.some(
    (r) =>
      r.category === 'dependencies' &&
      r.findings.some((f) => ['critical', 'high', 'error'].includes(f.severity))
  );
  if (!hasCriticalDeps) {
    wins.push('No critical dependency vulnerabilities');
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Celebration / Summary */}
      <ScanCelebration
        criticalCount={criticalCount}
        recommendedCount={recommendedCount}
        optionalCount={optionalCount}
        wins={wins}
      />

      {/* Priority Stats */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setSelectedPriority('critical')}
          className={cn(
            'p-4 rounded-xl border-2 transition-all text-left',
            selectedPriority === 'critical'
              ? 'border-red-500 bg-red-500/10'
              : 'border-border hover:border-red-500/50'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
          </div>
          <p className="text-sm font-medium">
            {plainMode ? 'Fix Now' : 'Critical'}
          </p>
          <p className="text-xs text-muted-foreground">
            {plainMode ? 'These need immediate attention' : 'Critical & High severity'}
          </p>
        </button>

        <button
          onClick={() => setSelectedPriority('recommended')}
          className={cn(
            'p-4 rounded-xl border-2 transition-all text-left',
            selectedPriority === 'recommended'
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-border hover:border-yellow-500/50'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-600">{recommendedCount}</span>
          </div>
          <p className="text-sm font-medium">
            {plainMode ? 'Fix Soon' : 'Recommended'}
          </p>
          <p className="text-xs text-muted-foreground">
            {plainMode ? 'Worth fixing when you can' : 'Medium severity warnings'}
          </p>
        </button>

        <button
          onClick={() => setSelectedPriority('optional')}
          className={cn(
            'p-4 rounded-xl border-2 transition-all text-left',
            selectedPriority === 'optional'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-border hover:border-blue-500/50'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{optionalCount}</span>
          </div>
          <p className="text-sm font-medium">
            {plainMode ? 'Nice to Have' : 'Optional'}
          </p>
          <p className="text-xs text-muted-foreground">
            {plainMode ? 'Improvements when you have time' : 'Low severity & info'}
          </p>
        </button>
      </div>

      {/* Show All toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {selectedPriority === 'critical' && (plainMode ? 'Issues to Fix Now' : 'Critical Issues')}
          {selectedPriority === 'recommended' && (plainMode ? 'Recommended Fixes' : 'Recommended')}
          {selectedPriority === 'optional' && (plainMode ? 'Optional Improvements' : 'Optional')}
          {selectedPriority === 'all' && 'All Issues'}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPriority(selectedPriority === 'all' ? 'critical' : 'all')}
        >
          <Filter className="w-4 h-4 mr-1" />
          {selectedPriority === 'all' ? 'Show Priority' : `Show All (${totalCount})`}
        </Button>
      </div>

      {/* First Critical Issue Highlighted */}
      {selectedPriority === 'critical' && categorizedFindings.critical.length > 0 && (
        <Card className="border-2 border-red-500/50 bg-red-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Fix This First</Badge>
              <span className="text-xs text-muted-foreground">Most important issue</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <FindingCard finding={categorizedFindings.critical[0]} defaultExpanded />
          </CardContent>
        </Card>
      )}

      {/* Findings List */}
      <div className="space-y-3">
        {categorizedFindings[selectedPriority]
          .slice(selectedPriority === 'critical' ? 1 : 0, 25)
          .map((finding, index) => (
            <FindingCard key={finding.id || index} finding={finding} />
          ))}

        {categorizedFindings[selectedPriority].length === 0 && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="font-medium text-green-600">
                {selectedPriority === 'critical' && 'No critical issues found!'}
                {selectedPriority === 'recommended' && 'No recommended fixes needed'}
                {selectedPriority === 'optional' && 'No optional improvements'}
                {selectedPriority === 'all' && 'No issues found - your code looks great!'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedPriority === 'critical'
                  ? 'Great job! Your code passed our critical security checks.'
                  : 'Check other priority levels to see if there are things to improve.'}
              </p>
            </CardContent>
          </Card>
        )}

        {categorizedFindings[selectedPriority].length > 25 && (
          <p className="text-center text-sm text-muted-foreground">
            Showing 25 of {categorizedFindings[selectedPriority].length} issues.
            <Button variant="link" size="sm">Show more</Button>
          </p>
        )}
      </div>

      {/* Bulk Fix by Category */}
      {selectedPriority === 'critical' && Object.keys(findingsByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Fix All with AI
            </CardTitle>
            <CardDescription>
              Copy prompts to fix all issues in a category at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(findingsByCategory)
                .filter(([_, findings]) => findings.length > 0)
                .map(([category, findings]) => (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    onClick={() => copyBulkPrompt(category)}
                    className="justify-start"
                  >
                    {copiedCategory === category ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {plainMode ? getCategoryLabel(category, true) : category}
                    <Badge variant="secondary" className="ml-auto">
                      {findings.length}
                    </Badge>
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
