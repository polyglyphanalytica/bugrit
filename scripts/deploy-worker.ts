#!/usr/bin/env npx ts-node

/**
 * Bugrit Scan Worker Deployment Script
 *
 * Deploys the scan worker to Google Cloud Run with all required
 * configuration for Chromium, Puppeteer, and Docker-in-Docker support.
 *
 * Usage:
 *   npx ts-node scripts/deploy-worker.ts
 *
 * Required environment variables:
 *   - GOOGLE_CLOUD_PROJECT: GCP project ID
 *   - GOOGLE_CLOUD_REGION: GCP region (default: us-central1)
 *
 * Optional:
 *   - WORKER_IMAGE_NAME: Docker image name (default: bugrit-scan-worker)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || '';
const REGION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const IMAGE_NAME = process.env.WORKER_IMAGE_NAME || 'bugrit-scan-worker';
const SERVICE_NAME = 'bugrit-scan-worker';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: number, total: number, message: string) {
  log(`\n[${step}/${total}] ${message}`, 'cyan');
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠ ${message}`, 'yellow');
}

function exec(command: string, options: { silent?: boolean } = {}): string {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
    });
    return result || '';
  } catch (error: unknown) {
    if (error instanceof Error && 'stdout' in error) {
      return (error as { stdout: string }).stdout || '';
    }
    throw error;
  }
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  log('\n🔧 Bugrit Scan Worker Deployment', 'bright');
  log('================================\n', 'bright');

  const totalSteps = 10;
  let currentStep = 0;

  // Step 1: Validate prerequisites
  logStep(++currentStep, totalSteps, 'Validating prerequisites...');

  if (!PROJECT_ID) {
    logError('GOOGLE_CLOUD_PROJECT environment variable is required');
    log('\nSet it with: export GOOGLE_CLOUD_PROJECT=your-project-id');
    process.exit(1);
  }

  // Check gcloud CLI
  try {
    exec('gcloud --version', { silent: true });
    logSuccess('gcloud CLI is installed');
  } catch {
    logError('gcloud CLI is not installed');
    log('\nInstall it from: https://cloud.google.com/sdk/docs/install');
    process.exit(1);
  }

  // Check Docker
  try {
    exec('docker --version', { silent: true });
    logSuccess('Docker is installed');
  } catch {
    logError('Docker is not installed');
    log('\nInstall it from: https://docs.docker.com/get-docker/');
    process.exit(1);
  }

  // Step 2: Authenticate with GCP
  logStep(++currentStep, totalSteps, 'Checking GCP authentication...');

  try {
    const account = exec('gcloud config get-value account', { silent: true }).trim();
    if (account) {
      logSuccess(`Authenticated as: ${account}`);
    } else {
      logWarning('Not authenticated. Running gcloud auth login...');
      exec('gcloud auth login');
    }
  } catch {
    logWarning('Authentication check failed. Running gcloud auth login...');
    exec('gcloud auth login');
  }

  // Step 3: Check IAM permissions
  logStep(++currentStep, totalSteps, 'Checking IAM permissions...');

  const missingPermissions: string[] = [];

  try {
    // Test run.admin - try to list services
    exec(`gcloud run services list --project=${PROJECT_ID} --region=${REGION} --limit=1`, { silent: true });
    logSuccess('Cloud Run access: OK');
  } catch {
    missingPermissions.push('roles/run.admin (or roles/run.developer)');
  }

  try {
    // Test storage access for GCR
    exec(`gcloud container images list --repository=gcr.io/${PROJECT_ID} --limit=1 2>/dev/null || true`, { silent: true });
    logSuccess('Container Registry access: OK');
  } catch {
    missingPermissions.push('roles/storage.admin (for Container Registry)');
  }

  try {
    // Test secret manager access
    exec(`gcloud secrets list --project=${PROJECT_ID} --limit=1`, { silent: true });
    logSuccess('Secret Manager access: OK');
  } catch {
    missingPermissions.push('roles/secretmanager.admin');
  }

  if (missingPermissions.length > 0) {
    logWarning('Missing IAM permissions detected:');
    missingPermissions.forEach(p => log(`  - ${p}`, 'yellow'));
    log('\nSee docs/CLOUD_RUN_IAM.md for required permissions.\n');

    const continueAnyway = await prompt('Continue anyway? (y/N): ');
    if (continueAnyway.toLowerCase() !== 'y') {
      log('Aborting deployment. Please configure IAM permissions first.');
      process.exit(1);
    }
  }

  // Step 4: Configure Docker for GCR
  logStep(++currentStep, totalSteps, 'Configuring Docker for Google Container Registry...');

  try {
    exec('gcloud auth configure-docker gcr.io --quiet', { silent: true });
    logSuccess('Docker configured for GCR');
  } catch (error) {
    logError('Failed to configure Docker for GCR');
    throw error;
  }

  // Step 5: Enable required APIs
  logStep(++currentStep, totalSteps, 'Enabling required Google Cloud APIs...');

  const apis = [
    'run.googleapis.com',
    'containerregistry.googleapis.com',
    'cloudbuild.googleapis.com',
    'secretmanager.googleapis.com',
  ];

  for (const api of apis) {
    try {
      exec(`gcloud services enable ${api} --project=${PROJECT_ID}`, { silent: true });
      logSuccess(`Enabled: ${api}`);
    } catch {
      logWarning(`Could not enable ${api} (may already be enabled)`);
    }
  }

  // Step 6: Create Cloud Storage bucket for scan outputs
  logStep(++currentStep, totalSteps, 'Creating Cloud Storage bucket for scan outputs...');

  const SCAN_BUCKET = `${PROJECT_ID}-bugrit-scans`;

  try {
    // Check if bucket exists
    exec(`gsutil ls gs://${SCAN_BUCKET}`, { silent: true });
    logSuccess(`Bucket ${SCAN_BUCKET} already exists`);
  } catch {
    // Create the bucket
    try {
      exec(`gsutil mb -p ${PROJECT_ID} -l ${REGION} gs://${SCAN_BUCKET}`);
      logSuccess(`Created bucket: ${SCAN_BUCKET}`);

      // Set lifecycle policy to auto-delete old files (30 days)
      const lifecycleConfig = {
        rule: [
          {
            action: { type: 'Delete' },
            condition: { age: 30 },
          },
        ],
      };

      const tempLifecycleFile = `/tmp/bugrit-lifecycle-${Date.now()}.json`;
      fs.writeFileSync(tempLifecycleFile, JSON.stringify(lifecycleConfig));
      exec(`gsutil lifecycle set ${tempLifecycleFile} gs://${SCAN_BUCKET}`, { silent: true });
      fs.unlinkSync(tempLifecycleFile);

      logSuccess('Set 30-day lifecycle policy on bucket');
    } catch (err) {
      logWarning(`Could not create bucket ${SCAN_BUCKET} (may already exist or lack permissions)`);
    }
  }

  // Step 7: Build Docker image
  logStep(++currentStep, totalSteps, 'Building Docker image (with Cloud Build support)...');

  const workerDir = path.join(__dirname, '..', 'worker');
  const dockerfile = path.join(workerDir, 'Dockerfile');
  const imageTag = `gcr.io/${PROJECT_ID}/${IMAGE_NAME}:latest`;
  const imageTagVersion = `gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${Date.now()}`;

  if (!fs.existsSync(dockerfile)) {
    logError(`Dockerfile not found at ${dockerfile}`);
    process.exit(1);
  }

  log(`Building image: ${imageTag}`);
  try {
    exec(`docker build -t ${imageTag} -t ${imageTagVersion} -f ${dockerfile} .`);
    logSuccess('Docker image built successfully');
  } catch (error) {
    logError('Docker build failed');
    throw error;
  }

  // Step 7: Push to GCR
  logStep(++currentStep, totalSteps, 'Pushing image to Google Container Registry...');

  try {
    exec(`docker push ${imageTag}`);
    exec(`docker push ${imageTagVersion}`);
    logSuccess('Image pushed to GCR');
  } catch (error) {
    logError('Failed to push image to GCR');
    throw error;
  }

  // Step 8: Create secrets if they don't exist
  logStep(++currentStep, totalSteps, 'Setting up secrets...');

  try {
    // Check if secret exists
    exec(`gcloud secrets describe bugrit-worker-secret --project=${PROJECT_ID}`, { silent: true });
    logSuccess('Secret bugrit-worker-secret already exists');
  } catch {
    // Generate a secure random secret
    const crypto = require('crypto');
    const workerSecret = crypto.randomBytes(32).toString('base64url');

    log('Creating worker secret in Secret Manager...');
    try {
      // Create secret using a temp file (not echoing to console)
      const tempSecretFile = `/tmp/bugrit-secret-${Date.now()}`;
      fs.writeFileSync(tempSecretFile, workerSecret, { mode: 0o600 });
      exec(`gcloud secrets create bugrit-worker-secret --data-file=${tempSecretFile} --project=${PROJECT_ID}`);
      fs.unlinkSync(tempSecretFile); // Delete temp file immediately

      logSuccess('Created secret: bugrit-worker-secret');
      log('\n   Secret stored securely in Google Secret Manager.', 'green');
      log('   To retrieve it for App Hosting, run:', 'yellow');
      log(`   gcloud secrets versions access latest --secret=bugrit-worker-secret --project=${PROJECT_ID}\n`, 'cyan');
    } catch {
      logWarning('Could not create secret (may already exist)');
    }
  }

  // Step 9: Deploy to Cloud Run
  logStep(++currentStep, totalSteps, 'Deploying to Cloud Run...');

  const deployCommand = `
    gcloud run deploy ${SERVICE_NAME} \
      --image=${imageTagVersion} \
      --project=${PROJECT_ID} \
      --region=${REGION} \
      --platform=managed \
      --memory=8Gi \
      --cpu=4 \
      --timeout=900 \
      --concurrency=1 \
      --max-instances=10 \
      --min-instances=0 \
      --set-env-vars="NODE_ENV=production,PUPPETEER_SKIP_DOWNLOAD=true,PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},SCAN_OUTPUT_BUCKET=${PROJECT_ID}-bugrit-scans" \
      --set-secrets="WORKER_SECRET=bugrit-worker-secret:latest" \
      --no-allow-unauthenticated \
      --service-account=bugrit-worker@${PROJECT_ID}.iam.gserviceaccount.com \
      --quiet
  `.trim().replace(/\s+/g, ' ');

  // First, create service account if it doesn't exist
  try {
    exec(`gcloud iam service-accounts describe bugrit-worker@${PROJECT_ID}.iam.gserviceaccount.com --project=${PROJECT_ID}`, { silent: true });
    logSuccess('Service account already exists');
  } catch {
    log('Creating service account...');
    exec(`gcloud iam service-accounts create bugrit-worker --display-name="Bugrit Scan Worker" --project=${PROJECT_ID}`);
    logSuccess('Created service account: bugrit-worker');
  }

  // Grant the service account permission to access the secret
  try {
    exec(`gcloud secrets add-iam-policy-binding bugrit-worker-secret \
      --member="serviceAccount:bugrit-worker@${PROJECT_ID}.iam.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor" \
      --project=${PROJECT_ID}`, { silent: true });
    logSuccess('Granted secret access to worker SA');
  } catch {
    logWarning('Could not grant secret access (may already be configured)');
  }

  // Grant the service account permissions for Cloud Build and Storage
  try {
    exec(`gcloud projects add-iam-policy-binding ${PROJECT_ID} \
      --member="serviceAccount:bugrit-worker@${PROJECT_ID}.iam.gserviceaccount.com" \
      --role="roles/cloudbuild.builds.editor"`, { silent: true });
    logSuccess('Granted Cloud Build access to worker SA');
  } catch {
    logWarning('Could not grant Cloud Build access (may already be configured)');
  }

  try {
    exec(`gcloud projects add-iam-policy-binding ${PROJECT_ID} \
      --member="serviceAccount:bugrit-worker@${PROJECT_ID}.iam.gserviceaccount.com" \
      --role="roles/storage.objectAdmin"`, { silent: true });
    logSuccess('Granted Cloud Storage access to worker SA');
  } catch {
    logWarning('Could not grant Cloud Storage access (may already be configured)');
  }

  try {
    exec(deployCommand);
    logSuccess('Deployed to Cloud Run');
  } catch (error) {
    logError('Deployment failed');
    throw error;
  }

  // Get service URL
  const serviceUrl = exec(
    `gcloud run services describe ${SERVICE_NAME} --project=${PROJECT_ID} --region=${REGION} --format="value(status.url)"`,
    { silent: true }
  ).trim();

  // Summary
  log('\n========================================', 'bright');
  log('🎉 Deployment Complete!', 'green');
  log('========================================\n', 'bright');

  log('Service URL:', 'cyan');
  log(`  ${serviceUrl}\n`);

  log('Next steps:', 'yellow');
  log('1. Add these environment variables to your App Hosting configuration:');
  log(`   SCAN_WORKER_URL=${serviceUrl}`);
  log(`   WORKER_SECRET=$(gcloud secrets versions access latest --secret=bugrit-worker-secret --project=${PROJECT_ID})\n`);

  log('2. Grant the App Hosting service account permission to invoke the worker:');
  log(`   gcloud run services add-iam-policy-binding ${SERVICE_NAME} \\`);
  log(`     --member="serviceAccount:YOUR_APP_HOSTING_SA@${PROJECT_ID}.iam.gserviceaccount.com" \\`);
  log(`     --role="roles/run.invoker" \\`);
  log(`     --region=${REGION} \\`);
  log(`     --project=${PROJECT_ID}\n`);

  log('3. Test the worker:');
  log(`   curl ${serviceUrl}/health\n`);
}

// Run the script
main().catch(error => {
  logError(`Deployment failed: ${error.message}`);
  process.exit(1);
});
