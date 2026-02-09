import { NextRequest, NextResponse } from 'next/server';
import { runTools, ToolResult } from '@/lib/tools/runner';
import { generateId, getDb, COLLECTIONS } from '@/lib/firestore';
import { validateUpload, scanFileForThreats } from '@/lib/scan/security';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { safeRequire } from '@/lib/utils/safe-require';
import { logger } from '@/lib/logger';
import {
  checkScanAffordability,
  countLinesOfCode,
  checkRepoSizeLimit,
  billForCompletedScan,
  reserveCreditsForScan,
  releaseReservation,
} from '@/lib/billing';
import { ToolCategory, TOOL_COUNT, TOOL_REGISTRY } from '@/lib/tools/registry';
import { getAccessTokenForUser } from '@/lib/github/connections';
import { notifyScanCompleted, notifyScanFailed, notifySecurityAlert } from '@/lib/notifications/dispatcher';
import { createTelemetryTicket } from '@/lib/support/telemetry-tickets';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Scan source types
type SourceType = 'url' | 'github' | 'gitlab' | 'upload' | 'docker' | 'npm' | 'mobile';

interface Scan {
  id: string;
  applicationId: string;
  userId: string;
  sourceType: SourceType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  source: {
    type: SourceType;
    url?: string;
    repoUrl?: string;
    branch?: string;
    fileName?: string;
    npmPackage?: string;
    npmVersion?: string;
    dockerImage?: string;
    dockerTag?: string;
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  toolsCompleted: number;
  toolsTotal: number;
  results?: ToolResult[];
  summary?: {
    totalFindings: number;
    errors: number;
    warnings: number;
    info: number;
    byTool: Record<string, number>;
  };
  selectedModules?: string[];
  error?: string;
  // Billing information
  billing?: {
    estimatedCredits: number;
    actualCredits?: number;
    linesOfCode?: number;
    autoTopupTriggered?: boolean;
    autoTopupCredits?: number;
  };
}

// Firestore helper functions for scan persistence
async function getScan(scanId: string): Promise<Scan | null> {
  const db = getDb();
  if (!db) {
    logger.warn('Firestore not available, scan will not persist');
    return null;
  }
  const doc = await db.collection(COLLECTIONS.SCANS).doc(scanId).get();
  if (!doc.exists) return null;
  return doc.data() as Scan;
}

async function saveScan(scan: Scan): Promise<void> {
  const db = getDb();
  if (!db) {
    logger.warn('Firestore not available, scan will not persist');
    return;
  }
  await db.collection(COLLECTIONS.SCANS).doc(scan.id).set(scan, { merge: true });
}

async function getScansForUser(userId: string, applicationId?: string | null): Promise<Scan[]> {
  const db = getDb();
  if (!db) {
    logger.warn('Firestore not available');
    return [];
  }
  let query = db.collection(COLLECTIONS.SCANS).where('userId', '==', userId);
  if (applicationId) {
    query = query.where('applicationId', '==', applicationId);
  }
  const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();
  return snapshot.docs.map(doc => doc.data() as Scan);
}

// Helper to get user email for notifications
async function getUserEmail(userId: string): Promise<string> {
  // In production, look up from Firebase Auth or user profile in Firestore
  // For now, return a placeholder - the notification system will skip email if not found
  const db = getDb();
  if (db) {
    try {
      // Try to get email from user profile or organizations
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        return userDoc.data()?.email || userId;
      }
    } catch {
      // Fall through
    }
  }
  return userId; // userId might be an email for some auth methods
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const contentType = request.headers.get('content-type') || '';

    let applicationId: string;
    let sourceType: SourceType;
    let uploadedFile: File | null = null;
    let targetUrl: string | undefined;
    let repoUrl: string | undefined;
    let branch: string | undefined;
    let accessToken: string | undefined;
    let npmPackage: string | undefined;
    let npmVersion: string | undefined;
    let mobilePlatform: string | undefined;
    let dockerImage: string | undefined;
    let dockerTag: string | undefined;
    let selectedModules: string[] | undefined;

    // Handle FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      applicationId = formData.get('applicationId') as string;
      sourceType = formData.get('sourceType') as SourceType;
      targetUrl = formData.get('targetUrl') as string | undefined;
      repoUrl = formData.get('repoUrl') as string | undefined;
      branch = formData.get('branch') as string | undefined;
      accessToken = formData.get('accessToken') as string | undefined;
      npmPackage = formData.get('npmPackage') as string | undefined;
      npmVersion = formData.get('npmVersion') as string | undefined;
      mobilePlatform = formData.get('platform') as string | undefined;
      dockerImage = formData.get('dockerImage') as string | undefined;
      dockerTag = formData.get('dockerTag') as string | undefined;

      const modulesField = formData.get('selectedModules') as string | undefined;
      if (modulesField) {
        try { selectedModules = JSON.parse(modulesField); } catch { /* ignore */ }
      }

      const file = formData.get('file');
      if (file instanceof File) {
        uploadedFile = file;
      }
    } else {
      const body = await request.json();
      applicationId = body.applicationId;
      sourceType = body.sourceType;
      targetUrl = body.targetUrl;
      repoUrl = body.repoUrl;
      branch = body.branch;
      accessToken = body.accessToken;
      npmPackage = body.npmPackage;
      npmVersion = body.npmVersion;
      mobilePlatform = body.platform;
      dockerImage = body.dockerImage;
      dockerTag = body.dockerTag;
      if (Array.isArray(body.selectedModules)) {
        selectedModules = body.selectedModules;
      }
    }

    // Validate required fields
    if (!applicationId || !sourceType) {
      return NextResponse.json(
        { error: 'Missing required fields: applicationId, sourceType' },
        { status: 400 }
      );
    }

    // Auto-inject GitHub access token if user has connected their account
    // This enables scanning private repos without manually providing tokens
    if ((sourceType === 'github' || sourceType === 'gitlab') && !accessToken) {
      try {
        const storedToken = await getAccessTokenForUser(userId);
        if (storedToken) {
          accessToken = storedToken;
          logger.info('Using stored GitHub token for scan', { userId, sourceType });
        }
      } catch (error) {
        logger.warn('Failed to retrieve stored GitHub token', { userId, error });
        // Continue without token - scan may still work for public repos
      }
    }

    // Validate based on source type
    const validationError = validateSourceType(sourceType, {
      targetUrl,
      repoUrl,
      uploadedFile,
      npmPackage,
      mobilePlatform,
      dockerImage,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // For upload type, validate file security
    if ((sourceType === 'upload' || sourceType === 'mobile') && uploadedFile) {
      const uploadValidation = validateUpload(uploadedFile, 'starter');
      if (!uploadValidation.valid) {
        return NextResponse.json({ error: uploadValidation.error }, { status: 400 });
      }

      const buffer = await uploadedFile.arrayBuffer();
      const threatScan = await scanFileForThreats(buffer);
      if (!threatScan.valid) {
        return NextResponse.json({ error: threatScan.error }, { status: 400 });
      }
    }

    // Resolve selected tools to their categories for billing
    // If user selected specific modules, use those; otherwise run all tools
    let validToolIds: string[] | undefined;
    let scanCategories: ToolCategory[];

    if (selectedModules && selectedModules.length > 0) {
      // Validate tool IDs against registry and derive categories
      const registryIds = new Set(TOOL_REGISTRY.map(t => t.id));
      validToolIds = selectedModules.filter(id => registryIds.has(id));
      const categorySet = new Set<ToolCategory>();
      for (const id of validToolIds) {
        const tool = TOOL_REGISTRY.find(t => t.id === id);
        if (tool) categorySet.add(tool.category);
      }
      scanCategories = Array.from(categorySet);
    } else {
      // No specific selection — all tools will run
      scanCategories = [...new Set(TOOL_REGISTRY.map(t => t.category))];
    }

    // Check if user can afford this scan
    const affordCheck = await checkScanAffordability(userId, {
      categories: scanCategories,
      aiFeatures: ['summary'],
      estimatedLines: 50000, // Default estimate, actual will be calculated during scan
    });

    if (!affordCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          message: affordCheck.reason,
          required: affordCheck.estimate.total,
          available: affordCheck.currentBalance,
          overage: affordCheck.overage,
        },
        { status: 402 }
      );
    }

    // Create scan record
    const scanId = generateId('scn');

    // Reserve credits for this scan
    const reservation = await reserveCreditsForScan(userId, scanId, affordCheck.estimate.total);
    if (!reservation.success) {
      return NextResponse.json(
        { error: 'Failed to reserve credits', message: reservation.error },
        { status: 402 }
      );
    }
    const now = new Date().toISOString();

    const toolsTotal = validToolIds ? validToolIds.length : TOOL_COUNT;

    const scan: Scan = {
      id: scanId,
      applicationId,
      userId,
      sourceType,
      status: 'pending',
      source: {
        type: sourceType,
        url: targetUrl,
        repoUrl,
        branch: branch || 'main',
        fileName: uploadedFile?.name,
        npmPackage,
        npmVersion: npmVersion || 'latest',
        dockerImage,
        dockerTag: dockerTag || 'latest',
      },
      selectedModules: validToolIds,
      createdAt: now,
      toolsCompleted: 0,
      toolsTotal,
      billing: {
        estimatedCredits: affordCheck.estimate.total,
      },
    };

    await saveScan(scan);

    // Start scan in background
    runScanInBackground(scanId, {
      sourceType,
      uploadedFile,
      targetUrl,
      repoUrl,
      branch: branch || 'main',
      accessToken,
      npmPackage,
      npmVersion: npmVersion || 'latest',
      mobilePlatform,
      dockerImage,
      dockerTag: dockerTag || 'latest',
      userId,
      estimatedCredits: affordCheck.estimate.total,
      selectedModules: validToolIds,
      scanCategories,
    });

    return NextResponse.json({ scan }, { status: 201 });
  } catch (error) {
    logger.error('Error creating scan', {
      path: '/api/scans',
      method: 'POST',
      error,
    });
    return NextResponse.json(
      { error: 'Failed to create scan' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const scanId = searchParams.get('scanId');

    // Get single scan by ID
    if (scanId) {
      const scan = await getScan(scanId);
      if (!scan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
      }
      return NextResponse.json({ scan });
    }

    // Get all scans for user (already filtered and sorted by Firestore)
    const scans = await getScansForUser(userId, applicationId);

    return NextResponse.json({ scans });
  } catch (error) {
    logger.error('Error fetching scans', {
      path: '/api/scans',
      method: 'GET',
      error,
    });
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
  }
}

function validateSourceType(
  sourceType: SourceType,
  data: {
    targetUrl?: string;
    repoUrl?: string;
    uploadedFile?: File | null;
    npmPackage?: string;
    mobilePlatform?: string;
    dockerImage?: string;
  }
): string | null {
  switch (sourceType) {
    case 'url':
      if (!data.targetUrl?.trim()) {
        return 'Target URL is required for URL scans';
      }
      try {
        new URL(data.targetUrl);
      } catch {
        return 'Invalid URL format';
      }
      break;
    case 'github':
    case 'gitlab':
      if (!data.repoUrl?.trim()) {
        return 'Repository URL is required';
      }
      break;
    case 'upload':
      if (!data.uploadedFile) {
        return 'File is required for upload scans';
      }
      break;
    case 'npm':
      if (!data.npmPackage?.trim()) {
        return 'Package name is required for npm scans';
      }
      break;
    case 'mobile':
      if (!data.uploadedFile) {
        return 'Mobile binary is required';
      }
      if (!data.mobilePlatform) {
        return 'Platform (ios/android) is required';
      }
      break;
    case 'docker':
      if (!data.dockerImage?.trim()) {
        return 'Docker image name is required';
      }
      break;
  }
  return null;
}

interface ScanOptions {
  sourceType: SourceType;
  uploadedFile?: File | null;
  targetUrl?: string;
  repoUrl?: string;
  branch?: string;
  accessToken?: string;
  npmPackage?: string;
  npmVersion?: string;
  mobilePlatform?: string;
  dockerImage?: string;
  dockerTag?: string;
  // Tool selection
  selectedModules?: string[];
  scanCategories: ToolCategory[];
  // Billing
  userId: string;
  estimatedCredits: number;
}

async function runScanInBackground(scanId: string, options: ScanOptions) {
  let tempDir: string | null = null;
  let linesOfCode = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let scan: any = null;

  try {
    scan = await getScan(scanId);
    if (!scan) return;

    // Update status to running
    scan.status = 'running';
    scan.startedAt = new Date().toISOString();
    await saveScan(scan);

    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'buggered-scan-'));
    let targetPath = tempDir;
    let targetUrl: string | undefined;

    // Prepare source based on type
    switch (options.sourceType) {
      case 'upload':
        if (options.uploadedFile) {
          await extractUploadedZip(options.uploadedFile, tempDir);
        }
        break;

      case 'github':
      case 'gitlab':
        if (options.repoUrl) {
          await cloneRepository(options.repoUrl, tempDir, options.branch, options.accessToken);
        }
        break;

      case 'url':
        targetUrl = options.targetUrl;
        // For URL scans, we create a minimal project structure
        // The tools will run Lighthouse and accessibility checks on the URL
        await fs.writeFile(
          path.join(tempDir, 'package.json'),
          JSON.stringify({ name: 'url-scan', version: '1.0.0' })
        );
        break;

      case 'npm':
        if (options.npmPackage) {
          await downloadNpmPackage(options.npmPackage, options.npmVersion || 'latest', tempDir);
        }
        break;

      case 'mobile':
        if (options.uploadedFile) {
          // For mobile, we extract the APK/IPA and analyze what we can
          await extractUploadedFile(options.uploadedFile, tempDir);
        }
        break;

      case 'docker':
        // Docker image scans don't need a temp directory for source code.
        // Trivy pulls and scans the image directly via its CLI.
        // We create a minimal project structure for any file-based tools to skip gracefully.
        await fs.writeFile(
          path.join(tempDir, 'package.json'),
          JSON.stringify({ name: 'docker-scan', version: '1.0.0' })
        );
        break;

      default:
        throw new Error(`Unsupported source type: ${options.sourceType}`);
    }

    // Count actual lines of code for billing
    linesOfCode = await countLinesOfCode(targetPath);
    logger.info('Counted lines of code', { scanId, linesOfCode });

    // Check repository size limit
    const repoSizeCheck = await checkRepoSizeLimit(options.userId, linesOfCode);
    if (!repoSizeCheck.allowed) {
      throw new Error(repoSizeCheck.reason || 'Repository size exceeds tier limit');
    }

    // Run selected tools (or all if none specified)
    const dockerImage = options.dockerImage
      ? `${options.dockerImage}:${options.dockerTag || 'latest'}`
      : undefined;
    logger.info('Running scan tools', {
      scanId, targetPath, targetUrl, dockerImage,
      selectedModules: options.selectedModules?.length ?? 'all',
    });
    const results = await runTools({
      targetPath,
      targetUrl,
      dockerImage,
      tools: options.selectedModules,
    });

    // Update scan with results
    scan.toolsCompleted = results.length;
    scan.results = results;

    // Calculate summary
    const summary = {
      totalFindings: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      byTool: {} as Record<string, number>,
    };

    for (const result of results) {
      summary.totalFindings += result.summary.total;
      summary.errors += result.summary.errors;
      summary.warnings += result.summary.warnings;
      summary.info += result.summary.info;
      summary.byTool[result.toolId] = result.summary.total;
    }

    scan.summary = summary;
    scan.status = 'completed';
    scan.completedAt = new Date().toISOString();

    // Bill for the completed scan using actual categories run
    const billingResult = await billForCompletedScan(options.userId, scanId, {
      linesOfCode,
      categoriesRun: options.scanCategories,
      aiFeatures: ['summary'],
      issuesFound: summary.totalFindings,
    });

    // Update scan with billing info
    scan.billing = {
      estimatedCredits: options.estimatedCredits,
      actualCredits: billingResult.creditsCharged,
      linesOfCode,
      autoTopupTriggered: billingResult.autoTopupTriggered,
      autoTopupCredits: billingResult.autoTopupCredits,
    };

    await saveScan(scan);

    logger.info('Scan completed', {
      scanId,
      totalFindings: summary.totalFindings,
      creditsCharged: billingResult.creditsCharged,
      autoTopupTriggered: billingResult.autoTopupTriggered,
    });

    // Send notification for scan completion
    try {
      const userEmail = await getUserEmail(options.userId);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bugrit.com';
      const reportUrl = `${baseUrl}/scans/${scanId}`;

      // Send scan completed notification
      await notifyScanCompleted({
        userId: options.userId,
        userEmail,
        scanId,
        applicationName: scan.applicationId, // Could look up app name
        totalFindings: summary.totalFindings,
        critical: summary.errors, // Using errors as proxy for critical
        high: summary.warnings,   // Using warnings as proxy for high
        reportUrl,
      });

      // Send security alert if critical issues found
      if (summary.errors > 0) {
        await notifySecurityAlert({
          userId: options.userId,
          userEmail,
          scanId,
          applicationName: scan.applicationId,
          critical: summary.errors,
          high: summary.warnings,
          topIssues: [], // Would need to extract from results
          reportUrl,
        });
      }
    } catch (notifyError) {
      logger.warn('Failed to send scan completion notification', { scanId, error: notifyError });
    }
  } catch (error) {
    logger.error('Scan failed', { scanId, error });
    if (scan) {
      scan.status = 'failed';
      scan.error = error instanceof Error ? error.message : 'Unknown error';
      scan.completedAt = new Date().toISOString();
      await saveScan(scan);
    }

    // Release the reserved credits since scan failed
    await releaseReservation(scanId);
    logger.info('Released credit reservation for failed scan', { scanId });

    // Send notification for scan failure
    if (scan) {
      try {
        const userEmail = await getUserEmail(options.userId);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bugrit.com';

        await notifyScanFailed({
          userId: options.userId,
          userEmail,
          scanId,
          applicationName: scan.applicationId,
          error: scan.error || 'Unknown error',
          scanUrl: `${baseUrl}/scans/${scanId}`,
        });
      } catch (notifyError) {
        logger.warn('Failed to send scan failure notification', { scanId, error: notifyError });
      }

      // Create telemetry ticket for scan failures
      createTelemetryTicket({
        userId: options.userId,
        category: 'scan_failure',
        subject: `Scan failed: ${scanId}`,
        message: `Scan ${scanId} failed for user ${options.userId}. Error: ${scan.error || 'Unknown'}. Source: ${options.sourceType}${options.repoUrl ? ` (${options.repoUrl})` : ''}`,
        priority: 'normal',
        metadata: { scanId, sourceType: options.sourceType, error: scan.error },
      }).catch(() => {}); // Fire and forget
    }
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        logger.warn('Failed to cleanup temp directory', { tempDir });
      }
    }
  }
}

async function extractUploadedZip(file: File, targetDir: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const zipPath = path.join(targetDir, 'upload.zip');
  await fs.writeFile(zipPath, buffer);

  try {
    const AdmZip = safeRequire<typeof import('adm-zip')>('adm-zip');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(targetDir, true);
    await fs.unlink(zipPath);
  } catch (error) {
    throw new Error(`Failed to extract ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractUploadedFile(file: File, targetDir: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(targetDir, file.name);
  await fs.writeFile(filePath, buffer);

  // If it's a ZIP-based format (APK is a ZIP), try to extract
  if (file.name.endsWith('.apk')) {
    try {
      const AdmZip = safeRequire<typeof import('adm-zip')>('adm-zip');
      const zip = new AdmZip(filePath);
      const extractDir = path.join(targetDir, 'extracted');
      await fs.mkdir(extractDir, { recursive: true });
      zip.extractAllTo(extractDir, true);
    } catch {
      logger.warn('Could not extract APK as ZIP', { fileName: file.name });
    }
  }
}

async function cloneRepository(
  repoUrl: string,
  targetDir: string,
  branch?: string,
  accessToken?: string
) {
  const simpleGit = safeRequire<typeof import('simple-git')>('simple-git').default;
  const git = simpleGit();

  // Build URL with auth token if provided
  let cloneUrl = repoUrl;
  if (accessToken) {
    const url = new URL(repoUrl);
    if (url.hostname === 'github.com') {
      cloneUrl = `https://${accessToken}@github.com${url.pathname}`;
    } else if (url.hostname === 'gitlab.com' || url.hostname.includes('gitlab')) {
      cloneUrl = `https://oauth2:${accessToken}@${url.hostname}${url.pathname}`;
    }
  }

  logger.info('Cloning repository', { repoUrl, branch: branch || 'main', targetDir });

  try {
    await git.clone(cloneUrl, targetDir, [
      '--depth', '1',
      '--branch', branch || 'main',
      '--single-branch',
    ]);
    logger.info('Repository cloned successfully', { repoUrl });
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function downloadNpmPackage(packageName: string, version: string, targetDir: string) {
  logger.info('Downloading npm package', { packageName, version });

  try {
    // Fetch package metadata from npm registry
    const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
    const metaResponse = await fetch(registryUrl);

    if (!metaResponse.ok) {
      throw new Error(`Package not found: ${packageName}`);
    }

    const metadata = await metaResponse.json();

    // Get the specific version or latest
    const resolvedVersion = version === 'latest'
      ? metadata['dist-tags']?.latest
      : version;

    const versionData = metadata.versions?.[resolvedVersion];
    if (!versionData) {
      throw new Error(`Version ${version} not found for package ${packageName}`);
    }

    // Download the tarball
    const tarballUrl = versionData.dist?.tarball;
    if (!tarballUrl) {
      throw new Error('No tarball URL found');
    }

    const tarballResponse = await fetch(tarballUrl);
    if (!tarballResponse.ok) {
      throw new Error('Failed to download package tarball');
    }

    const tarballBuffer = Buffer.from(await tarballResponse.arrayBuffer());
    const tarballPath = path.join(targetDir, 'package.tgz');
    await fs.writeFile(tarballPath, tarballBuffer);

    // Extract tarball (npm packages are .tar.gz files)
    // Using tar package or node's built-in zlib
    const zlib = await import('zlib');
    const tar = safeRequire<typeof import('tar')>('tar');

    await tar.extract({
      file: tarballPath,
      cwd: targetDir,
      strip: 1, // Remove the 'package/' prefix
    });

    await fs.unlink(tarballPath);
    logger.info('Downloaded and extracted npm package', { packageName, version: resolvedVersion });
  } catch (error) {
    throw new Error(`Failed to download npm package: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Cancel a running scan
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;

    const { searchParams } = new URL(request.url);
    const scanId = searchParams.get('scanId');

    if (!scanId) {
      return NextResponse.json({ error: 'Missing scanId' }, { status: 400 });
    }

    const scan = await getScan(scanId);

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Verify ownership - user can only cancel their own scans
    if (scan.userId !== userId) {
      return NextResponse.json({ error: 'Not authorized to cancel this scan' }, { status: 403 });
    }

    if (scan.status === 'running') {
      scan.status = 'failed';
      scan.error = 'Cancelled by user';
      scan.completedAt = new Date().toISOString();
      await saveScan(scan);

      // Release the reserved credits
      await releaseReservation(scanId);
      logger.info('Released credit reservation for cancelled scan', { scanId, userId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error cancelling scan', { error });
    return NextResponse.json({ error: 'Failed to cancel scan' }, { status: 500 });
  }
}
