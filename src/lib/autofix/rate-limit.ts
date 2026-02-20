/**
 * Per-user rate limiting for autofix endpoints.
 *
 * In-memory store keyed by userId + action.
 * TODO: Migrate to Redis for multi-instance deployments.
 */

import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup to prevent unbounded memory growth
const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * Check rate limit for a user + action pair.
 * Returns null if allowed, or a 429 NextResponse if exceeded.
 */
export function checkAutofixRateLimit(
  userId: string,
  action: 'trigger' | 'read' | 'settings' | 'integrate',
): NextResponse | null {
  cleanup();

  const limits: Record<string, number> = {
    trigger: 5,     // expensive AI + GitHub operations
    integrate: 5,   // expensive AI + GitHub operations
    settings: 20,   // lightweight reads/writes
    read: 30,       // read-only queries
  };

  const maxRequests = limits[action] ?? 20;
  const window = 60_000; // 1 minute
  const now = Date.now();
  const key = `${userId}:${action}`;

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + window });
    return null;
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter,
        limit: maxRequests,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  entry.count++;
  return null;
}
