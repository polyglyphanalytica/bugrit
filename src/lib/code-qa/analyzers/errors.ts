// Error Analyzer
// Detects potential errors, build issues, and code problems

import { Finding, AIPrompt, AnalyzerContext } from '../types';

interface ErrorPattern {
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

const ERROR_PATTERNS: ErrorPattern[] = [
  // Missing await
  {
    id: 'missing-await',
    name: 'Potentially Missing Await',
    pattern: /(?:const|let|var)\s+\w+\s*=\s*(?!await\s)(?:\w+\.)?(?:fetch|axios|get|post|put|delete|find|findOne|save|create|update|remove)\s*\(/g,
    severity: 'high',
    category: 'error',
    description: 'Async operation may be missing an await keyword',
    explanation: 'Without await, the variable will contain a Promise instead of the resolved value. This often leads to unexpected behavior where operations seem to fail silently.',
    impact: 'Code may not work as expected. The variable will be a Promise object rather than the actual data, causing type errors or logic failures.',
    recommendation: 'Add the await keyword before the async operation, and ensure the containing function is marked as async.',
    languages: ['javascript', 'typescript'],
  },
  // Unhandled promise
  {
    id: 'unhandled-promise',
    name: 'Unhandled Promise Rejection',
    pattern: /(?:\.then\s*\([^)]+\))(?!\s*\.catch|\s*\.finally)/g,
    severity: 'medium',
    category: 'error',
    description: 'Promise chain does not have error handling',
    explanation: 'Promises without .catch() will cause unhandled rejection warnings in Node.js and may crash your application in strict mode.',
    impact: 'Errors may go unnoticed, making debugging difficult. In Node.js, unhandled rejections can terminate the process.',
    recommendation: 'Add a .catch() handler to handle errors, or use try/catch with async/await.',
    languages: ['javascript', 'typescript'],
  },
  // Incorrect equality
  {
    id: 'loose-equality',
    name: 'Loose Equality Comparison',
    pattern: /[^!=]==[^=]|[^!]=!=[^=]/g,
    severity: 'medium',
    category: 'error',
    description: 'Code uses loose equality (== or !=) which can cause unexpected type coercion',
    explanation: 'Loose equality performs type coercion before comparison, leading to surprising results like 0 == "" being true. This is a common source of bugs.',
    impact: 'May cause incorrect comparisons, especially with null, undefined, numbers, and strings. Logic errors can be hard to track down.',
    recommendation: 'Use strict equality (=== and !==) to avoid type coercion surprises.',
    languages: ['javascript', 'typescript'],
  },
  // Null/undefined access
  {
    id: 'null-access',
    name: 'Potential Null/Undefined Access',
    pattern: /(?:\w+)\s*\.\s*(?:\w+)\s*\.\s*(?:\w+)(?!\s*\?)/g,
    severity: 'medium',
    category: 'error',
    description: 'Deep property access without null checks may throw an error',
    explanation: 'Accessing properties of potentially null or undefined values throws a TypeError. This is one of the most common JavaScript errors.',
    impact: 'Application may crash at runtime when the intermediate property is null or undefined.',
    recommendation: 'Use optional chaining (?.) for safe property access, or add explicit null checks.',
    languages: ['javascript', 'typescript'],
  },
  // Unused imports
  {
    id: 'unused-import',
    name: 'Potentially Unused Import',
    pattern: /import\s+{\s*(\w+)\s*}\s+from/g,
    severity: 'low',
    category: 'build',
    description: 'This import may not be used in the file',
    explanation: 'Unused imports increase bundle size slightly and make code harder to read. They may also cause issues with tree-shaking.',
    impact: 'Slightly larger bundle size and reduced code clarity.',
    recommendation: 'Remove unused imports. Most IDEs can automatically clean up unused imports.',
    languages: ['javascript', 'typescript'],
  },
  // Deprecated API usage
  {
    id: 'deprecated-api',
    name: 'Deprecated API Usage',
    pattern: /\b(?:componentWillMount|componentWillReceiveProps|componentWillUpdate|substr|escape|unescape)\b/g,
    severity: 'medium',
    category: 'error',
    description: 'Code uses a deprecated API that may be removed in future versions',
    explanation: 'Deprecated APIs are marked for removal. While they still work, they may cause warnings and will eventually stop working in future versions.',
    impact: 'Code may break in future updates. May also cause console warnings that clutter logs.',
    recommendation: 'Replace deprecated APIs with their modern equivalents. Check documentation for the recommended replacement.',
    languages: ['javascript', 'typescript'],
  },
  // Incorrect array mutation
  {
    id: 'array-mutation',
    name: 'Array Mutation May Cause Issues',
    pattern: /(?:state|props)\.\w+\.(?:push|pop|shift|unshift|splice|sort|reverse)\s*\(/g,
    severity: 'high',
    category: 'error',
    description: 'Directly mutating state or props array, which can cause React render issues',
    explanation: 'Mutating arrays in state or props directly does not trigger React re-renders. The component will not update to reflect the change.',
    impact: 'UI will not update correctly. Data appears to change but the display remains stale.',
    recommendation: 'Create a new array instead of mutating: use [...array, newItem] or array.filter() or array.map() to create new arrays.',
    languages: ['javascript', 'typescript'],
  },
  // Missing key in list
  {
    id: 'missing-key',
    name: 'Missing Key Prop in List',
    pattern: /\.map\s*\([^)]*\)\s*(?:=>|{)[\s\S]*?<\s*(?!Fragment)[A-Z]\w*[^>]*>(?![^<]*key\s*=)/g,
    severity: 'medium',
    category: 'error',
    description: 'List items rendered without a unique key prop',
    explanation: 'React uses keys to identify which items changed, were added, or removed. Without keys, React cannot efficiently update the list.',
    impact: 'Poor performance when lists change. May cause incorrect item updates or state bugs.',
    recommendation: 'Add a unique key prop to each list item. Use a stable ID from your data, not the array index.',
    languages: ['javascript', 'typescript'],
  },
  // setState in render
  {
    id: 'setState-in-render',
    name: 'State Update in Render',
    pattern: /render\s*\([^)]*\)\s*{[\s\S]*?(?:setState|set[A-Z]\w*)\s*\(/g,
    severity: 'critical',
    category: 'error',
    description: 'State is being updated during render, causing infinite loops',
    explanation: 'Updating state during render triggers a new render, which updates state again, creating an infinite loop that crashes the application.',
    impact: 'Application will freeze or crash with "Maximum update depth exceeded" error.',
    recommendation: 'Move state updates to event handlers, useEffect, or lifecycle methods. Never update state directly in render.',
    languages: ['javascript', 'typescript'],
  },
  // Incorrect dependency array
  {
    id: 'missing-dependency',
    name: 'Potentially Missing Dependency',
    pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*{[^}]*(\w+)[^}]*},\s*\[\s*\]\s*\)/g,
    severity: 'medium',
    category: 'error',
    description: 'useEffect uses variables that are not in its dependency array',
    explanation: 'When useEffect uses variables from the component scope but does not list them as dependencies, the effect may use stale values.',
    impact: 'Effect may not run when it should, or may use outdated values leading to bugs.',
    recommendation: 'Add all variables used inside the effect to the dependency array, or use the useCallback/useMemo hooks for functions.',
    languages: ['javascript', 'typescript'],
  },
  // Import from src path
  {
    id: 'absolute-import-error',
    name: 'Potentially Invalid Import Path',
    pattern: /import\s+.*\s+from\s+['"](?:\.\.\/){4,}/g,
    severity: 'low',
    category: 'build',
    description: 'Deep relative import path may indicate need for path aliases',
    explanation: 'Deeply nested relative imports are hard to maintain and prone to errors when files are moved. They also make the code harder to read.',
    impact: 'Imports may break when refactoring. Code is harder to navigate.',
    recommendation: 'Set up path aliases (e.g., @/ for src/) in your bundler/TypeScript config to use cleaner import paths.',
    languages: ['javascript', 'typescript'],
  },
];

export class ErrorAnalyzer {
  /**
   * Analyze code for potential errors and build issues
   */
  analyze(context: AnalyzerContext): Finding[] {
    const findings: Finding[] = [];

    for (const pattern of ERROR_PATTERNS) {
      if (!pattern.languages.includes(context.language)) {
        continue;
      }

      const matches = this.findMatches(context, pattern);
      findings.push(...matches);
    }

    return findings;
  }

  private findMatches(context: AnalyzerContext, pattern: ErrorPattern): Finding[] {
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
    pattern: ErrorPattern,
    context: AnalyzerContext,
    codeSnippet: string,
    line: number
  ): AIPrompt {
    const shortPrompt = `Fix the ${pattern.name.toLowerCase()} in ${context.file} at line ${line}. ${pattern.recommendation}`;

    const detailedPrompt = `
I need to fix a potential bug in my codebase. A ${pattern.severity} priority "${pattern.name}" issue was found.

File: ${context.file}
Line: ${line}

The problem: ${pattern.description}

Code context:
\`\`\`
${codeSnippet}
\`\`\`

Why this is problematic:
${pattern.explanation}

What could go wrong:
${pattern.impact}

Please fix this issue by:
${pattern.recommendation}

Ensure the fix does not change the intended behavior of the code.
`.trim();

    return {
      shortPrompt,
      detailedPrompt,
      steps: [
        `Open ${context.file} and navigate to line ${line}`,
        'Understand what the code is trying to accomplish',
        `Apply the fix: ${pattern.recommendation}`,
        'Test that the code works correctly after the fix',
        'Verify no new issues were introduced',
      ],
      expectedOutcome: `The potential error should be fixed, making the code more reliable without changing its intended behavior.`,
    };
  }
}
