/**
 * Channel Configuration — Environment-Aware Key Selection
 *
 * Follows the same dual-key pattern as Stripe:
 * - Production (bugrit.com): uses live keys (SLACK_*, WHATSAPP_*)
 * - Non-prod: uses sandbox/test keys (SLACK_TEST_*, WHATSAPP_TEST_*),
 *   falling back to live keys if test keys aren't set.
 *
 * All secrets are stored in Google Secret Manager and referenced
 * from apphosting.yaml.
 */

import { isProduction } from '@/lib/environment';

// ─── Slack ──────────────────────────────────────────────────────────────

export function getSlackSigningSecret(): string | undefined {
  if (isProduction()) {
    return process.env.SLACK_SIGNING_SECRET;
  }
  return process.env.SLACK_TEST_SIGNING_SECRET || process.env.SLACK_SIGNING_SECRET;
}

export function getSlackBotToken(): string | undefined {
  if (isProduction()) {
    return process.env.SLACK_BOT_TOKEN;
  }
  return process.env.SLACK_TEST_BOT_TOKEN || process.env.SLACK_BOT_TOKEN;
}

// ─── WhatsApp ───────────────────────────────────────────────────────────

export function getWhatsAppAccessToken(): string | undefined {
  if (isProduction()) {
    return process.env.WHATSAPP_ACCESS_TOKEN;
  }
  return process.env.WHATSAPP_TEST_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
}

export function getWhatsAppAppSecret(): string | undefined {
  if (isProduction()) {
    return process.env.WHATSAPP_APP_SECRET;
  }
  return process.env.WHATSAPP_TEST_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
}

export function getWhatsAppPhoneNumberId(): string | undefined {
  if (isProduction()) {
    return process.env.WHATSAPP_PHONE_NUMBER_ID;
  }
  return process.env.WHATSAPP_TEST_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
}

export function getWhatsAppVerifyToken(): string | undefined {
  if (isProduction()) {
    return process.env.WHATSAPP_VERIFY_TOKEN;
  }
  return process.env.WHATSAPP_TEST_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
}
