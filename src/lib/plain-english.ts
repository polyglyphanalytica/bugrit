/**
 * Plain English translations for technical terms
 * Used throughout the app to make security concepts accessible to vibe coders
 */

// Technical term translations
export const TECH_TERMS: Record<string, { simple: string; explanation: string }> = {
  // Security vulnerabilities
  'SQL injection': {
    simple: 'Database attack',
    explanation: 'Hackers can access or modify your database by putting malicious code in form fields',
  },
  'XSS': {
    simple: 'Script attack',
    explanation: 'Attackers can run their code on your users\' browsers, stealing passwords or sessions',
  },
  'Cross-Site Scripting': {
    simple: 'Script attack',
    explanation: 'Attackers can run their code on your users\' browsers, stealing passwords or sessions',
  },
  'hardcoded secrets': {
    simple: 'Exposed passwords',
    explanation: 'Passwords, API keys, or tokens are visible in your code where anyone can find them',
  },
  'RCE': {
    simple: 'Server takeover',
    explanation: 'Remote Code Execution - attackers can run any command on your server',
  },
  'command injection': {
    simple: 'Server command attack',
    explanation: 'Hackers can run system commands on your server through user inputs',
  },
  'CSRF': {
    simple: 'Fake request attack',
    explanation: 'Attackers trick users into performing actions they didn\'t intend',
  },
  'privilege escalation': {
    simple: 'Unauthorized access',
    explanation: 'Attackers gain admin-level access starting from a regular user account',
  },

  // Dependencies
  'supply chain attack': {
    simple: 'Poisoned package',
    explanation: 'Malicious code hidden in a library you installed via npm/pip/etc.',
  },
  'CVE': {
    simple: 'Known vulnerability',
    explanation: 'A security flaw that\'s been publicly documented with a tracking number',
  },
  'GPL violation': {
    simple: 'License issue',
    explanation: 'Using open-source code in a way that violates its license terms',
  },
  'node_modules': {
    simple: 'Your installed packages',
    explanation: 'The folder containing all the JavaScript libraries your app depends on',
  },

  // Quality
  'linting': {
    simple: 'Code style check',
    explanation: 'Automated checking for coding style, common mistakes, and best practices',
  },
  'type error': {
    simple: 'Code mismatch',
    explanation: 'Using data in a way that doesn\'t match what the code expects',
  },
  'dead code': {
    simple: 'Unused code',
    explanation: 'Code that exists but never actually runs - just taking up space',
  },
  'technical debt': {
    simple: 'Accumulated shortcuts',
    explanation: 'Quick fixes and workarounds that will need to be properly fixed later',
  },

  // Performance
  'Core Web Vitals': {
    simple: 'Page speed scores',
    explanation: 'Google\'s measurements of how fast and responsive your pages feel to users',
  },
  'bundle size': {
    simple: 'Download size',
    explanation: 'How much JavaScript users need to download before your app works',
  },
  'memory leak': {
    simple: 'Memory buildup',
    explanation: 'Your app slowly uses more and more memory until it crashes',
  },

  // Accessibility
  'WCAG': {
    simple: 'Accessibility standard',
    explanation: 'Web Content Accessibility Guidelines - rules for making sites usable by everyone',
  },
  'WCAG 2.1': {
    simple: 'Accessibility rules',
    explanation: 'International standards for making websites usable by people with disabilities',
  },
  'ADA': {
    simple: 'Disability rights law',
    explanation: 'Americans with Disabilities Act - requires accessible digital services',
  },
  'screen reader': {
    simple: 'Voice browser',
    explanation: 'Software that reads web pages aloud for visually impaired users',
  },
  'alt text': {
    simple: 'Image description',
    explanation: 'Text that describes images for screen readers and when images fail to load',
  },

  // Infrastructure
  'S3 bucket': {
    simple: 'Cloud storage',
    explanation: 'Amazon\'s cloud file storage - often misconfigured to be publicly accessible',
  },
  'container escape': {
    simple: 'Security breakout',
    explanation: 'An attacker breaks out of their isolated environment to access the host system',
  },
  'Kubernetes': {
    simple: 'Container orchestration',
    explanation: 'System for automatically deploying and managing containerized applications',
  },
  'Terraform': {
    simple: 'Infrastructure code',
    explanation: 'Tool for defining and creating cloud resources using code files',
  },
  'Docker': {
    simple: 'App container',
    explanation: 'Packages your app with everything it needs to run anywhere',
  },

  // Tools
  'ESLint': {
    simple: 'JavaScript checker',
    explanation: 'Finds problems and enforces coding style in JavaScript/TypeScript',
  },
  'TypeScript': {
    simple: 'Type checker',
    explanation: 'Catches type mismatches before your code runs',
  },
  'Prettier': {
    simple: 'Code formatter',
    explanation: 'Automatically formats your code to be consistent',
  },
  'Semgrep': {
    simple: 'Security scanner',
    explanation: 'Searches your code for security vulnerabilities and bugs',
  },
  'Trivy': {
    simple: 'Vulnerability scanner',
    explanation: 'Finds known security issues in your containers and dependencies',
  },
  'axe-core': {
    simple: 'Accessibility tester',
    explanation: 'Tests your pages for accessibility issues',
  },

  // Frameworks (for scan options)
  'Playwright': {
    simple: 'Browser testing',
    explanation: 'Automated testing that controls real browsers to test your web app',
  },
  'Appium': {
    simple: 'Mobile testing',
    explanation: 'Automated testing for iOS and Android apps',
  },
  'Tauri': {
    simple: 'Desktop app framework',
    explanation: 'Build desktop apps using web technologies',
  },
  'Capacitor': {
    simple: 'Mobile wrapper',
    explanation: 'Turn your web app into a native iOS/Android app',
  },
};

// Severity level translations
export const SEVERITY_LABELS = {
  technical: {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    info: 'Info',
    error: 'Error',
    warning: 'Warning',
  },
  plain: {
    critical: 'Fix immediately',
    high: 'Fix soon',
    medium: 'Worth fixing',
    low: 'Nice to have',
    info: 'Good to know',
    error: 'Problem found',
    warning: 'Potential issue',
  },
};

// Category translations
export const CATEGORY_LABELS = {
  technical: {
    security: 'Security',
    dependencies: 'Dependencies',
    quality: 'Quality',
    linting: 'Linting',
    accessibility: 'Accessibility',
    performance: 'Performance',
    documentation: 'Documentation',
    git: 'Git',
    mobile: 'Mobile',
    'api-security': 'API Security',
    'cloud-native': 'Cloud Native',
  },
  plain: {
    security: 'Security Risks',
    dependencies: 'Package Issues',
    quality: 'Code Problems',
    linting: 'Style Issues',
    accessibility: 'Accessibility',
    performance: 'Speed Issues',
    documentation: 'Docs Issues',
    git: 'Git Issues',
    mobile: 'Mobile Security',
    'api-security': 'API Issues',
    'cloud-native': 'Infrastructure',
  },
};

// Human-readable scan progress steps
export const SCAN_PROGRESS_STEPS = [
  { key: 'secrets', label: 'Checking for leaked passwords and API keys', icon: '🔑' },
  { key: 'security', label: 'Looking for security vulnerabilities', icon: '🛡️' },
  { key: 'dependencies', label: 'Analyzing your packages and dependencies', icon: '📦' },
  { key: 'quality', label: 'Reviewing code quality', icon: '✨' },
  { key: 'accessibility', label: 'Testing accessibility', icon: '♿' },
  { key: 'performance', label: 'Measuring performance', icon: '⚡' },
  { key: 'documentation', label: 'Checking documentation', icon: '📚' },
];

// Get plain English translation for a term
export function getPlainEnglish(term: string): string {
  const entry = TECH_TERMS[term] || TECH_TERMS[term.toLowerCase()];
  return entry?.simple || term;
}

// Get explanation for a term
export function getExplanation(term: string): string | null {
  const entry = TECH_TERMS[term] || TECH_TERMS[term.toLowerCase()];
  return entry?.explanation || null;
}

// Get severity label based on mode
export function getSeverityLabel(severity: string, plain = false): string {
  const labels = plain ? SEVERITY_LABELS.plain : SEVERITY_LABELS.technical;
  return labels[severity as keyof typeof labels] || severity;
}

// Get category label based on mode
export function getCategoryLabel(category: string, plain = false): string {
  const labels = plain ? CATEGORY_LABELS.plain : CATEGORY_LABELS.technical;
  return labels[category as keyof typeof labels] || category;
}

// Fix guidance for common issues with AI prompts for vibe coders
export const FIX_GUIDANCE: Record<string, {
  what: string;
  why: string;
  how: string[];
  aiPrompt: string;
}> = {
  'hardcoded-secret': {
    what: 'A password, API key, or secret token is visible in your code.',
    why: 'Anyone who can see your code (including on GitHub) can steal this credential and use it.',
    how: [
      'Move the secret to an environment variable (like .env file)',
      'Add .env to your .gitignore so it\'s never committed',
      'Rotate (change) the exposed key immediately - it may already be compromised',
    ],
    aiPrompt: `Fix the hardcoded secret in {{file}} at line {{line}}.

1. Move this secret to an environment variable
2. Update the code to read from process.env.VARIABLE_NAME
3. Add the variable to .env.example with a placeholder value
4. Make sure .env is in .gitignore

Keep the same functionality but remove the hardcoded value from the code.`,
  },
  'sql-injection': {
    what: 'User input is being put directly into a database query.',
    why: 'Attackers can manipulate your database - reading, modifying, or deleting any data.',
    how: [
      'Use parameterized queries or prepared statements',
      'Never concatenate user input into SQL strings',
      'Use an ORM like Prisma, Drizzle, or Sequelize which handles this for you',
    ],
    aiPrompt: `Fix the SQL injection vulnerability in {{file}} at line {{line}}.

The current code is concatenating user input directly into a SQL query. This allows attackers to manipulate the query.

Fix this by:
1. Using parameterized queries with placeholders (?, $1, etc.)
2. Passing user input as parameters, not string concatenation
3. If using an ORM, use its query builder methods instead of raw SQL

Show me the fixed code that prevents SQL injection while keeping the same functionality.`,
  },
  'xss': {
    what: 'User input is being displayed without proper escaping.',
    why: 'Attackers can inject scripts that steal cookies, passwords, or hijack user sessions.',
    how: [
      'Always escape HTML when displaying user content',
      'Use your framework\'s built-in escaping (React does this automatically)',
      'Set Content-Security-Policy headers to limit script execution',
    ],
    aiPrompt: `Fix the XSS (Cross-Site Scripting) vulnerability in {{file}} at line {{line}}.

User input is being rendered without proper sanitization, allowing attackers to inject malicious scripts.

Fix this by:
1. Escaping HTML entities before displaying user content
2. Using the framework's safe rendering methods (e.g., textContent instead of innerHTML)
3. If HTML is needed, use a sanitization library like DOMPurify

Show me the secure version of this code.`,
  },
  'missing-alt-text': {
    what: 'Images are missing text descriptions.',
    why: 'Screen reader users can\'t understand what the image shows, and your SEO suffers.',
    how: [
      'Add alt="description" to every <img> tag',
      'Describe what the image shows, not just "image" or "photo"',
      'For decorative images, use alt="" (empty) to skip them',
    ],
    aiPrompt: `Add proper alt text to the image in {{file}} at line {{line}}.

Write a descriptive alt attribute that:
1. Describes what the image shows (not just "image" or "picture")
2. Is concise but informative (usually under 125 characters)
3. If it's a decorative image with no meaning, use alt="" (empty string)

Look at the context to understand what the image represents and write appropriate alt text.`,
  },
  'outdated-dependency': {
    what: 'You\'re using an older version of a package with known security issues.',
    why: 'Known vulnerabilities are easy targets - hackers have ready-made exploits for them.',
    how: [
      'Run npm update or yarn upgrade to get the latest versions',
      'Check the changelog for breaking changes before updating major versions',
      'Consider using Dependabot or Renovate for automatic updates',
    ],
    aiPrompt: `Update the vulnerable dependency {{package}} in this project.

1. Check what version we're currently using in package.json
2. Find the latest secure version that fixes the vulnerability
3. Update package.json with the new version
4. Check if there are any breaking changes I need to handle
5. Run npm install or yarn to update the lockfile

If there are breaking changes, show me what code needs to be updated to work with the new version.`,
  },
  'no-explicit-any': {
    what: 'You\'re using "any" type which bypasses TypeScript\'s type checking.',
    why: 'The whole point of TypeScript is catching errors early - "any" defeats that.',
    how: [
      'Define a proper type or interface for the data',
      'Use "unknown" if you truly don\'t know the type and handle it safely',
      'If it\'s external data, create a type guard to validate it',
    ],
    aiPrompt: `Replace the "any" type in {{file}} at line {{line}} with a proper TypeScript type.

1. Look at how this variable/parameter is used in the code
2. Create an appropriate type or interface based on the actual shape of the data
3. If it's data from an API, create an interface matching the response structure
4. If the type truly can be anything, use "unknown" and add proper type guards

Show me the typed version with the new interface/type definition.`,
  },
  'react-hooks-rules': {
    what: 'React hooks are being called conditionally or in loops.',
    why: 'Hooks must be called in the same order every render, or React gets confused and your app breaks.',
    how: [
      'Always call hooks at the top level of your component',
      'Never call hooks inside conditions, loops, or nested functions',
      'Move the condition inside the hook instead',
    ],
    aiPrompt: `Fix the React hooks violation in {{file}} at line {{line}}.

The hook is being called conditionally or in a loop, which violates React's rules of hooks.

Fix this by:
1. Moving the hook call to the top level of the component
2. If you need conditional behavior, move the condition INSIDE the hook (e.g., in useEffect's callback)
3. If you need multiple dynamic hooks, consider using a single hook with an array

Show me the corrected code that follows React's rules of hooks.`,
  },
  'unused-variable': {
    what: 'A variable is declared but never used.',
    why: 'Dead code makes your codebase harder to understand and slightly increases bundle size.',
    how: [
      'Remove the unused variable',
      'If you need it later, delete it now and add it back when needed',
      'If it\'s intentionally unused, prefix with underscore: _unusedVar',
    ],
    aiPrompt: `Clean up the unused variable in {{file}} at line {{line}}.

Either:
1. Remove it completely if it's not needed
2. If it's a function parameter that must exist (like for an API), prefix it with underscore: _unused
3. If it should be used but isn't, fix the code to use it properly

Show me the cleaned up code.`,
  },
  'console-log': {
    what: 'Console.log statements left in production code.',
    why: 'Debug logs in production leak information and look unprofessional in the browser console.',
    how: [
      'Remove console.log statements before deploying',
      'Use a proper logging service for production logging',
      'Set up ESLint to catch console statements',
    ],
    aiPrompt: `Remove the console.log statement in {{file}} at line {{line}}.

If this is:
- Debug code: Just delete it
- Important logging: Replace with a proper logger (like winston, pino, or your framework's logger)
- Error reporting: Use console.error or a monitoring service like Sentry

Show me the code with the console.log removed or replaced appropriately.`,
  },
  'missing-error-handling': {
    what: 'Async operations without try/catch or .catch() handlers.',
    why: 'Unhandled errors crash your app or leave users with no feedback when things go wrong.',
    how: [
      'Wrap async operations in try/catch blocks',
      'Add .catch() handlers to promises',
      'Show user-friendly error messages instead of crashing',
    ],
    aiPrompt: `Add error handling to the async operation in {{file}} at line {{line}}.

The code is missing proper error handling for async operations.

Add:
1. try/catch block around the async code
2. User-friendly error handling (toast notification, error state, etc.)
3. Proper logging of the error for debugging
4. Consider what the UI should show when this fails

Show me the code with proper error handling that won't leave users confused when something goes wrong.`,
  },
  'insecure-cookie': {
    what: 'Cookies are missing security flags.',
    why: 'Without proper flags, cookies can be stolen via XSS attacks or sent over insecure connections.',
    how: [
      'Add HttpOnly flag to prevent JavaScript access',
      'Add Secure flag to only send over HTTPS',
      'Add SameSite flag to prevent CSRF attacks',
    ],
    aiPrompt: `Fix the insecure cookie configuration in {{file}} at line {{line}}.

Add these security flags to the cookie:
1. HttpOnly: true - prevents JavaScript from reading the cookie
2. Secure: true - only sends cookie over HTTPS
3. SameSite: 'strict' or 'lax' - prevents CSRF attacks

For session cookies, use:
{ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' }

Show me the fixed cookie configuration.`,
  },
  'password-in-url': {
    what: 'Sensitive data is being passed in URL parameters.',
    why: 'URLs are logged everywhere (server logs, browser history, analytics) and can leak credentials.',
    how: [
      'Send sensitive data in the request body instead',
      'Use POST requests for operations with sensitive data',
      'Never put passwords, tokens, or PII in URLs',
    ],
    aiPrompt: `Fix the sensitive data exposure in {{file}} at line {{line}}.

Sensitive data (passwords, tokens, etc.) should never be in URL parameters because URLs are logged everywhere.

Fix this by:
1. Change from GET to POST request
2. Move the sensitive data to the request body
3. Update the API endpoint to accept the data from the body

Show me the secure version using POST with body data.`,
  },
};

// Generate a dynamic AI prompt for any finding
export function generateAIPrompt(finding: {
  message: string;
  file?: string;
  line?: number;
  rule?: string;
  severity?: string;
}): string {
  const location = finding.file
    ? `in ${finding.file}${finding.line ? ` at line ${finding.line}` : ''}`
    : '';

  return `Fix this ${finding.severity || 'code'} issue ${location}:

"${finding.message}"
${finding.rule ? `\nRule: ${finding.rule}` : ''}

Please:
1. Explain what's wrong in simple terms
2. Show me the fixed code
3. Explain why the fix works

Keep the same functionality but fix the issue.`;
}

// Get fix guidance for a finding
export function getFixGuidance(ruleId: string): typeof FIX_GUIDANCE[string] | null {
  // Normalize rule ID
  const normalized = ruleId.toLowerCase().replace(/[@/]/g, '-');

  // Check for direct match
  if (FIX_GUIDANCE[normalized]) {
    return FIX_GUIDANCE[normalized];
  }

  // Check for partial matches
  for (const [key, guidance] of Object.entries(FIX_GUIDANCE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return guidance;
    }
  }

  return null;
}

// Format AI prompt with actual values
export function formatAIPrompt(template: string, values: Record<string, string | number | undefined>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value || 'unknown'));
  }
  return result;
}

// Additional AI prompts for general categories
export const CATEGORY_AI_PROMPTS: Record<string, string> = {
  security: `I have security issues in my codebase that need fixing. Here's the scan report:

{{findings}}

For each issue:
1. Explain the security risk in simple terms
2. Show me the fixed code
3. Verify no new vulnerabilities are introduced

Prioritize fixes by severity (critical first).`,

  dependencies: `My project has dependency issues. Here's what was found:

{{findings}}

Please:
1. Update the affected packages in package.json
2. Check for any breaking changes
3. Run the updates and fix any compatibility issues
4. Make sure all tests still pass`,

  accessibility: `My app has accessibility issues that need fixing:

{{findings}}

For each issue:
1. Explain why it's important for users
2. Show me the fix
3. Test that it works with keyboard navigation
4. Verify screen reader compatibility`,

  quality: `My code has quality issues that need attention:

{{findings}}

For each issue:
1. Explain why it's a problem
2. Show the improved code
3. Make sure functionality is preserved
4. Add tests if appropriate`,

  performance: `My app has performance issues:

{{findings}}

Please:
1. Explain the performance impact
2. Show optimized code
3. Measure improvement where possible
4. Ensure functionality isn't broken`,
};

// Quick fix prompts for one-click actions
export const QUICK_FIX_PROMPTS: Record<string, string> = {
  'fix-all-eslint': `Fix all ESLint errors and warnings in this project.

1. Run npx eslint --fix on all files
2. For issues that can't be auto-fixed, fix them manually
3. Don't disable rules unless absolutely necessary
4. Explain any rules you had to disable and why`,

  'update-all-deps': `Update all dependencies to their latest versions.

1. Update package.json with latest versions
2. Run npm install / yarn
3. Fix any breaking changes
4. Run tests to verify nothing broke
5. List any major version changes that might need attention`,

  'fix-all-typescript': `Fix all TypeScript errors in this project.

1. Add proper types where there are 'any' types
2. Fix type mismatches
3. Create interfaces for complex objects
4. Don't use type assertions (as any) unless necessary`,

  'add-error-handling': `Add proper error handling throughout this codebase.

1. Wrap all async operations in try/catch
2. Add user-friendly error messages
3. Log errors for debugging
4. Add error boundaries for React components
5. Show loading and error states in the UI`,

  'secure-all-cookies': `Audit and fix all cookie usage in this project.

1. Find all places cookies are set
2. Add HttpOnly, Secure, and SameSite flags
3. Set appropriate expiration times
4. Document what each cookie is for`,

  'remove-console-logs': `Remove all console.log statements from production code.

1. Find all console.log, console.debug, console.info calls
2. Remove debug logging
3. Keep console.error and console.warn if appropriate
4. Replace important logs with a proper logging service`,
};
