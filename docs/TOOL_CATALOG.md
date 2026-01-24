# Bugrit Tool Catalog

Complete reference for all 142 integrated security, quality, and testing tools.

## Overview

Bugrit integrates **142 tools** across 17 categories:

| Category | Direct Tools | Cloud Build | Total | Description |
|----------|-------------|-------------|-------|-------------|
| Security | 11 | 44 | 55 | SAST, DAST, vulnerability scanning |
| Code Quality | 9 | 25 | 34 | Linting, formatting, static analysis |
| IaC Security | 7 | 0 | 7 | Infrastructure as Code security |
| Performance | 6 | 1 | 7 | Load testing, web performance |
| Accessibility | 3 | 0 | 3 | WCAG compliance, a11y testing |
| API Testing | 4 | 0 | 4 | REST, GraphQL, contract testing |
| API Schema | 2 | 0 | 2 | OpenAPI validation, diff detection |
| Documentation | 4 | 0 | 4 | Prose linting, spell checking |
| Complexity | 3 | 0 | 3 | Code complexity metrics |
| Coverage | 3 | 0 | 3 | Test coverage, mutation testing |
| Database | 3 | 0 | 3 | SQL linting, schema analysis |
| Secret Scanning | 3 | 0 | 3 | Credential detection |
| License | 2 | 0 | 2 | License compliance |
| Visual | 3 | 0 | 3 | Visual regression, screenshots |
| Observability | 2 | 0 | 2 | Monitoring integration |
| Chaos | 1 | 0 | 1 | Chaos engineering |
| **Total** | **64** | **78** | **142** | |

---

## Credit Costs

| Scan Type | Credits | Notes |
|-----------|---------|-------|
| Base Scan | 1 | Per scan |
| Per 10K Lines | 1 | Scales with repo size |
| Linting | 0 | Free |
| Dependencies | 0 | Free |
| Documentation | 0 | Free |
| Git Analysis | 0 | Free |
| Quality | 0 | Free |
| Security | 1 | Per scan |
| Accessibility | 4 | Per scan |
| Performance | 5 | Per scan |
| AI Summary | 1 | Per scan |
| AI Issue Explanations | 0.1 | Per issue |
| AI Fix Suggestions | 0.15 | Per issue |
| Priority Scoring | 1 | Per scan |

---

## Direct Integrations (64 Tools)

### Security (11 tools)

| Tool | Description | Languages | Website |
|------|-------------|-----------|---------|
| **Semgrep** | Static analysis for security patterns | All | [semgrep.dev](https://semgrep.dev) |
| **OWASP ZAP** | Web application security scanner (DAST) | Web | [zaproxy.org](https://zaproxy.org) |
| **Trivy** | Container & filesystem vulnerability scanner | All | [trivy.dev](https://trivy.dev) |
| **OWASP Dependency-Check** | Known vulnerability detection | Java, .NET, JS | [owasp.org](https://owasp.org/www-project-dependency-check/) |
| **detect-secrets** | Secrets detection in code | All | [github.com/Yelp/detect-secrets](https://github.com/Yelp/detect-secrets) |
| **Retire.js** | JavaScript library vulnerability scanner | JS | [retirejs.github.io](https://retirejs.github.io/retire.js/) |
| **npm audit** | Node.js dependency vulnerabilities | Node.js | [npmjs.com](https://docs.npmjs.com/cli/v8/commands/npm-audit) |
| **Bandit** | Python security linter | Python | [bandit.readthedocs.io](https://bandit.readthedocs.io) |
| **gosec** | Go security checker | Go | [securego.io](https://securego.io) |
| **Brakeman** | Ruby on Rails security scanner | Ruby | [brakemanscanner.org](https://brakemanscanner.org) |
| **Nuclei** | Template-based vulnerability scanner | Web | [nuclei.projectdiscovery.io](https://nuclei.projectdiscovery.io) |

### Code Quality (9 tools)

| Tool | Description | Languages | Website |
|------|-------------|-----------|---------|
| **ESLint** | JavaScript/TypeScript linter | JS, TS | [eslint.org](https://eslint.org) |
| **Biome** | Fast formatter and linter | JS, TS, JSON | [biomejs.dev](https://biomejs.dev) |
| **Stylelint** | CSS/SCSS linter | CSS, SCSS | [stylelint.io](https://stylelint.io) |
| **Prettier** | Code formatter | JS, TS, CSS, etc. | [prettier.io](https://prettier.io) |
| **HTMLHint** | HTML linter | HTML | [htmlhint.com](https://htmlhint.com) |
| **markdownlint** | Markdown linter | Markdown | [github.com/DavidAnson/markdownlint](https://github.com/DavidAnson/markdownlint) |
| **commitlint** | Git commit message linter | Git | [commitlint.js.org](https://commitlint.js.org) |
| **SonarQube** | Continuous code quality | All | [sonarqube.org](https://www.sonarqube.org) |
| **CodeClimate** | Automated code review | All | [codeclimate.com](https://codeclimate.com) |

### Accessibility (3 tools)

| Tool | Description | Target | Website |
|------|-------------|--------|---------|
| **Lighthouse** | Performance, accessibility, SEO audit | Web | [developers.google.com](https://developers.google.com/web/tools/lighthouse) |
| **axe-core** | WCAG accessibility testing | Web | [deque.com/axe](https://www.deque.com/axe/) |
| **Pa11y** | Automated accessibility testing | Web | [pa11y.org](https://pa11y.org) |

### Performance (6 tools)

| Tool | Description | Type | Website |
|------|-------------|------|---------|
| **k6** | Load testing tool | Load | [k6.io](https://k6.io) |
| **Artillery** | Load and functional testing | Load | [artillery.io](https://artillery.io) |
| **JMeter** | Performance testing | Load | [jmeter.apache.org](https://jmeter.apache.org) |
| **Locust** | Python load testing | Load | [locust.io](https://locust.io) |
| **sitespeed.io** | Web performance testing | Web Perf | [sitespeed.io](https://sitespeed.io) |
| **WebPageTest** | Web performance analysis | Web Perf | [webpagetest.org](https://www.webpagetest.org) |

### API Testing (4 tools)

| Tool | Description | Type | Website |
|------|-------------|------|---------|
| **Newman** | Postman collection runner | REST | [npmjs.com/package/newman](https://www.npmjs.com/package/newman) |
| **Pact** | Contract testing | Contract | [pact.io](https://pact.io) |
| **Dredd** | API documentation testing | REST | [dredd.org](https://dredd.org) |
| **GraphQL Inspector** | GraphQL schema validation | GraphQL | [graphql-inspector.com](https://graphql-inspector.com) |

### API Schema (2 tools)

| Tool | Description | Format | Website |
|------|-------------|--------|---------|
| **Spectral** | OpenAPI/AsyncAPI linter | OpenAPI | [stoplight.io/spectral](https://stoplight.io/open-source/spectral) |
| **openapi-diff** | API breaking change detection | OpenAPI | [github.com/OpenAPITools/openapi-diff](https://github.com/OpenAPITools/openapi-diff) |

### Visual Testing (3 tools)

| Tool | Description | Type | Website |
|------|-------------|------|---------|
| **Storybook** | Component visual testing | Components | [storybook.js.org](https://storybook.js.org) |
| **Puppeteer** | Browser automation & screenshots | Browser | [pptr.dev](https://pptr.dev) |
| **BackstopJS** | Visual regression testing | Regression | [garris.github.io/BackstopJS](https://garris.github.io/BackstopJS/) |

### Coverage (3 tools)

| Tool | Description | Type | Website |
|------|-------------|------|---------|
| **Istanbul** | JavaScript code coverage | Coverage | [istanbul.js.org](https://istanbul.js.org) |
| **Stryker** | Mutation testing | Mutation | [stryker-mutator.io](https://stryker-mutator.io) |
| **Bundle Analyzer** | Webpack bundle analysis | Bundle | [npmjs.com/package/webpack-bundle-analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer) |

### Observability (2 tools)

| Tool | Description | Type | Website |
|------|-------------|------|---------|
| **Sentry** | Error tracking integration | Errors | [sentry.io](https://sentry.io) |
| **OpenTelemetry** | Observability framework | Telemetry | [opentelemetry.io](https://opentelemetry.io) |

### Chaos Engineering (1 tool)

| Tool | Description | Type | Website |
|------|-------------|------|---------|
| **LitmusChaos** | Kubernetes chaos engineering | Chaos | [litmuschaos.io](https://litmuschaos.io) |

### Complexity Analysis (3 tools)

| Tool | Description | Metrics | Website |
|------|-------------|---------|---------|
| **Knip** | Unused exports/dependencies finder | Dead code | [knip.dev](https://knip.dev) |
| **Lizard** | Code complexity analyzer | CCN, NLOC | [github.com/terryyin/lizard](https://github.com/terryyin/lizard) |
| **ts-prune** | Unused TypeScript exports | Dead code | [github.com/nadeesha/ts-prune](https://github.com/nadeesha/ts-prune) |

### Documentation Quality (4 tools)

| Tool | Description | Type | Website |
|------|-------------|------|---------|
| **Vale** | Prose linter with style guides | Style | [vale.sh](https://vale.sh) |
| **alex** | Inclusive language linter | Inclusivity | [alexjs.com](https://alexjs.com) |
| **cspell** | Spell checker for code | Spelling | [cspell.org](https://cspell.org) |
| **write-good** | English prose linter | Grammar | [github.com/btford/write-good](https://github.com/btford/write-good) |

### Database Tools (3 tools)

| Tool | Description | Databases | Website |
|------|-------------|-----------|---------|
| **SQLFluff** | SQL linter and formatter | All SQL | [sqlfluff.com](https://sqlfluff.com) |
| **pgFormatter** | PostgreSQL formatter | PostgreSQL | [github.com/darold/pgFormatter](https://github.com/darold/pgFormatter) |
| **SchemaSpy** | Database schema analyzer | All | [schemaspy.org](https://schemaspy.org) |

### License Scanning (2 tools)

| Tool | Description | Output | Website |
|------|-------------|--------|---------|
| **license-checker** | NPM license checker | JSON | [npmjs.com/package/license-checker](https://www.npmjs.com/package/license-checker) |
| **ScanCode** | License and copyright scanner | SPDX | [scancode-toolkit.readthedocs.io](https://scancode-toolkit.readthedocs.io) |

### Secret Scanning (3 tools)

| Tool | Description | Detection | Website |
|------|-------------|-----------|---------|
| **Gitleaks** | Git secret scanner | Regex | [gitleaks.io](https://gitleaks.io) |
| **TruffleHog** | Secret scanner with verification | Verified | [trufflesecurity.com](https://trufflesecurity.com/trufflehog) |
| **git-secrets** | AWS secret prevention | Pre-commit | [github.com/awslabs/git-secrets](https://github.com/awslabs/git-secrets) |

### IaC Security (7 tools)

| Tool | Description | IaC Types | Website |
|------|-------------|-----------|---------|
| **Checkov** | IaC security scanner | TF, K8s, ARM | [checkov.io](https://www.checkov.io) |
| **tfsec** | Terraform security scanner | Terraform | [aquasecurity.github.io/tfsec](https://aquasecurity.github.io/tfsec/) |
| **Kubesec** | Kubernetes security scoring | K8s YAML | [kubesec.io](https://kubesec.io) |
| **kube-bench** | CIS Kubernetes Benchmark | K8s | [aquasecurity.github.io/kube-bench](https://aquasecurity.github.io/kube-bench/) |
| **Grype** | Container vulnerability scanner | Images | [github.com/anchore/grype](https://github.com/anchore/grype) |
| **Dockle** | Container image linter | Dockerfile | [github.com/goodwithtech/dockle](https://github.com/goodwithtech/dockle) |
| **Hadolint** | Dockerfile linter | Dockerfile | [github.com/hadolint/hadolint](https://github.com/hadolint/hadolint) |

---

## Cloud Build Integrations (78 Tools)

These tools run in Docker containers via Google Cloud Build for isolated, scalable execution.

### Wave 1: Core Security & Performance (6 tools)

| Tool | Category | Description |
|------|----------|-------------|
| OWASP ZAP | Security | Web application security scanner |
| Dependency Check | Security | Known vulnerability detection |
| Sitespeed.io | Performance | Web performance testing |
| CodeClimate | Code Quality | Automated code review |
| Trivy | Security | Container vulnerability scanner |
| Grype | Security | Vulnerability scanner |

### Wave 2: Advanced Security (10 tools)

| Tool | Category | Description |
|------|----------|-------------|
| Semgrep | Security | Pattern-based static analysis |
| Nuclei | Security | Template-based vulnerability scanner |
| Checkov | Security | Infrastructure as code scanner |
| Syft | Security | SBOM generator |
| Dockle | Security | Container image linter |
| ShellCheck | Code Quality | Shell script linter |
| tfsec | Security | Terraform security scanner |
| Gitleaks | Security | Git secret scanner |
| Bandit | Security | Python security linter |
| gosec | Security | Go security checker |

### Wave 3: Language-Specific (8 tools)

| Tool | Category | Languages |
|------|----------|-----------|
| PHPStan | Code Quality | PHP |
| Psalm | Code Quality | PHP |
| Brakeman | Security | Ruby |
| RuboCop | Code Quality | Ruby |
| SpotBugs | Code Quality | Java |
| PMD | Code Quality | Java |
| Checkstyle | Code Quality | Java |
| Detekt | Code Quality | Kotlin |

### Wave 4: Dependencies, API, Mobile, Cloud Native, AI/ML (20 tools)

| Tool | Category | Description |
|------|----------|-------------|
| OSV Scanner | Security | Google OSV vulnerability scanner |
| pip-audit | Security | Python dependency scanner |
| cargo-audit | Security | Rust dependency scanner |
| Spectral | Code Quality | OpenAPI/AsyncAPI linter |
| Schemathesis | API Testing | API fuzzing |
| GraphQL Cop | Security | GraphQL security scanner |
| MobSF | Security | Mobile security framework |
| APKLeaks | Security | Android APK analyzer |
| SwiftLint | Code Quality | Swift linter |
| Kubesec | Security | Kubernetes security |
| kube-bench | Security | CIS K8s Benchmark |
| Polaris | Security | Kubernetes best practices |
| Terrascan | Security | IaC security |
| kube-hunter | Security | K8s penetration testing |
| Flawfinder | Security | C/C++ security scanner |
| Garak | Security | LLM security scanner |
| ModelScan | Security | ML model scanner |
| Androguard | Security | Android analysis |
| TruffleHog | Security | Secret scanner |
| KICS | Security | IaC security |

### Wave 5-8: Extended Support (34 tools)

| Tool | Category | Description |
|------|----------|-------------|
| Cppcheck | Code Quality | C/C++ static analysis |
| Clippy | Code Quality | Rust linter |
| Ruff | Code Quality | Python linter (fast) |
| mypy | Code Quality | Python type checker |
| Hadolint | Code Quality | Dockerfile linter |
| SQLFluff | Code Quality | SQL linter |
| golangci-lint | Code Quality | Go linter aggregator |
| actionlint | Code Quality | GitHub Actions linter |
| cfn-lint | Code Quality | CloudFormation linter |
| Vale | Code Quality | Prose linter |
| yamllint | Code Quality | YAML linter |
| Pylint | Code Quality | Python linter |
| dart-analyze | Code Quality | Dart analyzer |
| ktlint | Code Quality | Kotlin linter |
| Scalafix | Code Quality | Scala linter |
| Scalafmt | Code Quality | Scala formatter |
| HLint | Code Quality | Haskell linter |
| Buf | Code Quality | Protobuf linter |
| angular-eslint | Code Quality | Angular linter |
| sqlcheck | Code Quality | SQL anti-patterns |
| pgFormatter | Code Quality | PostgreSQL formatter |
| Error Prone | Code Quality | Java bug detector |
| Credo | Code Quality | Elixir linter |
| Bearer | Security | Data security scanner |
| Prowler | Security | AWS security |
| Clair | Security | Container vulnerabilities |
| Falco | Security | Runtime security |
| Slither | Security | Solidity analyzer |
| Steampipe | Security | Cloud compliance |
| Infer | Code Quality | Static analyzer |
| ScanCode | License | License scanner |
| Licensee | License | License detector |
| Cosign | Security | Container signing |
| Safety | Security | Python safety checker |

---

## Language Compatibility Matrix

| Language | Security | Code Quality | Complexity | Coverage |
|----------|----------|--------------|------------|----------|
| JavaScript/TypeScript | Semgrep, npm audit, Retire.js | ESLint, Biome, Prettier | Knip, ts-prune | Istanbul, Stryker |
| Python | Bandit, Semgrep, pip-audit | Ruff, Pylint, mypy | Lizard | |
| Go | gosec, Semgrep | golangci-lint | Lizard | |
| Java | Semgrep, SpotBugs | PMD, Checkstyle, Error Prone | Lizard | |
| Ruby | Brakeman, Semgrep | RuboCop | Lizard | |
| PHP | Semgrep | PHPStan, Psalm | Lizard | |
| Kotlin | Semgrep | Detekt, ktlint | Lizard | |
| Swift | Semgrep | SwiftLint | | |
| Rust | cargo-audit | Clippy | | |
| C/C++ | Flawfinder, Semgrep | Cppcheck | Lizard | |
| SQL | | SQLFluff, pgFormatter | | |
| Terraform | tfsec, Checkov | | | |
| Kubernetes | Kubesec, kube-bench | | | |
| Docker | Dockle, Trivy | Hadolint | | |

---

## Scan Tiers

| Tier | Tools Run | Credit Cost | Use Case |
|------|-----------|-------------|----------|
| **Quick** | Linting, basic security | ~2 credits | Pre-commit checks |
| **Standard** | All local tools | ~10 credits | CI/CD pipelines |
| **Deep** | + Cloud Build tools | ~25 credits | Pre-release scans |
| **Paranoid** | All 142 tools | ~50 credits | Security audits |

---

## Configuration

### Enabling/Disabling Tools

```typescript
const config: OrchestratorConfig = {
  // Run specific categories only
  categories: ['security', 'code-quality'],

  // Or specific tools
  tools: ['eslint', 'semgrep', 'trivy'],

  // Exclude tools
  excludeTools: ['sonarqube'],

  // Tool-specific config
  toolConfigs: {
    eslint: { configPath: '.eslintrc.js' },
    semgrep: { options: { rules: ['p/security-audit'] } },
  },
};
```

### Running Scans

```typescript
import { auditOrchestrator } from '@/lib/integrations/orchestrator';

const report = await auditOrchestrator.runAudit(
  { directory: '/path/to/repo' },
  {
    categories: ['security', 'code-quality'],
    parallel: true,
    maxConcurrent: 5,
    enableIntelligence: true,
  }
);
```

---

## Adding New Tools

1. Create integration class in appropriate category folder
2. Implement `ToolIntegration` interface
3. Export from category's `index.ts`
4. Add to `ALL_INTEGRATIONS` array in `orchestrator.ts`
5. Update this documentation

See existing integrations for examples of proper implementation patterns.
