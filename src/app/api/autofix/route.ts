/**
 * Autofix API
 *
 * POST /api/autofix — Trigger autofix for a completed scan
 * GET  /api/autofix — Get autofix jobs for current user
 * GET  /api/autofix?scanId=xxx — Get autofix jobs for a specific scan
 *
 * Enterprise tier only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { runAutofix, getJobsForScan, getUserJobs, getAutofixJob } from '@/lib/autofix/engine';
import { requireEnterpriseTier } from '@/lib/autofix/gate';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    // Enterprise tier gate
    const gateResult = await requireEnterpriseTier(userId);
    if (gateResult) return gateResult;

    const body = await request.json();
    const { scanId, appId, repoOwner, repoName } = body;

    if (!scanId || !appId || !repoOwner || !repoName) {
      return NextResponse.json(
        { error: 'Missing required fields: scanId, appId, repoOwner, repoName' },
        { status: 400 }
      );
    }

    const job = await runAutofix({ userId, scanId, appId, repoOwner, repoName });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      message: 'Autofix job started',
    }, { status: 201 });
  } catch (error) {
    logger.error('Autofix trigger failed', { error });
    const message = error instanceof Error ? error.message : 'Failed to start autofix';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const gateResult = await requireEnterpriseTier(userId);
    if (gateResult) return gateResult;

    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');
    const jobId = searchParams.get('jobId');

    // Get a specific job
    if (jobId) {
      const job = await getAutofixJob(jobId);
      if (!job || job.userId !== userId) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json(job);
    }

    // Get jobs for a scan
    if (scanId) {
      const jobs = await getJobsForScan(scanId);
      // Filter to user's jobs only
      const userJobs = jobs.filter(j => j.userId === userId);
      return NextResponse.json({ jobs: userJobs });
    }

    // Get all user's recent jobs
    const jobs = await getUserJobs(userId);
    return NextResponse.json({ jobs });
  } catch (error) {
    logger.error('Autofix GET failed', { error });
    return NextResponse.json({ error: 'Failed to fetch autofix jobs' }, { status: 500 });
  }
}
