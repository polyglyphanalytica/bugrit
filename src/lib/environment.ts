export type BugritEnvironment = 'production' | 'dev';

const PRODUCTION_HOSTNAMES = ['bugrit.com'];

export const DEFAULT_FIRESTORE_DATABASE_ID = '(default)';
export const DEV_FIRESTORE_DATABASE_ID = 'devdb';

function normalizeHostname(hostname?: string | null): string | null {
  if (!hostname) return null;
  return hostname.toLowerCase().trim();
}

export function isProductionHostname(hostname?: string | null): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return false;
  return PRODUCTION_HOSTNAMES.some((domain) =>
    normalized === domain || normalized.endsWith(`.${domain}`)
  );
}

export function resolveEnvironmentFromHost(hostname?: string | null): BugritEnvironment {
  return isProductionHostname(hostname) ? 'production' : 'dev';
}

function getHostCandidate(): string | null {
  // Explicit environment override takes priority
  if (process.env.BUGRIT_ENVIRONMENT === 'production') {
    return PRODUCTION_HOSTNAMES[0];
  }
  if (process.env.BUGRIT_ENVIRONMENT === 'dev') {
    return null;
  }

  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      return url.hostname;
    } catch {
      // ignore invalid URL
    }
  }

  if (process.env.NEXT_PUBLIC_APP_HOSTNAME) {
    return process.env.NEXT_PUBLIC_APP_HOSTNAME;
  }

  if (process.env.APP_HOSTNAME) {
    return process.env.APP_HOSTNAME;
  }

  if (process.env.HOSTNAME) {
    return process.env.HOSTNAME;
  }

  return null;
}

export function getDefaultEnvironment(): BugritEnvironment {
  const host = getHostCandidate();
  const env = resolveEnvironmentFromHost(host);
  if (!host && typeof window === 'undefined') {
    console.warn('[environment] No hostname detected server-side, defaulting to dev. Set BUGRIT_ENVIRONMENT=production for production.');
  }
  return env;
}

export function isProduction(): boolean {
  return getDefaultEnvironment() === 'production';
}

export function getFirestoreDatabaseId(environment: BugritEnvironment): string {
  return environment === 'production'
    ? DEFAULT_FIRESTORE_DATABASE_ID
    : DEV_FIRESTORE_DATABASE_ID;
}
