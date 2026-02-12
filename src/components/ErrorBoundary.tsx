'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { devConsole } from '@/lib/console';

/**
 * Error information structure for logging and reporting
 */
interface ErrorLogData {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
}

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional fallback UI to render instead of the default error UI */
  fallback?: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional custom reset handler */
  onReset?: () => void;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Log error to console and prepare for external service integration
 * In production, this would send to Sentry, LogRocket, or similar service
 */
function logErrorToService(errorData: ErrorLogData): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    devConsole.group('ErrorBoundary caught an error');
    devConsole.error('Error:', errorData.message);
    if (errorData.stack) {
      devConsole.error('Stack trace:', errorData.stack);
    }
    if (errorData.componentStack) {
      devConsole.error('Component stack:', errorData.componentStack);
    }
    devConsole.groupEnd();
  }

  // Sentry integration is optional - to enable:
  // 1. Install @sentry/nextjs: npm install @sentry/nextjs
  // 2. Set NEXT_PUBLIC_SENTRY_DSN environment variable
  // 3. Uncomment the code below
  //
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN && typeof window !== 'undefined') {
  //   import('@sentry/nextjs')
  //     .then((Sentry) => {
  //       Sentry.captureException(new Error(errorData.message), {
  //         extra: {
  //           componentStack: errorData.componentStack,
  //           url: errorData.url,
  //           stack: errorData.stack,
  //         },
  //       });
  //     })
  //     .catch(() => {
  //       // Sentry not available, fail silently
  //     });
  // }

  // In production, send to logging endpoint
  if (process.env.NODE_ENV === 'production') {
    // Fire-and-forget error reporting
    fetch('/api/logs/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch(() => {
      // Silently fail - we don't want error reporting to cause more errors
    });
  }
}

/**
 * React Error Boundary component that catches JavaScript errors anywhere
 * in their child component tree, logs those errors, and displays a fallback UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With error callback
 * <ErrorBoundary onError={(error, info) => reportToService(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({ errorInfo });

    // Prepare error data for logging
    const errorData: ErrorLogData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Log the error
    logErrorToService(errorData);

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    // Reset the error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    // Reload the page
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, render it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Error details (dev only):
                  </p>
                  <p className="mt-1 text-sm text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={this.handleReset}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
                <Button className="flex-1" onClick={this.handleReload}>
                  Reload page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
