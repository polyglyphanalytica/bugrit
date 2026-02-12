/**
 * Real-Time Session Polling Hook
 *
 * Polls the session API for real-time audit report updates.
 * The report enriches in real-time as individual tools complete.
 *
 * Features:
 * - Lightweight progress-only polling
 * - Full report polling
 * - Incremental updates (new reports since last poll)
 * - Automatic stop when session completes
 * - Exponential backoff on errors
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { devConsole } from '@/lib/console';

export interface SessionProgress {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  running: number;
  pending: number;
  percentage: number;
}

export interface ToolReport {
  toolName: string;
  category: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: {
    tool: string;
    category: string;
    success: boolean;
    duration: number;
    findings: Array<{
      id: string;
      severity: string;
      title: string;
      description: string;
    }>;
    summary: {
      total: number;
      bySeverity: Record<string, number>;
    };
  };
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
}

export interface RefundInfo {
  refundedCredits: number;
  toolsRefunded: string[];
  newBalance: number;
}

export interface SessionReport {
  sessionId: string;
  userId: string;
  status: 'initializing' | 'running' | 'completed' | 'partial' | 'failed';
  progress: SessionProgress;
  toolReports: Record<string, ToolReport>;
  summary: {
    totalFindings: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    toolsRun: string[];
    toolsSkipped: string[];
    toolsFailed: string[];
  };
  intelligence?: {
    executiveSummary: string;
    riskScore: number;
    topIssues: Array<{
      title: string;
      severity: string;
      category: string;
    }>;
    recommendations: Array<{
      title: string;
      priority: string;
    }>;
  };
  refund?: RefundInfo;
  createdAt: string;
  lastUpdated: string;
  completedAt?: string;
  duration?: number;
}

export interface UseSessionPollingOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
  /** Use progress-only polling (lightweight) */
  progressOnly?: boolean;
  /** Use incremental updates (only new reports) */
  incremental?: boolean;
  /** Auto-stop polling when complete */
  autoStop?: boolean;
  /** Maximum poll attempts before giving up */
  maxAttempts?: number;
  /**
   * Function to get authentication token (Firebase ID token).
   * Required for authenticated session polling.
   * Example: () => user.getIdToken()
   */
  getAuthToken?: () => Promise<string>;
  /** Callback when a new tool report arrives */
  onToolComplete?: (report: ToolReport) => void;
  /** Callback when session completes */
  onComplete?: (report: SessionReport) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseSessionPollingResult {
  /** Current session report */
  report: SessionReport | null;
  /** Current progress */
  progress: SessionProgress | null;
  /** New tool reports since last poll */
  newReports: ToolReport[];
  /** Whether polling is active */
  isPolling: boolean;
  /** Whether session is complete */
  isComplete: boolean;
  /** Last error */
  error: Error | null;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Force refresh */
  refresh: () => Promise<void>;
}

/**
 * Hook for real-time session polling
 */
export function useSessionPolling(
  sessionId: string | null,
  options: UseSessionPollingOptions = {}
): UseSessionPollingResult {
  const {
    pollInterval = 2000,
    progressOnly = false,
    incremental = false,
    autoStop = true,
    maxAttempts = 100,
    getAuthToken,
    onToolComplete,
    onComplete,
    onError,
  } = options;

  const [report, setReport] = useState<SessionReport | null>(null);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [newReports, setNewReports] = useState<ToolReport[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef(0);
  const lastUpdateRef = useRef<string | null>(null);
  const backoffRef = useRef(pollInterval);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchReport = useCallback(async () => {
    if (!sessionId) return;

    try {
      let url = `/api/sessions/${sessionId}`;

      if (progressOnly) {
        url += '?progress=true';
      } else if (incremental && lastUpdateRef.current) {
        url += `?since=${encodeURIComponent(lastUpdateRef.current)}`;
      }

      // Build headers with optional authentication
      const headers: Record<string, string> = {};
      if (getAuthToken) {
        try {
          const token = await getAuthToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (authError) {
          devConsole.error('Failed to get auth token for session polling:', authError);
          // Continue without auth - the API will return 401 if auth is required
        }
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.status}`);
      }

      const data = await response.json();

      // Reset backoff on success
      backoffRef.current = pollInterval;
      attemptRef.current = 0;
      setError(null);

      if (progressOnly) {
        setProgress(data.progress);
        if (data.status === 'completed' || data.status === 'partial' || data.status === 'failed') {
          setIsComplete(true);
          if (autoStop) stopPolling();
        }
      } else if (incremental) {
        if (data.newReports && data.newReports.length > 0) {
          setNewReports(data.newReports);
          data.newReports.forEach((r: ToolReport) => {
            onToolComplete?.(r);
          });
        }
        setProgress(data.progress);
        if (data.status === 'completed' || data.status === 'partial' || data.status === 'failed') {
          setIsComplete(true);
          if (autoStop) stopPolling();
        }
        lastUpdateRef.current = data.lastUpdated;
      } else {
        const sessionReport = data as SessionReport;
        setReport(sessionReport);
        setProgress(sessionReport.progress);

        // Check for new completed tools
        if (report) {
          for (const [toolName, toolReport] of Object.entries(sessionReport.toolReports)) {
            const prevReport = report.toolReports[toolName];
            if (
              toolReport.status === 'completed' &&
              prevReport?.status !== 'completed'
            ) {
              onToolComplete?.(toolReport);
            }
          }
        }

        if (
          sessionReport.status === 'completed' ||
          sessionReport.status === 'partial' ||
          sessionReport.status === 'failed'
        ) {
          setIsComplete(true);
          onComplete?.(sessionReport);
          if (autoStop) stopPolling();
        }

        lastUpdateRef.current = sessionReport.lastUpdated;
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      onError?.(errorObj);

      // Exponential backoff on error
      attemptRef.current++;
      if (attemptRef.current >= maxAttempts) {
        stopPolling();
      } else {
        backoffRef.current = Math.min(backoffRef.current * 1.5, 30000);
      }
    }
  }, [
    sessionId,
    progressOnly,
    incremental,
    pollInterval,
    autoStop,
    maxAttempts,
    onToolComplete,
    onComplete,
    onError,
    stopPolling,
    report,
  ]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    if (!sessionId) return;

    setIsPolling(true);
    attemptRef.current = 0;
    backoffRef.current = pollInterval;

    // Initial fetch
    fetchReport();

    // Start interval
    intervalRef.current = setInterval(() => {
      fetchReport();
    }, backoffRef.current);
  }, [sessionId, pollInterval, fetchReport]);

  const refresh = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  // Auto-start polling when sessionId changes
  useEffect(() => {
    if (sessionId) {
      setIsComplete(false);
      setReport(null);
      setProgress(null);
      setNewReports([]);
      setError(null);
      lastUpdateRef.current = null;
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [sessionId, startPolling, stopPolling]);

  // Update interval when backoff changes
  useEffect(() => {
    if (isPolling && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        fetchReport();
      }, backoffRef.current);
    }
  }, [isPolling, fetchReport]);

  return {
    report,
    progress,
    newReports,
    isPolling,
    isComplete,
    error,
    startPolling,
    stopPolling,
    refresh,
  };
}

/**
 * Hook for starting a new audit session
 */
export function useStartSession() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startSession = useCallback(async (params: {
    target: {
      directory?: string;
      url?: string;
      urls?: string[];
    };
    categories?: string[];
    tools?: string[];
    excludeTools?: string[];
    enableIntelligence?: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to start session: ${response.status}`);
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      return data;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    startSession,
    sessionId,
    isLoading,
    error,
  };
}
