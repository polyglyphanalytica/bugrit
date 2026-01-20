/**
 * Projects API
 *
 * GET /api/v1/projects - List all projects
 * POST /api/v1/projects - Create a new project
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';
import {
  createProject,
  getProjectsByOrganization,
  checkProjectLimit,
  checkPlatformAccess,
  Platform,
} from '@/lib/api/store';

export async function GET(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'projects:read');

    const projects = await getProjectsByOrganization(context.organizationId);

    // Pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20'), 100);
    const start = (page - 1) * perPage;
    const end = start + perPage;

    const paginatedProjects = projects.slice(start, end);

    const response = successResponse(paginatedProjects, 200, {
      page,
      perPage,
      total: projects.length,
    });

    // Add rate limit headers
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await authenticateRequest(request, 'projects:write');

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return Errors.missingField('name');
    }
    if (!body.platforms || body.platforms.length === 0) {
      return Errors.missingField('platforms');
    }

    // Validate platforms
    const validPlatforms: Platform[] = ['web', 'ios', 'android', 'desktop'];
    for (const platform of body.platforms) {
      if (!validPlatforms.includes(platform as Platform)) {
        return Errors.validationError(`Invalid platform: ${platform}`, {
          validPlatforms,
        });
      }

      // Check tier access for platform
      if (!checkPlatformAccess(context.tier, platform as Platform)) {
        return Errors.validationError(
          `Platform "${platform}" not available on ${context.tier} tier. Upgrade to access this platform.`,
          {
            currentTier: context.tier,
            platform,
          }
        );
      }
    }

    // Check project limit
    const limitCheck = await checkProjectLimit(context.organizationId, context.tier);
    if (!limitCheck.allowed) {
      return Errors.validationError(
        `Project limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to create more projects.`,
        {
          currentCount: limitCheck.current,
          limit: limitCheck.limit,
          tier: context.tier,
        }
      );
    }

    // Create project
    const project = await createProject({
      name: body.name,
      description: body.description,
      platforms: body.platforms,
      repositoryUrl: body.repositoryUrl,
      githubInstallationId: body.githubInstallationId,
      defaultBranch: body.defaultBranch || 'main',
      organizationId: context.organizationId,
    });

    const response = successResponse(project, 201);

    // Add rate limit headers
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}
