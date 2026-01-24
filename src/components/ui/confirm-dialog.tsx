'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import { buttonVariants } from './button';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle, Trash2, type LucideIcon } from 'lucide-react';

interface ConfirmDialogProps {
  /** Trigger element */
  trigger: React.ReactNode;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Visual variant */
  variant?: 'default' | 'destructive';
  /** Icon to show in header */
  icon?: LucideIcon;
  /** Whether the dialog is currently processing */
  loading?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

/**
 * A confirmation dialog component for important or destructive actions
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  icon: Icon,
  loading = false,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setIsOpen(false);
  };

  const isLoading = loading || isProcessing;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className={cn('rounded-full p-2', {
                  'bg-destructive/10': variant === 'destructive',
                  'bg-muted': variant === 'default',
                })}
              >
                <Icon
                  className={cn('h-5 w-5', {
                    'text-destructive': variant === 'destructive',
                    'text-foreground': variant === 'default',
                  })}
                />
              </div>
            )}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className={Icon ? 'ml-12' : ''}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn({
              [buttonVariants({ variant: 'destructive' })]:
                variant === 'destructive',
            })}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Pre-configured delete confirmation dialog
interface DeleteConfirmDialogProps {
  /** Trigger element */
  trigger: React.ReactNode;
  /** What is being deleted (e.g., "project", "scan", "API key") */
  itemName: string;
  /** Optional specific item identifier to show in description */
  itemIdentifier?: string;
  /** Callback when deletion is confirmed */
  onConfirm: () => void | Promise<void>;
  /** Whether the dialog is currently processing */
  loading?: boolean;
}

export function DeleteConfirmDialog({
  trigger,
  itemName,
  itemIdentifier,
  onConfirm,
  loading,
}: DeleteConfirmDialogProps) {
  const description = itemIdentifier
    ? `Are you sure you want to delete "${itemIdentifier}"? This action cannot be undone.`
    : `Are you sure you want to delete this ${itemName}? This action cannot be undone.`;

  return (
    <ConfirmDialog
      trigger={trigger}
      title={`Delete ${itemName}?`}
      description={description}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={onConfirm}
      variant="destructive"
      icon={Trash2}
      loading={loading}
    />
  );
}

// Pre-configured warning confirmation dialog
interface WarningConfirmDialogProps {
  /** Trigger element */
  trigger: React.ReactNode;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description: string;
  /** Confirm button text */
  confirmText?: string;
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;
  /** Whether the dialog is currently processing */
  loading?: boolean;
}

export function WarningConfirmDialog({
  trigger,
  title,
  description,
  confirmText = 'Continue',
  onConfirm,
  loading,
}: WarningConfirmDialogProps) {
  return (
    <ConfirmDialog
      trigger={trigger}
      title={title}
      description={description}
      confirmText={confirmText}
      onConfirm={onConfirm}
      variant="default"
      icon={AlertTriangle}
      loading={loading}
    />
  );
}

// Hook for programmatic confirmation dialogs
interface UseConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function useConfirm() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    options: UseConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: null,
    resolve: null,
  });

  const confirm = React.useCallback((options: UseConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        open: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    dialogState.resolve?.(true);
    setDialogState({ open: false, options: null, resolve: null });
  }, [dialogState.resolve]);

  const handleCancel = React.useCallback(() => {
    dialogState.resolve?.(false);
    setDialogState({ open: false, options: null, resolve: null });
  }, [dialogState.resolve]);

  const ConfirmDialogComponent = React.useCallback(() => {
    if (!dialogState.options) return null;

    return (
      <AlertDialog
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogState.options.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogState.options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {dialogState.options.cancelText || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn({
                [buttonVariants({ variant: 'destructive' })]:
                  dialogState.options.variant === 'destructive',
              })}
            >
              {dialogState.options.confirmText || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }, [dialogState, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}
