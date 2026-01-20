// Security layer for uploaded code scanning
// Validates uploads and enforces sandboxing policies

export interface SecurityPolicy {
  maxFileSizeMb: number;
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  sandboxConfig: SandboxConfig;
}

export interface SandboxConfig {
  // Network isolation - no outbound connections
  networkDisabled: true;
  // Time limit in seconds
  timeoutSeconds: number;
  // Memory limit in MB
  memoryLimitMb: number;
  // CPU limit (0.5 = half a core, 2 = 2 cores)
  cpuLimit: number;
  // Read-only filesystem except /tmp
  readOnlyFs: true;
  // No privileged operations
  noPrivileged: true;
  // Drop all capabilities
  dropAllCapabilities: true;
}

// Security policies by subscription tier
export const SECURITY_POLICIES: Record<string, SecurityPolicy> = {
  free: {
    maxFileSizeMb: 50,
    allowedExtensions: ['.zip', '.apk', '.ipa'],
    allowedMimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.android.package-archive',
      'application/octet-stream', // IPA files
    ],
    sandboxConfig: {
      networkDisabled: true,
      timeoutSeconds: 60,
      memoryLimitMb: 512,
      cpuLimit: 0.5,
      readOnlyFs: true,
      noPrivileged: true,
      dropAllCapabilities: true,
    },
  },
  pro: {
    maxFileSizeMb: 100,
    allowedExtensions: ['.zip', '.apk', '.ipa', '.tar.gz', '.tgz'],
    allowedMimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.android.package-archive',
      'application/octet-stream',
      'application/gzip',
      'application/x-gzip',
    ],
    sandboxConfig: {
      networkDisabled: true,
      timeoutSeconds: 120,
      memoryLimitMb: 1024,
      cpuLimit: 1,
      readOnlyFs: true,
      noPrivileged: true,
      dropAllCapabilities: true,
    },
  },
  business: {
    maxFileSizeMb: 500,
    allowedExtensions: ['.zip', '.apk', '.ipa', '.tar.gz', '.tgz'],
    allowedMimeTypes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.android.package-archive',
      'application/octet-stream',
      'application/gzip',
      'application/x-gzip',
    ],
    sandboxConfig: {
      networkDisabled: true,
      timeoutSeconds: 300,
      memoryLimitMb: 2048,
      cpuLimit: 2,
      readOnlyFs: true,
      noPrivileged: true,
      dropAllCapabilities: true,
    },
  },
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file before upload
 */
export function validateUpload(
  file: File,
  tier: string = 'starter'
): ValidationResult {
  const policy = SECURITY_POLICIES[tier] || SECURITY_POLICIES.free;

  // Check file size
  const fileSizeMb = file.size / (1024 * 1024);
  if (fileSizeMb > policy.maxFileSizeMb) {
    return {
      valid: false,
      error: `File size (${fileSizeMb.toFixed(1)} MB) exceeds limit of ${policy.maxFileSizeMb} MB for your plan`,
    };
  }

  // Check extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!policy.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File type ${extension} is not allowed. Allowed: ${policy.allowedExtensions.join(', ')}`,
    };
  }

  // Check MIME type (less reliable but still useful)
  if (file.type && !policy.allowedMimeTypes.includes(file.type)) {
    // Don't fail on MIME type alone - it's unreliable
    console.warn(`Unexpected MIME type: ${file.type} for file ${file.name}`);
  }

  return { valid: true };
}

/**
 * Check file contents for obvious malicious patterns
 * This runs on the server after upload
 */
export async function scanFileForThreats(
  fileBuffer: ArrayBuffer
): Promise<ValidationResult> {
  const uint8 = new Uint8Array(fileBuffer);

  // Check for ZIP bombs (highly compressed files)
  // A 50MB file that decompresses to 1GB+ is suspicious
  // This is a basic heuristic - real production would use a proper scanner
  const compressedSize = uint8.length;
  // We can't know uncompressed size without actually decompressing
  // In production, use a streaming decompressor with limits

  // Check for known malware signatures (basic check)
  // In production, integrate with ClamAV or similar
  const knownMalwarePatterns = [
    // EICAR test pattern (standard antivirus test string)
    new Uint8Array([
      0x58, 0x35, 0x4f, 0x21, 0x50, 0x25, 0x40, 0x41, 0x50, 0x5b, 0x34, 0x5c,
      0x50, 0x5a, 0x58, 0x35, 0x34, 0x28, 0x50, 0x5e, 0x29, 0x37, 0x43, 0x43,
      0x29, 0x37, 0x7d, 0x24, 0x45, 0x49, 0x43, 0x41, 0x52, 0x2d, 0x53, 0x54,
      0x41, 0x4e, 0x44, 0x41, 0x52, 0x44, 0x2d, 0x41, 0x4e, 0x54, 0x49, 0x56,
      0x49, 0x52, 0x55, 0x53, 0x2d, 0x54, 0x45, 0x53, 0x54, 0x2d, 0x46, 0x49,
      0x4c, 0x45, 0x21, 0x24, 0x48, 0x2b, 0x48, 0x2a,
    ]),
  ];

  for (const pattern of knownMalwarePatterns) {
    if (containsPattern(uint8, pattern)) {
      return {
        valid: false,
        error: 'File contains known malware signature',
      };
    }
  }

  return { valid: true };
}

/**
 * Check if uint8 array contains a pattern
 */
function containsPattern(data: Uint8Array, pattern: Uint8Array): boolean {
  for (let i = 0; i <= data.length - pattern.length; i++) {
    let found = true;
    for (let j = 0; j < pattern.length; j++) {
      if (data[i + j] !== pattern[j]) {
        found = false;
        break;
      }
    }
    if (found) return true;
  }
  return false;
}

/**
 * Generate Docker/container run command with security constraints
 * This is what runs when actually executing the scan
 */
export function generateSandboxCommand(
  imageName: string,
  tier: string = 'starter'
): string[] {
  const policy = SECURITY_POLICIES[tier] || SECURITY_POLICIES.free;
  const config = policy.sandboxConfig;

  // Docker command with security options
  return [
    'docker',
    'run',
    '--rm',
    // Network isolation
    '--network=none',
    // Memory limit
    `--memory=${config.memoryLimitMb}m`,
    // CPU limit
    `--cpus=${config.cpuLimit}`,
    // Read-only filesystem
    '--read-only',
    // Tmpfs for /tmp (only writable location)
    '--tmpfs=/tmp:rw,noexec,nosuid,size=100m',
    // Drop all capabilities
    '--cap-drop=ALL',
    // No new privileges
    '--security-opt=no-new-privileges',
    // Run as non-root user
    '--user=1000:1000',
    // Limit PIDs to prevent fork bombs
    '--pids-limit=100',
    // Timeout (will be handled externally)
    // Image name
    imageName,
  ];
}

/**
 * Dangerous patterns to check for in source code
 * These don't block the scan, but flag for review
 */
export const SUSPICIOUS_PATTERNS = [
  // Shell command execution
  /eval\s*\(/gi,
  /exec\s*\(/gi,
  /system\s*\(/gi,
  /shell_exec/gi,
  /child_process/gi,
  /subprocess/gi,

  // Network operations that shouldn't be in test code
  /new\s+WebSocket/gi,
  /XMLHttpRequest/gi,

  // File system operations outside expected paths
  /\/etc\/passwd/gi,
  /\/etc\/shadow/gi,

  // Crypto mining indicators
  /coinhive/gi,
  /cryptonight/gi,
  /stratum\+tcp/gi,

  // Reverse shell patterns
  /bash\s+-i/gi,
  /\/dev\/tcp/gi,
  /mkfifo/gi,
];

/**
 * Check source code for suspicious patterns
 * Returns list of warnings (doesn't block scan)
 */
export function checkForSuspiciousCode(
  code: string
): { pattern: string; line: number }[] {
  const warnings: { pattern: string; line: number }[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    SUSPICIOUS_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        warnings.push({
          pattern: pattern.toString(),
          line: index + 1,
        });
        // Reset regex lastIndex after test
        pattern.lastIndex = 0;
      }
    });
  });

  return warnings;
}
