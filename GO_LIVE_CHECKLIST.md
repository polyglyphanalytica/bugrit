# Bugrit Go-Live Readiness Checklist

## Critical Environment Variables

### Required for Production

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `SCAN_WORKER_URL` | Cloud Run worker URL for browser-based tools (Lighthouse, axe-core, Pa11y) | Deploy `/worker` to Cloud Run, copy the URL |
| `WORKER_SECRET` | Shared secret for worker authentication | Generate with `openssl rand -base64 32` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK credentials | Firebase Console > Project Settings > Service Accounts |
| `FIREBASE_PROJECT_ID` | Firebase project identifier | Firebase Console > Project Settings |
| `STRIPE_SECRET_KEY` | Stripe billing integration | Stripe Dashboard > Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | Stripe Dashboard > Webhooks |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | Your domain (e.g., `https://bugrit.com`) |

### Required for Full Functionality

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `GOOGLE_CLOUD_PROJECT` | GCP project for Cloud Build (Docker tools) | GCP Console |
| `SCAN_OUTPUT_BUCKET` | Cloud Storage for scan artifacts | Create bucket in GCP |
| `ADMIN_ENCRYPTION_KEY` | Encryption for admin data | Generate with `openssl rand -hex 16` |
| `SUPERADMIN_EMAIL` | Primary admin account | Your admin email |

## Pre-Launch Checklist

### Infrastructure
- [ ] Deploy main app to Firebase App Hosting
- [ ] Deploy worker service to Cloud Run with Chromium
- [ ] Set up Firestore database with security rules
- [ ] Configure Cloud Storage bucket for scan artifacts
- [ ] Set up Cloud Build for Docker-based tools

### Environment Configuration
- [ ] Set `SCAN_WORKER_URL` to deployed worker URL
- [ ] Set `WORKER_SECRET` (same value in both main app and worker)
- [ ] Configure all Firebase environment variables
- [ ] Configure Stripe for billing
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain

### Security
- [ ] Ensure `SKIP_API_AUTH=false` in production
- [ ] Verify CORS settings on worker allow only your domain
- [ ] Review Firestore security rules
- [ ] Enable Cloud Run authentication

### Testing
- [ ] Test scan flow end-to-end (GitHub repo scan)
- [ ] Test URL-based scans (Lighthouse, accessibility)
- [ ] Verify billing/credits flow
- [ ] Test user registration and authentication

## Worker Deployment

```bash
# Build and deploy worker to Cloud Run
cd worker
gcloud builds submit --tag gcr.io/YOUR_PROJECT/bugrit-worker
gcloud run deploy bugrit-worker \
  --image gcr.io/YOUR_PROJECT/bugrit-worker \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --timeout 300 \
  --set-env-vars "WORKER_SECRET=your-secret,PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium"
```

## Post-Launch Monitoring
- [ ] Set up error alerting (Sentry recommended)
- [ ] Monitor Cloud Run metrics for worker
- [ ] Track scan success/failure rates
- [ ] Monitor billing/credit usage
