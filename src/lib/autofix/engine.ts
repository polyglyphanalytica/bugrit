/**
 * Autofix Orchestration Engine
 *
 * Coordinates the full autofix pipeline:
 * 1. Load scan findings
 * 2. Fetch source files from GitHub
 * 3. Generate fixes via the user's chosen AI provider
 * 4. Push all fixes to a single branch and open a PR
 *
 * One branch per scan run — all fixes committed together.
 * Enterprise tier only.
 */

import { db } from '@/lib/firebase/admin';
import {
  AutofixJob,
  AutofixJobStatus,
  AutofixSettings,
  FindingForFix,
  DEFAULT_AUTOFIX_SETTINGS,
} from './types';
import { getDecryptedKey } from './keys';
import { generateBatchFixesWithProvider } from './providers';
import { getGitHubToken, getRepoInfo, getFileContent, pushFixBranch } from './github';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

const JOBS_COLLECTION = 'autofixJobs';
const SETTINGS_COLLECTION = 'autofixSettings';

// ═══════════════════════════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════════════════════════

export async function getAutofixSettings(userId: string): Promise<AutofixSettings> {
  const doc = await db.collection(SETTINGS_COLLECTION).doc(userId).get();
  if (!doc.exists) {
    return { userId, ...DEFAULT_AUTOFIX_SETTINGS };
  }
  const data = doc.data()!;
  return {
    userId,
    enabled: data.enabled ?? false,
    autoRun: data.autoRun ?? false,
    provider: data.provider ?? null,
    github: {
      createPR: data.github?.createPR ?? true,
      branchPrefix: data.github?.branchPrefix || 'bugrit/autofix',
      minSeverity: data.github?.minSeverity || 'high',
      maxFindings: data.github?.maxFindings ?? 25,
    },
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
  };
}

export async function updateAutofixSettings(
  userId: string,
  updates: Partial<Omit<AutofixSettings, 'userId'>>
): Promise<AutofixSettings> {
  const current = await getAutofixSettings(userId);
  const merged: AutofixSettings = {
    ...current,
    ...updates,
    github: { ...current.github, ...updates.github },
    userId,
    updatedAt: new Date(),
  };

  await db.collection(SETTINGS_COLLECTION).doc(userId).set({
    ...merged,
    updatedAt: merged.updatedAt.toISOString(),
  }, { merge: true });

  return merged;
}

// ═══════════════════════════════════════════════════════════════
// Job Management
// ═══════════════════════════════════════════════════════════════

export async function getAutofixJob(jobId: string): Promise<AutofixJob | null> {
  const doc = await db.collection(JOBS_COLLECTION).doc(jobId).get();
  if (!doc.exists) return null;
  return docToJob(doc.data()!);
}

export async function getJobsForScan(scanId: string): Promise<AutofixJob[]> {
  const snapshot = await db.collection(JOBS_COLLECTION)
    .where('scanId', '==', scanId)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();
  return snapshot.docs.map(d => docToJob(d.data()));
}

export async function getUserJobs(userId: string, limit = 20): Promise<AutofixJob[]> {
  const snapshot = await db.collection(JOBS_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(d => docToJob(d.data()));
}

async function updateJob(jobId: string, updates: Partial<AutofixJob>): Promise<void> {
  await db.collection(JOBS_COLLECTION).doc(jobId).update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

function docToJob(data: Record<string, unknown>): AutofixJob {
  return {
    ...data,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
    completedAt: data.completedAt ? new Date(data.completedAt as string) : undefined,
  } as AutofixJob;
}

// ═══════════════════════════════════════════════════════════════
// Main Engine
// ═══════════════════════════════════════════════════════════════

/**
 * Run autofix for a completed scan.
 * Creates one branch with all fixes committed together.
 */
export async function runAutofix(params: {
  userId: string;
  scanId: string;
  appId: string;
  repoOwner: string;
  repoName: string;
}): Promise<AutofixJob> {
  const { userId, scanId, appId, repoOwner, repoName } = params;

  // 1. Load settings and validate
  const settings = await getAutofixSettings(userId);
  if (!settings.enabled || !settings.provider) {
    throw new Error('Autofix is not enabled or no AI provider configured');
  }

  // 2. Create job record
  const jobId = `af_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const job: AutofixJob = {
    id: jobId,
    userId,
    scanId,
    appId,
    status: 'queued',
    provider: settings.provider.providerId,
    model: settings.provider.model,
    repo: { owner: repoOwner, name: repoName, defaultBranch: 'main', fullName: `${repoOwner}/${repoName}` },
    progress: { totalFindings: 0, fixedCount: 0, skippedCount: 0, failedCount: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(JOBS_COLLECTION).doc(jobId).set({
    ...job,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });

  // 3. Run the pipeline asynchronously
  runPipeline(job, settings).catch(error => {
    logger.error('Autofix pipeline failed', { jobId, error });
    updateJob(jobId, { status: 'failed', error: String(error) }).catch(() => {});
  });

  return job;
}

async function runPipeline(job: AutofixJob, settings: AutofixSettings): Promise<void> {
  const { userId, scanId } = job;
  const { provider } = settings;
  if (!provider) throw new Error('No provider configured');

  try {
    // Step 1: Get GitHub token and repo info
    await updateJob(job.id, { status: 'fetching_code' });
    const ghToken = await getGitHubToken(userId);
    const repoInfo = await getRepoInfo(ghToken, job.repo.owner, job.repo.name);
    job.repo.defaultBranch = repoInfo.defaultBranch;

    // Step 2: Load scan findings from Firestore
    const findings = await loadScanFindings(scanId, settings.github.minSeverity, settings.github.maxFindings);
    if (findings.length === 0) {
      await updateJob(job.id, {
        status: 'completed',
        progress: { totalFindings: 0, fixedCount: 0, skippedCount: 0, failedCount: 0 },
        completedAt: new Date(),
      });
      return;
    }

    await updateJob(job.id, {
      status: 'fetching_code',
      progress: { totalFindings: findings.length, fixedCount: 0, skippedCount: 0, failedCount: 0 },
    });

    // Step 3: Fetch source files from GitHub
    const uniqueFiles = [...new Set(findings.filter(f => f.file).map(f => f.file!))];
    const fileContents = new Map<string, string>();

    for (const filePath of uniqueFiles) {
      const content = await getFileContent(ghToken, job.repo.owner, job.repo.name, filePath, repoInfo.defaultBranch);
      if (content) fileContents.set(filePath, content);
    }

    // Step 4: Generate fixes via AI provider
    await updateJob(job.id, { status: 'generating_fixes' });
    const apiKey = await getDecryptedKey(provider.keyId, userId);

    const fixes = await generateBatchFixesWithProvider(
      provider.providerId,
      apiKey,
      provider.model,
      findings,
      fileContents,
      async (fixed, total, current) => {
        await updateJob(job.id, {
          progress: {
            totalFindings: total,
            fixedCount: fixed,
            skippedCount: 0,
            failedCount: 0,
            currentFinding: current,
          },
        });
      }
    );

    if (fixes.length === 0) {
      await updateJob(job.id, {
        status: 'completed',
        progress: { totalFindings: findings.length, fixedCount: 0, skippedCount: findings.length, failedCount: 0 },
        completedAt: new Date(),
      });
      return;
    }

    // Step 5: Push all fixes to a single branch
    await updateJob(job.id, { status: 'pushing_branch' });
    const branchName = `${settings.github.branchPrefix}/${scanId.substring(0, 8)}`;

    const result = await pushFixBranch({
      token: ghToken,
      owner: job.repo.owner,
      repo: job.repo.name,
      baseBranch: repoInfo.defaultBranch,
      branchName,
      scanId,
      fixes,
      createPR: settings.github.createPR,
    });

    // Step 6: Mark complete
    await updateJob(job.id, {
      status: 'completed',
      progress: {
        totalFindings: findings.length,
        fixedCount: fixes.length,
        skippedCount: findings.length - fixes.length,
        failedCount: 0,
      },
      result: {
        branch: result.branch,
        prUrl: result.prUrl,
        prNumber: result.prNumber,
        commitSha: result.commitSha,
        filesChanged: result.filesChanged,
        summary: `Fixed ${fixes.length}/${findings.length} findings in ${result.filesChanged} files`,
      },
      completedAt: new Date(),
    });

    logger.info('Autofix completed', {
      jobId: job.id,
      scanId,
      fixedCount: fixes.length,
      branch: result.branch,
      prUrl: result.prUrl,
    });
  } catch (error) {
    logger.error('Autofix pipeline error', { jobId: job.id, error });
    await updateJob(job.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

async function loadScanFindings(
  scanId: string,
  minSeverity: string,
  maxFindings: number
): Promise<FindingForFix[]> {
  const scanDoc = await db.collection('scans').doc(scanId).get();
  if (!scanDoc.exists) throw new Error(`Scan ${scanId} not found`);

  const scanData = scanDoc.data()!;
  const findings: FindingForFix[] = scanData.findings || [];

  const minLevel = SEVERITY_ORDER[minSeverity as keyof typeof SEVERITY_ORDER] ?? 1;

  return findings
    .filter(f => {
      const level = SEVERITY_ORDER[f.severity as keyof typeof SEVERITY_ORDER] ?? 4;
      return level <= minLevel && f.file;
    })
    .sort((a, b) => {
      const aLevel = SEVERITY_ORDER[a.severity as keyof typeof SEVERITY_ORDER] ?? 4;
      const bLevel = SEVERITY_ORDER[b.severity as keyof typeof SEVERITY_ORDER] ?? 4;
      return aLevel - bLevel;
    })
    .slice(0, maxFindings);
}

/**
 * Called by scan completion handler when autoRun is enabled.
 * Checks if autofix should trigger and starts it.
 */
export async function maybeAutoTrigger(params: {
  userId: string;
  scanId: string;
  appId: string;
  repoOwner: string;
  repoName: string;
}): Promise<AutofixJob | null> {
  try {
    const settings = await getAutofixSettings(params.userId);

    if (!settings.enabled || !settings.autoRun || !settings.provider) {
      return null;
    }

    logger.info('Auto-triggering autofix', { userId: params.userId, scanId: params.scanId });
    return runAutofix(params);
  } catch (error) {
    logger.error('Auto-trigger failed', { ...params, error });
    return null;
  }
}
