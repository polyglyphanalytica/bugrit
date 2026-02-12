/**
 * Cloud Run Deployment Module
 *
 * Deploys the Bugrit scan worker to Google Cloud Run using the Admin API.
 * This enables a hybrid architecture:
 * - Firebase App Hosting: Web UI, auth, billing
 * - Cloud Run: Scan worker with Chromium/Puppeteer
 */

import { google } from 'googleapis';
import { devConsole } from '@/lib/console';

// Cloud Run Admin API client
const run = google.run('v2');

export interface CloudRunConfig {
  projectId: string;
  region: string;
  serviceName: string;
  imageUrl: string;
  memory?: string;
  cpu?: string;
  timeout?: string;
  maxInstances?: number;
  minInstances?: number;
  env?: Record<string, string>;
  secrets?: Record<string, string>; // secretName -> envVarName
  serviceAccount?: string;
  allowUnauthenticated?: boolean;
  internalOnly?: boolean;
}

export interface DeploymentResult {
  success: boolean;
  serviceUrl?: string;
  error?: string;
  revision?: string;
}

/**
 * Get authenticated client using Application Default Credentials
 */
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  // Cast to the expected type for googleapis compatibility
  return auth.getClient() as Promise<ReturnType<typeof auth.getClient> extends Promise<infer T> ? T : never>;
}

// Type for googleapis auth options
type AuthClient = Awaited<ReturnType<typeof getAuthClient>>;

/**
 * Build the full resource name for a Cloud Run service
 */
function getServiceName(projectId: string, region: string, serviceName: string): string {
  return `projects/${projectId}/locations/${region}/services/${serviceName}`;
}

/**
 * Check if a Cloud Run service exists
 */
export async function serviceExists(config: CloudRunConfig): Promise<boolean> {
  try {
    const authClient = await getAuthClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google.options({ auth: authClient as any });

    await run.projects.locations.services.get({
      name: getServiceName(config.projectId, config.region, config.serviceName),
    });
    return true;
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Deploy or update a Cloud Run service
 */
export async function deployService(config: CloudRunConfig): Promise<DeploymentResult> {
  try {
    const authClient = await getAuthClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google.options({ auth: authClient as any });

    const exists = await serviceExists(config);

    // Build service configuration
    const serviceConfig = buildServiceConfig(config);

    let operation;

    if (exists) {
      // Update existing service
      devConsole.log(`Updating existing service: ${config.serviceName}`);
      operation = await run.projects.locations.services.patch({
        name: getServiceName(config.projectId, config.region, config.serviceName),
        requestBody: serviceConfig,
      });
    } else {
      // Create new service
      devConsole.log(`Creating new service: ${config.serviceName}`);
      operation = await run.projects.locations.services.create({
        parent: `projects/${config.projectId}/locations/${config.region}`,
        serviceId: config.serviceName,
        requestBody: serviceConfig,
      });
    }

    // Wait for operation to complete
    const result = await waitForOperation(operation.data.name!, config.projectId);

    if (result.success) {
      // Get service URL
      const service = await run.projects.locations.services.get({
        name: getServiceName(config.projectId, config.region, config.serviceName),
      });

      // Set IAM policy if needed
      if (config.allowUnauthenticated) {
        await setPublicAccess(config);
      }

      return {
        success: true,
        serviceUrl: service.data.uri || undefined,
        revision: service.data.latestReadyRevision || undefined,
      };
    }

    return result;
  } catch (error: unknown) {
    const err = error as Error;
    devConsole.error('Deployment failed:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Build the Cloud Run service configuration
 */
function buildServiceConfig(config: CloudRunConfig) {
  // Environment variables
  const envVars = Object.entries(config.env || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Add Puppeteer-specific env vars for Chromium
  envVars.push(
    { name: 'PUPPETEER_SKIP_DOWNLOAD', value: 'true' },
    { name: 'PUPPETEER_EXECUTABLE_PATH', value: '/usr/bin/chromium' },
    { name: 'NODE_ENV', value: 'production' },
  );

  // Secret references
  const secretEnvVars = Object.entries(config.secrets || {}).map(([secretName, envVarName]) => ({
    name: envVarName,
    valueSource: {
      secretKeyRef: {
        secret: secretName,
        version: 'latest',
      },
    },
  }));

  return {
    template: {
      containers: [
        {
          image: config.imageUrl,
          resources: {
            limits: {
              memory: config.memory || '2Gi',
              cpu: config.cpu || '2',
            },
          },
          env: [...envVars, ...secretEnvVars],
          ports: [{ containerPort: 8080 }],
        },
      ],
      scaling: {
        maxInstanceCount: config.maxInstances || 10,
        minInstanceCount: config.minInstances || 0,
      },
      timeout: config.timeout || '300s',
      serviceAccount: config.serviceAccount,
    },
    ingress: config.internalOnly
      ? 'INGRESS_TRAFFIC_INTERNAL_ONLY'
      : 'INGRESS_TRAFFIC_ALL',
  };
}

/**
 * Wait for a long-running operation to complete
 */
async function waitForOperation(
  operationName: string,
  projectId: string,
  maxWaitMs: number = 300000
): Promise<DeploymentResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const operation = await run.projects.locations.operations.get({
        name: operationName,
      });

      if (operation.data.done) {
        if (operation.data.error) {
          return {
            success: false,
            error: operation.data.error.message || 'Operation failed',
          };
        }
        return { success: true };
      }

      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        error: `Failed to check operation status: ${err.message}`,
      };
    }
  }

  return {
    success: false,
    error: 'Operation timed out',
  };
}

/**
 * Set public access (allow unauthenticated) on a service
 */
async function setPublicAccess(config: CloudRunConfig): Promise<void> {
  const authClient = await getAuthClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google.options({ auth: authClient as any });

  await run.projects.locations.services.setIamPolicy({
    resource: getServiceName(config.projectId, config.region, config.serviceName),
    requestBody: {
      policy: {
        bindings: [
          {
            role: 'roles/run.invoker',
            members: ['allUsers'],
          },
        ],
      },
    },
  });
}

/**
 * Delete a Cloud Run service
 */
export async function deleteService(config: CloudRunConfig): Promise<DeploymentResult> {
  try {
    const authClient = await getAuthClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google.options({ auth: authClient as any });

    await run.projects.locations.services.delete({
      name: getServiceName(config.projectId, config.region, config.serviceName),
    });

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Get the URL of a deployed service
 */
export async function getServiceUrl(config: CloudRunConfig): Promise<string | null> {
  try {
    const authClient = await getAuthClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google.options({ auth: authClient as any });

    const service = await run.projects.locations.services.get({
      name: getServiceName(config.projectId, config.region, config.serviceName),
    });

    return service.data.uri || null;
  } catch (error) {
    return null;
  }
}

/**
 * Build and push Docker image to Google Container Registry
 */
export async function buildAndPushImage(
  projectId: string,
  imageName: string,
  dockerfilePath: string = './Dockerfile',
  contextPath: string = '.'
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const { execSync } = require('child_process');

  const imageUrl = `gcr.io/${projectId}/${imageName}:latest`;
  const imageUrlWithTag = `gcr.io/${projectId}/${imageName}:${Date.now()}`;

  try {
    // Build the image
    devConsole.log('Building Docker image...');
    execSync(
      `docker build -t ${imageUrl} -t ${imageUrlWithTag} -f ${dockerfilePath} ${contextPath}`,
      { stdio: 'inherit' }
    );

    // Push to GCR
    devConsole.log('Pushing to Google Container Registry...');
    execSync(`docker push ${imageUrl}`, { stdio: 'inherit' });
    execSync(`docker push ${imageUrlWithTag}`, { stdio: 'inherit' });

    return {
      success: true,
      imageUrl: imageUrlWithTag,
    };
  } catch (error: unknown) {
    const err = error as Error;
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Full deployment pipeline: build, push, and deploy
 */
export async function fullDeploy(
  config: Omit<CloudRunConfig, 'imageUrl'> & {
    imageName: string;
    dockerfilePath?: string;
    contextPath?: string;
  }
): Promise<DeploymentResult> {
  // Step 1: Build and push image
  devConsole.log('Step 1/2: Building and pushing Docker image...');
  const buildResult = await buildAndPushImage(
    config.projectId,
    config.imageName,
    config.dockerfilePath,
    config.contextPath
  );

  if (!buildResult.success) {
    return {
      success: false,
      error: `Image build failed: ${buildResult.error}`,
    };
  }

  // Step 2: Deploy to Cloud Run
  devConsole.log('Step 2/2: Deploying to Cloud Run...');
  const deployResult = await deployService({
    ...config,
    imageUrl: buildResult.imageUrl!,
  });

  return deployResult;
}
