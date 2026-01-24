# Bugrit Go-Live Checklist

Complete these checks before accepting production traffic.

---

## 1. Security Verification

### Authentication & Authorization
- [ ] Firebase Auth is using production credentials (not test)
- [ ] Session cookies have `secure: true` and `httpOnly: true`
- [ ] CORS is configured for production domain only
- [ ] Rate limiting is enabled on API routes
- [ ] Worker authentication is enforced (shared secret)

### Secrets Management
- [ ] All secrets stored in Google Secret Manager (not env files)
- [ ] No secrets in Git history (`git log -p | grep -i secret`)
- [ ] Firebase Admin key is NOT committed
- [ ] Stripe is using live keys, not test keys
- [ ] Worker secret is cryptographically random (32+ bytes)

### Infrastructure Security
- [ ] Cloud Run worker has `--no-allow-unauthenticated`
- [ ] Worker service account has minimal permissions
- [ ] App Hosting service account can invoke Cloud Run
- [ ] Secret accessor roles are scoped correctly

### Input Validation
- [ ] URL inputs are validated before scanning
- [ ] File uploads (if any) are sanitized
- [ ] SQL/NoSQL injection protected (Firestore is safe)
- [ ] XSS protection headers enabled (via Helmet)

---

## 2. Billing & Payments

### Stripe Configuration
- [ ] Using Stripe **live** API keys
- [ ] Webhook endpoint is registered and verified
- [ ] Webhook signature validation is enabled
- [ ] All four tiers have products/prices created
- [ ] Tax configuration (if applicable)

### Credit System
- [ ] Credit costs match documented pricing:
  | Tool | Credits |
  |------|---------|
  | Linting | 1 |
  | Security | 2 |
  | Dependencies | 1 |
  | Accessibility | 4 |
  | Performance | 5 |
  | AI Explanation | 0.1/issue |
  | AI Fix | 0.15/issue |

- [ ] Free tier gets 5 credits on signup
- [ ] Credit deduction happens atomically
- [ ] Overage handling works (blocks or allows)
- [ ] Monthly credit reset works via Stripe webhook

### Subscription Flow
- [ ] Checkout redirects to Stripe correctly
- [ ] Success callback updates Firestore
- [ ] Cancellation webhook handled
- [ ] Upgrade/downgrade works
- [ ] Invoice emails configured in Stripe

---

## 3. Scan Tools Verification

### Puppeteer-Based Tools (Cloud Run)
- [ ] Lighthouse performance scan works
- [ ] Axe-core accessibility scan works
- [ ] Pa11y accessibility scan works
- [ ] Screenshot capture works
- [ ] Scans complete within timeout (900s)

### Docker-Based Tools (Cloud Build)
- [ ] OWASP ZAP scan works
- [ ] Dependency Check scan works
- [ ] Sitespeed.io scan works
- [ ] Trivy container scan works
- [ ] Grype SBOM scan works
- [ ] Code Climate analysis works (if configured)
- [ ] Cloud Build timeout is sufficient (10 min)
- [ ] Scan results upload to Cloud Storage

### Local Analysis Tools
- [ ] ESLint analysis works
- [ ] Biome analysis works
- [ ] Secretlint detects secrets
- [ ] License checker works
- [ ] JSCPD duplicate detection works
- [ ] Madge dependency graph works

---

## 4. Monitoring & Observability

### Error Tracking
- [ ] Console errors are captured
- [ ] API errors return proper status codes
- [ ] Worker errors are logged with request IDs
- [ ] Error notifications configured (email/Slack)

### Logging
- [ ] Cloud Run logs enabled in Cloud Logging
- [ ] App Hosting logs accessible
- [ ] Request/response times logged
- [ ] Scan start/complete events logged

### Alerting (Recommended)
- [ ] Alert on error rate > 5%
- [ ] Alert on response time > 10s (API)
- [ ] Alert on Cloud Run cold starts > threshold
- [ ] Alert on credit balance anomalies
- [ ] Alert on Stripe webhook failures

### Metrics to Track
- [ ] Scan completion rate
- [ ] Average scan duration by tool
- [ ] Credit usage per user/tier
- [ ] Conversion rate (free → paid)
- [ ] MRR (Monthly Recurring Revenue)

---

## 5. Performance & Scalability

### Cloud Run Configuration
- [ ] Memory: 8GB (sufficient for Puppeteer)
- [ ] CPU: 4 cores
- [ ] Timeout: 900s (15 min)
- [ ] Concurrency: 1 (single scan per instance)
- [ ] Min instances: 0 (or 1 if cold starts unacceptable)
- [ ] Max instances: 10 (adjust based on load)

### Cloud Build Configuration
- [ ] Machine type appropriate for tools
- [ ] Timeout per tool is sufficient
- [ ] Concurrent build limit set

### Database
- [ ] Firestore indexes created for queries
- [ ] No N+1 query patterns
- [ ] Pagination on large collections

### CDN & Caching
- [ ] Static assets cached (Next.js handles this)
- [ ] API responses have appropriate cache headers
- [ ] Scan results cached (avoid re-scanning)

---

## 6. User Experience

### Onboarding
- [ ] Sign-up flow works end-to-end
- [ ] Welcome email configured
- [ ] First scan experience is smooth
- [ ] Free credits are visible after signup

### Core Flows
- [ ] Create scan → run → view results
- [ ] AI explanation generates correctly
- [ ] AI fix suggestion generates correctly
- [ ] Export results (if implemented)
- [ ] View scan history

### GitHub Integration
- [ ] Settings → Integrations page loads
- [ ] "Connect GitHub" redirects to GitHub OAuth
- [ ] OAuth callback saves connection successfully
- [ ] Connected state shows GitHub username
- [ ] Disconnect GitHub works
- [ ] Scanning private repo works after connecting (auto-injects token)

### Error Handling
- [ ] Failed scans show clear error messages
- [ ] Network errors have retry option
- [ ] Credit exhaustion shows upgrade prompt
- [ ] 404 pages are user-friendly

### Mobile Responsiveness
- [ ] Dashboard works on mobile
- [ ] Scan results readable on mobile
- [ ] Checkout works on mobile

---

## 7. Legal & Compliance

- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Cookie consent (if required in your region)
- [ ] GDPR data export capability (if EU users)
- [ ] Data retention policy documented
- [ ] Scan output storage lifecycle (30 days)

---

## 8. Documentation

- [ ] API documentation (if public API)
- [ ] User guide / help center
- [ ] Pricing page accurate
- [ ] FAQ section complete
- [ ] Contact/support method available

---

## 9. Backup & Recovery

- [ ] Firestore automatic backups enabled
- [ ] Backup retention period set
- [ ] Recovery procedure documented
- [ ] Test restore from backup

---

## 10. Deployment Infrastructure Setup

### GitHub Repository Secrets
- [ ] Add `GCP_PROJECT_ID` - Your Google Cloud project ID
- [ ] Add `GCP_SA_KEY` - Service account JSON key (base64 encoded)
- [ ] Add `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON key

### Enable Google Cloud APIs
- [ ] Enable Cloud Build API: `gcloud services enable cloudbuild.googleapis.com`
- [ ] Enable Cloud Run API: `gcloud services enable run.googleapis.com`
- [ ] Enable Artifact Registry API: `gcloud services enable artifactregistry.googleapis.com`
- [ ] Enable Secret Manager API: `gcloud services enable secretmanager.googleapis.com`
- [ ] Enable Firebase Hosting API: `gcloud services enable firebasehosting.googleapis.com`

### Create Artifact Registry Repository
- [ ] Create Docker repository for container images:
  ```bash
  gcloud artifacts repositories create bugrit \
    --repository-format=docker \
    --location=us-central1 \
    --description="Bugrit Docker images"
  ```

### Secret Manager Setup
- [ ] Create `FIREBASE_API_KEY` secret
- [ ] Create `FIREBASE_SERVICE_ACCOUNT_KEY` secret
- [ ] Create `ADMIN_ENCRYPTION_KEY` secret
- [ ] Create `STRIPE_SECRET_KEY` secret
- [ ] Create `STRIPE_WEBHOOK_SECRET` secret
- [ ] Create `GITHUB_CLIENT_ID` secret (for GitHub OAuth)
- [ ] Create `GITHUB_CLIENT_SECRET` secret (for GitHub OAuth)
- [ ] Create `GITHUB_APP_ID` secret (optional, for GitHub App installations)
- [ ] Create `GITHUB_APP_PRIVATE_KEY` secret (optional, for GitHub App)
- [ ] Create any additional secrets referenced in apphosting.yaml

### GitHub OAuth Setup (Private Repository Access)
- [ ] Create GitHub OAuth App at https://github.com/settings/developers
  - Application name: `Bugrit`
  - Homepage URL: `https://bugrit.com`
  - Authorization callback URL: `https://bugrit.com/api/auth/github/callback`
- [ ] Copy Client ID to `GITHUB_CLIENT_ID` secret
- [ ] Copy Client Secret to `GITHUB_CLIENT_SECRET` secret
- [ ] Set `GITHUB_REDIRECT_URI` to `https://bugrit.com/api/auth/github/callback`
- [ ] (Optional) Create GitHub App for organization installations:
  - Go to https://github.com/settings/apps/new
  - Set permissions: Contents (read), Metadata (read), Pull requests (write)
  - Generate and download private key
  - Add App ID to `GITHUB_APP_ID`
  - Add private key (with `\n` for newlines) to `GITHUB_APP_PRIVATE_KEY`

### IAM Permissions for Cloud Build Service Account
- [ ] Grant Cloud Run Admin role
- [ ] Grant Service Account User role
- [ ] Grant Secret Manager Secret Accessor role
- [ ] Grant Artifact Registry Writer role
- [ ] Grant Storage Admin role (for scan output bucket)

### Firebase Configuration
- [ ] Verify `.firebaserc` has correct project ID
- [ ] Deploy Firestore rules: `npm run deploy:firestore`
- [ ] Test Firebase emulators work: `npm run emulators`

### Cloud Run Service Configuration
- [ ] Verify service name matches `bugrit` in cloudbuild.yaml
- [ ] Verify region is set correctly (default: us-central1)
- [ ] Configure custom domain mapping (if needed)
- [ ] Set up SSL certificate for custom domain

### Test Deployments
- [ ] Test local build: `npm run build`
- [ ] Test Cloud Build deployment: `npm run deploy:cloudrun`
- [ ] Test Firebase Hosting deployment: `npm run deploy:hosting`
- [ ] Verify GitHub Actions workflow runs on push to main

### Verify Deployment URLs
- [ ] Cloud Run service is accessible
- [ ] Firebase Hosting serves static assets
- [ ] All rewrites to Cloud Run work correctly

---

## 11. Launch Day Checklist

### Before Launch
- [ ] DNS pointing to production
- [ ] SSL certificate valid
- [ ] All test data cleaned from production DB
- [ ] Stripe in live mode
- [ ] Analytics tracking code installed
- [ ] Status page set up (optional)

### During Launch
- [ ] Monitor error rates
- [ ] Monitor Cloud Run instance count
- [ ] Monitor Stripe dashboard for first payments
- [ ] Be ready to scale up instances if needed
- [ ] Have rollback plan ready

### After Launch
- [ ] Verify first real user signup
- [ ] Verify first real scan completes
- [ ] Verify first payment processes
- [ ] Check for any unexpected errors
- [ ] Celebrate! 🎉

---

## Quick Smoke Test Script

Run this sequence to verify critical paths:

```bash
# 1. Check worker health
curl -s https://YOUR_WORKER_URL/health | jq .

# 2. Check ready status
curl -s https://YOUR_WORKER_URL/ready | jq .

# 3. List available Docker tools
curl -s -H "Authorization: Bearer YOUR_WORKER_SECRET" \
  https://YOUR_WORKER_URL/docker-tools | jq .

# 4. Test homepage loads
curl -s -o /dev/null -w "%{http_code}" https://YOUR_APP_URL

# 5. Test API health
curl -s https://YOUR_APP_URL/api/health | jq .
```

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Firebase Support | https://firebase.google.com/support |
| GCP Support | https://cloud.google.com/support |
| Stripe Support | https://support.stripe.com |
| Your On-Call | [Add your contact] |

---

## Post-Launch Monitoring (First 48 Hours)

Check these metrics frequently:

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| Error rate | < 1% | Investigate logs |
| P95 latency | < 5s | Check Cloud Run scaling |
| Failed scans | < 5% | Check tool containers |
| Webhook failures | 0 | Check Stripe config |
| User complaints | 0 | Respond immediately |
