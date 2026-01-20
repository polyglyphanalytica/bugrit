// Security Analyzer
// Detects security vulnerabilities and provides plain English explanations

import { Finding, AIPrompt, AnalyzerContext } from '../types';

interface SecurityPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: Finding['severity'];
  description: string;
  explanation: string;
  impact: string;
  recommendation: string;
  cweId?: string;
  owaspCategory?: string;
  languages: string[];
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  // SQL Injection
  {
    id: 'sql-injection',
    name: 'Potential SQL Injection',
    pattern: /(\$\{.*\}|`.*\+.*`|['"].*\+.*['"])\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE)/gi,
    severity: 'critical',
    description: 'User input appears to be directly concatenated into a SQL query',
    explanation: 'SQL injection occurs when user-supplied data is included in a SQL query without proper sanitization. An attacker could modify the query to access, modify, or delete data they should not have access to.',
    impact: 'An attacker could read sensitive data, modify or delete database records, or potentially gain administrative access to the database server.',
    recommendation: 'Use parameterized queries or prepared statements instead of string concatenation. Never trust user input in SQL queries.',
    cweId: 'CWE-89',
    owaspCategory: 'A03:2021-Injection',
    languages: ['javascript', 'typescript', 'python', 'java', 'php'],
  },
  // XSS
  {
    id: 'xss-vulnerability',
    name: 'Potential Cross-Site Scripting (XSS)',
    pattern: /innerHTML\s*=|dangerouslySetInnerHTML|document\.write\(|\.html\(/gi,
    severity: 'high',
    description: 'Code directly inserts content into the DOM without sanitization',
    explanation: 'Cross-Site Scripting allows attackers to inject malicious scripts into web pages viewed by other users. This happens when user input is rendered without proper encoding.',
    impact: 'An attacker could steal session cookies, redirect users to malicious sites, or perform actions on behalf of the user.',
    recommendation: 'Sanitize all user input before rendering. Use framework-provided safe methods. For React, avoid dangerouslySetInnerHTML unless absolutely necessary and sanitize content.',
    cweId: 'CWE-79',
    owaspCategory: 'A03:2021-Injection',
    languages: ['javascript', 'typescript'],
  },
  // Hardcoded Secrets
  {
    id: 'hardcoded-secret',
    name: 'Hardcoded Secret or API Key',
    pattern: /(?:api[_-]?key|apikey|secret|password|token|auth)[\s]*[=:]\s*['"][a-zA-Z0-9_\-]{16,}['"]/gi,
    severity: 'critical',
    description: 'A secret, API key, or password appears to be hardcoded in the source code',
    explanation: 'Hardcoded secrets in source code can be extracted by anyone with access to the code. If the code is in a public repository or gets leaked, these secrets become compromised.',
    impact: 'Exposed credentials could allow attackers to access your systems, APIs, or third-party services, potentially leading to data breaches or financial loss.',
    recommendation: 'Move all secrets to environment variables or a secure secrets manager. Never commit secrets to version control. Use .env files locally and secure secret management in production.',
    cweId: 'CWE-798',
    owaspCategory: 'A07:2021-Identification and Authentication Failures',
    languages: ['javascript', 'typescript', 'python', 'java', 'go', 'ruby'],
  },
  // Eval usage
  {
    id: 'unsafe-eval',
    name: 'Use of eval() or Similar Dynamic Code Execution',
    pattern: /\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['"`]/gi,
    severity: 'high',
    description: 'Code uses eval() or similar dynamic code execution functions',
    explanation: 'The eval() function executes arbitrary code, which creates a significant security risk if any part of the evaluated code comes from user input or external sources.',
    impact: 'An attacker could execute arbitrary code in your application, potentially gaining full control of the execution environment.',
    recommendation: 'Avoid using eval() entirely. Use JSON.parse() for JSON data, or restructure your code to avoid dynamic code execution.',
    cweId: 'CWE-95',
    owaspCategory: 'A03:2021-Injection',
    languages: ['javascript', 'typescript'],
  },
  // Insecure HTTP
  {
    id: 'insecure-http',
    name: 'Insecure HTTP Protocol',
    pattern: /['"]http:\/\/(?!localhost|127\.0\.0\.1)/gi,
    severity: 'medium',
    description: 'Code references a URL using insecure HTTP instead of HTTPS',
    explanation: 'HTTP transmits data in plain text, making it vulnerable to interception and modification by attackers on the network path.',
    impact: 'Data transmitted over HTTP can be read or modified by attackers, potentially exposing sensitive information or allowing man-in-the-middle attacks.',
    recommendation: 'Use HTTPS for all external URLs. Update any hardcoded HTTP URLs to HTTPS.',
    cweId: 'CWE-319',
    owaspCategory: 'A02:2021-Cryptographic Failures',
    languages: ['javascript', 'typescript', 'python', 'java', 'go'],
  },
  // Command Injection
  {
    id: 'command-injection',
    name: 'Potential Command Injection',
    pattern: /exec\(|execSync\(|spawn\(|system\(|popen\(|subprocess\.call/gi,
    severity: 'critical',
    description: 'Code executes system commands, which may include user input',
    explanation: 'Command injection occurs when user input is passed to system commands without proper sanitization, allowing attackers to execute arbitrary commands.',
    impact: 'An attacker could execute arbitrary system commands, potentially gaining full control of the server, accessing sensitive files, or compromising other systems.',
    recommendation: 'Avoid passing user input to system commands. If necessary, use allow-lists for input validation and escape special characters.',
    cweId: 'CWE-78',
    owaspCategory: 'A03:2021-Injection',
    languages: ['javascript', 'typescript', 'python', 'ruby', 'php'],
  },
  // Path Traversal
  {
    id: 'path-traversal',
    name: 'Potential Path Traversal',
    pattern: /(?:readFile|writeFile|createReadStream|access)\s*\([^)]*(?:\+|`\$\{)/gi,
    severity: 'high',
    description: 'File path appears to include user-controllable input',
    explanation: 'Path traversal vulnerabilities allow attackers to access files outside the intended directory by using sequences like "../" in file paths.',
    impact: 'An attacker could read sensitive files like configuration files or credentials, or potentially overwrite critical system files.',
    recommendation: 'Validate and sanitize file paths. Use path.normalize() and ensure the resulting path stays within the expected directory.',
    cweId: 'CWE-22',
    owaspCategory: 'A01:2021-Broken Access Control',
    languages: ['javascript', 'typescript', 'python', 'java'],
  },
  // Weak Crypto
  {
    id: 'weak-crypto',
    name: 'Weak Cryptographic Algorithm',
    pattern: /\b(?:md5|sha1|des|rc4)\b/gi,
    severity: 'medium',
    description: 'Code uses a cryptographic algorithm that is considered weak or broken',
    explanation: 'Algorithms like MD5, SHA1, DES, and RC4 have known vulnerabilities and should not be used for security-sensitive operations.',
    impact: 'Data protected with weak cryptography could be compromised, allowing attackers to forge signatures, crack passwords, or decrypt sensitive data.',
    recommendation: 'Use modern cryptographic algorithms: SHA-256 or SHA-3 for hashing, AES-256 for encryption, and bcrypt or Argon2 for password hashing.',
    cweId: 'CWE-327',
    owaspCategory: 'A02:2021-Cryptographic Failures',
    languages: ['javascript', 'typescript', 'python', 'java', 'go'],
  },
  // Insecure Deserialization
  {
    id: 'insecure-deserialization',
    name: 'Potential Insecure Deserialization',
    pattern: /JSON\.parse\([^)]*(?:req\.|request\.|body|params|query)/gi,
    severity: 'medium',
    description: 'User input is being parsed as JSON without validation',
    explanation: 'While JSON.parse itself is relatively safe, parsing user input without validation can lead to unexpected behavior or denial of service.',
    impact: 'Could lead to application crashes, unexpected behavior, or in some cases more severe attacks depending on how the parsed data is used.',
    recommendation: 'Validate the structure and types of parsed JSON data before using it. Use schema validation libraries like Zod, Yup, or Joi.',
    cweId: 'CWE-502',
    owaspCategory: 'A08:2021-Software and Data Integrity Failures',
    languages: ['javascript', 'typescript'],
  },
  // Missing Auth Check
  {
    id: 'missing-auth-check',
    name: 'Potentially Missing Authentication Check',
    pattern: /(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*['"][^'"]+['"],\s*(?:async\s*)?\([^)]*\)\s*=>/gi,
    severity: 'medium',
    description: 'API route handler may be missing authentication middleware',
    explanation: 'API endpoints without authentication checks can be accessed by anyone, potentially exposing sensitive data or functionality.',
    impact: 'Unauthenticated endpoints could allow unauthorized access to data or functionality, leading to data breaches or misuse.',
    recommendation: 'Ensure all sensitive endpoints have appropriate authentication middleware. Review this endpoint to confirm authentication is properly handled.',
    cweId: 'CWE-306',
    owaspCategory: 'A07:2021-Identification and Authentication Failures',
    languages: ['javascript', 'typescript'],
  },
];

export class SecurityAnalyzer {
  /**
   * Analyze code for security vulnerabilities
   */
  analyze(context: AnalyzerContext): Finding[] {
    const findings: Finding[] = [];

    for (const pattern of SECURITY_PATTERNS) {
      // Check if pattern applies to this language
      if (!pattern.languages.includes(context.language)) {
        continue;
      }

      // Find matches
      const matches = this.findMatches(context, pattern);
      findings.push(...matches);
    }

    return findings;
  }

  private findMatches(context: AnalyzerContext, pattern: SecurityPattern): Finding[] {
    const findings: Finding[] = [];
    let match;

    // Reset regex
    pattern.pattern.lastIndex = 0;

    while ((match = pattern.pattern.exec(context.content)) !== null) {
      const line = this.getLineNumber(context.content, match.index);
      const codeSnippet = this.getCodeSnippet(context.lines, line);

      findings.push({
        id: `${pattern.id}-${context.file}-${line}`,
        category: 'security',
        severity: pattern.severity,
        title: pattern.name,
        description: pattern.description,
        explanation: pattern.explanation,
        file: context.file,
        line,
        codeSnippet,
        impact: pattern.impact,
        affectedArea: 'Security',
        recommendation: pattern.recommendation,
        aiPrompt: this.generateAIPrompt(pattern, context, codeSnippet, line),
        cweId: pattern.cweId,
        owaspCategory: pattern.owaspCategory,
        tags: ['security', pattern.id],
        references: [
          pattern.cweId ? `https://cwe.mitre.org/data/definitions/${pattern.cweId.replace('CWE-', '')}.html` : undefined,
          'https://owasp.org/Top10/',
        ].filter(Boolean) as string[],
      });
    }

    return findings;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getCodeSnippet(lines: string[], lineNumber: number): string {
    const start = Math.max(0, lineNumber - 2);
    const end = Math.min(lines.length, lineNumber + 2);
    return lines.slice(start, end).join('\n');
  }

  private generateAIPrompt(
    pattern: SecurityPattern,
    context: AnalyzerContext,
    codeSnippet: string,
    line: number
  ): AIPrompt {
    const shortPrompt = `Fix the ${pattern.name.toLowerCase()} vulnerability in ${context.file} at line ${line}. ${pattern.recommendation}`;

    const detailedPrompt = `
I have identified a ${pattern.severity} severity ${pattern.name} vulnerability in my codebase.

File: ${context.file}
Line: ${line}

The issue: ${pattern.description}

Code context:
\`\`\`
${codeSnippet}
\`\`\`

Why this is a problem:
${pattern.explanation}

Potential impact:
${pattern.impact}

Please fix this vulnerability by:
${pattern.recommendation}

Do not introduce any new functionality or change the existing logic - only fix the security issue.
`.trim();

    return {
      shortPrompt,
      detailedPrompt,
      steps: [
        `Locate the vulnerable code at line ${line} in ${context.file}`,
        'Understand what the code is trying to accomplish',
        `Apply the recommended fix: ${pattern.recommendation}`,
        'Test that the functionality still works correctly',
        'Verify the security vulnerability is resolved',
      ],
      expectedOutcome: `The ${pattern.name.toLowerCase()} vulnerability should be eliminated while maintaining the original functionality of the code.`,
    };
  }
}
