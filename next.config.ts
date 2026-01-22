import type {NextConfig} from 'next';

// Only ignore build errors in development for faster iteration
// Production builds MUST have type checking and linting enabled
const isDevelopment = process.env.NODE_ENV === 'development';
const isCI = process.env.CI === 'true';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Type errors are ALWAYS checked in production/CI builds
    ignoreBuildErrors: isDevelopment && !isCI,
  },
  eslint: {
    // Lint errors are ALWAYS checked in production/CI builds
    ignoreDuringBuilds: isDevelopment && !isCI,
  },
  // Exclude problematic packages from build tracing
  outputFileTracingExcludes: {
    '*': [
      'node_modules/knip/**',
      'node_modules/madge/**',
      'node_modules/dependency-cruiser/**',
      'node_modules/puppeteer/**',
      'node_modules/lighthouse/**',
      'node_modules/pa11y/**',
      'node_modules/@axe-core/**',
      'node_modules/secretlint/**',
      'node_modules/@secretlint/**',
      'node_modules/jscpd/**',
      'node_modules/@biomejs/**',
      'node_modules/playwright/**',
      'node_modules/webdriverio/**',
      'node_modules/depcheck/**',
      'node_modules/stylelint/**',
      'node_modules/license-checker-rseidelsohn/**',
      'node_modules/eslint/**',
    ],
  },
  // Exclude packages with native bindings from webpack bundling
  serverExternalPackages: [
    'knip',
    'madge',
    'dependency-cruiser',
    'puppeteer',
    'lighthouse',
    'pa11y',
    '@axe-core/puppeteer',
    '@secretlint/core',
    'secretlint',
    'jscpd',
    'biome',
    '@biomejs/js-api',
    'playwright',
    'webdriverio',
    'tauri-driver',
    'depcheck',
    'stylelint',
    'license-checker-rseidelsohn',
    'tar',
    'eslint',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
