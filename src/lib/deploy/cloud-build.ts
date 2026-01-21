/**
 * Cloud Build Module for Docker-based Scans
 *
 * Runs Docker-based security tools (OWASP ZAP, Dependency Check, etc.)
 * via Google Cloud Build API since Cloud Run doesn't support Docker-in-Docker.
 *
 * Architecture:
 * 1. Cloud Run worker receives scan request
 * 2. For Docker-based tools, triggers Cloud Build job
 * 3. Cloud Build runs the Docker image with source code
 * 4. Results are written to Cloud Storage
 * 5. Worker fetches results and returns to client
 */

import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';

const cloudbuild = google.cloudbuild('v1');

// Tool configurations for Cloud Build
export const DOCKER_TOOLS = {
  'owasp-zap': {
    image: 'owasp/zap2docker-stable',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'owasp/zap2docker-stable',
        entrypoint: 'zap-baseline.py',
        args: ['-t', targetUrl, '-J', '/workspace/zap-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/zap-report.json', `gs://${outputBucket}/${jobId}/zap-report.json`],
      },
    ],
  },
  'dependency-check': {
    image: 'owasp/dependency-check',
    timeout: '1200s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'owasp/dependency-check',
        args: [
          '--scan', '/workspace/source',
          '--format', 'JSON',
          '--out', '/workspace/dependency-check-report.json',
          '--prettyPrint',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/dependency-check-report.json', `gs://${outputBucket}/${jobId}/dependency-check-report.json`],
      },
    ],
  },
  'sitespeed': {
    image: 'sitespeedio/sitespeed.io:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'sitespeedio/sitespeed.io:latest',
        args: [targetUrl, '-n', '3', '--outputFolder', '/workspace/sitespeed'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', '/workspace/sitespeed/*', `gs://${outputBucket}/${jobId}/sitespeed/`],
      },
    ],
  },
  'codeclimate': {
    image: 'codeclimate/codeclimate',
    timeout: '900s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'codeclimate/codeclimate',
        entrypoint: 'sh',
        args: ['-c', 'cd /workspace/source && codeclimate analyze -f json > /workspace/codeclimate-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/codeclimate-report.json', `gs://${outputBucket}/${jobId}/codeclimate-report.json`],
      },
    ],
  },
  'trivy': {
    image: 'aquasec/trivy:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'aquasec/trivy:latest',
        args: ['fs', '--format', 'json', '--output', '/workspace/trivy-report.json', '/workspace/source'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/trivy-report.json', `gs://${outputBucket}/${jobId}/trivy-report.json`],
      },
    ],
  },
  'grype': {
    image: 'anchore/grype:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'anchore/grype:latest',
        args: ['dir:/workspace/source', '-o', 'json', '--file', '/workspace/grype-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/grype-report.json', `gs://${outputBucket}/${jobId}/grype-report.json`],
      },
    ],
  },
} as const;

export type DockerToolId = keyof typeof DOCKER_TOOLS;

export interface CloudBuildConfig {
  projectId: string;
  region?: string;
  outputBucket: string;
  serviceAccount?: string;
}

export interface BuildJobRequest {
  toolId: DockerToolId;
  target: string; // URL for web tools, GCS path for source tools
  scanId: string;
  timeout?: string;
}

export interface BuildJobResult {
  success: boolean;
  jobId: string;
  status: 'QUEUED' | 'WORKING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CANCELLED';
  outputPath?: string;
  error?: string;
  duration?: number;
}

/**
 * Get authenticated client using Application Default Credentials
 */
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return auth.getClient();
}

/**
 * Cloud Build client for running Docker-based scans
 */
export class CloudBuildRunner {
  private config: CloudBuildConfig;
  private storage: Storage;

  constructor(config: CloudBuildConfig) {
    this.config = config;
    this.storage = new Storage({ projectId: config.projectId });
  }

  /**
   * Check if a tool requires Cloud Build (vs running locally)
   */
  static requiresCloudBuild(toolId: string): boolean {
    return toolId in DOCKER_TOOLS;
  }

  /**
   * Submit a build job for a Docker-based tool
   */
  async submitJob(request: BuildJobRequest): Promise<BuildJobResult> {
    const { toolId, target, scanId } = request;
    const tool = DOCKER_TOOLS[toolId];

    if (!tool) {
      return {
        success: false,
        jobId: '',
        status: 'FAILURE',
        error: `Unknown tool: ${toolId}`,
      };
    }

    const jobId = `${scanId}-${toolId}-${Date.now()}`;

    try {
      const authClient = await getAuthClient();
      google.options({ auth: authClient });

      // Build the Cloud Build configuration
      const buildConfig = {
        steps: tool.buildSteps(target, this.config.outputBucket, jobId),
        timeout: request.timeout || tool.timeout,
        options: {
          machineType: 'E2_HIGHCPU_8',
          logging: 'CLOUD_LOGGING_ONLY',
        },
      };

      // Submit the build
      const response = await cloudbuild.projects.builds.create({
        projectId: this.config.projectId,
        requestBody: buildConfig,
      });

      const buildId = response.data.metadata?.build?.id;

      if (!buildId) {
        return {
          success: false,
          jobId,
          status: 'FAILURE',
          error: 'Failed to get build ID from response',
        };
      }

      return {
        success: true,
        jobId: buildId,
        status: 'QUEUED',
        outputPath: `gs://${this.config.outputBucket}/${jobId}/`,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        jobId,
        status: 'FAILURE',
        error: err.message,
      };
    }
  }

  /**
   * Wait for a build job to complete
   */
  async waitForJob(buildId: string, timeoutMs: number = 600000): Promise<BuildJobResult> {
    const startTime = Date.now();

    try {
      const authClient = await getAuthClient();
      google.options({ auth: authClient });

      while (Date.now() - startTime < timeoutMs) {
        const response = await cloudbuild.projects.builds.get({
          projectId: this.config.projectId,
          id: buildId,
        });

        const build = response.data;
        const status = build.status as BuildJobResult['status'];

        if (status === 'SUCCESS' || status === 'FAILURE' || status === 'TIMEOUT' || status === 'CANCELLED') {
          return {
            success: status === 'SUCCESS',
            jobId: buildId,
            status,
            duration: Date.now() - startTime,
            error: status !== 'SUCCESS' ? `Build ${status.toLowerCase()}` : undefined,
          };
        }

        // Wait 5 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      return {
        success: false,
        jobId: buildId,
        status: 'TIMEOUT',
        error: 'Timed out waiting for build to complete',
        duration: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        jobId: buildId,
        status: 'FAILURE',
        error: err.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Run a Docker tool and wait for results
   */
  async runTool(request: BuildJobRequest): Promise<{
    result: BuildJobResult;
    output?: unknown;
  }> {
    // Submit the job
    const submitResult = await this.submitJob(request);

    if (!submitResult.success) {
      return { result: submitResult };
    }

    // Wait for completion
    const waitResult = await this.waitForJob(submitResult.jobId);

    if (!waitResult.success) {
      return { result: waitResult };
    }

    // Fetch results from Cloud Storage
    try {
      const output = await this.fetchResults(request.toolId, submitResult.outputPath!);
      return {
        result: waitResult,
        output,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        result: {
          ...waitResult,
          success: false,
          error: `Failed to fetch results: ${err.message}`,
        },
      };
    }
  }

  /**
   * Fetch results from Cloud Storage
   */
  private async fetchResults(toolId: DockerToolId, outputPath: string): Promise<unknown> {
    // Parse GCS path
    const match = outputPath.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid GCS path: ${outputPath}`);
    }

    const [, bucket, prefix] = match;

    // Determine the expected output file
    const outputFiles: Record<DockerToolId, string> = {
      'owasp-zap': 'zap-report.json',
      'dependency-check': 'dependency-check-report.json',
      'sitespeed': 'sitespeed/browsertime.summary-total.json',
      'codeclimate': 'codeclimate-report.json',
      'trivy': 'trivy-report.json',
      'grype': 'grype-report.json',
    };

    const outputFile = outputFiles[toolId];
    const filePath = `${prefix}${outputFile}`;

    // Download and parse the file
    const [contents] = await this.storage.bucket(bucket).file(filePath).download();
    return JSON.parse(contents.toString('utf-8'));
  }

  /**
   * Upload source code to Cloud Storage for scanning
   */
  async uploadSource(localPath: string, scanId: string): Promise<string> {
    const destPath = `scans/${scanId}/source`;
    const bucket = this.storage.bucket(this.config.outputBucket);

    const fs = await import('fs');
    const path = await import('path');
    const { promisify } = await import('util');
    const readdir = promisify(fs.readdir);
    const stat = promisify(fs.stat);

    // Recursively upload files
    async function uploadDir(dir: string, prefix: string) {
      const entries = await readdir(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // Skip common directories
          if (['node_modules', '.git', 'dist', 'build'].includes(entry)) {
            continue;
          }
          await uploadDir(fullPath, `${prefix}${entry}/`);
        } else {
          const destFile = `${destPath}/${prefix}${entry}`;
          await bucket.upload(fullPath, { destination: destFile });
        }
      }
    }

    await uploadDir(localPath, '');

    return `${this.config.outputBucket}/${destPath}`;
  }

  /**
   * Clean up scan artifacts from Cloud Storage
   */
  async cleanup(scanId: string): Promise<void> {
    const bucket = this.storage.bucket(this.config.outputBucket);

    try {
      await bucket.deleteFiles({
        prefix: `scans/${scanId}/`,
      });
    } catch (error) {
      console.error(`Failed to cleanup scan ${scanId}:`, error);
    }
  }
}

/**
 * Create a Cloud Build runner with default configuration
 */
export function createCloudBuildRunner(): CloudBuildRunner | null {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const outputBucket = process.env.SCAN_OUTPUT_BUCKET || `${projectId}-bugrit-scans`;

  if (!projectId) {
    console.warn('GOOGLE_CLOUD_PROJECT not set, Cloud Build runner unavailable');
    return null;
  }

  return new CloudBuildRunner({
    projectId,
    outputBucket,
  });
}
