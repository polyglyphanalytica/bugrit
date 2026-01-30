/**
 * Repository Analysis API
 *
 * POST /api/scans/analyze - Analyze a repository and get module recommendations
 *
 * This endpoint:
 * 1. Fetches repository info from GitHub
 * 2. Detects tech stack from package.json, etc.
 * 3. Returns tailored module recommendations
 * 4. Calculates credit estimate
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/api-auth';
import { getAccessTokenForUser } from '@/lib/github/connections';
import { logger } from '@/lib/logger';
import { getBillingAccount } from '@/lib/billing';

interface RepoAnalysis {
  name: string;
  description?: string;
  type: 'web' | 'mobile' | 'desktop' | 'hybrid' | 'library';
  techStack: string[];
  hasPackageJson: boolean;
  isPrivate: boolean;
  defaultBranch: string;
  estimatedLines?: number;
}

interface ModuleRecommendation {
  id: string;
  name: string;
  category: string;
  reason: string;
  priority: 'critical' | 'recommended' | 'optional';
}

// Tech stack detection patterns
const TECH_PATTERNS: Record<string, { files: string[]; deps: string[] }> = {
  'React': { files: [], deps: ['react', 'react-dom'] },
  'Next.js': { files: ['next.config.js', 'next.config.mjs', 'next.config.ts'], deps: ['next'] },
  'Vue': { files: ['vue.config.js'], deps: ['vue'] },
  'Angular': { files: ['angular.json'], deps: ['@angular/core'] },
  'Svelte': { files: ['svelte.config.js'], deps: ['svelte'] },
  'TypeScript': { files: ['tsconfig.json'], deps: ['typescript'] },
  'Tailwind CSS': { files: ['tailwind.config.js', 'tailwind.config.ts'], deps: ['tailwindcss'] },
  'Express': { files: [], deps: ['express'] },
  'Fastify': { files: [], deps: ['fastify'] },
  'NestJS': { files: ['nest-cli.json'], deps: ['@nestjs/core'] },
  'Prisma': { files: ['prisma/schema.prisma'], deps: ['prisma', '@prisma/client'] },
  'MongoDB': { files: [], deps: ['mongoose', 'mongodb'] },
  'PostgreSQL': { files: [], deps: ['pg', 'postgres'] },
  'Firebase': { files: [], deps: ['firebase', 'firebase-admin'] },
  'Docker': { files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'], deps: [] },
  'Capacitor': { files: ['capacitor.config.ts', 'capacitor.config.json'], deps: ['@capacitor/core'] },
  'Tauri': { files: ['tauri.conf.json', 'src-tauri'], deps: ['@tauri-apps/api'] },
  'Electron': { files: [], deps: ['electron'] },
};

// Module recommendations based on tech stack
const MODULE_RECOMMENDATIONS: Record<string, ModuleRecommendation[]> = {
  'default': [
    { id: 'eslint', name: 'ESLint', category: 'linting', reason: 'Code quality and best practices', priority: 'recommended' },
    { id: 'secretlint', name: 'Secret Scanner', category: 'security', reason: 'Detect leaked API keys and secrets', priority: 'critical' },
    { id: 'dependency-check', name: 'Dependency Audit', category: 'security', reason: 'Find vulnerable dependencies', priority: 'critical' },
    { id: 'license-checker', name: 'License Checker', category: 'compliance', reason: 'Verify open source licenses', priority: 'recommended' },
  ],
  'React': [
    { id: 'react-hooks', name: 'React Hooks Linter', category: 'linting', reason: 'Detect React hooks issues', priority: 'recommended' },
  ],
  'Next.js': [
    { id: 'nextjs-security', name: 'Next.js Security', category: 'security', reason: 'Check Next.js security headers and configs', priority: 'critical' },
    { id: 'lighthouse', name: 'Lighthouse', category: 'performance', reason: 'Performance and accessibility audit', priority: 'recommended' },
  ],
  'TypeScript': [
    { id: 'typescript-strict', name: 'TypeScript Strict', category: 'linting', reason: 'Check TypeScript strict mode compliance', priority: 'recommended' },
  ],
  'Docker': [
    { id: 'trivy', name: 'Trivy Container Scan', category: 'security', reason: 'Scan Docker images for vulnerabilities', priority: 'critical' },
    { id: 'hadolint', name: 'Dockerfile Linter', category: 'linting', reason: 'Best practices for Dockerfiles', priority: 'recommended' },
  ],
  'Express': [
    { id: 'express-security', name: 'Express Security', category: 'security', reason: 'Check for common Express vulnerabilities', priority: 'critical' },
  ],
  'Prisma': [
    { id: 'prisma-security', name: 'Prisma Security', category: 'security', reason: 'SQL injection and data exposure checks', priority: 'critical' },
  ],
  'Firebase': [
    { id: 'firebase-rules', name: 'Firebase Rules Check', category: 'security', reason: 'Verify Firestore security rules', priority: 'critical' },
  ],
  'Capacitor': [
    { id: 'mobile-security', name: 'Mobile Security Scan', category: 'security', reason: 'Check mobile app security', priority: 'critical' },
  ],
  'Tauri': [
    { id: 'tauri-security', name: 'Tauri Security', category: 'security', reason: 'Desktop app security audit', priority: 'critical' },
  ],
};

async function fetchGitHubRepoInfo(repoUrl: string, accessToken?: string | null): Promise<{
  repo: {
    name: string;
    description: string | null;
    private: boolean;
    default_branch: string;
  };
  files: string[];
  packageJson: Record<string, unknown> | null;
}> {
  // Parse repo URL
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }

  const [, owner, repo] = match;
  const repoName = repo.replace(/\.git$/, '');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Bugrit-Scanner',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  // Fetch repo info
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error('Repository not found. Is it private? Try connecting your GitHub account.');
    }
    throw new Error(`Failed to fetch repository: ${repoRes.statusText}`);
  }

  const repoData = await repoRes.json();

  // Fetch root directory contents
  const contentsRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/contents?ref=${repoData.default_branch}`,
    { headers }
  );

  let files: string[] = [];
  if (contentsRes.ok) {
    const contents = await contentsRes.json();
    files = Array.isArray(contents) ? contents.map((f: { name: string }) => f.name) : [];
  }

  // Try to fetch package.json
  let packageJson: Record<string, unknown> | null = null;
  try {
    const pkgRes = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repoName}/${repoData.default_branch}/package.json`,
      { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }
    );
    if (pkgRes.ok) {
      packageJson = await pkgRes.json();
    }
  } catch {
    // No package.json
  }

  return {
    repo: {
      name: repoData.name,
      description: repoData.description,
      private: repoData.private,
      default_branch: repoData.default_branch,
    },
    files,
    packageJson,
  };
}

function detectTechStack(files: string[], packageJson: Record<string, unknown> | null): string[] {
  const detected: string[] = [];

  const allDeps = packageJson
    ? {
        ...(packageJson.dependencies as Record<string, string> || {}),
        ...(packageJson.devDependencies as Record<string, string> || {}),
      }
    : {};

  for (const [tech, patterns] of Object.entries(TECH_PATTERNS)) {
    // Check files
    const hasFile = patterns.files.some((f) => files.includes(f));

    // Check dependencies
    const hasDep = patterns.deps.some((d) => d in allDeps);

    if (hasFile || hasDep) {
      detected.push(tech);
    }
  }

  return detected;
}

function detectAppType(techStack: string[], files: string[]): RepoAnalysis['type'] {
  if (techStack.includes('Capacitor') && (techStack.includes('React') || techStack.includes('Vue'))) {
    return 'hybrid';
  }
  if (techStack.includes('Tauri') || techStack.includes('Electron')) {
    return 'desktop';
  }
  if (techStack.includes('Capacitor')) {
    return 'mobile';
  }
  if (techStack.includes('Next.js') || techStack.includes('React') || techStack.includes('Vue') || techStack.includes('Angular')) {
    return 'web';
  }
  if (files.includes('index.js') || files.includes('index.ts') || files.includes('main.js')) {
    return 'library';
  }
  return 'web';
}

function getRecommendations(techStack: string[]): ModuleRecommendation[] {
  const recommendations: ModuleRecommendation[] = [...MODULE_RECOMMENDATIONS['default']];
  const addedIds = new Set(recommendations.map((r) => r.id));

  for (const tech of techStack) {
    const techRecs = MODULE_RECOMMENDATIONS[tech] || [];
    for (const rec of techRecs) {
      if (!addedIds.has(rec.id)) {
        recommendations.push(rec);
        addedIds.add(rec.id);
      }
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, recommended: 1, optional: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuthenticatedUser(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const body = await request.json();
    const { repoUrl, branch } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    // Get user's GitHub access token if available
    let accessToken: string | null = null;
    try {
      accessToken = await getAccessTokenForUser(userId);
    } catch {
      // No token available
    }

    // Fetch repo info from GitHub
    const { repo, files, packageJson } = await fetchGitHubRepoInfo(repoUrl, accessToken);

    // Detect tech stack
    const techStack = detectTechStack(files, packageJson);

    // Detect app type
    const appType = detectAppType(techStack, files);

    // Build analysis result
    const analysis: RepoAnalysis = {
      name: repo.name,
      description: repo.description || undefined,
      type: appType,
      techStack,
      hasPackageJson: !!packageJson,
      isPrivate: repo.private,
      defaultBranch: branch || repo.default_branch,
    };

    // Get module recommendations
    const recommendations = getRecommendations(techStack);

    // Calculate credit estimate
    const criticalCount = recommendations.filter((r) => r.priority === 'critical').length;
    const recommendedCount = recommendations.filter((r) => r.priority === 'recommended').length;
    const baseCredits = criticalCount * 2 + recommendedCount; // Critical modules cost more
    const estimatedTotal = Math.max(10, baseCredits * 3); // Minimum 10 credits

    // Get user's current balance
    let currentBalance = 0;
    try {
      const billingAccount = await getBillingAccount(userId);
      currentBalance = billingAccount?.credits?.remaining ?? 0;
    } catch {
      // Default to 0
    }

    const creditEstimate = {
      modules: recommendations.length,
      baseCredits,
      estimatedTotal,
      currentBalance,
      sufficient: currentBalance >= estimatedTotal,
      shortfall: Math.max(0, estimatedTotal - currentBalance),
    };

    logger.info('Repository analyzed', {
      userId,
      repo: repo.name,
      techStack,
      appType,
      recommendations: recommendations.length,
    });

    return NextResponse.json({
      analysis,
      recommendations,
      creditEstimate,
    });
  } catch (error) {
    logger.error('Failed to analyze repository', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze repository' },
      { status: 500 }
    );
  }
}
