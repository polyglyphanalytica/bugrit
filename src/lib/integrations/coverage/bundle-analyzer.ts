// Bundle Analyzer Integration (Self-hosted)
// License: MIT
// Website: https://github.com/webpack-contrib/webpack-bundle-analyzer

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface BundleStats {
  assets: Array<{
    name: string;
    size: number;
    chunks: number[];
    chunkNames: string[];
    emitted: boolean;
  }>;
  chunks: Array<{
    id: number;
    names: string[];
    size: number;
    modules: Array<{
      id: string;
      name: string;
      size: number;
      chunks: number[];
    }>;
  }>;
  modules: Array<{
    id: string;
    name: string;
    size: number;
    chunks: number[];
  }>;
  entrypoints: Record<string, { assets: Array<{ name: string; size: number }> }>;
  namedChunkGroups?: Record<string, { assets: Array<{ name: string; size: number }> }>;
}

export class BundleAnalyzerIntegration implements ToolIntegration {
  name = 'Bundle Analyzer';
  category = 'coverage' as const;
  description = 'Webpack bundle analyzer for visualizing bundle size and composition';
  website = 'https://github.com/webpack-contrib/webpack-bundle-analyzer';

  async isAvailable(): Promise<boolean> {
    try {
      const fs = await import('fs');
      // Check for common build tools
      return (
        fs.existsSync('package.json') &&
        (fs.existsSync('webpack.config.js') ||
         fs.existsSync('next.config.js') ||
         fs.existsSync('vite.config.js') ||
         fs.existsSync('rollup.config.js'))
      );
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        maxSize: 250000, // 250KB
        maxTotalSize: 1000000, // 1MB
        maxModuleSize: 50000, // 50KB
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const fs = await import('fs');
      const path = await import('path');

      const targetDir = target.directory || '.';
      const maxSize = (config?.options?.maxSize || 250000) as number;
      const maxTotalSize = (config?.options?.maxTotalSize || 1000000) as number;
      const maxModuleSize = (config?.options?.maxModuleSize || 50000) as number;

      // Look for webpack stats
      const possiblePaths = [
        path.join(targetDir, 'stats.json'),
        path.join(targetDir, '.next', 'build-manifest.json'),
        path.join(targetDir, 'dist', 'stats.json'),
        path.join(targetDir, 'build', 'stats.json'),
      ];

      let statsPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          statsPath = p;
          break;
        }
      }

      if (!statsPath) {
        // Try to generate stats
        try {
          const { execSync } = await import('child_process');
          execSync('npx webpack --json > stats.json', {
            encoding: 'utf-8',
            cwd: targetDir,
            maxBuffer: 100 * 1024 * 1024
          });
          statsPath = path.join(targetDir, 'stats.json');
        } catch {
          return {
            tool: this.name,
            category: this.category,
            success: false,
            duration: Date.now() - startTime,
            findings: [],
            summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
            error: 'Bundle stats not found. Build with stats output enabled.',
          };
        }
      }

      const stats: BundleStats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

      findings.push(...this.analyzeAssets(stats, maxSize, maxTotalSize));
      findings.push(...this.analyzeModules(stats, maxModuleSize));
      findings.push(...this.analyzeDuplicates(stats));

      return this.createResult(findings, Date.now() - startTime, stats);
    } catch (error) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private analyzeAssets(stats: BundleStats, maxSize: number, maxTotalSize: number): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Check total bundle size
    const totalSize = stats.assets?.reduce((sum, a) => sum + a.size, 0) || 0;

    if (totalSize > maxTotalSize) {
      findings.push({
        id: 'bundle-total-size',
        tool: this.name,
        category: this.category,
        severity: totalSize > maxTotalSize * 2 ? 'high' : 'medium',
        title: 'Bundle Analyzer: Total Bundle Too Large',
        description: `Total bundle size is ${(totalSize / 1024).toFixed(2)}KB (max: ${(maxTotalSize / 1024).toFixed(0)}KB)`,
        explanation: 'Large bundles increase load times and affect user experience.',
        impact: 'Users on slow connections will experience long loading times.',
        recommendation: 'Use code splitting, tree shaking, and lazy loading.',
        documentationUrl: 'https://webpack.js.org/guides/code-splitting/',
        aiPrompt: {
          short: 'Reduce total bundle size',
          detailed: `
Reduce total bundle size from ${(totalSize / 1024).toFixed(2)}KB to under ${(maxTotalSize / 1024).toFixed(0)}KB.

Strategies:
- Code splitting
- Tree shaking
- Lazy loading
- Remove unused dependencies
          `.trim(),
          steps: [
            'Analyze bundle composition',
            'Identify large dependencies',
            'Implement code splitting',
            'Remove unused code',
          ],
        },
        ruleId: 'total-size',
        tags: ['bundle', 'performance', 'size'],
        effort: 'hard',
      });
    }

    // Check individual assets
    for (const asset of stats.assets || []) {
      if (asset.size > maxSize && !asset.name.includes('.map')) {
        findings.push({
          id: `bundle-asset-${asset.name}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity: asset.size > maxSize * 2 ? 'high' : 'medium',
          title: `Bundle Analyzer: Large Asset - ${asset.name}`,
          description: `Asset "${asset.name}" is ${(asset.size / 1024).toFixed(2)}KB (max: ${(maxSize / 1024).toFixed(0)}KB)`,
          explanation: 'This asset is larger than the recommended maximum.',
          impact: 'Large assets slow down page load.',
          file: asset.name,
          recommendation: 'Split this chunk or lazy load it.',
          documentationUrl: 'https://webpack.js.org/guides/code-splitting/',
          aiPrompt: {
            short: `Reduce size of ${asset.name}`,
            detailed: `Reduce asset size from ${(asset.size / 1024).toFixed(2)}KB to under ${(maxSize / 1024).toFixed(0)}KB.`,
            steps: ['Analyze asset contents', 'Split or lazy load', 'Verify improvement'],
          },
          ruleId: 'asset-size',
          tags: ['bundle', 'performance', 'size'],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private analyzeModules(stats: BundleStats, maxModuleSize: number): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Check for large modules
    const allModules: Array<{ name: string; size: number }> = [];

    for (const chunk of stats.chunks || []) {
      for (const mod of chunk.modules || []) {
        allModules.push({ name: mod.name, size: mod.size });
      }
    }

    // Sort by size and check largest
    allModules.sort((a, b) => b.size - a.size);

    for (const mod of allModules.slice(0, 10)) {
      if (mod.size > maxModuleSize && !mod.name.includes('node_modules')) {
        findings.push({
          id: `bundle-module-${mod.name}`.replace(/[^a-z0-9-]/gi, '-').substring(0, 100),
          tool: this.name,
          category: this.category,
          severity: 'low',
          title: `Bundle Analyzer: Large Module`,
          description: `Module "${mod.name}" is ${(mod.size / 1024).toFixed(2)}KB`,
          explanation: 'This module contributes significantly to bundle size.',
          impact: 'Large modules increase bundle size.',
          file: mod.name,
          recommendation: 'Consider splitting this module or lazy loading.',
          documentationUrl: 'https://webpack.js.org/guides/code-splitting/',
          aiPrompt: {
            short: `Optimize module ${mod.name}`,
            detailed: `Optimize or split large module: ${mod.name} (${(mod.size / 1024).toFixed(2)}KB)`,
            steps: ['Review module', 'Split if possible', 'Lazy load'],
          },
          ruleId: 'module-size',
          tags: ['bundle', 'performance'],
          effort: 'moderate',
        });
      }
    }

    return findings;
  }

  private analyzeDuplicates(stats: BundleStats): AuditFinding[] {
    const findings: AuditFinding[] = [];

    // Check for duplicate modules
    const moduleOccurrences = new Map<string, number>();

    for (const chunk of stats.chunks || []) {
      for (const mod of chunk.modules || []) {
        // Extract package name from node_modules
        const match = mod.name.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
        if (match) {
          const pkg = match[1];
          moduleOccurrences.set(pkg, (moduleOccurrences.get(pkg) || 0) + 1);
        }
      }
    }

    for (const [pkg, count] of moduleOccurrences.entries()) {
      if (count > 1) {
        findings.push({
          id: `bundle-duplicate-${pkg}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity: count > 3 ? 'medium' : 'low',
          title: `Bundle Analyzer: Duplicate Package - ${pkg}`,
          description: `Package "${pkg}" appears in ${count} chunks`,
          explanation: 'Multiple versions of the same package may be bundled.',
          impact: 'Duplicates increase bundle size unnecessarily.',
          recommendation: 'Use npm dedupe or webpack SplitChunksPlugin.',
          documentationUrl: 'https://webpack.js.org/plugins/split-chunks-plugin/',
          aiPrompt: {
            short: `Deduplicate ${pkg}`,
            detailed: `Remove duplicate instances of ${pkg} (found ${count} times).`,
            steps: ['Run npm dedupe', 'Configure splitChunks', 'Verify bundle'],
          },
          ruleId: 'duplicate-package',
          tags: ['bundle', 'duplicate'],
          effort: 'easy',
        });
      }
    }

    return findings;
  }

  private createResult(findings: AuditFinding[], duration: number, stats: BundleStats): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    const totalSize = stats.assets?.reduce((sum, a) => sum + a.size, 0) || 0;

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: findings.length === 0 ? 1 : 0,
        failed: findings.length,
      },
      metadata: {
        totalSize,
        assetCount: stats.assets?.length || 0,
        chunkCount: stats.chunks?.length || 0,
      },
    };
  }
}
