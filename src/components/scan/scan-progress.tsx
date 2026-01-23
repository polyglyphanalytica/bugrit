'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SCAN_PROGRESS_STEPS } from '@/lib/plain-english';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

interface ScanProgressProps {
  toolsCompleted: number;
  toolsTotal: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  className?: string;
}

/**
 * Human-readable scan progress
 * Shows friendly step descriptions instead of "Running tools 23/115"
 */
export function ScanProgress({ toolsCompleted, toolsTotal, status, className }: ScanProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progress = (toolsCompleted / toolsTotal) * 100;

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Determine which steps are complete based on progress
  const getStepStatus = (stepIndex: number): 'completed' | 'active' | 'pending' => {
    const stepProgress = ((stepIndex + 1) / SCAN_PROGRESS_STEPS.length) * 100;
    if (progress >= stepProgress) return 'completed';
    if (progress >= stepProgress - (100 / SCAN_PROGRESS_STEPS.length)) return 'active';
    return 'pending';
  };

  if (status === 'completed') {
    return (
      <Card className={cn('border-green-500/50 bg-green-500/10', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-600">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">Scan Complete!</p>
              <p className="text-sm text-muted-foreground">All checks finished. Review your results below.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'failed') {
    return (
      <Card className={cn('border-red-500/50 bg-red-500/10', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-red-600">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-lg">!</span>
            </div>
            <div>
              <p className="font-semibold">Scan Failed</p>
              <p className="text-sm text-muted-foreground">Something went wrong. Check the error details below.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-semibold">Scanning your code...</p>
              <p className="text-sm text-muted-foreground">This usually takes less than 2 minutes</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-primary">{Math.round(animatedProgress)}%</span>
        </div>

        {/* Progress bar */}
        <Progress value={animatedProgress} className="h-3 mb-6" />

        {/* Human-readable steps */}
        <div className="space-y-3">
          {SCAN_PROGRESS_STEPS.map((step, index) => {
            const stepStatus = getStepStatus(index);
            return (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                  stepStatus === 'completed' && 'bg-green-500/10',
                  stepStatus === 'active' && 'bg-primary/10 border border-primary/30',
                  stepStatus === 'pending' && 'bg-muted/30 opacity-60'
                )}
              >
                <span className="text-xl">{step.icon}</span>
                <span className={cn(
                  'flex-1',
                  stepStatus === 'completed' && 'text-green-600',
                  stepStatus === 'active' && 'text-primary font-medium',
                  stepStatus === 'pending' && 'text-muted-foreground'
                )}>
                  {step.label}
                </span>
                {stepStatus === 'completed' && (
                  <Check className="w-5 h-5 text-green-600" />
                )}
                {stepStatus === 'active' && (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
              </div>
            );
          })}
        </div>

        {/* Tool count (smaller, less prominent) */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          {toolsCompleted} of {toolsTotal} tools completed
        </p>
      </CardContent>
    </Card>
  );
}
