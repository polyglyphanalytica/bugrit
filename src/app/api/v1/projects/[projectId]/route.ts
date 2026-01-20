/**
 * Individual Project API
 *
 * GET /api/v1/projects/:projectId - Get project details
 * PUT /api/v1/projects/:projectId - Update project
 * DELETE /api/v1/projects/:projectId - Delete project
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, getRateLimitHeaders } from '@/lib/api/auth';
import { successResponse, handleError, Errors } from '@/lib/api/errors';
import { getProject, updateProject, deleteProject, Platform } from '@/lib/api/store';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'projects:read');
    const { projectId } = await params;

    const project = await getProject(projectId);

    if (!project) {
      return Errors.notFound('Project');
    }

    // Verify access
    if (project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    const response = successResponse(project);
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'projects:write');
    const { projectId } = await params;

    const project = await getProject(projectId);

    if (!project) {
      return Errors.notFound('Project');
    }

    // Verify access
    if (project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    const body = await request.json();

    // Validate platforms if provided
    if (body.platforms) {
      const validPlatforms: Platform[] = ['web', 'ios', 'android', 'desktop'];
      for (const platform of body.platforms) {
        if (!validPlatforms.includes(platform as Platform)) {
          return Errors.validationError(`Invalid platform: ${platform}`, {
            validPlatforms,
          });
        }
      }
    }

    // Update project
    const updated = await updateProject(projectId, {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.platforms && { platforms: body.platforms }),
      ...(body.repositoryUrl !== undefined && { repositoryUrl: body.repositoryUrl }),
      ...(body.githubInstallationId !== undefined && { githubInstallationId: body.githubInstallationId }),
      ...(body.defaultBranch && { defaultBranch: body.defaultBranch }),
    });

    const response = successResponse(updated);
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await authenticateRequest(request, 'projects:write');
    const { projectId } = await params;

    const project = await getProject(projectId);

    if (!project) {
      return Errors.notFound('Project');
    }

    // Verify access
    if (project.organizationId !== context.organizationId) {
      return Errors.forbidden();
    }

    await deleteProject(projectId);

    const response = successResponse({ deleted: true });
    const rateLimitHeaders = getRateLimitHeaders(context);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleError(error);
  }
}
