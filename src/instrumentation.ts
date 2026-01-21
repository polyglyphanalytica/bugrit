/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * It's used to initialize monitoring, validation, and other startup tasks.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server (not in Edge runtime or during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid bundling issues
    const { validateEnv } = await import('@/lib/env-validation');

    try {
      // Validate environment variables on startup
      validateEnv();
      console.log('[instrumentation] Environment validation passed');
    } catch (error) {
      // In production, this will throw and prevent startup
      // In development, it logs a warning but continues
      if (process.env.NODE_ENV === 'production') {
        console.error('[instrumentation] Environment validation failed:', error);
        throw error;
      } else {
        console.warn('[instrumentation] Environment validation warning:', error);
      }
    }
  }
}
