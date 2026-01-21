# Cloud Run Worker IAM Configuration

This document outlines the IAM permissions required for deploying and running the Bugrit scan worker on Google Cloud Run.

## Overview

The hybrid architecture uses two service accounts:
1. **Deployer Account** - Used by CI/CD or admin to deploy the worker
2. **Worker Service Account** - Used by the running Cloud Run service

## 1. Deployer IAM Permissions

The account running `npm run deploy:worker` needs these roles:

### Required Roles

```bash
# Project-level roles needed for deployment
DEPLOYER_EMAIL="your-deployer@your-project.iam.gserviceaccount.com"
PROJECT_ID="your-project-id"

# Cloud Run Admin - create/update services
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/run.admin"

# Service Account User - deploy as service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/iam.serviceAccountUser"

# Storage Admin - push to Container Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/storage.admin"

# Secret Manager Admin - create/manage secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/secretmanager.admin"

# Service Usage Admin - enable APIs
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/serviceusage.serviceUsageAdmin"
```

### Alternative: Custom Role (Least Privilege)

For production, create a custom role with only the necessary permissions:

```bash
gcloud iam roles create bugritDeployer \
  --project=$PROJECT_ID \
  --title="Bugrit Worker Deployer" \
  --description="Deploy Bugrit scan worker to Cloud Run" \
  --permissions="\
run.services.create,\
run.services.update,\
run.services.get,\
run.services.getIamPolicy,\
run.services.setIamPolicy,\
storage.buckets.create,\
storage.buckets.get,\
storage.objects.create,\
storage.objects.get,\
storage.objects.list,\
secretmanager.secrets.create,\
secretmanager.secrets.get,\
secretmanager.versions.add,\
secretmanager.versions.access,\
iam.serviceAccounts.actAs,\
serviceusage.services.enable"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="projects/$PROJECT_ID/roles/bugritDeployer"
```

## 2. Worker Service Account Permissions

The worker service account (`bugrit-worker@$PROJECT_ID.iam.gserviceaccount.com`) needs:

### Required Roles

```bash
WORKER_SA="bugrit-worker@$PROJECT_ID.iam.gserviceaccount.com"

# Access secrets (for WORKER_SECRET)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$WORKER_SA" \
  --role="roles/secretmanager.secretAccessor"

# If using Firebase/Firestore for results storage
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$WORKER_SA" \
  --role="roles/datastore.user"

# If using Cloud Storage for scan artifacts
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$WORKER_SA" \
  --role="roles/storage.objectAdmin"
```

### Cloud Build Access (for Docker-based tools)

The worker uses Cloud Build to run Docker-based security tools (OWASP ZAP, Trivy, etc.):

```bash
# Cloud Build - submit and monitor builds
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$WORKER_SA" \
  --role="roles/cloudbuild.builds.editor"

# Storage - upload source and fetch results
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$WORKER_SA" \
  --role="roles/storage.objectAdmin"
```

### No External Network Roles Needed

The worker does NOT need:
- `roles/compute.admin` - No VMs created
- `roles/container.admin` - No GKE clusters
- Docker socket access - Docker tools run via Cloud Build, not Docker-in-Docker

## 3. App Hosting → Worker Invocation

The App Hosting service account needs permission to invoke the Cloud Run worker:

```bash
APP_HOSTING_SA="firebase-app-hosting@$PROJECT_ID.iam.gserviceaccount.com"
# Or find your actual SA with: gcloud run services describe bugrit-web --region=us-central1

gcloud run services add-iam-policy-binding bugrit-scan-worker \
  --member="serviceAccount:$APP_HOSTING_SA" \
  --role="roles/run.invoker" \
  --region=us-central1 \
  --project=$PROJECT_ID
```

## 4. Secret Access

### Worker accessing WORKER_SECRET

The Cloud Run service is configured to mount the secret via `--set-secrets`:
```yaml
env:
  - name: WORKER_SECRET
    valueFrom:
      secretKeyRef:
        name: bugrit-worker-secret
        key: latest
```

This requires the worker SA to have `secretmanager.versions.access` permission on the secret:

```bash
gcloud secrets add-iam-policy-binding bugrit-worker-secret \
  --member="serviceAccount:$WORKER_SA" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

### App Hosting accessing WORKER_SECRET

For the App Hosting app to read the secret (to set WORKER_SECRET env var):

```bash
gcloud secrets add-iam-policy-binding bugrit-worker-secret \
  --member="serviceAccount:$APP_HOSTING_SA" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID
```

## 5. Complete Setup Script

Run this after initial project setup:

```bash
#!/bin/bash
set -e

PROJECT_ID="your-project-id"
REGION="us-central1"
DEPLOYER_EMAIL="deployer@your-project.iam.gserviceaccount.com"  # Or user:you@example.com
APP_HOSTING_SA="firebase-app-hosting@$PROJECT_ID.iam.gserviceaccount.com"

# Create worker service account
gcloud iam service-accounts create bugrit-worker \
  --display-name="Bugrit Scan Worker" \
  --project=$PROJECT_ID

WORKER_SA="bugrit-worker@$PROJECT_ID.iam.gserviceaccount.com"

# Grant deployer permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$DEPLOYER_EMAIL" \
  --role="roles/secretmanager.admin"

# Grant worker permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$WORKER_SA" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$WORKER_SA" \
  --role="roles/datastore.user"

# Grant App Hosting permission to invoke worker (run after deployment)
# gcloud run services add-iam-policy-binding bugrit-scan-worker \
#   --member="serviceAccount:$APP_HOSTING_SA" \
#   --role="roles/run.invoker" \
#   --region=$REGION \
#   --project=$PROJECT_ID

echo "IAM setup complete. Now run: npm run deploy:worker"
```

## 6. Security Best Practices

1. **Use Workload Identity** for CI/CD instead of service account keys
2. **Rotate secrets** periodically using Secret Manager versions
3. **Restrict network** - Worker should only be callable by App Hosting SA
4. **Audit logs** - Enable Cloud Audit Logs for run.googleapis.com
5. **No `allUsers`** - Never allow unauthenticated access to the worker

## 7. Troubleshooting

### "Permission denied" on deployment
```bash
# Check current permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:$DEPLOYER_EMAIL"
```

### "Secret not found" error
```bash
# Verify secret exists
gcloud secrets list --project=$PROJECT_ID

# Check secret access
gcloud secrets versions access latest \
  --secret=bugrit-worker-secret \
  --project=$PROJECT_ID
```

### Worker can't be invoked
```bash
# Check IAM policy on the service
gcloud run services get-iam-policy bugrit-scan-worker \
  --region=$REGION \
  --project=$PROJECT_ID
```
