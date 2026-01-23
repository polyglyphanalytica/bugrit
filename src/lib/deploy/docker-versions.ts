/**
 * Docker Image Version Registry
 *
 * Pinned versions for all 53 Docker-based scanning tools.
 * This ensures reproducible builds and controlled updates.
 *
 * Update Policy:
 * - Security tools: Update within 7 days of security patches
 * - Quality tools: Update monthly
 * - All tools: Test in staging before production rollout
 *
 * Version Format:
 * - Use semantic version tags when available (e.g., :1.56.0)
 * - Use date-based tags for tools without semver (e.g., :2024.01.15)
 * - Avoid :latest in production
 *
 * Last full audit: 2026-01-23
 */

export interface DockerImageVersion {
  image: string;
  version: string;
  lastUpdated: string;
  releaseNotes?: string;
  breaking?: boolean;
}

/**
 * Pinned Docker image versions for all Cloud Build tools
 */
export const DOCKER_VERSIONS: Record<string, DockerImageVersion> = {
  // ═══════════════════════════════════════════════════════════════
  // Wave 1: Core Security & Performance (6 tools)
  // ═══════════════════════════════════════════════════════════════
  'owasp-zap': {
    image: 'ghcr.io/zaproxy/zaproxy',
    version: '2.14.0',
    lastUpdated: '2024-01-15',
    releaseNotes: 'https://github.com/zaproxy/zaproxy/releases/tag/v2.14.0',
  },
  'dependency-check': {
    image: 'owasp/dependency-check',
    version: '9.0.9',
    lastUpdated: '2024-01-10',
    releaseNotes: 'https://github.com/jeremylong/DependencyCheck/releases',
  },
  'sitespeed': {
    image: 'sitespeedio/sitespeed.io',
    version: '32.0.0',
    lastUpdated: '2024-01-12',
    releaseNotes: 'https://github.com/sitespeedio/sitespeed.io/releases',
  },
  'codeclimate': {
    image: 'codeclimate/codeclimate',
    version: '0.96.0',
    lastUpdated: '2023-12-01',
    releaseNotes: 'https://github.com/codeclimate/codeclimate/releases',
  },
  'trivy': {
    image: 'aquasec/trivy',
    version: '0.49.1',
    lastUpdated: '2024-01-18',
    releaseNotes: 'https://github.com/aquasecurity/trivy/releases',
  },
  'grype': {
    image: 'anchore/grype',
    version: '0.74.0',
    lastUpdated: '2024-01-15',
    releaseNotes: 'https://github.com/anchore/grype/releases',
  },

  // ═══════════════════════════════════════════════════════════════
  // Wave 2: Advanced Security Scanning (10 tools)
  // ═══════════════════════════════════════════════════════════════
  'semgrep': {
    image: 'returntocorp/semgrep',
    version: '1.56.0',
    lastUpdated: '2024-01-17',
    releaseNotes: 'https://github.com/semgrep/semgrep/releases',
  },
  'nuclei': {
    image: 'projectdiscovery/nuclei',
    version: '3.1.4',
    lastUpdated: '2024-01-16',
    releaseNotes: 'https://github.com/projectdiscovery/nuclei/releases',
  },
  'checkov': {
    image: 'bridgecrew/checkov',
    version: '3.1.55',
    lastUpdated: '2024-01-19',
    releaseNotes: 'https://github.com/bridgecrewio/checkov/releases',
  },
  'syft': {
    image: 'anchore/syft',
    version: '0.100.0',
    lastUpdated: '2024-01-14',
    releaseNotes: 'https://github.com/anchore/syft/releases',
  },
  'dockle': {
    image: 'goodwithtech/dockle',
    version: '0.4.14',
    lastUpdated: '2023-11-20',
    releaseNotes: 'https://github.com/goodwithtech/dockle/releases',
  },
  'shellcheck': {
    image: 'koalaman/shellcheck-alpine',
    version: '0.9.0',
    lastUpdated: '2023-05-01',
    releaseNotes: 'https://github.com/koalaman/shellcheck/releases',
  },
  'tfsec': {
    image: 'aquasec/tfsec',
    version: '1.28.4',
    lastUpdated: '2023-12-15',
    releaseNotes: 'https://github.com/aquasecurity/tfsec/releases',
  },
  'gitleaks': {
    image: 'zricethezav/gitleaks',
    version: '8.18.1',
    lastUpdated: '2024-01-10',
    releaseNotes: 'https://github.com/gitleaks/gitleaks/releases',
  },
  'bandit': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Tool installed via pip in container',
  },
  'gosec': {
    image: 'securego/gosec',
    version: '2.18.2',
    lastUpdated: '2023-12-20',
    releaseNotes: 'https://github.com/securego/gosec/releases',
  },

  // ═══════════════════════════════════════════════════════════════
  // Wave 3: Language-Specific Tools (8 tools)
  // ═══════════════════════════════════════════════════════════════
  'phpstan': {
    image: 'php',
    version: '8.3-cli',
    lastUpdated: '2024-01-01',
    releaseNotes: 'PHPStan installed via composer',
  },
  'psalm': {
    image: 'php',
    version: '8.3-cli',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Psalm installed via composer',
  },
  'brakeman': {
    image: 'ruby',
    version: '3.3',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Brakeman installed via gem',
  },
  'rubocop': {
    image: 'ruby',
    version: '3.3',
    lastUpdated: '2024-01-01',
    releaseNotes: 'RuboCop installed via gem',
  },
  'spotbugs': {
    image: 'maven',
    version: '3.9-eclipse-temurin-21',
    lastUpdated: '2024-01-01',
    releaseNotes: 'SpotBugs via Maven plugin',
  },
  'pmd': {
    image: 'maven',
    version: '3.9-eclipse-temurin-21',
    lastUpdated: '2024-01-01',
    releaseNotes: 'PMD via Maven plugin',
  },
  'checkstyle': {
    image: 'maven',
    version: '3.9-eclipse-temurin-21',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Checkstyle via Maven plugin',
  },
  'detekt': {
    image: 'gradle',
    version: '8-jdk21',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Detekt via Gradle plugin',
  },

  // ═══════════════════════════════════════════════════════════════
  // Wave 4: Dependencies, API, Mobile, Cloud Native, AI/ML (19 tools)
  // ═══════════════════════════════════════════════════════════════

  // Dependencies
  'osv-scanner': {
    image: 'ghcr.io/google/osv-scanner',
    version: '1.5.0',
    lastUpdated: '2024-01-08',
    releaseNotes: 'https://github.com/google/osv-scanner/releases',
  },
  'pip-audit': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'pip-audit installed via pip',
  },
  'cargo-audit': {
    image: 'rust',
    version: '1.75',
    lastUpdated: '2024-01-01',
    releaseNotes: 'cargo-audit installed via cargo',
  },

  // API Security
  'spectral': {
    image: 'stoplight/spectral',
    version: '6.11.0',
    lastUpdated: '2023-10-15',
    releaseNotes: 'https://github.com/stoplightio/spectral/releases',
  },
  'schemathesis': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Schemathesis installed via pip',
  },
  'graphql-cop': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'graphql-cop installed via pip',
  },

  // Mobile Security
  'mobsf': {
    image: 'opensecurity/mobile-security-framework-mobsf',
    version: '3.9.2',
    lastUpdated: '2024-01-05',
    releaseNotes: 'https://github.com/MobSF/Mobile-Security-Framework-MobSF/releases',
  },
  'apkleaks': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'APKLeaks installed via pip',
  },
  'swiftlint': {
    image: 'swift',
    version: '5.9',
    lastUpdated: '2024-01-01',
    releaseNotes: 'SwiftLint downloaded in container',
  },
  'androguard': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Androguard installed via pip',
  },

  // Cloud Native / Kubernetes
  'kubesec': {
    image: 'kubesec/kubesec',
    version: 'v2.14.0',
    lastUpdated: '2023-08-15',
    releaseNotes: 'https://github.com/controlplaneio/kubesec/releases',
  },
  'kube-bench': {
    image: 'aquasec/kube-bench',
    version: '0.7.1',
    lastUpdated: '2024-01-10',
    releaseNotes: 'https://github.com/aquasecurity/kube-bench/releases',
  },
  'polaris': {
    image: 'quay.io/fairwinds/polaris',
    version: '8.5.4',
    lastUpdated: '2024-01-12',
    releaseNotes: 'https://github.com/FairwindsOps/polaris/releases',
  },
  'terrascan': {
    image: 'tenable/terrascan',
    version: '1.18.11',
    lastUpdated: '2024-01-08',
    releaseNotes: 'https://github.com/tenable/terrascan/releases',
  },
  'kube-hunter': {
    image: 'aquasec/kube-hunter',
    version: '0.6.8',
    lastUpdated: '2023-06-01',
    releaseNotes: 'https://github.com/aquasecurity/kube-hunter/releases',
  },

  // C/C++ Tools
  'cppcheck': {
    image: 'ubuntu',
    version: '22.04',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Cppcheck installed via apt',
  },
  'flawfinder': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Flawfinder installed via pip',
  },

  // Rust Tools
  'clippy': {
    image: 'rust',
    version: '1.75',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Clippy via rustup component',
  },

  // AI/ML Security
  'garak': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'Garak installed via pip',
  },
  'modelscan': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2024-01-01',
    releaseNotes: 'ModelScan installed via pip',
  },

  // ═══════════════════════════════════════════════════════════════
  // Wave 5: January 2026 Expansion (10 tools)
  // ═══════════════════════════════════════════════════════════════

  // Python Quality
  'ruff': {
    image: 'ghcr.io/astral-sh/ruff',
    version: '0.9.2',
    lastUpdated: '2026-01-23',
    releaseNotes: 'https://github.com/astral-sh/ruff/releases',
  },
  'mypy': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2026-01-23',
    releaseNotes: 'Mypy 1.14.x installed via pip',
  },

  // Dockerfile & SQL
  'hadolint': {
    image: 'hadolint/hadolint',
    version: '2.12.0-alpine',
    lastUpdated: '2026-01-23',
    releaseNotes: 'https://github.com/hadolint/hadolint/releases',
  },
  'sqlfluff': {
    image: 'sqlfluff/sqlfluff',
    version: '3.3.0',
    lastUpdated: '2026-01-23',
    releaseNotes: 'https://github.com/sqlfluff/sqlfluff/releases',
  },

  // Go
  'golangci-lint': {
    image: 'golangci/golangci-lint',
    version: '1.63.4',
    lastUpdated: '2026-01-23',
    releaseNotes: 'https://github.com/golangci/golangci-lint/releases',
  },

  // Security
  'trufflehog': {
    image: 'trufflesecurity/trufflehog',
    version: '3.88.0',
    lastUpdated: '2026-01-23',
    releaseNotes: 'https://github.com/trufflesecurity/trufflehog/releases',
  },

  // CI/CD
  'actionlint': {
    image: 'rhysd/actionlint',
    version: '1.7.7',
    lastUpdated: '2026-01-23',
    releaseNotes: 'https://github.com/rhysd/actionlint/releases',
  },

  // Cloud Native / IaC
  'kics': {
    image: 'checkmarx/kics',
    version: '2.1.4',
    lastUpdated: '2026-01-23',
    releaseNotes: 'https://github.com/Checkmarx/kics/releases',
  },
  'cfn-lint': {
    image: 'python',
    version: '3.12-slim',
    lastUpdated: '2026-01-23',
    releaseNotes: 'cfn-lint installed via pip',
  },

  // Documentation
  'vale': {
    image: 'jdkato/vale',
    version: '3.9.5',
    lastUpdated: '2026-01-23',
    releaseNotes: 'https://github.com/errata-ai/vale/releases',
  },
};

/**
 * Get the full Docker image reference with pinned version
 */
export function getDockerImage(toolId: string): string {
  const version = DOCKER_VERSIONS[toolId];
  if (!version) {
    throw new Error(`Unknown tool: ${toolId}. Add it to DOCKER_VERSIONS.`);
  }
  return `${version.image}:${version.version}`;
}

/**
 * Get all tools that need updating (older than specified days)
 */
export function getStaleTools(maxAgeDays: number = 90): string[] {
  const now = new Date();
  const stale: string[] = [];

  for (const [toolId, version] of Object.entries(DOCKER_VERSIONS)) {
    const lastUpdated = new Date(version.lastUpdated);
    const ageDays = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays > maxAgeDays) {
      stale.push(toolId);
    }
  }

  return stale;
}

/**
 * Get version info for a specific tool
 */
export function getVersionInfo(toolId: string): DockerImageVersion | undefined {
  return DOCKER_VERSIONS[toolId];
}

/**
 * List all tools with their current versions
 */
export function listAllVersions(): Array<{ toolId: string; image: string; lastUpdated: string }> {
  return Object.entries(DOCKER_VERSIONS).map(([toolId, version]) => ({
    toolId,
    image: `${version.image}:${version.version}`,
    lastUpdated: version.lastUpdated,
  }));
}

// Export count for verification
export const PINNED_TOOL_COUNT = Object.keys(DOCKER_VERSIONS).length;
