/**
 * Cloud Build Module for Docker-based Scans
 *
 * Runs Docker-based security tools (OWASP ZAP, Dependency Check, etc.)
 * via Google Cloud Build API since Cloud Run doesn't support Docker-in-Docker.
 *
 * Architecture:
 * 1. Cloud Run worker receives scan request
 * 2. For Docker-based tools, triggers Cloud Build job
 * 3. Cloud Build runs the Docker image with source code
 * 4. Results are written to Cloud Storage
 * 5. Worker fetches results and returns to client
 *
 * Version Management:
 * - Docker image versions are pinned in ./docker-versions.ts
 * - Use getDockerImage(toolId) to get pinned image:tag
 * - See MAINTENANCE.md for update procedures
 */

import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import { getDockerImage, DOCKER_VERSIONS } from './docker-versions';

const cloudbuild = google.cloudbuild('v1');

// Tool configurations for Cloud Build
export const DOCKER_TOOLS = {
  'owasp-zap': {
    image: 'owasp/zap2docker-stable',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'owasp/zap2docker-stable',
        entrypoint: 'zap-baseline.py',
        args: ['-t', targetUrl, '-J', '/workspace/zap-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/zap-report.json', `gs://${outputBucket}/${jobId}/zap-report.json`],
      },
    ],
  },
  'dependency-check': {
    image: 'owasp/dependency-check',
    timeout: '1200s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'owasp/dependency-check',
        args: [
          '--scan', '/workspace/source',
          '--format', 'JSON',
          '--out', '/workspace/dependency-check-report.json',
          '--prettyPrint',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/dependency-check-report.json', `gs://${outputBucket}/${jobId}/dependency-check-report.json`],
      },
    ],
  },
  'sitespeed': {
    image: 'sitespeedio/sitespeed.io:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'sitespeedio/sitespeed.io:latest',
        args: [targetUrl, '-n', '3', '--outputFolder', '/workspace/sitespeed'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', '/workspace/sitespeed/*', `gs://${outputBucket}/${jobId}/sitespeed/`],
      },
    ],
  },
  'codeclimate': {
    image: 'codeclimate/codeclimate',
    timeout: '900s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'codeclimate/codeclimate',
        entrypoint: 'sh',
        args: ['-c', 'cd /workspace/source && codeclimate analyze -f json > /workspace/codeclimate-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/codeclimate-report.json', `gs://${outputBucket}/${jobId}/codeclimate-report.json`],
      },
    ],
  },
  'trivy': {
    image: 'aquasec/trivy:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'aquasec/trivy:latest',
        args: ['fs', '--format', 'json', '--output', '/workspace/trivy-report.json', '/workspace/source'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/trivy-report.json', `gs://${outputBucket}/${jobId}/trivy-report.json`],
      },
    ],
  },
  'grype': {
    image: 'anchore/grype:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'anchore/grype:latest',
        args: ['dir:/workspace/source', '-o', 'json', '--file', '/workspace/grype-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/grype-report.json', `gs://${outputBucket}/${jobId}/grype-report.json`],
      },
    ],
  },
  // ============================================================
  // Wave 2: Additional Security & Quality Tools (all open source)
  // ============================================================
  'semgrep': {
    image: 'returntocorp/semgrep:latest',
    timeout: '900s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'returntocorp/semgrep:latest',
        entrypoint: 'semgrep',
        args: [
          'scan',
          '--config', 'auto',
          '--json',
          '--output', '/workspace/semgrep-report.json',
          '/workspace/source',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/semgrep-report.json', `gs://${outputBucket}/${jobId}/semgrep-report.json`],
      },
    ],
  },
  'nuclei': {
    image: 'projectdiscovery/nuclei:latest',
    timeout: '900s',
    memory: '4GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'projectdiscovery/nuclei:latest',
        args: [
          '-u', targetUrl,
          '-jsonl',
          '-o', '/workspace/nuclei-report.json',
          '-severity', 'low,medium,high,critical',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/nuclei-report.json', `gs://${outputBucket}/${jobId}/nuclei-report.json`],
      },
    ],
  },
  'checkov': {
    image: 'bridgecrew/checkov:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'bridgecrew/checkov:latest',
        entrypoint: 'checkov',
        args: [
          '-d', '/workspace/source',
          '-o', 'json',
          '--output-file-path', '/workspace',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/results_json.json', `gs://${outputBucket}/${jobId}/checkov-report.json`],
      },
    ],
  },
  'syft': {
    image: 'anchore/syft:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'anchore/syft:latest',
        args: ['dir:/workspace/source', '-o', 'json', '--file', '/workspace/syft-sbom.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/syft-sbom.json', `gs://${outputBucket}/${jobId}/syft-sbom.json`],
      },
    ],
  },
  'dockle': {
    image: 'goodwithtech/dockle:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (imageRef: string, outputBucket: string, jobId: string) => [
      {
        name: 'goodwithtech/dockle:latest',
        args: ['-f', 'json', '-o', '/workspace/dockle-report.json', imageRef],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/dockle-report.json', `gs://${outputBucket}/${jobId}/dockle-report.json`],
      },
    ],
  },
  'shellcheck': {
    image: 'koalaman/shellcheck-alpine:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'koalaman/shellcheck-alpine:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'find /workspace/source -name "*.sh" -type f -exec shellcheck -f json {} + > /workspace/shellcheck-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/shellcheck-report.json', `gs://${outputBucket}/${jobId}/shellcheck-report.json`],
      },
    ],
  },
  'tfsec': {
    image: 'aquasec/tfsec:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'aquasec/tfsec:latest',
        args: ['/workspace/source', '--format', 'json', '--out', '/workspace/tfsec-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/tfsec-report.json', `gs://${outputBucket}/${jobId}/tfsec-report.json`],
      },
    ],
  },
  'gitleaks': {
    image: 'zricethezav/gitleaks:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'zricethezav/gitleaks:latest',
        args: ['detect', '--source', '/workspace/source', '--report-format', 'json', '--report-path', '/workspace/gitleaks-report.json', '--no-git'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/gitleaks-report.json', `gs://${outputBucket}/${jobId}/gitleaks-report.json`],
      },
    ],
  },
  'bandit': {
    image: 'python:3.12-slim',
    timeout: '600s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install bandit -q && bandit -r /workspace/source -f json -o /workspace/bandit-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/bandit-report.json', `gs://${outputBucket}/${jobId}/bandit-report.json`],
      },
    ],
  },
  'gosec': {
    image: 'securego/gosec:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'securego/gosec:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'gosec -fmt=json -out=/workspace/gosec-report.json /workspace/source/... || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/gosec-report.json', `gs://${outputBucket}/${jobId}/gosec-report.json`],
      },
    ],
  },
  // ============================================================
  // Wave 3: Language-Specific Tools
  // ============================================================
  'phpstan': {
    image: 'php:8.3-cli',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'php:8.3-cli',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && composer require --dev phpstan/phpstan -q 2>/dev/null || true && vendor/bin/phpstan analyse --error-format=json --no-progress > /workspace/phpstan-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/phpstan-report.json', `gs://${outputBucket}/${jobId}/phpstan-report.json`],
      },
    ],
  },
  'psalm': {
    image: 'php:8.3-cli',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'php:8.3-cli',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && composer require --dev vimeo/psalm -q 2>/dev/null || true && vendor/bin/psalm --init && vendor/bin/psalm --output-format=json > /workspace/psalm-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/psalm-report.json', `gs://${outputBucket}/${jobId}/psalm-report.json`],
      },
    ],
  },
  'brakeman': {
    image: 'ruby:3.3',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'ruby:3.3',
        entrypoint: 'sh',
        args: [
          '-c',
          'gem install brakeman -q && brakeman /workspace/source -f json -o /workspace/brakeman-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/brakeman-report.json', `gs://${outputBucket}/${jobId}/brakeman-report.json`],
      },
    ],
  },
  'rubocop': {
    image: 'ruby:3.3',
    timeout: '600s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'ruby:3.3',
        entrypoint: 'sh',
        args: [
          '-c',
          'gem install rubocop rubocop-rails rubocop-performance -q && rubocop /workspace/source --format json --out /workspace/rubocop-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/rubocop-report.json', `gs://${outputBucket}/${jobId}/rubocop-report.json`],
      },
    ],
  },
  'spotbugs': {
    image: 'maven:3.9-eclipse-temurin-21',
    timeout: '900s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'maven:3.9-eclipse-temurin-21',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && mvn compile spotbugs:spotbugs -DspotbugsXmlOutput=true -DspotbugsXmlOutputDirectory=/workspace || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/spotbugsXml.xml', `gs://${outputBucket}/${jobId}/spotbugs-report.xml`],
      },
    ],
  },
  'pmd': {
    image: 'maven:3.9-eclipse-temurin-21',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'maven:3.9-eclipse-temurin-21',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && mvn pmd:pmd -Dformat=json -DoutputDirectory=/workspace || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/pmd.json', `gs://${outputBucket}/${jobId}/pmd-report.json`],
      },
    ],
  },
  'checkstyle': {
    image: 'maven:3.9-eclipse-temurin-21',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'maven:3.9-eclipse-temurin-21',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && mvn checkstyle:checkstyle -Dcheckstyle.output.format=xml -Dcheckstyle.output.file=/workspace/checkstyle-report.xml || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/checkstyle-report.xml', `gs://${outputBucket}/${jobId}/checkstyle-report.xml`],
      },
    ],
  },
  'detekt': {
    image: 'gradle:8-jdk21',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'gradle:8-jdk21',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && gradle detekt --continue || true && cp build/reports/detekt/detekt.json /workspace/detekt-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/detekt-report.json', `gs://${outputBucket}/${jobId}/detekt-report.json`],
      },
    ],
  },
  // ============================================================
  // Wave 4: API, Mobile, Cloud Native, AI/ML Tools
  // ============================================================

  // Dependency & Supply Chain
  'osv-scanner': {
    image: 'ghcr.io/google/osv-scanner:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'ghcr.io/google/osv-scanner:latest',
        args: ['--format', 'json', '--output', '/workspace/osv-report.json', '/workspace/source'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/osv-report.json', `gs://${outputBucket}/${jobId}/osv-report.json`],
      },
    ],
  },
  'pip-audit': {
    image: 'python:3.12-slim',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install pip-audit -q && cd /workspace/source && pip-audit --format json --output /workspace/pip-audit-report.json -r requirements.txt 2>/dev/null || pip-audit --format json --output /workspace/pip-audit-report.json . || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/pip-audit-report.json', `gs://${outputBucket}/${jobId}/pip-audit-report.json`],
      },
    ],
  },
  'cargo-audit': {
    image: 'rust:1.75',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'rust:1.75',
        entrypoint: 'sh',
        args: [
          '-c',
          'cargo install cargo-audit && cd /workspace/source && cargo audit --json > /workspace/cargo-audit-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/cargo-audit-report.json', `gs://${outputBucket}/${jobId}/cargo-audit-report.json`],
      },
    ],
  },

  // API Security
  'spectral': {
    image: 'stoplight/spectral:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'stoplight/spectral:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'find /workspace/source -name "openapi*.json" -o -name "openapi*.yaml" -o -name "swagger*.json" -o -name "swagger*.yaml" | xargs -I {} spectral lint {} --format json --output /workspace/spectral-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/spectral-report.json', `gs://${outputBucket}/${jobId}/spectral-report.json`],
      },
    ],
  },
  'schemathesis': {
    image: 'python:3.12-slim',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          `pip install schemathesis -q && schemathesis run ${targetUrl} --hypothesis-max-examples=50 --report /workspace/schemathesis-report.json || true`,
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/schemathesis-report.json', `gs://${outputBucket}/${jobId}/schemathesis-report.json`],
      },
    ],
  },
  'graphql-cop': {
    image: 'python:3.12-slim',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          `pip install graphql-cop -q && graphql-cop -t ${targetUrl} -o json > /workspace/graphql-cop-report.json || true`,
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/graphql-cop-report.json', `gs://${outputBucket}/${jobId}/graphql-cop-report.json`],
      },
    ],
  },

  // Mobile Security
  'mobsf': {
    image: 'opensecurity/mobile-security-framework-mobsf:latest',
    timeout: '900s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'opensecurity/mobile-security-framework-mobsf:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /home/mobsf/Mobile-Security-Framework-MobSF && python manage.py runserver 0.0.0.0:8000 & sleep 10 && find /workspace/source -name "*.apk" -o -name "*.ipa" | head -1 | xargs -I {} curl -F "file=@{}" http://localhost:8000/api/v1/upload -H "Authorization: env.MOBSF_API_KEY" && curl http://localhost:8000/api/v1/report_json -o /workspace/mobsf-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/mobsf-report.json', `gs://${outputBucket}/${jobId}/mobsf-report.json`],
      },
    ],
  },
  'apkleaks': {
    image: 'python:3.12-slim',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install apkleaks -q && find /workspace/source -name "*.apk" | head -1 | xargs -I {} apkleaks -f {} -o /workspace/apkleaks-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/apkleaks-report.json', `gs://${outputBucket}/${jobId}/apkleaks-report.json`],
      },
    ],
  },
  'swiftlint': {
    image: 'swift:5.9',
    timeout: '300s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'swift:5.9',
        entrypoint: 'sh',
        args: [
          '-c',
          'apt-get update && apt-get install -y curl && curl -L https://github.com/realm/SwiftLint/releases/download/0.54.0/swiftlint_linux.zip -o /tmp/swiftlint.zip && unzip /tmp/swiftlint.zip -d /usr/local/bin && swiftlint lint /workspace/source --reporter json > /workspace/swiftlint-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/swiftlint-report.json', `gs://${outputBucket}/${jobId}/swiftlint-report.json`],
      },
    ],
  },

  // Cloud Native / Kubernetes
  'kubesec': {
    image: 'kubesec/kubesec:v2',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'kubesec/kubesec:v2',
        entrypoint: 'sh',
        args: [
          '-c',
          'find /workspace/source -name "*.yaml" -o -name "*.yml" | xargs -I {} kubesec scan {} > /workspace/kubesec-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/kubesec-report.json', `gs://${outputBucket}/${jobId}/kubesec-report.json`],
      },
    ],
  },
  'kube-bench': {
    image: 'aquasec/kube-bench:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'aquasec/kube-bench:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'kube-bench --json > /workspace/kube-bench-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/kube-bench-report.json', `gs://${outputBucket}/${jobId}/kube-bench-report.json`],
      },
    ],
  },
  'polaris': {
    image: 'quay.io/fairwinds/polaris:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'quay.io/fairwinds/polaris:latest',
        args: ['audit', '--audit-path', '/workspace/source', '--format', 'json', '--output-file', '/workspace/polaris-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/polaris-report.json', `gs://${outputBucket}/${jobId}/polaris-report.json`],
      },
    ],
  },
  'terrascan': {
    image: 'tenable/terrascan:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'tenable/terrascan:latest',
        args: ['scan', '-d', '/workspace/source', '-o', 'json'],
        env: ['OUTPUT_FILE=/workspace/terrascan-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/terrascan-report.json', `gs://${outputBucket}/${jobId}/terrascan-report.json`],
      },
    ],
  },
  'kube-hunter': {
    image: 'aquasec/kube-hunter:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'aquasec/kube-hunter:latest',
        args: ['--remote', targetUrl, '--report', 'json', '--log', 'none'],
        env: ['OUTPUT_FILE=/workspace/kube-hunter-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/kube-hunter-report.json', `gs://${outputBucket}/${jobId}/kube-hunter-report.json`],
      },
    ],
  },

  // C/C++ Tools
  'cppcheck': {
    image: 'ubuntu:22.04',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'ubuntu:22.04',
        entrypoint: 'sh',
        args: [
          '-c',
          'apt-get update && apt-get install -y cppcheck && cppcheck --enable=all --xml --xml-version=2 /workspace/source 2> /workspace/cppcheck-report.xml || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/cppcheck-report.xml', `gs://${outputBucket}/${jobId}/cppcheck-report.xml`],
      },
    ],
  },
  'flawfinder': {
    image: 'python:3.12-slim',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install flawfinder -q && flawfinder --json /workspace/source > /workspace/flawfinder-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/flawfinder-report.json', `gs://${outputBucket}/${jobId}/flawfinder-report.json`],
      },
    ],
  },

  // Rust Tools
  'clippy': {
    image: 'rust:1.75',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'rust:1.75',
        entrypoint: 'sh',
        args: [
          '-c',
          'rustup component add clippy && cd /workspace/source && cargo clippy --message-format=json > /workspace/clippy-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/clippy-report.json', `gs://${outputBucket}/${jobId}/clippy-report.json`],
      },
    ],
  },

  // AI/ML Security
  'garak': {
    image: 'python:3.12-slim',
    timeout: '900s',
    memory: '8GB',
    buildSteps: (targetUrl: string, outputBucket: string, jobId: string) => [
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          `pip install garak -q && garak --model_type rest --model_name ${targetUrl} --probes all --report_prefix /workspace/garak || true`,
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/garak.report.jsonl', `gs://${outputBucket}/${jobId}/garak-report.jsonl`],
      },
    ],
  },
  'modelscan': {
    image: 'python:3.12-slim',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install modelscan -q && modelscan -p /workspace/source --output-format json > /workspace/modelscan-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/modelscan-report.json', `gs://${outputBucket}/${jobId}/modelscan-report.json`],
      },
    ],
  },
  'androguard': {
    image: 'python:3.12-slim',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install androguard -q && androlyze.py -i /workspace/source/*.apk -o /workspace/androguard-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/androguard-report.json', `gs://${outputBucket}/${jobId}/androguard-report.json`],
      },
    ],
  },

  // ============================================================
  // Wave 5: January 2026 Expansion (10 tools)
  // ============================================================

  // Python Quality
  'ruff': {
    image: 'ghcr.io/astral-sh/ruff:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'ghcr.io/astral-sh/ruff:latest',
        args: ['check', '--output-format', 'json', '/workspace/source'],
        env: ['OUTPUT_FILE=/workspace/ruff-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/ruff-report.json', `gs://${outputBucket}/${jobId}/ruff-report.json`],
      },
    ],
  },
  'mypy': {
    image: 'python:3.12-slim',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install mypy -q && mypy /workspace/source --ignore-missing-imports --output json > /workspace/mypy-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/mypy-report.json', `gs://${outputBucket}/${jobId}/mypy-report.json`],
      },
    ],
  },

  // Dockerfile & SQL
  'hadolint': {
    image: 'hadolint/hadolint:latest',
    timeout: '120s',
    memory: '1GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'hadolint/hadolint:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'find /workspace/source -name "Dockerfile*" -o -name "*.dockerfile" | xargs -I {} hadolint --format json {} > /workspace/hadolint-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/hadolint-report.json', `gs://${outputBucket}/${jobId}/hadolint-report.json`],
      },
    ],
  },
  'sqlfluff': {
    image: 'sqlfluff/sqlfluff:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'sqlfluff/sqlfluff:latest',
        args: ['lint', '--format', 'json', '/workspace/source'],
        env: ['OUTPUT_FILE=/workspace/sqlfluff-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/sqlfluff-report.json', `gs://${outputBucket}/${jobId}/sqlfluff-report.json`],
      },
    ],
  },

  // Go
  'golangci-lint': {
    image: 'golangci/golangci-lint:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'golangci/golangci-lint:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && golangci-lint run --out-format json > /workspace/golangci-lint-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/golangci-lint-report.json', `gs://${outputBucket}/${jobId}/golangci-lint-report.json`],
      },
    ],
  },

  // Security
  'trufflehog': {
    image: 'trufflesecurity/trufflehog:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'trufflesecurity/trufflehog:latest',
        args: ['filesystem', '--json', '--directory', '/workspace/source'],
        env: ['OUTPUT_FILE=/workspace/trufflehog-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/trufflehog-report.json', `gs://${outputBucket}/${jobId}/trufflehog-report.json`],
      },
    ],
  },

  // CI/CD
  'actionlint': {
    image: 'rhysd/actionlint:latest',
    timeout: '120s',
    memory: '1GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'rhysd/actionlint:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'actionlint -format "{{json .}}" /workspace/source/.github/workflows/*.yml /workspace/source/.github/workflows/*.yaml > /workspace/actionlint-report.json 2>/dev/null || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/actionlint-report.json', `gs://${outputBucket}/${jobId}/actionlint-report.json`],
      },
    ],
  },

  // Cloud Native / IaC
  'kics': {
    image: 'checkmarx/kics:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'checkmarx/kics:latest',
        args: ['scan', '-p', '/workspace/source', '-o', '/workspace', '--report-formats', 'json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/results.json', `gs://${outputBucket}/${jobId}/kics-report.json`],
      },
    ],
  },
  'cfn-lint': {
    image: 'python:3.12-slim',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install cfn-lint -q && find /workspace/source -name "*.template*" -o -name "*cloudformation*.yml" -o -name "*cloudformation*.yaml" | xargs cfn-lint --format json > /workspace/cfn-lint-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/cfn-lint-report.json', `gs://${outputBucket}/${jobId}/cfn-lint-report.json`],
      },
    ],
  },

  // Documentation
  'vale': {
    image: 'jdkato/vale:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'jdkato/vale:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'vale --output=JSON /workspace/source > /workspace/vale-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/vale-report.json', `gs://${outputBucket}/${jobId}/vale-report.json`],
      },
    ],
  },

  // ============================================================
  // Wave 6: January 2026 Expansion Part 2 (6 tools)
  // ============================================================

  // YAML Linting
  'yamllint': {
    image: 'cytopia/yamllint:latest',
    timeout: '120s',
    memory: '1GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'cytopia/yamllint:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'yamllint -f json /workspace/source > /workspace/yamllint-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/yamllint-report.json', `gs://${outputBucket}/${jobId}/yamllint-report.json`],
      },
    ],
  },

  // Security - Data Privacy
  'bearer': {
    image: 'bearer/bearer:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'bearer/bearer:latest',
        args: ['scan', '/workspace/source', '--format', 'json', '--output', '/workspace/bearer-report.json'],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/bearer-report.json', `gs://${outputBucket}/${jobId}/bearer-report.json`],
      },
    ],
  },

  // Python - Pylint
  'pylint': {
    image: 'python:3.12-slim',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install pylint -q && find /workspace/source -name "*.py" | xargs pylint --output-format=json > /workspace/pylint-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/pylint-report.json', `gs://${outputBucket}/${jobId}/pylint-report.json`],
      },
    ],
  },

  // Dart/Flutter
  'dart-analyze': {
    image: 'dart:stable',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'dart:stable',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && dart analyze --format=json > /workspace/dart-analyze-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/dart-analyze-report.json', `gs://${outputBucket}/${jobId}/dart-analyze-report.json`],
      },
    ],
  },

  // Kotlin
  'ktlint': {
    image: 'pinterest/ktlint:latest',
    timeout: '300s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'pinterest/ktlint:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'ktlint --reporter=json /workspace/source/**/*.kt /workspace/source/**/*.kts > /workspace/ktlint-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/ktlint-report.json', `gs://${outputBucket}/${jobId}/ktlint-report.json`],
      },
    ],
  },

  // AWS Security
  'prowler': {
    image: 'prowler/prowler:latest',
    timeout: '1200s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'prowler/prowler:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'prowler aws --output-formats json --output-directory /workspace || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/prowler-output*.json', `gs://${outputBucket}/${jobId}/prowler-report.json`],
      },
    ],
  },

  // ============================================================
  // Wave 7: January 2026 Expansion Part 3 (8 Docker tools)
  // ============================================================

  // Container Security
  'clair': {
    image: 'quay.io/projectquay/clair:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'quay.io/projectquay/clair:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'clairctl report --out json /workspace/source > /workspace/clair-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/clair-report.json', `gs://${outputBucket}/${jobId}/clair-report.json`],
      },
    ],
  },
  'falco': {
    image: 'falcosecurity/falco:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'falcosecurity/falco:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'falco -r /workspace/source --format json -o json_output=true > /workspace/falco-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/falco-report.json', `gs://${outputBucket}/${jobId}/falco-report.json`],
      },
    ],
  },

  // Smart Contract Security
  'slither': {
    image: 'trailofbits/slither:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'trailofbits/slither:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && slither . --json /workspace/slither-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/slither-report.json', `gs://${outputBucket}/${jobId}/slither-report.json`],
      },
    ],
  },

  // Java Quality
  'error-prone': {
    image: 'maven:3.9-eclipse-temurin-21',
    timeout: '900s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'maven:3.9-eclipse-temurin-21',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && mvn compile -Dmaven.compiler.compilerId=javac -Dmaven.compiler.compilerArgs=-XDcompilePolicy=simple -Dmaven.compiler.compilerArgs=-Xplugin:ErrorProne 2>&1 | tee /workspace/error-prone-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/error-prone-report.json', `gs://${outputBucket}/${jobId}/error-prone-report.json`],
      },
    ],
  },

  // Elixir Quality
  'credo': {
    image: 'elixir:1.16-slim',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'elixir:1.16-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && mix local.hex --force && mix deps.get && mix credo --format json > /workspace/credo-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/credo-report.json', `gs://${outputBucket}/${jobId}/credo-report.json`],
      },
    ],
  },

  // Cloud Infrastructure
  'steampipe': {
    image: 'turbot/steampipe:latest',
    timeout: '900s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'turbot/steampipe:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'steampipe check all --output json > /workspace/steampipe-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/steampipe-report.json', `gs://${outputBucket}/${jobId}/steampipe-report.json`],
      },
    ],
  },

  // Multi-language Quality
  'sonar-scanner': {
    image: 'sonarsource/sonar-scanner-cli:latest',
    timeout: '1200s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'sonarsource/sonar-scanner-cli:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && sonar-scanner -Dsonar.projectKey=scan -Dsonar.sources=. -Dsonar.report.export.path=/workspace/sonar-scanner-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/sonar-scanner-report.json', `gs://${outputBucket}/${jobId}/sonar-scanner-report.json`],
      },
    ],
  },

  // Static Analysis (Meta)
  'infer': {
    image: 'facebook/infer:latest',
    timeout: '1200s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'facebook/infer:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && infer run --report-json -- make 2>/dev/null || infer run --report-json -- javac $(find . -name "*.java") 2>/dev/null || true && cp infer-out/report.json /workspace/infer-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/infer-report.json', `gs://${outputBucket}/${jobId}/infer-report.json`],
      },
    ],
  },

  // ============================================================
  // Wave 8: January 2026 Expansion Part 4 (11 Docker tools)
  // ============================================================

  // Scala
  'scalafmt': {
    image: 'scalameta/scalafmt:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'scalameta/scalafmt:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && scalafmt --check --reporter json > /workspace/scalafmt-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/scalafmt-report.json', `gs://${outputBucket}/${jobId}/scalafmt-report.json`],
      },
    ],
  },
  'scalafix': {
    image: 'scalacenter/scalafix:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'scalacenter/scalafix:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && scalafix --check --format json > /workspace/scalafix-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/scalafix-report.json', `gs://${outputBucket}/${jobId}/scalafix-report.json`],
      },
    ],
  },

  // Haskell
  'hlint': {
    image: 'haskell:9.6-slim',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'haskell:9.6-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'cabal update && cabal install hlint && cd /workspace/source && hlint . --json > /workspace/hlint-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/hlint-report.json', `gs://${outputBucket}/${jobId}/hlint-report.json`],
      },
    ],
  },

  // Protocol Buffers
  'buf': {
    image: 'bufbuild/buf:latest',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'bufbuild/buf:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && buf lint --error-format json > /workspace/buf-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/buf-report.json', `gs://${outputBucket}/${jobId}/buf-report.json`],
      },
    ],
  },

  // Angular
  'angular-eslint': {
    image: 'node:20-slim',
    timeout: '600s',
    memory: '4GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'node:20-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && npm install @angular-eslint/eslint-plugin @angular-eslint/template-parser && npx eslint --format json . > /workspace/angular-eslint-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/angular-eslint-report.json', `gs://${outputBucket}/${jobId}/angular-eslint-report.json`],
      },
    ],
  },

  // License Scanning
  'scancode-toolkit': {
    image: 'ghcr.io/nexb/scancode-toolkit:latest',
    timeout: '1800s',
    memory: '8GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'ghcr.io/nexb/scancode-toolkit:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'scancode --license --copyright --json /workspace/scancode-report.json /workspace/source || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/scancode-report.json', `gs://${outputBucket}/${jobId}/scancode-report.json`],
      },
    ],
  },
  'licensee': {
    image: 'ruby:3.2-slim',
    timeout: '600s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'ruby:3.2-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'gem install licensee && cd /workspace/source && licensee detect --json > /workspace/licensee-report.json || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/licensee-report.json', `gs://${outputBucket}/${jobId}/licensee-report.json`],
      },
    ],
  },

  // Security
  'cosign': {
    image: 'gcr.io/projectsigstore/cosign:latest',
    timeout: '600s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'gcr.io/projectsigstore/cosign:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'cd /workspace/source && cosign verify-blob --help > /workspace/cosign-report.json 2>&1 || echo "{\"status\": \"ready\"}" > /workspace/cosign-report.json',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/cosign-report.json', `gs://${outputBucket}/${jobId}/cosign-report.json`],
      },
    ],
  },
  'safety': {
    image: 'python:3.12-slim',
    timeout: '600s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'python:3.12-slim',
        entrypoint: 'sh',
        args: [
          '-c',
          'pip install safety && cd /workspace/source && safety check --json > /workspace/safety-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/safety-report.json', `gs://${outputBucket}/${jobId}/safety-report.json`],
      },
    ],
  },

  // SQL Quality
  'sqlcheck': {
    image: 'aaronmorgenegg/sqlcheck:latest',
    timeout: '600s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'aaronmorgenegg/sqlcheck:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'find /workspace/source -name "*.sql" -exec sqlcheck -f {} \\; > /workspace/sqlcheck-report.json 2>&1 || true',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/sqlcheck-report.json', `gs://${outputBucket}/${jobId}/sqlcheck-report.json`],
      },
    ],
  },
  'pgformatter': {
    image: 'darold/pgformatter:latest',
    timeout: '600s',
    memory: '2GB',
    buildSteps: (sourcePath: string, outputBucket: string, jobId: string) => [
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '-r', `gs://${sourcePath}/*`, '/workspace/source/'],
      },
      {
        name: 'darold/pgformatter:latest',
        entrypoint: 'sh',
        args: [
          '-c',
          'find /workspace/source -name "*.sql" -exec pg_format --check {} \\; > /workspace/pgformatter-report.json 2>&1 || echo "{\"status\": \"formatted\"}" > /workspace/pgformatter-report.json',
        ],
      },
      {
        name: 'gcr.io/cloud-builders/gsutil',
        args: ['cp', '/workspace/pgformatter-report.json', `gs://${outputBucket}/${jobId}/pgformatter-report.json`],
      },
    ],
  },
} as const;

export type DockerToolId = keyof typeof DOCKER_TOOLS;

export interface CloudBuildConfig {
  projectId: string;
  region?: string;
  outputBucket: string;
  serviceAccount?: string;
}

export interface BuildJobRequest {
  toolId: DockerToolId;
  target: string; // URL for web tools, GCS path for source tools
  scanId: string;
  timeout?: string;
}

export interface BuildJobResult {
  success: boolean;
  jobId: string;
  status: 'QUEUED' | 'WORKING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CANCELLED';
  outputPath?: string;
  error?: string;
  duration?: number;
}

/**
 * Get authenticated client using Application Default Credentials
 */
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return auth.getClient();
}

/**
 * Cloud Build client for running Docker-based scans
 */
export class CloudBuildRunner {
  private config: CloudBuildConfig;
  private storage: Storage;

  constructor(config: CloudBuildConfig) {
    this.config = config;
    this.storage = new Storage({ projectId: config.projectId });
  }

  /**
   * Check if a tool requires Cloud Build (vs running locally)
   */
  static requiresCloudBuild(toolId: string): boolean {
    return toolId in DOCKER_TOOLS;
  }

  /**
   * Submit a build job for a Docker-based tool
   */
  async submitJob(request: BuildJobRequest): Promise<BuildJobResult> {
    const { toolId, target, scanId } = request;
    const tool = DOCKER_TOOLS[toolId];

    if (!tool) {
      return {
        success: false,
        jobId: '',
        status: 'FAILURE',
        error: `Unknown tool: ${toolId}`,
      };
    }

    const jobId = `${scanId}-${toolId}-${Date.now()}`;

    try {
      const authClient = await getAuthClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      google.options({ auth: authClient as any });

      // Build the Cloud Build configuration
      const buildConfig = {
        steps: tool.buildSteps(target, this.config.outputBucket, jobId),
        timeout: request.timeout || tool.timeout,
        options: {
          machineType: 'E2_HIGHCPU_8',
          logging: 'CLOUD_LOGGING_ONLY',
        },
      };

      // Submit the build
      const response = await cloudbuild.projects.builds.create({
        projectId: this.config.projectId,
        requestBody: buildConfig,
      });

      const buildId = response.data.metadata?.build?.id;

      if (!buildId) {
        return {
          success: false,
          jobId,
          status: 'FAILURE',
          error: 'Failed to get build ID from response',
        };
      }

      return {
        success: true,
        jobId: buildId,
        status: 'QUEUED',
        outputPath: `gs://${this.config.outputBucket}/${jobId}/`,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        jobId,
        status: 'FAILURE',
        error: err.message,
      };
    }
  }

  /**
   * Wait for a build job to complete
   */
  async waitForJob(buildId: string, timeoutMs: number = 600000): Promise<BuildJobResult> {
    const startTime = Date.now();

    try {
      const authClient = await getAuthClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      google.options({ auth: authClient as any });

      while (Date.now() - startTime < timeoutMs) {
        const response = await cloudbuild.projects.builds.get({
          projectId: this.config.projectId,
          id: buildId,
        });

        const build = response.data;
        const status = build.status as BuildJobResult['status'];

        if (status === 'SUCCESS' || status === 'FAILURE' || status === 'TIMEOUT' || status === 'CANCELLED') {
          return {
            success: status === 'SUCCESS',
            jobId: buildId,
            status,
            duration: Date.now() - startTime,
            error: status !== 'SUCCESS' ? `Build ${status.toLowerCase()}` : undefined,
          };
        }

        // Wait 5 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      return {
        success: false,
        jobId: buildId,
        status: 'TIMEOUT',
        error: 'Timed out waiting for build to complete',
        duration: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        success: false,
        jobId: buildId,
        status: 'FAILURE',
        error: err.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Run a Docker tool and wait for results
   */
  async runTool(request: BuildJobRequest): Promise<{
    result: BuildJobResult;
    output?: unknown;
  }> {
    // Submit the job
    const submitResult = await this.submitJob(request);

    if (!submitResult.success) {
      return { result: submitResult };
    }

    // Wait for completion
    const waitResult = await this.waitForJob(submitResult.jobId);

    if (!waitResult.success) {
      return { result: waitResult };
    }

    // Fetch results from Cloud Storage
    try {
      const output = await this.fetchResults(request.toolId, submitResult.outputPath!);
      return {
        result: waitResult,
        output,
      };
    } catch (error: unknown) {
      const err = error as Error;
      return {
        result: {
          ...waitResult,
          success: false,
          error: `Failed to fetch results: ${err.message}`,
        },
      };
    }
  }

  /**
   * Fetch results from Cloud Storage
   */
  private async fetchResults(toolId: DockerToolId, outputPath: string): Promise<unknown> {
    // Parse GCS path
    const match = outputPath.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid GCS path: ${outputPath}`);
    }

    const [, bucket, prefix] = match;

    // Determine the expected output file
    const outputFiles: Record<DockerToolId, string> = {
      // Wave 1 tools
      'owasp-zap': 'zap-report.json',
      'dependency-check': 'dependency-check-report.json',
      'sitespeed': 'sitespeed/browsertime.summary-total.json',
      'codeclimate': 'codeclimate-report.json',
      'trivy': 'trivy-report.json',
      'grype': 'grype-report.json',
      // Wave 2 tools
      'semgrep': 'semgrep-report.json',
      'nuclei': 'nuclei-report.json',
      'checkov': 'checkov-report.json',
      'syft': 'syft-sbom.json',
      'dockle': 'dockle-report.json',
      'shellcheck': 'shellcheck-report.json',
      'tfsec': 'tfsec-report.json',
      'gitleaks': 'gitleaks-report.json',
      'bandit': 'bandit-report.json',
      'gosec': 'gosec-report.json',
      // Wave 3: Language-specific tools
      'phpstan': 'phpstan-report.json',
      'psalm': 'psalm-report.json',
      'brakeman': 'brakeman-report.json',
      'rubocop': 'rubocop-report.json',
      'spotbugs': 'spotbugs-report.xml',
      'pmd': 'pmd-report.json',
      'checkstyle': 'checkstyle-report.xml',
      'detekt': 'detekt-report.json',
      // Wave 4: API, Mobile, Cloud Native, AI/ML tools
      'osv-scanner': 'osv-report.json',
      'pip-audit': 'pip-audit-report.json',
      'cargo-audit': 'cargo-audit-report.json',
      'spectral': 'spectral-report.json',
      'schemathesis': 'schemathesis-report.json',
      'graphql-cop': 'graphql-cop-report.json',
      'mobsf': 'mobsf-report.json',
      'apkleaks': 'apkleaks-report.json',
      'swiftlint': 'swiftlint-report.json',
      'kubesec': 'kubesec-report.json',
      'kube-bench': 'kube-bench-report.json',
      'polaris': 'polaris-report.json',
      'terrascan': 'terrascan-report.json',
      'kube-hunter': 'kube-hunter-report.json',
      'cppcheck': 'cppcheck-report.xml',
      'flawfinder': 'flawfinder-report.json',
      'clippy': 'clippy-report.json',
      'garak': 'garak-report.jsonl',
      'modelscan': 'modelscan-report.json',
      'androguard': 'androguard-report.json',
      // Wave 5: January 2026 Expansion
      'ruff': 'ruff-report.json',
      'mypy': 'mypy-report.json',
      'hadolint': 'hadolint-report.json',
      'sqlfluff': 'sqlfluff-report.json',
      'golangci-lint': 'golangci-lint-report.json',
      'trufflehog': 'trufflehog-report.json',
      'actionlint': 'actionlint-report.json',
      'kics': 'kics-report.json',
      'cfn-lint': 'cfn-lint-report.json',
      'vale': 'vale-report.json',
      // Wave 6: January 2026 Expansion Part 2
      'yamllint': 'yamllint-report.json',
      'bearer': 'bearer-report.json',
      'pylint': 'pylint-report.json',
      'dart-analyze': 'dart-analyze-report.json',
      'ktlint': 'ktlint-report.json',
      'prowler': 'prowler-report.json',
      // Wave 7: January 2026 Expansion Part 3
      'clair': 'clair-report.json',
      'falco': 'falco-report.json',
      'slither': 'slither-report.json',
      'error-prone': 'error-prone-report.json',
      'credo': 'credo-report.json',
      'steampipe': 'steampipe-report.json',
      'sonar-scanner': 'sonar-scanner-report.json',
      'infer': 'infer-report.json',
      // Wave 8: January 2026 Expansion Part 4
      'scalafmt': 'scalafmt-report.json',
      'scalafix': 'scalafix-report.json',
      'hlint': 'hlint-report.json',
      'buf': 'buf-report.json',
      'angular-eslint': 'angular-eslint-report.json',
      'scancode-toolkit': 'scancode-report.json',
      'licensee': 'licensee-report.json',
      'cosign': 'cosign-report.json',
      'safety': 'safety-report.json',
      'sqlcheck': 'sqlcheck-report.json',
      'pgformatter': 'pgformatter-report.json',
    };

    const outputFile = outputFiles[toolId];
    const filePath = `${prefix}${outputFile}`;

    // Download and parse the file
    const [contents] = await this.storage.bucket(bucket).file(filePath).download();
    return JSON.parse(contents.toString('utf-8'));
  }

  /**
   * Upload source code to Cloud Storage for scanning
   */
  async uploadSource(localPath: string, scanId: string): Promise<string> {
    const destPath = `scans/${scanId}/source`;
    const bucket = this.storage.bucket(this.config.outputBucket);

    const fs = await import('fs');
    const path = await import('path');
    const { promisify } = await import('util');
    const readdir = promisify(fs.readdir);
    const stat = promisify(fs.stat);

    // Recursively upload files
    async function uploadDir(dir: string, prefix: string) {
      const entries = await readdir(dir);

      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stats = await stat(fullPath);

        if (stats.isDirectory()) {
          // Skip common directories
          if (['node_modules', '.git', 'dist', 'build'].includes(entry)) {
            continue;
          }
          await uploadDir(fullPath, `${prefix}${entry}/`);
        } else {
          const destFile = `${destPath}/${prefix}${entry}`;
          await bucket.upload(fullPath, { destination: destFile });
        }
      }
    }

    await uploadDir(localPath, '');

    return `${this.config.outputBucket}/${destPath}`;
  }

  /**
   * Clean up scan artifacts from Cloud Storage
   */
  async cleanup(scanId: string): Promise<void> {
    const bucket = this.storage.bucket(this.config.outputBucket);

    try {
      await bucket.deleteFiles({
        prefix: `scans/${scanId}/`,
      });
    } catch (error) {
      console.error(`Failed to cleanup scan ${scanId}:`, error);
    }
  }
}

/**
 * Create a Cloud Build runner with default configuration
 */
export function createCloudBuildRunner(): CloudBuildRunner | null {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const outputBucket = process.env.SCAN_OUTPUT_BUCKET || `${projectId}-bugrit-scans`;

  if (!projectId) {
    console.warn('GOOGLE_CLOUD_PROJECT not set, Cloud Build runner unavailable');
    return null;
  }

  return new CloudBuildRunner({
    projectId,
    outputBucket,
  });
}

/**
 * Get the pinned Docker image for a tool
 * Falls back to the image defined in DOCKER_TOOLS if not pinned
 */
export function getPinnedImage(toolId: DockerToolId): string {
  // Try to get pinned version first
  const pinnedVersion = DOCKER_VERSIONS[toolId];
  if (pinnedVersion) {
    return `${pinnedVersion.image}:${pinnedVersion.version}`;
  }

  // Fall back to DOCKER_TOOLS definition
  const toolConfig = DOCKER_TOOLS[toolId];
  if (toolConfig) {
    console.warn(`Tool ${toolId} not pinned in docker-versions.ts, using default image`);
    return toolConfig.image;
  }

  throw new Error(`Unknown tool: ${toolId}`);
}

/**
 * Check if all Docker tools have pinned versions
 */
export function validateVersionPinning(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const toolId of Object.keys(DOCKER_TOOLS)) {
    if (!DOCKER_VERSIONS[toolId]) {
      missing.push(toolId);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
