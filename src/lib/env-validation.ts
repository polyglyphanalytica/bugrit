/**
 * Environment Variable Validation
 *
 * This module validates all required environment variables at startup
 * and provides a typed, validated env object for use throughout the app.
 *
 * In production, missing required variables will throw an error.
 * In development, warnings are logged but the app continues.
 */

import { z } from 'zod';

// =============================================================================
// Schema Definitions
// =============================================================================

/**
 * Server-side environment variables (not exposed to client)
 */
const serverEnvSchema = z.object({
  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Firebase Admin (required for production)
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),

  // Security
  ADMIN_ENCRYPTION_KEY: z
    .string()
    .min(16, 'ADMIN_ENCRYPTION_KEY must be at least 16 characters')
    .optional(),
  SUPERADMIN_EMAIL: z.string().email().optional(),
  ADMIN_API_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_STARTER_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BUSINESS_YEARLY_PRICE_ID: z.string().optional(),

  // GitHub
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_URL: z.string().url().optional().or(z.literal('')),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional().or(z.literal('')),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional().or(z.literal('')),

  // Third-party integrations
  SONARQUBE_URL: z.string().url().optional().or(z.literal('')),
  SONARQUBE_TOKEN: z.string().optional(),
  ZAP_URL: z.string().url().optional().or(z.literal('')),
  ZAP_API_KEY: z.string().optional(),

  // Development flags
  SKIP_API_AUTH: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  REQUIRE_API_AUTH: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

/**
 * Client-side environment variables (exposed via NEXT_PUBLIC_ prefix)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_FB_PIXEL_ID: z.string().optional(),
});

// =============================================================================
// Production Requirements
// =============================================================================

/**
 * Variables that MUST be set in production
 */
const REQUIRED_IN_PRODUCTION = {
  server: [
    'ADMIN_ENCRYPTION_KEY',
  ] as const,
  client: [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ] as const,
};

/**
 * Variables that are STRONGLY RECOMMENDED in production (warning only)
 */
const RECOMMENDED_IN_PRODUCTION = {
  server: [
    'FIREBASE_SERVICE_ACCOUNT_KEY',
    'SUPERADMIN_EMAIL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ] as const,
  client: [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ] as const,
};

// =============================================================================
// Validation Logic
// =============================================================================

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = ServerEnv & ClientEnv;

let cachedServerEnv: ServerEnv | null = null;
let cachedClientEnv: ClientEnv | null = null;

/**
 * Validates server-side environment variables
 */
function validateServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(', ')}`)
      .join('\n');

    const message = `Invalid server environment variables:\n${errorMessages}`;

    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.warn(`[env-validation] Warning: ${message}`);
      // Return partial env in development
      cachedServerEnv = serverEnvSchema.parse({
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
      });
      return cachedServerEnv;
    }
  }

  cachedServerEnv = result.data;
  return cachedServerEnv;
}

/**
 * Validates client-side environment variables
 */
function validateClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;

  const clientEnvValues = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
  };

  const result = clientEnvSchema.safeParse(clientEnvValues);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(', ')}`)
      .join('\n');

    const message = `Invalid client environment variables:\n${errorMessages}`;

    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.warn(`[env-validation] Warning: ${message}`);
      cachedClientEnv = clientEnvSchema.parse(clientEnvValues);
      return cachedClientEnv;
    }
  }

  cachedClientEnv = result.data;
  return cachedClientEnv;
}

/**
 * Checks for required variables in production and throws/warns appropriately
 */
function checkProductionRequirements(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  // Check required server vars
  for (const key of REQUIRED_IN_PRODUCTION.server) {
    if (!process.env[key]) {
      missingRequired.push(key);
    }
  }

  // Check required client vars
  for (const key of REQUIRED_IN_PRODUCTION.client) {
    if (!process.env[key]) {
      missingRequired.push(key);
    }
  }

  // Check recommended server vars
  for (const key of RECOMMENDED_IN_PRODUCTION.server) {
    if (!process.env[key]) {
      missingRecommended.push(key);
    }
  }

  // Check recommended client vars
  for (const key of RECOMMENDED_IN_PRODUCTION.client) {
    if (!process.env[key]) {
      missingRecommended.push(key);
    }
  }

  // Log warnings for recommended vars
  if (missingRecommended.length > 0) {
    console.warn(
      `[env-validation] Warning: The following environment variables are recommended in production:\n` +
        missingRecommended.map((v) => `  - ${v}`).join('\n')
    );
  }

  // Throw for required vars
  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variables in production:\n` +
        missingRequired.map((v) => `  - ${v}`).join('\n') +
        `\n\nSee .env.example for required configuration.`
    );
  }
}

// =============================================================================
// Exported Functions & Values
// =============================================================================

/**
 * Validates all environment variables
 * Call this at application startup
 */
export function validateEnv(): Env {
  checkProductionRequirements();
  const serverEnv = validateServerEnv();
  const clientEnv = validateClientEnv();
  return { ...serverEnv, ...clientEnv };
}

/**
 * Get validated server environment (server-side only)
 */
export function getServerEnv(): ServerEnv {
  return validateServerEnv();
}

/**
 * Get validated client environment (safe for client-side)
 */
export function getClientEnv(): ClientEnv {
  return validateClientEnv();
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
}

/**
 * Pre-validated environment object
 * Use this for quick access to validated env vars
 */
export const env = {
  get server() {
    return getServerEnv();
  },
  get client() {
    return getClientEnv();
  },
  isProduction,
  isDevelopment,
  isFirebaseConfigured,
  isStripeConfigured,
};

export default env;
