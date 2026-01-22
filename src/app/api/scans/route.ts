import { NextRequest, NextResponse } from 'next/server';
import { runTools, ToolResult } from '@/lib/tools/runner';
import { generateId } from '@/lib/firestore';
import { validateUpload, scanFileForThreats } from '@/lib/scan/security';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { safeRequire } from '@/lib/utils/safe-require';
import { logger } from '@/lib/logger';
import {
  checkScanAffordability,
  countLinesOfCode,
  billForCompletedScan,
  reserveCreditsForScan,
  releaseReservation,
} from '@/lib/billing';
import { ToolCategory } from '@/lib/tools/registry';
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

// In-memory store (replace with Firebase in production)
const scansStore = new Map<string, Scan>();

export async function POST(request: NextRequest) {
  try {
    const authResult = requireAuthenticatedUser(request);
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
    }

    // Validate required fields
    if (!applicationId || !sourceType) {
      return NextResponse.json(
        { error: 'Missing required fields: applicationId, sourceType' },
        { status: 400 }
      );
    }

    // Validate based on source type
    const validationError = validateSourceType(sourceType, {
      targetUrl,
      repoUrl,
      uploadedFile,
      npmPackage,
      mobilePlatform,
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

    // Check if user can afford this scan
    const defaultCategories: ToolCategory[] = ['linting', 'security', 'accessibility'];
    const affordCheck = await checkScanAffordability(userId, {
      categories: defaultCategories,
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
      },
      createdAt: now,
      toolsCompleted: 0,
      toolsTotal: 69,
      billing: {
        estimatedCredits: affordCheck.estimate.total,
      },
    };

    scansStore.set(scanId, scan);

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
      userId,
      estimatedCredits: affordCheck.estimate.total,
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
    const authResult = requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const userId = authResult;
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');
    const scanId = searchParams.get('scanId');

    // Get single scan by ID
    if (scanId) {
      const scan = scansStore.get(scanId);
      if (!scan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
      }
      return NextResponse.json({ scan });
    }

    // Get all scans for user
    let scans = Array.from(scansStore.values()).filter(
      (scan) => scan.userId === userId
    );

    if (applicationId) {
      scans = scans.filter((scan) => scan.applicationId === applicationId);
    }

    scans.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

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
      return 'Docker scanning is coming soon';
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
  // Billing
  userId: string;
  estimatedCredits: number;
}

async function runScanInBackground(scanId: string, options: ScanOptions) {
  const scan = scansStore.get(scanId);
  if (!scan) return;

  let tempDir: string | null = null;
  let linesOfCode = 0;

  try {
    // Update status to running
    scan.status = 'running';
    scan.startedAt = new Date().toISOString();
    scansStore.set(scanId, scan);

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

      default:
        throw new Error(`Unsupported source type: ${options.sourceType}`);
    }

    // Count actual lines of code for billing
    linesOfCode = await countLinesOfCode(targetPath);
    logger.info('Counted lines of code', { scanId, linesOfCode });

    // Run all tools
    logger.info('Running scan tools', { scanId, targetPath, targetUrl });
    const results = await runTools({
      targetPath,
      targetUrl,
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

    // Bill for the completed scan
    const defaultCategories: ToolCategory[] = ['linting', 'security', 'accessibility'];
    const billingResult = await billForCompletedScan(options.userId, scanId, {
      linesOfCode,
      categoriesRun: defaultCategories,
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

    scansStore.set(scanId, scan);

    logger.info('Scan completed', {
      scanId,
      totalFindings: summary.totalFindings,
      creditsCharged: billingResult.creditsCharged,
      autoTopupTriggered: billingResult.autoTopupTriggered,
    });
  } catch (error) {
    logger.error('Scan failed', { scanId, error });
    scan.status = 'failed';
    scan.error = error instanceof Error ? error.message : 'Unknown error';
    scan.completedAt = new Date().toISOString();
    scansStore.set(scanId, scan);

    // Release the reserved credits since scan failed
    await releaseReservation(scanId);
    logger.info('Released credit reservation for failed scan', { scanId });
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
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');

  if (!scanId) {
    return NextResponse.json({ error: 'Missing scanId' }, { status: 400 });
  }

  const scan = scansStore.get(scanId);
  if (scan && scan.status === 'running') {
    scan.status = 'failed';
    scan.error = 'Cancelled by user';
    scan.completedAt = new Date().toISOString();
    scansStore.set(scanId, scan);

    // Release the reserved credits
    await releaseReservation(scanId);
    logger.info('Released credit reservation for cancelled scan', { scanId });
  }

  return NextResponse.json({ success: true });
}
