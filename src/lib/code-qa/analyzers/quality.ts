// Quality Analyzer
// Detects code quality issues and provides plain English explanations

import { Finding, AIPrompt, AnalyzerContext } from '../types';

interface QualityPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: Finding['severity'];
  category: Finding['category'];
  description: string;
  explanation: string;
  impact: string;
  recommendation: string;
  languages: string[];
}

const QUALITY_PATTERNS: QualityPattern[] = [
  // Console logs in production
  {
    id: 'console-log',
    name: 'Console Statement in Code',
    pattern: /\bconsole\.(log|debug|info|warn|error|trace)\s*\(/g,
    severity: 'low',
    category: 'quality',
    description: 'Code contains console statements that may have been left from debugging',
    explanation: 'Console statements are useful during development but should typically be removed or replaced with proper logging before production. They can expose sensitive information and impact performance.',
    impact: 'May expose debugging information to users, clutter browser console, and slightly impact performance.',
    recommendation: 'Remove debug console statements or replace with a proper logging library that can be configured for different environments.',
    languages: ['javascript', 'typescript'],
  },
  // TODO comments
  {
    id: 'todo-comment',
    name: 'Unresolved TODO Comment',
    pattern: /\/\/\s*TODO[:\s]|\/\*\s*TODO[:\s]|#\s*TODO[:\s]/gi,
    severity: 'info',
    category: 'maintainability',
    description: 'Code contains a TODO comment indicating unfinished work',
    explanation: 'TODO comments mark areas of code that need attention. While useful for tracking work, unresolved TODOs can indicate technical debt or incomplete features.',
    impact: 'Unresolved TODOs may indicate missing functionality, potential bugs, or areas needing improvement.',
    recommendation: 'Review this TODO and either complete the task, create a ticket in your issue tracker, or remove it if no longer relevant.',
    languages: ['javascript', 'typescript', 'python', 'java', 'go', 'ruby'],
  },
  // Magic numbers
  {
    id: 'magic-number',
    name: 'Magic Number',
    pattern: /(?<![a-zA-Z_$])(?:(?:===|!==|==|!=|>|<|>=|<=)\s*\d{2,}|\d{2,}\s*(?:===|!==|==|!=|>|<|>=|<=))/g,
    severity: 'low',
    category: 'maintainability',
    description: 'Code contains a hardcoded number without explanation',
    explanation: 'Magic numbers are numeric literals used directly in code without explanation. They make code harder to understand and maintain because the meaning of the number is not clear.',
    impact: 'Reduces code readability and makes maintenance more difficult. Changes require finding all instances of the number.',
    recommendation: 'Extract the number into a named constant with a descriptive name that explains its purpose.',
    languages: ['javascript', 'typescript', 'python', 'java', 'go'],
  },
  // Long functions
  {
    id: 'long-function',
    name: 'Function May Be Too Long',
    pattern: /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:async\s+)?(?:\w+)\s*\([^)]*\)\s*{)[^}]{2000,}/g,
    severity: 'medium',
    category: 'maintainability',
    description: 'This function appears to be very long and may benefit from being split up',
    explanation: 'Long functions are harder to understand, test, and maintain. They often do too many things and violate the single responsibility principle.',
    impact: 'Reduces code readability, makes testing more difficult, and increases the risk of bugs when making changes.',
    recommendation: 'Consider breaking this function into smaller, focused functions. Each function should do one thing well.',
    languages: ['javascript', 'typescript'],
  },
  // Nested callbacks (callback hell)
  {
    id: 'callback-hell',
    name: 'Deeply Nested Callbacks',
    pattern: /\)\s*=>\s*{[^}]*\)\s*=>\s*{[^}]*\)\s*=>\s*{/g,
    severity: 'medium',
    category: 'quality',
    description: 'Code has deeply nested callback functions, making it hard to follow',
    explanation: 'Deeply nested callbacks (callback hell) make code difficult to read, debug, and maintain. The flow of execution becomes hard to follow.',
    impact: 'Significantly reduces code readability and makes error handling more difficult.',
    recommendation: 'Refactor using async/await syntax, Promise.all() for parallel operations, or break into separate named functions.',
    languages: ['javascript', 'typescript'],
  },
  // Empty catch blocks
  {
    id: 'empty-catch',
    name: 'Empty Catch Block',
    pattern: /catch\s*\([^)]*\)\s*{\s*}/g,
    severity: 'high',
    category: 'error',
    description: 'Error is caught but completely ignored without any handling',
    explanation: 'Empty catch blocks silently swallow errors, making debugging extremely difficult. When something goes wrong, you will have no indication of what happened.',
    impact: 'Bugs become invisible. Users may experience broken functionality with no error messages or logs to help diagnose the issue.',
    recommendation: 'At minimum, log the error. Better yet, handle the error appropriately or let it propagate if you cannot handle it.',
    languages: ['javascript', 'typescript', 'java', 'python'],
  },
  // Unused variables (basic detection)
  {
    id: 'unused-var-pattern',
    name: 'Potentially Unused Variable',
    pattern: /(?:const|let|var)\s+_\w+\s*=/g,
    severity: 'low',
    category: 'quality',
    description: 'Variable prefixed with underscore may indicate intentionally unused variable',
    explanation: 'Variables prefixed with underscore are a convention for indicating unused variables. If the variable is truly unused, it should be removed to keep code clean.',
    impact: 'Unused variables add noise to the code and may confuse other developers about their purpose.',
    recommendation: 'If the variable is unused, remove it. If it is used, consider renaming without the underscore prefix.',
    languages: ['javascript', 'typescript'],
  },
  // Type assertion abuse
  {
    id: 'type-assertion',
    name: 'Type Assertion May Hide Issues',
    pattern: /as\s+any\b|<any>/g,
    severity: 'medium',
    category: 'quality',
    description: 'Code uses "as any" which bypasses TypeScript type checking',
    explanation: 'Using "as any" tells TypeScript to ignore type checking for this value. This defeats the purpose of using TypeScript and can hide real bugs.',
    impact: 'Type errors that TypeScript would normally catch will be missed, potentially causing runtime errors.',
    recommendation: 'Define proper types for the value. If the type is complex, consider creating an interface or type alias.',
    languages: ['typescript'],
  },
  // Any type usage
  {
    id: 'explicit-any',
    name: 'Explicit Any Type',
    pattern: /:\s*any\b/g,
    severity: 'low',
    category: 'quality',
    description: 'Code explicitly uses the "any" type, losing type safety',
    explanation: 'The "any" type disables TypeScript type checking for that value. While sometimes necessary, overuse reduces the benefits of TypeScript.',
    impact: 'Reduces type safety and may hide potential bugs that would be caught with proper typing.',
    recommendation: 'Replace "any" with a specific type. Use "unknown" if the type is truly unknown, then narrow it with type guards.',
    languages: ['typescript'],
  },
  // Duplicate strings
  {
    id: 'duplicate-string',
    name: 'Repeated String Literal',
    pattern: /(['"])(?:error|success|loading|pending|failed|Error:|Warning:)\1/gi,
    severity: 'low',
    category: 'maintainability',
    description: 'Same string literal appears multiple times in code',
    explanation: 'Repeated string literals make code harder to maintain. If the string needs to change, you must find and update every occurrence.',
    impact: 'Increases maintenance burden and risk of inconsistencies when updating strings.',
    recommendation: 'Extract repeated strings into named constants or an internationalization file.',
    languages: ['javascript', 'typescript', 'python', 'java'],
  },
];

export class QualityAnalyzer {
  /**
   * Analyze code for quality issues
   */
  analyze(context: AnalyzerContext): Finding[] {
    const findings: Finding[] = [];

    for (const pattern of QUALITY_PATTERNS) {
      if (!pattern.languages.includes(context.language)) {
        continue;
      }

      const matches = this.findMatches(context, pattern);
      findings.push(...matches);
    }

    return findings;
  }

  private findMatches(context: AnalyzerContext, pattern: QualityPattern): Finding[] {
    const findings: Finding[] = [];
    let match;

    pattern.pattern.lastIndex = 0;

    while ((match = pattern.pattern.exec(context.content)) !== null) {
      const line = this.getLineNumber(context.content, match.index);
      const codeSnippet = this.getCodeSnippet(context.lines, line);

      findings.push({
        id: `${pattern.id}-${context.file}-${line}`,
        category: pattern.category,
        severity: pattern.severity,
        title: pattern.name,
        description: pattern.description,
        explanation: pattern.explanation,
        file: context.file,
        line,
        codeSnippet,
        impact: pattern.impact,
        affectedArea: this.getCategoryArea(pattern.category),
        recommendation: pattern.recommendation,
        aiPrompt: this.generateAIPrompt(pattern, context, codeSnippet, line),
        tags: [pattern.category, pattern.id],
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

  private getCategoryArea(category: Finding['category']): string {
    const areas: Record<Finding['category'], string> = {
      security: 'Security',
      performance: 'Performance',
      quality: 'Code Quality',
      build: 'Build System',
      error: 'Error Handling',
      accessibility: 'Accessibility',
      maintainability: 'Maintainability',
      'best-practice': 'Best Practices',
    };
    return areas[category] || 'General';
  }

  private generateAIPrompt(
    pattern: QualityPattern,
    context: AnalyzerContext,
    codeSnippet: string,
    line: number
  ): AIPrompt {
    const shortPrompt = `Improve code quality in ${context.file} at line ${line}: ${pattern.recommendation}`;

    const detailedPrompt = `
I need to improve code quality in my codebase. A ${pattern.severity} priority ${pattern.name} issue was found.

File: ${context.file}
Line: ${line}

The issue: ${pattern.description}

Code context:
\`\`\`
${codeSnippet}
\`\`\`

Why this matters:
${pattern.explanation}

Impact:
${pattern.impact}

Please improve this code by:
${pattern.recommendation}

Keep the existing functionality unchanged while improving the code quality.
`.trim();

    return {
      shortPrompt,
      detailedPrompt,
      steps: [
        `Open ${context.file} and navigate to line ${line}`,
        'Understand what the code is doing',
        `Apply the improvement: ${pattern.recommendation}`,
        'Verify the code still works correctly',
      ],
      expectedOutcome: `The code quality issue should be resolved while maintaining identical functionality.`,
    };
  }
}
