'use client';

import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  FileQuestion,
  FolderOpen,
  Inbox,
  Search,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button text */
  actionLabel?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Secondary action button text */
  secondaryActionLabel?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Empty state component for when there's no data to display
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const descSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const paddingSizes = {
    sm: 'py-6 px-4',
    md: 'py-12 px-6',
    lg: 'py-16 px-8',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        paddingSizes[size],
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className={cn('text-muted-foreground', iconSizes[size])} />
      </div>
      <h3 className={cn('font-semibold text-foreground mb-2', titleSizes[size])}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-muted-foreground max-w-sm mb-6', descSizes[size])}>
          {description}
        </p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} size={size === 'sm' ? 'sm' : 'default'}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios

export function NoScansEmptyState({ onScan }: { onScan?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No scans yet"
      description="Run your first security scan to start analyzing your code for vulnerabilities."
      actionLabel="Start a Scan"
      onAction={onScan}
    />
  );
}

export function NoProjectsEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects"
      description="Create a project to organize your scans and track security over time."
      actionLabel="Create Project"
      onAction={onCreate}
    />
  );
}

export function NoResultsEmptyState({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No results found"
      description="Try adjusting your search or filter criteria."
      actionLabel="Clear Filters"
      onAction={onClear}
      size="sm"
    />
  );
}

export function ErrorEmptyState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Something went wrong"
      description={message || 'An error occurred while loading the data.'}
      actionLabel="Try Again"
      onAction={onRetry}
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <EmptyState
      icon={Inbox}
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
      size="sm"
    />
  );
}
