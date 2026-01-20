/**
 * API Error Handling
 *
 * Standardized error responses for the API.
 */

import { NextResponse } from 'next/server';
import { ApiResponse, ApiError } from './types';

// Error codes
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_API_KEY: 'EXPIRED_API_KEY',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_FIELD: 'MISSING_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * API Error class for throwing structured errors
 */
export class ApiException extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  const error: ApiError = {
    code,
    message,
    ...(details && { details }),
  };

  return NextResponse.json(
    { success: false, error },
    { status: statusCode }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  pagination?: { page: number; perPage: number; total: number }
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (pagination) {
    response.pagination = {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.perPage),
    };
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Handle caught errors and return appropriate response
 */
export function handleError(error: unknown): NextResponse<ApiResponse<never>> {
  console.error('API Error:', error);

  if (error instanceof ApiException) {
    return errorResponse(error.code, error.message, error.statusCode, error.details);
  }

  if (error instanceof SyntaxError) {
    return errorResponse(
      ErrorCodes.INVALID_REQUEST,
      'Invalid JSON in request body',
      400
    );
  }

  // Default to internal error
  return errorResponse(
    ErrorCodes.INTERNAL_ERROR,
    'An unexpected error occurred',
    500
  );
}

// Pre-built error responses for common cases
export const Errors = {
  unauthorized: () =>
    errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required', 401),

  forbidden: () =>
    errorResponse(ErrorCodes.FORBIDDEN, 'Access denied', 403),

  invalidApiKey: () =>
    errorResponse(ErrorCodes.INVALID_API_KEY, 'Invalid or missing API key', 401),

  notFound: (resource: string) =>
    errorResponse(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

  alreadyExists: (resource: string) =>
    errorResponse(ErrorCodes.ALREADY_EXISTS, `${resource} already exists`, 409),

  validationError: (message: string, details?: Record<string, unknown>) =>
    errorResponse(ErrorCodes.VALIDATION_ERROR, message, 400, details),

  missingField: (field: string) =>
    errorResponse(ErrorCodes.MISSING_FIELD, `Missing required field: ${field}`, 400),

  rateLimited: (retryAfter?: number) =>
    errorResponse(
      ErrorCodes.RATE_LIMITED,
      'Rate limit exceeded. Please try again later.',
      429,
      retryAfter ? { retryAfter } : undefined
    ),

  quotaExceeded: (resource: string) =>
    errorResponse(
      ErrorCodes.QUOTA_EXCEEDED,
      `${resource} quota exceeded for your plan`,
      402
    ),

  internalError: () =>
    errorResponse(ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred', 500),
};
