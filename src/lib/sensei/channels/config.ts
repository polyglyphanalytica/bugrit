/**
 * Channel Configuration — Environment-Aware Key Selection
 *
 * Follows the same dual-key pattern as Stripe:
 * - Production (bugrit.com): uses live keys (SLACK_*, TELEGRAM_*)
 * - Non-prod: uses sandbox/test keys (SLACK_TEST_*, TELEGRAM_TEST_*),
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

// ─── Telegram ─────────────────────────────────────────────────────────

export function getTelegramBotToken(): string | undefined {
  if (isProduction()) {
    return process.env.TELEGRAM_BOT_TOKEN;
  }
  return process.env.TELEGRAM_TEST_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
}

export function getTelegramWebhookSecret(): string | undefined {
  if (isProduction()) {
    return process.env.TELEGRAM_WEBHOOK_SECRET;
  }
  return process.env.TELEGRAM_TEST_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;
}
