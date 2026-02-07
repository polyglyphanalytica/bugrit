export type BugritEnvironment = 'production' | 'dev';

const PRODUCTION_HOSTNAMES = ['bugrit.com', 'bugrid.com'];

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
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
      return url.hostname;
    } catch (error) {
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
  return resolveEnvironmentFromHost(getHostCandidate());
}

export function getFirestoreDatabaseId(environment: BugritEnvironment): string {
  return environment === 'production'
    ? DEFAULT_FIRESTORE_DATABASE_ID
    : DEV_FIRESTORE_DATABASE_ID;
}
