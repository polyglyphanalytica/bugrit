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

## Tool Updates (Ongoing)

Bugrit uses **118 tools total**: 115 scanning tools + 3 browser testing platforms.

### Update Strategy by Category

| Category | Count | Update Mechanism | Frequency |
|----------|-------|------------------|-----------|
| Docker-based tools | 78 | Cloud Build (`infra/update-tools.yaml`) | Weekly (automated) |
| NPM-based tools | 37 | Dependabot (`.github/dependabot.yml`) | Weekly (PRs) |
| Browser testing (Lighthouse, axe, Pa11y) | 3 | Dependabot + Worker rebuild | Weekly |
| Runtime-updating | 4 | Self-updating at scan time | Automatic |

### Automatic (No Action Required)

These tools download fresh databases/rules at scan time:
- **Trivy**: Downloads CVE databases before each scan
- **Grype**: Downloads vulnerability database before each scan
- **Semgrep**: Fetches rules from registry at runtime
- **Nuclei**: Downloads community templates at scan time

### Weekly: Docker Images (Cloud Build)

The `infra/update-tools.yaml` pulls 65 Docker images covering all 78 Docker-based tools.

```bash
# One-time setup: Create Cloud Scheduler job
gcloud scheduler jobs create http update-security-tools \
  --schedule="0 3 * * 0" \
  --uri="https://cloudbuild.googleapis.com/v1/projects/PROJECT/triggers/update-tools:run" \
  --http-method=POST \
  --oidc-service-account-email=YOUR_SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com
```

**Tools covered by Cloud Build updates:**

Security (20): semgrep, gitleaks, trivy, grype, nuclei, checkov, trufflehog, bearer, owasp-zap, dependency-check, osv-scanner, clair, falco, cosign, bandit, gosec, brakeman, slither, infer, garak

Container/IaC (5): tfsec, dockle, hadolint, kics, terrascan

Cloud Native/K8s (6): kubesec, kube-bench, polaris, kube-hunter, prowler, steampipe

Code Quality (20): codeclimate, sonar-scanner, phpstan, psalm, spotbugs, pmd, checkstyle, detekt, ktlint, scalafmt, scalafix, golangci-lint, ruff, cppcheck, shellcheck, actionlint, yamllint, sqlfluff, vale, buf

Mobile (2): mobsf, swiftlint

Performance (1): sitespeed

+ 9 base images (python, rust, ruby, node, dart, elixir, haskell) for pip/gem/cargo tools

### Weekly: NPM Packages (Dependabot)

The `.github/dependabot.yml` manages 40 npm packages including:

**Browser Testing Platforms (3):**
- `lighthouse` - Performance, SEO, best practices
- `@axe-core/cli`, `@axe-core/puppeteer` - WCAG accessibility
- `pa11y` - Automated accessibility testing

**Security Tools (6):** secretlint, better-npm-audit, audit-ci, lockfile-lint, eslint-plugin-security

**Linting Tools (5):** eslint, @biomejs/biome, stylelint, prettier, markdownlint

**Code Quality (7):** typescript, knip, jscpd, cspell, publint, madge, depcheck

**Dependency Tools (2):** license-checker, dependency-cruiser

**Documentation (3):** alex, remark-cli, @commitlint/cli

**Performance (2):** size-limit, @size-limit/preset-small-lib

Dependabot + Auto-merge is configured to:
- Group related tools to reduce PR noise
- Run weekly on Mondays at 9am PT
- **Auto-merge** minor and patch updates (no manual action needed)
- **Auto-test** before merging (typecheck, tests, build)
- Label major updates for manual review

### Fully Automated Weekly Schedule

| Day | Time | What Happens |
|-----|------|--------------|
| Sunday | 3:00 AM | Cloud Build pulls 65 Docker images, rebuilds worker |
| Monday | 9:00 AM | Dependabot opens PRs for 40 npm packages |
| Monday | ~9:15 AM | Auto-merge workflow tests and merges minor/patch PRs |

**No manual intervention required** for routine updates. The only items needing review are:
- Major version bumps (labeled `major-update, needs-review`)
- Failed build/test runs

### Manual Review Required (Major Updates Only)

Major version bumps for these packages get labeled for manual review:
- `next` (framework changes)
- `react`, `react-dom` (UI breaking changes)
- `typescript` (type checking changes)
- `firebase`, `firebase-admin` (auth/database changes)

### Monitoring Automated Updates

Check these weekly to ensure automation is working:
- [ ] GitHub Actions: Verify Dependabot PRs are auto-merging
- [ ] Cloud Build: Check `update-security-tools` job succeeded
- [ ] Cloud Run: Verify worker redeployed with latest tools
