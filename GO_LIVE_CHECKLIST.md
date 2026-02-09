# Bugrit Go-Live Checklist: Secrets & Configuration

All secrets are stored in **Google Secret Manager** and referenced from `apphosting.yaml`.
The app uses **dual-key architecture**: live keys for production (`bugrit.com`), test/sandbox keys for all non-prod URLs. Runtime selection via `isProduction()` in `src/lib/environment.ts`.

---

## 1. Firebase (Required)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `FIREBASE_API_KEY` | `NEXT_PUBLIC_FIREBASE_API_KEY` | Client SDK browser auth | [ ] |
| `FIREBASE_MESSAGING_SENDER_ID` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Push messaging | [ ] |
| `FIREBASE_APP_ID` | `NEXT_PUBLIC_FIREBASE_APP_ID` | Client SDK app identifier | [ ] |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `FIREBASE_SERVICE_ACCOUNT_KEY` | Admin SDK (full JSON key) | [ ] |

**Plain config values (not secrets, in apphosting.yaml as `value:`):**
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `bugrit-prod.firebaseapp.com`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `bugrit-prod`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `bugrit-prod.appspot.com`
- `FIREBASE_PROJECT_ID` = `bugrit-prod`

---

## 2. Application Security (Required)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `admin-encryption-key` | `ADMIN_ENCRYPTION_KEY` | 32-char key for encrypting admin-stored Stripe keys in Firestore | [ ] |
| `platform-superadmin-email` | `PLATFORM_SUPERADMIN_EMAIL` | Protected superadmin email address | [ ] |
| `admin-api-key` | `ADMIN_API_KEY` | Server-to-server admin API authentication | [ ] |

---

## 3. Stripe Billing - LIVE (Production only: bugrit.com)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `stripe-secret-key` | `STRIPE_SECRET_KEY` | Stripe Live secret key (`sk_live_...`) | [ ] |
| `stripe-webhook-secret` | `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret (`whsec_...`) | [ ] |
| `STRIPE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side publishable key (`pk_live_...`) | [ ] |
| `stripe-starter-monthly-price-id` | `STRIPE_STARTER_MONTHLY_PRICE_ID` | Solo tier monthly price ID | [ ] |
| `stripe-starter-yearly-price-id` | `STRIPE_STARTER_YEARLY_PRICE_ID` | Solo tier yearly price ID | [ ] |
| `stripe-pro-monthly-price-id` | `STRIPE_PRO_MONTHLY_PRICE_ID` | Scale tier monthly price ID | [ ] |
| `stripe-pro-yearly-price-id` | `STRIPE_PRO_YEARLY_PRICE_ID` | Scale tier yearly price ID | [ ] |
| `stripe-business-monthly-price-id` | `STRIPE_BUSINESS_MONTHLY_PRICE_ID` | Business tier monthly price ID | [ ] |
| `stripe-business-yearly-price-id` | `STRIPE_BUSINESS_YEARLY_PRICE_ID` | Business tier yearly price ID | [ ] |

---

## 4. Stripe Billing - TEST/SANDBOX (All non-prod URLs)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `stripe-test-secret-key` | `STRIPE_TEST_SECRET_KEY` | Stripe Test secret key (`sk_test_...`) | [ ] |
| `stripe-test-webhook-secret` | `STRIPE_TEST_WEBHOOK_SECRET` | Test webhook signing secret | [ ] |
| `STRIPE_TEST_PUBLISHABLE_KEY` | `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` | Test publishable key (`pk_test_...`) | [ ] |
| `stripe-test-starter-monthly-price-id` | `STRIPE_TEST_STARTER_MONTHLY_PRICE_ID` | Test Solo monthly price ID | [ ] |
| `stripe-test-starter-yearly-price-id` | `STRIPE_TEST_STARTER_YEARLY_PRICE_ID` | Test Solo yearly price ID | [ ] |
| `stripe-test-pro-monthly-price-id` | `STRIPE_TEST_PRO_MONTHLY_PRICE_ID` | Test Scale monthly price ID | [ ] |
| `stripe-test-pro-yearly-price-id` | `STRIPE_TEST_PRO_YEARLY_PRICE_ID` | Test Scale yearly price ID | [ ] |
| `stripe-test-business-monthly-price-id` | `STRIPE_TEST_BUSINESS_MONTHLY_PRICE_ID` | Test Business monthly price ID | [ ] |
| `stripe-test-business-yearly-price-id` | `STRIPE_TEST_BUSINESS_YEARLY_PRICE_ID` | Test Business yearly price ID | [ ] |

**Stripe Admin Override (Optional):**
Stripe keys can also be stored encrypted in Firestore `platform_settings.stripe` via the admin panel. These override env vars at runtime. Encrypted with `ADMIN_ENCRYPTION_KEY`.

---

## 5. GitHub OAuth (Required for private repo scanning)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `github-client-id` | `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | [ ] |
| `github-client-secret` | `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | [ ] |

**Plain config value:**
- `GITHUB_REDIRECT_URI` = `https://bugrit-prod.web.app/api/auth/github/callback`
  - **Production action:** Update to `https://bugrit.com/api/auth/github/callback`
  - **Also update** the callback URL in GitHub OAuth App settings

**Not in apphosting.yaml (optional, for GitHub App mode):**
- `GITHUB_TOKEN` - Personal access token (alternative to OAuth)
- `GITHUB_APP_ID` - GitHub App ID
- `GITHUB_APP_PRIVATE_KEY` - GitHub App private key

---

## 6. Email Notifications (Required)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `resend-api-key` | `RESEND_API_KEY` | Resend.com API key for transactional email | [ ] |

**Plain config value:**
- `EMAIL_FROM_ADDRESS` = `noreply@bugrit.app`

---

## 7. Scan Worker (Required)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `scan-worker-url` | `SCAN_WORKER_URL` | Cloud Run URL for scan worker service | [ ] |
| `worker-secret` | `WORKER_SECRET` | Shared secret for worker authentication | [ ] |

---

## 8. Slack Integration - LIVE (Production: bugrit.com)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `slack-signing-secret` | `SLACK_SIGNING_SECRET` | Slack app signing secret (webhook verification) | [ ] |
| `slack-bot-token` | `SLACK_BOT_TOKEN` | Slack bot OAuth token (`xoxb-...`) | [ ] |

**Slack App Setup (Production):**
- [ ] Create Slack app at https://api.slack.com/apps
- [ ] Enable Events API, subscribe to `message.im` and `app_mention`
- [ ] Set Request URL: `https://bugrit.com/api/slack/events`
- [ ] Set Interactivity URL: `https://bugrit.com/api/slack/interactivity`
- [ ] Add bot scopes: `chat:write`, `im:history`, `im:read`, `app_mentions:read`

---

## 9. Slack Integration - TEST/SANDBOX (All non-prod URLs)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `slack-test-signing-secret` | `SLACK_TEST_SIGNING_SECRET` | Test Slack app signing secret | [ ] |
| `slack-test-bot-token` | `SLACK_TEST_BOT_TOKEN` | Test Slack bot token (`xoxb-...`) | [ ] |

**Slack App Setup (Test/Dev):**
- [ ] Create a **separate** Slack test app
- [ ] Set Request URL: `https://bugrit-prod.web.app/api/slack/events`
- [ ] Set Interactivity URL: `https://bugrit-prod.web.app/api/slack/interactivity`

---

## 10. WhatsApp Integration - LIVE (Production: bugrit.com)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `whatsapp-access-token` | `WHATSAPP_ACCESS_TOKEN` | Permanent system user access token | [ ] |
| `whatsapp-app-secret` | `WHATSAPP_APP_SECRET` | Meta app secret (webhook signature verification) | [ ] |
| `whatsapp-phone-number-id` | `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID | [ ] |
| `whatsapp-verify-token` | `WHATSAPP_VERIFY_TOKEN` | Custom token for webhook URL verification | [ ] |

**WhatsApp Setup (Production):**
- [ ] Create Meta Business app at https://developers.facebook.com
- [ ] Set up WhatsApp Business Platform
- [ ] Register production phone number
- [ ] Set webhook URL: `https://bugrit.com/api/whatsapp/webhook`
- [ ] Subscribe to `messages` webhook field
- [ ] Generate permanent system user access token

---

## 11. WhatsApp Integration - TEST/SANDBOX (All non-prod URLs)

| Secret Name in GCP | Env Variable | Purpose | Status |
|---|---|---|---|
| `whatsapp-test-access-token` | `WHATSAPP_TEST_ACCESS_TOKEN` | Test access token | [ ] |
| `whatsapp-test-app-secret` | `WHATSAPP_TEST_APP_SECRET` | Test app secret | [ ] |
| `whatsapp-test-phone-number-id` | `WHATSAPP_TEST_PHONE_NUMBER_ID` | Meta-provided test phone number ID | [ ] |
| `whatsapp-test-verify-token` | `WHATSAPP_TEST_VERIFY_TOKEN` | Test webhook verify token | [ ] |

**WhatsApp Setup (Test/Dev):**
- [ ] Use Meta test phone number from developer dashboard
- [ ] Set webhook URL: `https://bugrit-prod.web.app/api/whatsapp/webhook`

---

## 12. Not in apphosting.yaml (Optional / Future)

These are referenced in code but not yet deployed. Add to apphosting.yaml when needed:

| Env Variable | Purpose | Where Referenced |
|---|---|---|
| `CRON_SECRET` | Protects cron API endpoints | `src/app/api/cron/dunning/route.ts` |
| `SENTRY_AUTH_TOKEN` | Sentry error reporting auth | `src/lib/integrations/observability/sentry.ts` |
| `SONARQUBE_TOKEN` | SonarQube code quality integration | `.env.example` |
| `ZAP_API_KEY` | OWASP ZAP scanning integration | `.env.example` |
| `GCP_BILLING_FUNCTION_URL` | GCP billing Cloud Function | Commented out in `apphosting.yaml` |
| `GCP_BILLING_API_KEY` | GCP billing function auth | Commented out in `apphosting.yaml` |
| `GITHUB_APP_ID` | GitHub App mode (alternative to OAuth) | `.env.example` |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key | `.env.example` |

---

## Summary: Total Secret Count

| Category | Live/Shared | Test/Sandbox | Total |
|---|---|---|---|
| Firebase | 4 | - | 4 |
| Application Security | 3 | - | 3 |
| Stripe | 9 | 9 | 18 |
| GitHub OAuth | 2 | - | 2 |
| Email (Resend) | 1 | - | 1 |
| Scan Worker | 2 | - | 2 |
| Slack | 2 | 2 | 4 |
| WhatsApp | 4 | 4 | 8 |
| **Total** | **27** | **15** | **42** |

---

## Production Go-Live Actions

Before switching `BUGRIT_ENVIRONMENT=production`:

- [ ] All 42 secrets created in Google Secret Manager
- [ ] `NEXT_PUBLIC_APP_URL` updated to `https://bugrit.com`
- [ ] `GITHUB_REDIRECT_URI` updated to `https://bugrit.com/api/auth/github/callback`
- [ ] GitHub OAuth App callback URL updated in GitHub settings
- [ ] Slack production app webhook URLs pointing to `bugrit.com`
- [ ] WhatsApp production webhook URL pointing to `bugrit.com`
- [ ] Stripe live webhook endpoint configured for `https://bugrit.com/api/webhooks/stripe`
- [ ] `BUGRIT_ENVIRONMENT=production` uncommented in apphosting.yaml
- [ ] Firestore `(default)` database has required indexes
- [ ] DNS configured for `bugrit.com`
- [ ] SSL certificate provisioned
