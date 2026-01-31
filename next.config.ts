import type {NextConfig} from 'next';

// Detect build environment
const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: 'standalone',

  // Caching headers for better performance
  async headers() {
    return [
      {
        // Static assets - cache for 1 year (immutable)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Images - cache for 1 week
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Fonts - cache for 1 year
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API routes - no cache (dynamic data)
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        // Public pages - short cache with revalidation
        source: '/((?!api|_next).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },
  typescript: {
    // Type errors are checked during builds
    // Set to true only in development for faster iteration
    ignoreBuildErrors: isDevelopment,
  },
  eslint: {
    // ALWAYS skip ESLint during Next.js builds
    // Reasons:
    // 1. ESLint has a circular structure JSON serialization bug that causes OOM
    // 2. Linting should be done in a separate CI step, not during deployment
    // 3. Firebase App Hosting Cloud Build has limited memory (2GB)
    // 4. The eslint-plugin-react circular reference crashes the build
    // Run `npm run lint` separately in your CI pipeline
    ignoreDuringBuilds: true,
  },
  // Exclude problematic packages and directories from build tracing
  outputFileTracingExcludes: {
    '*': [
      'functions/**',
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
    'firebase-admin',
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
