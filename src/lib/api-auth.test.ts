import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the secureCompare function which is not exported
// So we'll test it through the validateAdminKey function
// First, let's create a module that exposes secureCompare for testing

// Helper to set NODE_ENV (readonly property requires workaround)
const setNodeEnv = (value: string) => {
  vi.stubEnv('NODE_ENV', value);
};

describe('secureCompare (via validateAdminKey)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should reject when admin key is not configured', async () => {
    // Set up environment without admin key
    const originalEnv = process.env.ADMIN_API_KEY;
    delete process.env.ADMIN_API_KEY;
    setNodeEnv('production');
    process.env.REQUIRE_API_AUTH = 'true';

    // Dynamically import to get fresh module
    const { validateAdminKey } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'x-admin-key') return 'some-key';
          return null;
        }),
      },
    } as unknown as Request;

    const result = validateAdminKey(mockRequest as any);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.error).toContain('not configured');

    // Restore
    process.env.ADMIN_API_KEY = originalEnv;
  });

  it('should reject when no admin key provided in request', async () => {
    process.env.ADMIN_API_KEY = 'test-admin-key';
    setNodeEnv('production');
    process.env.REQUIRE_API_AUTH = 'true';

    const { validateAdminKey } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn(() => null),
      },
    } as unknown as Request;

    const result = validateAdminKey(mockRequest as any);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.error).toContain('Admin key required');
  });

  it('should reject invalid admin key', async () => {
    process.env.ADMIN_API_KEY = 'correct-admin-key';
    setNodeEnv('production');
    process.env.REQUIRE_API_AUTH = 'true';

    const { validateAdminKey } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'x-admin-key') return 'wrong-admin-key';
          return null;
        }),
      },
    } as unknown as Request;

    const result = validateAdminKey(mockRequest as any);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.error).toContain('Invalid admin key');
  });

  it('should accept correct admin key', async () => {
    process.env.ADMIN_API_KEY = 'correct-admin-key';
    setNodeEnv('production');
    process.env.REQUIRE_API_AUTH = 'true';

    const { validateAdminKey } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'x-admin-key') return 'correct-admin-key';
          return null;
        }),
      },
    } as unknown as Request;

    const result = validateAdminKey(mockRequest as any);

    expect(result.success).toBe(true);
  });

  it('should skip auth in development mode when not required', async () => {
    setNodeEnv('development');
    process.env.REQUIRE_API_AUTH = 'false';

    const { validateAdminKey } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn(() => null),
      },
    } as unknown as Request;

    const result = validateAdminKey(mockRequest as any);

    expect(result.success).toBe(true);
  });
});

describe('validateApiKey', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should reject requests without API key in production', async () => {
    setNodeEnv('production');
    process.env.REQUIRE_API_AUTH = 'true';

    const { validateApiKey } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn(() => null),
      },
    } as unknown as Request;

    const result = validateApiKey(mockRequest as any);

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  it('should reject API keys with invalid format', async () => {
    setNodeEnv('production');
    process.env.REQUIRE_API_AUTH = 'true';

    const { validateApiKey } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn((name: string) => {
          if (name === 'x-api-key') return 'invalid-format-key';
          return null;
        }),
      },
    } as unknown as Request;

    const result = validateApiKey(mockRequest as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid API key format');
  });

  it('should skip auth in development when not required', async () => {
    setNodeEnv('development');
    process.env.REQUIRE_API_AUTH = 'false';

    const { validateApiKey } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn(() => null),
      },
    } as unknown as Request;

    const result = validateApiKey(mockRequest as any);

    expect(result.success).toBe(true);
  });
});

describe('hasPermission', () => {
  it('should return true in development mode without auth required', async () => {
    setNodeEnv('development');
    process.env.REQUIRE_API_AUTH = 'false';

    const { hasPermission } = await import('./api-auth');

    const result = hasPermission(undefined, 'scripts:read');

    expect(result).toBe(true);
  });

  it('should return false when apiKey is undefined in production', async () => {
    setNodeEnv('production');
    process.env.REQUIRE_API_AUTH = 'true';

    const { hasPermission } = await import('./api-auth');

    const result = hasPermission(undefined, 'scripts:read');

    expect(result).toBe(false);
  });

  it('should return true when apiKey has the required permission', async () => {
    setNodeEnv('production');
    process.env.REQUIRE_API_AUTH = 'true';

    const { hasPermission } = await import('./api-auth');

    const mockApiKey = {
      id: 'test',
      key: 'bg_test',
      name: 'Test',
      applicationId: 'app1',
      ownerId: 'user1',
      permissions: ['scripts:read', 'scripts:submit'] as any[],
      rateLimit: 1000,
      usageCount: 0,
      status: 'active' as const,
      createdAt: new Date(),
    };

    expect(hasPermission(mockApiKey, 'scripts:read')).toBe(true);
    expect(hasPermission(mockApiKey, 'scripts:submit')).toBe(true);
    expect(hasPermission(mockApiKey, 'executions:read')).toBe(false);
  });
});

describe('getAuthenticatedUserId', () => {
  it('should return user ID from API key', async () => {
    setNodeEnv('development');
    process.env.REQUIRE_API_AUTH = 'false';

    const { getAuthenticatedUserId } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn(() => null),
      },
      cookies: {
        get: vi.fn(() => null),
      },
    } as unknown as Request;

    // In dev mode without auth, should still return null if no identifier
    const result = getAuthenticatedUserId(mockRequest as any);

    // Since we're in dev mode without auth, validateApiKey returns success without apiKey
    // So we fall through to session cookie check
    expect(result).toBeNull();
  });

  it('should return null when no API key is provided (session cookies checked by requireAuthenticatedUser)', async () => {
    setNodeEnv('production');

    const { getAuthenticatedUserId } = await import('./api-auth');

    const mockRequest = {
      headers: {
        get: vi.fn(() => null),
      },
    } as unknown as Request;

    const result = getAuthenticatedUserId(mockRequest as any);

    // getAuthenticatedUserId only checks API keys.
    // Session cookie verification is async and handled by requireAuthenticatedUser.
    expect(result).toBeNull();
  });
});
