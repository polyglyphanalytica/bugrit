# Bugrit Setup Checklist

Complete these steps to deploy Bugrit from scratch.

## Prerequisites

- [ ] Google Cloud account with billing enabled
- [ ] Firebase project created (or will create via CLI)
- [ ] Node.js 20+ installed locally
- [ ] `gcloud` CLI installed and authenticated
- [ ] `firebase` CLI installed and authenticated
- [ ] Domain name (optional, for custom domain)

---

## 1. Google Cloud Project Setup

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export REGION="us-central1"
```

- [ ] Create or select GCP project
  ```bash
  gcloud projects create $PROJECT_ID --name="Bugrit"
  gcloud config set project $PROJECT_ID
  ```

- [ ] Enable billing on the project
  ```bash
  # Link billing account (get ID from console)
  gcloud billing accounts list
  gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
  ```

- [ ] Enable required APIs
  ```bash
  gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    firebase.googleapis.com \
    firestore.googleapis.com \
    identitytoolkit.googleapis.com \
    storage.googleapis.com
  ```

---

## 2. Firebase Setup

- [ ] Initialize Firebase project
  ```bash
  firebase projects:addfirebase $PROJECT_ID
  firebase use $PROJECT_ID
  ```

- [ ] Enable Firebase Authentication
  - Go to Firebase Console → Authentication → Sign-in method
  - [ ] Enable Email/Password
  - [ ] Enable Google (recommended)
  - [ ] Configure authorized domains

- [ ] Create Firestore database
  ```bash
  firebase firestore:databases:create --location=$REGION
  ```

- [ ] Deploy Firestore security rules
  ```bash
  firebase deploy --only firestore:rules
  ```

---

## 3. Stripe Setup (Billing)

- [ ] Create Stripe account at https://stripe.com
- [ ] Get API keys from Stripe Dashboard → Developers → API keys
- [ ] Create products and prices matching tiers:

  | Tier | Monthly Price | Credits |
  |------|---------------|---------|
  | Solo | $19 | 50 |
  | Scale | $49 | 200 |
  | Business | $99 | 500 |

- [ ] Set up webhook endpoint (after deployment):
  - URL: `https://your-domain.com/api/webhooks/stripe`
  - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

- [ ] Store Stripe secret key in Secret Manager
  ```bash
  echo -n "sk_live_xxx" | gcloud secrets create stripe-secret-key \
    --data-file=- --project=$PROJECT_ID
  ```

---

## 4. Environment Variables

- [ ] Create `.env.local` for local development:
  ```bash
  # Firebase
  NEXT_PUBLIC_FIREBASE_API_KEY=xxx
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
  NEXT_PUBLIC_FIREBASE_APP_ID=xxx

  # Firebase Admin (server-side)
  FIREBASE_PROJECT_ID=xxx
  FIREBASE_CLIENT_EMAIL=xxx
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

  # Stripe
  STRIPE_SECRET_KEY=sk_test_xxx
  STRIPE_WEBHOOK_SECRET=whsec_xxx
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

  # Worker
  WORKER_URL=https://bugrit-worker-xxx.run.app
  WORKER_SECRET=xxx

  # Google AI (for Genkit)
  GOOGLE_API_KEY=xxx
  ```

- [ ] Create Firebase service account key
  ```bash
  gcloud iam service-accounts keys create firebase-admin-key.json \
    --iam-account=firebase-adminsdk-xxx@$PROJECT_ID.iam.gserviceaccount.com
  ```

---

## 5. Deploy Cloud Run Worker

- [ ] Run the automated deployment script
  ```bash
  npm run deploy:worker
  ```

  This will:
  - Check IAM permissions
  - Enable required APIs
  - Create Artifact Registry repository
  - Create Cloud Storage bucket for scan outputs
  - Build and push Docker image
  - Create worker secret
  - Deploy Cloud Run service with proper IAM

- [ ] Note the worker URL from deployment output
- [ ] Update App Hosting environment with `WORKER_URL`

---

## 6. Deploy Firebase App Hosting

- [ ] Initialize App Hosting
  ```bash
  firebase apphosting:backends:create
  ```

- [ ] Configure environment secrets in Firebase Console:
  - Go to App Hosting → your backend → Settings → Environment
  - [ ] Add `STRIPE_SECRET_KEY` (link to Secret Manager)
  - [ ] Add `STRIPE_WEBHOOK_SECRET`
  - [ ] Add `WORKER_URL`
  - [ ] Add `WORKER_SECRET` (link to Secret Manager)
  - [ ] Add `GOOGLE_API_KEY` (for Genkit AI features)

- [ ] Deploy
  ```bash
  firebase deploy --only hosting
  ```
  Or push to connected Git branch for auto-deploy.

---

## 7. Post-Deployment Configuration

- [ ] Configure Stripe webhook with deployed URL
- [ ] Set up custom domain (optional)
  ```bash
  firebase apphosting:backends:update --custom-domain=bugrit.example.com
  ```
- [ ] Verify Firebase Auth authorized domains include your domain
- [ ] Test authentication flow end-to-end

---

## 8. Verify Installation

Run these checks to confirm everything is working:

- [ ] **Health Check**: `curl https://your-worker-url/health`
- [ ] **Auth**: Sign up and sign in works
- [ ] **Scan**: Run a basic scan on a test URL
- [ ] **Billing**: Test checkout flow with Stripe test card
- [ ] **Credits**: Verify credit deduction after scan
- [ ] **AI Features**: Test AI explanation on a scan result

---

## Quick Reference: Required Secrets

| Secret Name | Where Used | How to Get |
|-------------|------------|------------|
| `stripe-secret-key` | App Hosting | Stripe Dashboard |
| `bugrit-worker-secret` | Worker ↔ App | Auto-generated by deploy script |
| Firebase Admin Key | App Hosting | GCP Console → IAM → Service Accounts |
| `GOOGLE_API_KEY` | Genkit AI | Google AI Studio |

---

## Estimated Setup Time

| Step | Time |
|------|------|
| GCP/Firebase setup | 15 min |
| Stripe setup | 10 min |
| Worker deployment | 10 min |
| App deployment | 5 min |
| Testing | 15 min |
| **Total** | ~1 hour |
