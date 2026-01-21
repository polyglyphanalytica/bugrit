# Production Launch Checklist

This checklist covers everything required to launch Bugrit to production.
Items marked with 🤖 have been automated. Items marked with 👤 require manual action.

**Last Updated:** January 2026
**Estimated Time:** 4-6 hours (excluding DNS propagation)

---

## Pre-Launch Validation

Run the automated validation script first:

```bash
npx ts-node scripts/pre-launch-validation.ts
```

This checks code, configuration, and documentation automatically.

---

## 1. Google Cloud Platform Setup

### 1.1 Project Setup 👤

- [ ] Create GCP project (or use existing)
  ```bash
  gcloud projects create bugrit-prod --name="Bugrit Production"
  gcloud config set project bugrit-prod
  ```

- [ ] Enable billing on the project
  - Go to: https://console.cloud.google.com/billing

- [ ] Enable required APIs
  ```bash
  gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    storage.googleapis.com \
    secretmanager.googleapis.com \
    containerregistry.googleapis.com
  ```

### 1.2 Cloud Storage 👤

- [ ] Create scan artifacts bucket
  ```bash
  gsutil mb -l us-central1 gs://bugrit-prod-scans
  gsutil lifecycle set lifecycle.json gs://bugrit-prod-scans
  ```

- [ ] Create lifecycle policy (auto-delete after 30 days)
  ```json
  // lifecycle.json
  {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
  ```

### 1.3 Service Account 👤

- [ ] Create Cloud Build service account
  ```bash
  gcloud iam service-accounts create bugrit-cloud-build \
    --display-name="Bugrit Cloud Build"
  ```

- [ ] Grant required permissions
  ```bash
  PROJECT_ID=$(gcloud config get-value project)
  SA_EMAIL="bugrit-cloud-build@${PROJECT_ID}.iam.gserviceaccount.com"

  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudbuild.builds.editor"

  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.objectAdmin"
  ```

- [ ] Download service account key (for local development only)
  ```bash
  gcloud iam service-accounts keys create ./gcp-key.json \
    --iam-account=$SA_EMAIL
  ```

### 1.4 Cloud Run Setup 👤

- [ ] Deploy to Cloud Run
  ```bash
  gcloud run deploy bugrit \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10
  ```

---

## 2. Firebase Setup

### 2.1 Project Configuration 👤

- [ ] Create Firebase project (or link to existing GCP project)
  - Go to: https://console.firebase.google.com/

- [ ] Enable Authentication
  - [ ] Email/Password provider
  - [ ] Google provider (optional)
  - [ ] GitHub provider (optional)

- [ ] Enable Firestore
  - [ ] Select region (should match GCP region)
  - [ ] Start in production mode

- [ ] Configure security rules
  ```javascript
  // firestore.rules - deploy with: firebase deploy --only firestore:rules
  ```

### 2.2 Service Account 👤

- [ ] Generate Firebase Admin SDK key
  - Go to: Project Settings → Service Accounts → Generate New Private Key
  - Save as `firebase-admin-key.json`

- [ ] Set environment variable
  ```bash
  # Convert JSON to single line for env var
  FIREBASE_SERVICE_ACCOUNT_KEY=$(cat firebase-admin-key.json | jq -c .)
  ```

---

## 3. Stripe Setup

### 3.1 Account Configuration 👤

- [ ] Create Stripe account (if not exists)
  - Go to: https://dashboard.stripe.com/register

- [ ] Complete account verification
  - Business information
  - Bank account for payouts

- [ ] Configure branding
  - Logo, colors, statement descriptor

### 3.2 Products & Pricing 👤

- [ ] Create subscription products
  - Starter plan (monthly + yearly)
  - Pro plan (monthly + yearly)
  - Business plan (monthly + yearly)

- [ ] Record Price IDs
  ```
  STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx
  STRIPE_STARTER_YEARLY_PRICE_ID=price_xxx
  STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
  STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
  STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxx
  STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxx
  ```

### 3.3 Webhooks 👤

- [ ] Create webhook endpoint
  - URL: `https://yourdomain.com/api/webhooks/stripe`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.paid`
    - `invoice.payment_failed`

- [ ] Record webhook secret
  ```
  STRIPE_WEBHOOK_SECRET=whsec_xxx
  ```

### 3.4 API Keys 👤

- [ ] Get production API keys
  - Go to: Developers → API Keys
  ```
  STRIPE_SECRET_KEY=sk_live_xxx
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
  ```

---

## 4. Domain & SSL

### 4.1 Domain Configuration 👤

- [ ] Purchase/configure domain
- [ ] Point DNS to Cloud Run
  ```
  # A record (if using load balancer)
  @ → [Load Balancer IP]

  # Or CNAME (for Cloud Run direct)
  @ → [your-service].run.app
  ```

- [ ] Configure custom domain in Cloud Run
  ```bash
  gcloud run domain-mappings create \
    --service bugrit \
    --domain yourdomain.com \
    --region us-central1
  ```

### 4.2 SSL Certificate 👤

- [ ] SSL is automatic with Cloud Run custom domains
- [ ] Verify HTTPS works: `https://yourdomain.com`

---

## 5. Environment Variables

### 5.1 Set Production Variables 👤

Set these in Cloud Run (or your deployment platform):

```bash
gcloud run services update bugrit --region us-central1 --set-env-vars "\
FIREBASE_SERVICE_ACCOUNT_KEY=[base64-encoded-json],\
FIREBASE_PROJECT_ID=your-project,\
STRIPE_SECRET_KEY=sk_live_xxx,\
STRIPE_WEBHOOK_SECRET=whsec_xxx,\
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx,\
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxx,\
STRIPE_STARTER_YEARLY_PRICE_ID=price_xxx,\
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx,\
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx,\
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxx,\
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxx,\
NEXT_PUBLIC_APP_URL=https://yourdomain.com,\
ADMIN_ENCRYPTION_KEY=[32-char-random-string],\
SUPERADMIN_EMAIL=admin@yourdomain.com,\
GOOGLE_CLOUD_PROJECT=bugrit-prod,\
SCAN_OUTPUT_BUCKET=bugrit-prod-scans"
```

### 5.2 Generate Secrets 👤

- [ ] Generate admin encryption key
  ```bash
  openssl rand -hex 16
  ```

---

## 6. GitHub Setup

### 6.1 Repository Settings 👤

- [ ] Enable Renovate bot
  - Go to: https://github.com/apps/renovate
  - Install on your repository

- [ ] Configure branch protection
  - Require PR reviews
  - Require status checks (pre-launch validation)

### 6.2 Secrets 👤

Add these as repository secrets for CI/CD:

- [ ] `GCP_PROJECT_ID`
- [ ] `GCP_SA_KEY` (service account JSON)
- [ ] `FIREBASE_SERVICE_ACCOUNT_KEY`

---

## 7. Monitoring Setup

### 7.1 Error Tracking (Optional) 👤

- [ ] Create Sentry project
  - Go to: https://sentry.io/

- [ ] Get DSN and add to environment
  ```
  SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
  ```

### 7.2 Uptime Monitoring (Optional) 👤

- [ ] Set up uptime monitoring
  - Options: UptimeRobot, Pingdom, Google Cloud Monitoring
  - Monitor: `https://yourdomain.com/api/health`

### 7.3 Cloud Build Monitoring 👤

- [ ] Set up Cloud Build failure alerts
  - Go to: Cloud Build → Triggers → Notifications
  - Configure email/Slack alerts for build failures

---

## 8. Final Verification

### 8.1 Smoke Tests 👤

- [ ] Homepage loads
- [ ] User registration works
- [ ] Login/logout works
- [ ] Stripe checkout works (use test card first)
- [ ] Scan submission works
- [ ] Scan results display correctly

### 8.2 Security Verification 👤

- [ ] HTTPS enforced (HTTP redirects)
- [ ] Security headers present
  ```bash
  curl -I https://yourdomain.com | grep -i "strict-transport\|x-frame\|x-content"
  ```
- [ ] No secrets in client-side code
- [ ] API endpoints require authentication

### 8.3 Performance Check 👤

- [ ] Run Lighthouse audit
- [ ] Check Core Web Vitals
- [ ] Verify CDN caching works

---

## 9. Launch Day

### 9.1 Pre-Launch 👤

- [ ] Notify team of launch time
- [ ] Ensure someone is on-call
- [ ] Have rollback plan ready
  ```bash
  # To rollback to previous revision:
  gcloud run services update-traffic bugrit \
    --to-revisions=bugrit-00001-xxx=100 \
    --region us-central1
  ```

### 9.2 Launch 👤

- [ ] Merge PR to main branch
- [ ] Verify deployment succeeded
- [ ] Test critical flows again

### 9.3 Post-Launch 👤

- [ ] Monitor error rates for 1 hour
- [ ] Check Cloud Build job success rate
- [ ] Verify Stripe webhooks are firing
- [ ] Celebrate! 🎉

---

## Quick Reference

### Commands

```bash
# Run pre-launch validation
npx ts-node scripts/pre-launch-validation.ts

# Check tool health
npx ts-node scripts/check-tool-health.ts

# Deploy to Cloud Run
gcloud run deploy bugrit --source . --region us-central1

# View logs
gcloud run logs read --service bugrit --region us-central1

# Rollback
gcloud run services update-traffic bugrit --to-revisions=REVISION=100
```

### Support Contacts

| Service | Support Link |
|---------|--------------|
| GCP | https://console.cloud.google.com/support |
| Firebase | https://firebase.google.com/support |
| Stripe | https://support.stripe.com |

---

## Revision History

| Date | Change |
|------|--------|
| 2026-01-21 | Initial checklist |
