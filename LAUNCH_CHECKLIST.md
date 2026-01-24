# Bugrit Production Launch Checklist

A unified checklist for launching Bugrit to production. Complete all sections before accepting production traffic.

**Last Updated:** January 2026
**Estimated Time:** 4-6 hours (excluding DNS propagation)
**Tool Count:** 142 tools running 5,000+ security checks

---

## Quick Start

Run the automated pre-launch validation first:

```bash
npx ts-node scripts/pre-launch-validation.ts
```

This checks code, configuration, and documentation automatically.

---

## 1. Google Cloud Platform Setup

### 1.1 Project Setup

- [ ] Create or select GCP project
  ```bash
  export PROJECT_ID="bugrit-prod"
  export REGION="us-central1"
  gcloud projects create $PROJECT_ID --name="Bugrit Production"
  gcloud config set project $PROJECT_ID
  ```

- [ ] Enable billing on the project
  ```bash
  gcloud billing accounts list
  gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
  ```

- [ ] Enable required APIs
  ```bash
  gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    storage.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    firebase.googleapis.com \
    firestore.googleapis.com \
    identitytoolkit.googleapis.com
  ```

### 1.2 Cloud Storage

- [ ] Create scan artifacts bucket
  ```bash
  gsutil mb -l $REGION gs://${PROJECT_ID}-scans
  ```

- [ ] Create lifecycle policy (auto-delete after 30 days)
  ```bash
  cat > lifecycle.json << 'EOF'
  {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
  EOF
  gsutil lifecycle set lifecycle.json gs://${PROJECT_ID}-scans
  ```

### 1.3 Artifact Registry

- [ ] Create Docker repository
  ```bash
  gcloud artifacts repositories create bugrit \
    --repository-format=docker \
    --location=$REGION \
    --description="Bugrit Docker images"
  ```

### 1.4 Service Account

- [ ] Create Cloud Build service account
  ```bash
  gcloud iam service-accounts create bugrit-cloud-build \
    --display-name="Bugrit Cloud Build"

  SA_EMAIL="bugrit-cloud-build@${PROJECT_ID}.iam.gserviceaccount.com"
  ```

- [ ] Grant required IAM permissions
  ```bash
  # Cloud Build permissions
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudbuild.builds.editor"

  # Storage permissions
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.objectAdmin"

  # Cloud Run permissions
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"

  # Service Account User (for deploying to Cloud Run)
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountUser"

  # Secret Manager accessor
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/secretmanager.secretAccessor"

  # Artifact Registry writer
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.writer"
  ```

---

## 2. Firebase Setup

### 2.1 Project Configuration

- [ ] Initialize Firebase project
  ```bash
  firebase projects:addfirebase $PROJECT_ID
  firebase use $PROJECT_ID
  ```

- [ ] Enable Authentication providers
  - [ ] Email/Password (required)
  - [ ] Google (recommended)
  - [ ] GitHub (optional)

- [ ] Create Firestore database
  ```bash
  firebase firestore:databases:create --location=$REGION
  ```

- [ ] Deploy Firestore security rules
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] Configure authorized domains (add your production domain)

### 2.2 Service Account

- [ ] Generate Firebase Admin SDK key
  - Go to: Project Settings → Service Accounts → Generate New Private Key
  - Save as `firebase-admin-key.json`

- [ ] Convert to environment variable format
  ```bash
  FIREBASE_SERVICE_ACCOUNT_KEY=$(cat firebase-admin-key.json | jq -c .)
  ```

---

## 3. Stripe Setup

### 3.1 Account Configuration

- [ ] Create Stripe account at https://dashboard.stripe.com/register
- [ ] Complete business verification
- [ ] Configure branding (logo, colors, statement descriptor)

### 3.2 Products & Pricing

Create these subscription products in Stripe:

| Tier | Monthly | Yearly | Credits |
|------|---------|--------|---------|
| Solo | $19 | $190 | 50 |
| Scale | $49 | $490 | 200 |
| Business | $99 | $990 | 500 |

- [ ] Create Solo plan (monthly + yearly)
- [ ] Create Scale plan (monthly + yearly)
- [ ] Create Business plan (monthly + yearly)
- [ ] Record all Price IDs

### 3.3 Webhooks

- [ ] Create webhook endpoint
  - URL: `https://yourdomain.com/api/webhooks/stripe`
  - Events:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.paid`
    - `invoice.payment_failed`

- [ ] Record webhook secret (`whsec_xxx`)

### 3.4 API Keys

- [ ] Get production API keys from Developers → API Keys
  - `STRIPE_SECRET_KEY=sk_live_xxx`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx`

---

## 4. Secret Manager Setup

Store all secrets in Google Secret Manager:

```bash
# Stripe
echo -n "sk_live_xxx" | gcloud secrets create stripe-secret-key --data-file=-
echo -n "whsec_xxx" | gcloud secrets create stripe-webhook-secret --data-file=-

# Firebase (base64 encode the JSON)
cat firebase-admin-key.json | base64 | gcloud secrets create firebase-service-account --data-file=-

# Worker secret (generate random)
openssl rand -base64 32 | gcloud secrets create bugrit-worker-secret --data-file=-

# Admin encryption key
openssl rand -hex 16 | gcloud secrets create admin-encryption-key --data-file=-

# GitHub OAuth (for private repo access)
echo -n "your-github-client-id" | gcloud secrets create github-client-id --data-file=-
echo -n "your-github-client-secret" | gcloud secrets create github-client-secret --data-file=-
```

**Required secrets checklist:**
- [ ] `stripe-secret-key`
- [ ] `stripe-webhook-secret`
- [ ] `firebase-service-account`
- [ ] `bugrit-worker-secret`
- [ ] `admin-encryption-key`
- [ ] `github-client-id` (for private repo scanning)
- [ ] `github-client-secret`

---

## 5. Worker Deployment (Cloud Run)

### 5.1 Deploy Worker

```bash
# Build and deploy
cd worker
gcloud builds submit --tag gcr.io/$PROJECT_ID/bugrit-worker

gcloud run deploy bugrit-worker \
  --image gcr.io/$PROJECT_ID/bugrit-worker \
  --platform managed \
  --region $REGION \
  --memory 8Gi \
  --cpu 4 \
  --timeout 900 \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 10 \
  --no-allow-unauthenticated \
  --set-env-vars "WORKER_SECRET=$(gcloud secrets versions access latest --secret=bugrit-worker-secret)"
```

- [ ] Worker deployed successfully
- [ ] Note the worker URL: `https://bugrit-worker-xxx-uc.a.run.app`
- [ ] Verify health: `curl https://WORKER_URL/health`

### 5.2 Worker Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Memory | 8GB | Puppeteer + Chromium |
| CPU | 4 cores | Parallel analysis |
| Timeout | 900s (15 min) | Large repo scans |
| Concurrency | 1 | Single scan per instance |
| Min instances | 0 (or 1) | Cost vs cold starts |
| Max instances | 10 | Adjust based on load |

---

## 6. Main App Deployment

### 6.1 Firebase App Hosting

- [ ] Initialize App Hosting
  ```bash
  firebase apphosting:backends:create
  ```

- [ ] Configure environment in Firebase Console (App Hosting → Settings → Environment):
  - [ ] `STRIPE_SECRET_KEY` → link to Secret Manager
  - [ ] `STRIPE_WEBHOOK_SECRET` → link to Secret Manager
  - [ ] `WORKER_URL` → your Cloud Run worker URL
  - [ ] `WORKER_SECRET` → link to Secret Manager
  - [ ] `NEXT_PUBLIC_APP_URL` → `https://yourdomain.com`
  - [ ] `GOOGLE_API_KEY` → for Genkit AI features

- [ ] Deploy
  ```bash
  firebase deploy --only hosting
  ```

### 6.2 Cloud Run Alternative

If not using Firebase App Hosting:

```bash
gcloud run deploy bugrit \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10
```

---

## 7. Domain & SSL

### 7.1 DNS Configuration

- [ ] Point DNS to your deployment:
  ```
  # For Cloud Run
  @ CNAME [your-service]-xxx-uc.a.run.app

  # Or A record for load balancer
  @ A [Load Balancer IP]
  ```

### 7.2 Custom Domain

- [ ] Configure custom domain in Cloud Run
  ```bash
  gcloud run domain-mappings create \
    --service bugrit \
    --domain yourdomain.com \
    --region $REGION
  ```

- [ ] Or configure in Firebase App Hosting
  ```bash
  firebase apphosting:backends:update --custom-domain=yourdomain.com
  ```

### 7.3 SSL Certificate

- [ ] SSL is automatic with Cloud Run / Firebase
- [ ] Verify HTTPS works: `curl -I https://yourdomain.com`

---

## 8. GitHub Integration Setup

### 8.1 GitHub OAuth App (for private repos)

- [ ] Create OAuth App at https://github.com/settings/developers
  - Application name: `Bugrit`
  - Homepage URL: `https://yourdomain.com`
  - Authorization callback URL: `https://yourdomain.com/api/auth/github/callback`

- [ ] Store credentials in Secret Manager (done in step 4)

### 8.2 Repository Secrets (for CI/CD)

Add these as GitHub repository secrets:
- [ ] `GCP_PROJECT_ID`
- [ ] `GCP_SA_KEY` (service account JSON, base64 encoded)
- [ ] `FIREBASE_SERVICE_ACCOUNT`

### 8.3 Branch Protection

- [ ] Enable branch protection on `main`
- [ ] Require PR reviews
- [ ] Require status checks (pre-launch validation)

---

## 9. Security Verification

### 9.1 Authentication & Authorization

- [ ] Firebase Auth using production credentials
- [ ] Session cookies have `secure: true` and `httpOnly: true`
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled on API routes
- [ ] Worker authentication enforced (shared secret)
- [ ] `SKIP_API_AUTH=false` in production

### 9.2 Secrets Management

- [ ] All secrets in Google Secret Manager (not env files)
- [ ] No secrets in Git history: `git log -p | grep -i secret`
- [ ] Firebase Admin key NOT committed
- [ ] Stripe using live keys (not test)
- [ ] Worker secret is cryptographically random (32+ bytes)

### 9.3 Infrastructure Security

- [ ] Cloud Run worker has `--no-allow-unauthenticated`
- [ ] Worker service account has minimal permissions
- [ ] App Hosting service account can invoke Cloud Run
- [ ] Secret accessor roles scoped correctly

### 9.4 Input Validation

- [ ] URL inputs validated before scanning
- [ ] XSS protection headers enabled
- [ ] API endpoints require authentication

### 9.5 Security Headers Check

```bash
curl -I https://yourdomain.com | grep -i "strict-transport\|x-frame\|x-content"
```

---

## 10. Billing Verification

### 10.1 Credit System

Verify credit costs match:

| Category | Credits |
|----------|---------|
| Linting | 0 (free) |
| Security | 2 |
| Dependencies | 1 |
| Accessibility | 4 |
| Performance | 5 |
| AI Explanation | 0.1/issue |
| AI Fix | 0.15/issue |

- [ ] Free tier gets 5 credits on signup
- [ ] Credit deduction happens atomically
- [ ] Overage handling works (blocks or allows based on setting)
- [ ] Monthly credit reset works via Stripe webhook

### 10.2 Subscription Flow

- [ ] Checkout redirects to Stripe correctly
- [ ] Success callback updates Firestore
- [ ] Cancellation webhook handled
- [ ] Upgrade/downgrade works
- [ ] Invoice emails configured in Stripe

---

## 11. Scan Tools Verification

### 11.1 Browser-Based Tools (Cloud Run Worker)

- [ ] Lighthouse performance scan works
- [ ] Axe-core accessibility scan works
- [ ] Pa11y accessibility scan works
- [ ] Screenshot capture works
- [ ] Scans complete within timeout (900s)

### 11.2 Docker-Based Tools (Cloud Build)

- [ ] Semgrep scan works
- [ ] Trivy vulnerability scan works
- [ ] OWASP ZAP scan works
- [ ] Checkov IaC scan works
- [ ] Cloud Build timeout sufficient (10 min)
- [ ] Results upload to Cloud Storage

### 11.3 Local Analysis Tools

- [ ] ESLint analysis works
- [ ] Biome analysis works
- [ ] Secretlint detects secrets
- [ ] License checker works

---

## 12. Monitoring & Alerting

### 12.1 Error Tracking (Recommended)

- [ ] Set up Sentry
  ```
  SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
  ```

### 12.2 Uptime Monitoring

- [ ] Configure uptime monitoring (UptimeRobot, Pingdom, or GCP)
- [ ] Monitor: `https://yourdomain.com/api/health`

### 12.3 Alerting Rules

- [ ] Alert on error rate > 5%
- [ ] Alert on response time > 10s
- [ ] Alert on Cloud Run cold starts > threshold
- [ ] Alert on Stripe webhook failures
- [ ] Cloud Build failure notifications

### 12.4 Logging

- [ ] Cloud Run logs enabled
- [ ] Request/response times logged
- [ ] Scan start/complete events logged

---

## 13. User Experience Verification

### 13.1 Core Flows

- [ ] Sign-up flow works end-to-end
- [ ] Login/logout works
- [ ] First scan experience is smooth
- [ ] AI explanation generates correctly
- [ ] AI fix suggestion generates correctly
- [ ] View scan history works

### 13.2 GitHub Integration

- [ ] "Connect GitHub" redirects to OAuth
- [ ] OAuth callback saves connection
- [ ] Connected state shows GitHub username
- [ ] Scanning private repos works after connecting

### 13.3 Mobile Responsiveness

- [ ] Dashboard works on mobile
- [ ] Scan results readable on mobile
- [ ] Checkout works on mobile

---

## 14. Legal & Compliance

- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Cookie consent (if required)
- [ ] GDPR data export capability (if EU users)
- [ ] Data retention policy documented (30 days for scan artifacts)

---

## 15. Documentation

- [ ] API documentation available
- [ ] User guide / help center
- [ ] Pricing page accurate (142 tools, 5,000+ checks)
- [ ] FAQ section complete
- [ ] Contact/support method available

---

## 16. Backup & Recovery

- [ ] Firestore automatic backups enabled
- [ ] Backup retention period set
- [ ] Recovery procedure documented
- [ ] Test restore from backup

---

## 17. Launch Day

### 17.1 Pre-Launch (T-1 day)

- [ ] Notify team of launch time
- [ ] Ensure someone is on-call
- [ ] DNS pointing to production
- [ ] SSL certificate valid
- [ ] All test data cleaned from production DB
- [ ] Stripe in live mode
- [ ] Analytics tracking installed
- [ ] Have rollback plan ready:
  ```bash
  # Rollback to previous revision
  gcloud run services update-traffic bugrit \
    --to-revisions=bugrit-00001-xxx=100 \
    --region $REGION
  ```

### 17.2 Launch (T-0)

- [ ] Merge final PR to main branch
- [ ] Verify deployment succeeded
- [ ] Run smoke tests:
  ```bash
  # Worker health
  curl -s https://WORKER_URL/health | jq .

  # App health
  curl -s https://yourdomain.com/api/health | jq .

  # Homepage
  curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com
  ```
- [ ] Test critical flows again
- [ ] Monitor error rates

### 17.3 Post-Launch (T+1 hour)

- [ ] Verify first real user signup
- [ ] Verify first real scan completes
- [ ] Verify first payment processes (if any)
- [ ] Monitor Cloud Run instance count
- [ ] Check Stripe dashboard
- [ ] Check for unexpected errors
- [ ] Celebrate! 🎉

---

## 18. Post-Launch Monitoring (First 48 Hours)

Check these metrics frequently:

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Error rate | < 1% | Investigate logs |
| P95 latency | < 5s | Check Cloud Run scaling |
| Failed scans | < 5% | Check tool containers |
| Webhook failures | 0 | Check Stripe config |
| User complaints | 0 | Respond immediately |

---

## 19. Automated Tool Updates

### Weekly Schedule (Fully Automated)

| Day | Time | What Happens |
|-----|------|--------------|
| Sunday | 3:00 AM | Cloud Build pulls Docker images |
| Monday | 9:00 AM | Dependabot opens npm PRs |
| Monday | ~9:15 AM | Auto-merge tests and merges minor/patch |

### Self-Updating Tools (No Action Required)

These download fresh databases at scan time:
- **Trivy**: CVE database
- **Grype**: Vulnerability database
- **Semgrep**: Rules from registry
- **Nuclei**: Community templates

### Manual Review Required

Major version bumps for:
- `next`, `react`, `react-dom`
- `typescript`
- `firebase`, `firebase-admin`

---

## Quick Reference

### Commands

```bash
# Pre-launch validation
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

## Environment Variables Reference

| Variable | Purpose | Source |
|----------|---------|--------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK | Secret Manager |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Your project |
| `STRIPE_SECRET_KEY` | Stripe billing | Secret Manager |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | Secret Manager |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe | Stripe Dashboard |
| `WORKER_URL` | Cloud Run worker URL | Worker deployment |
| `WORKER_SECRET` | Worker authentication | Secret Manager |
| `NEXT_PUBLIC_APP_URL` | Production URL | Your domain |
| `GOOGLE_CLOUD_PROJECT` | GCP project | Your project |
| `SCAN_OUTPUT_BUCKET` | Scan artifacts | Cloud Storage |
| `ADMIN_ENCRYPTION_KEY` | Admin data encryption | Secret Manager |
| `SUPERADMIN_EMAIL` | Primary admin | Your email |
| `GITHUB_CLIENT_ID` | GitHub OAuth | Secret Manager |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | Secret Manager |

---

*Checklist consolidated from multiple sources. Last revision: January 2026*
