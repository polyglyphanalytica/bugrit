// Performance Analyzer
// Detects performance issues and provides plain English explanations

import { Finding, AIPrompt, AnalyzerContext } from '../types';

interface PerformancePattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: Finding['severity'];
  description: string;
  explanation: string;
  impact: string;
  recommendation: string;
  languages: string[];
}

const PERFORMANCE_PATTERNS: PerformancePattern[] = [
  // Sync operations in async context
  {
    id: 'sync-in-async',
    name: 'Synchronous Operation in Async Context',
    pattern: /(?:readFileSync|writeFileSync|execSync|existsSync)\s*\(/g,
    severity: 'high',
    category: 'performance',
    description: 'Code uses synchronous file/process operations that block the event loop',
    explanation: 'Synchronous operations block the entire Node.js event loop until they complete. This prevents other requests from being processed, severely impacting application responsiveness.',
    impact: 'Application becomes unresponsive during the operation. In web servers, this can cause all users to experience delays.',
    recommendation: 'Replace synchronous operations with their async equivalents (readFile, writeFile, exec) and use await or callbacks.',
    languages: ['javascript', 'typescript'],
  },
  // N+1 query pattern
  {
    id: 'n-plus-one',
    name: 'Potential N+1 Query Problem',
    pattern: /(?:for|forEach|map)\s*\([^)]*\)\s*(?:{\s*)?(?:await\s+)?(?:\w+\.)?(?:find|get|fetch|query|select)\s*\(/g,
    severity: 'high',
    category: 'performance',
    description: 'Database or API calls are being made inside a loop',
    explanation: 'Making database queries inside a loop causes N+1 queries: one to get the list, then N more for each item. This dramatically increases response time as the dataset grows.',
    impact: 'Response time increases linearly with data size. A list of 100 items could require 101 database round trips instead of 1-2.',
    recommendation: 'Batch the queries: fetch all needed data in one query before the loop, or use database joins/includes to fetch related data upfront.',
    languages: ['javascript', 'typescript', 'python', 'java', 'ruby'],
  },
  // Large bundle imports
  {
    id: 'large-import',
    name: 'Potentially Large Library Import',
    pattern: /import\s+(?:\*\s+as\s+\w+|\w+)\s+from\s+['"](?:lodash|moment|rxjs|@mui\/material|antd)(?:\/|['"])/g,
    severity: 'medium',
    category: 'performance',
    description: 'Importing entire library instead of specific modules may increase bundle size',
    explanation: 'Importing an entire library when you only need specific functions significantly increases your JavaScript bundle size, slowing down page load times.',
    impact: 'Increased bundle size leads to longer download times and slower page loads, especially on mobile networks.',
    recommendation: 'Import only the specific functions or components you need. For example, use "import debounce from \'lodash/debounce\'" instead of "import _ from \'lodash\'".',
    languages: ['javascript', 'typescript'],
  },
  // Memory leak patterns
  {
    id: 'memory-leak',
    name: 'Potential Memory Leak',
    pattern: /(?:addEventListener|setInterval|setTimeout)\s*\([^)]+\)(?![\s\S]*?(?:removeEventListener|clearInterval|clearTimeout))/g,
    severity: 'medium',
    category: 'performance',
    description: 'Event listener or timer may not be properly cleaned up',
    explanation: 'Event listeners and timers that are not cleaned up when no longer needed can cause memory leaks, especially in single-page applications where components mount and unmount.',
    impact: 'Memory usage grows over time, eventually causing slowdowns or crashes. Most noticeable in long-running applications.',
    recommendation: 'Always remove event listeners and clear timers in cleanup functions (componentWillUnmount, useEffect cleanup, or equivalent).',
    languages: ['javascript', 'typescript'],
  },
  // Unoptimized re-renders
  {
    id: 'unoptimized-render',
    name: 'Potentially Unoptimized React Render',
    pattern: /useEffect\s*\(\s*\([^)]*\)\s*=>\s*{[\s\S]*?},\s*\[\s*\]\s*\)/g,
    severity: 'low',
    category: 'performance',
    description: 'useEffect with empty dependency array - verify this is intentional',
    explanation: 'A useEffect with an empty dependency array runs only once. While sometimes correct, it may cause stale data issues if the effect depends on props or state.',
    impact: 'Could lead to stale data being displayed or missing updates when dependencies change.',
    recommendation: 'Verify that no props or state variables used inside the effect need to be in the dependency array.',
    languages: ['javascript', 'typescript'],
  },
  // String concatenation in loops
  {
    id: 'string-concat-loop',
    name: 'String Concatenation in Loop',
    pattern: /(?:for|while)\s*\([^)]*\)\s*{[^}]*(?:\+=\s*['"`]|['"`]\s*\+\s*['"`])[^}]*}/g,
    severity: 'low',
    category: 'performance',
    description: 'Building a string by concatenation in a loop is inefficient',
    explanation: 'Strings are immutable, so each concatenation creates a new string. In a loop, this creates many intermediate strings that must be garbage collected.',
    impact: 'Can cause significant slowdowns with large loops and increased memory pressure from garbage collection.',
    recommendation: 'Use an array to collect parts, then join them at the end: parts.push(item); result = parts.join("").',
    languages: ['javascript', 'typescript', 'python', 'java'],
  },
  // No pagination
  {
    id: 'no-pagination',
    name: 'Query Without Pagination',
    pattern: /(?:findAll|find\(\)|getAll|query\s*\()\s*(?:[^)]*?)(?!\s*(?:limit|take|first|skip|offset|page))/g,
    severity: 'medium',
    category: 'performance',
    description: 'Database query appears to fetch all records without pagination',
    explanation: 'Fetching all records from a database without pagination can cause severe performance issues as data grows. Memory usage spikes and response times increase.',
    impact: 'Application may slow down dramatically or crash when data volume increases. Could also cause timeouts.',
    recommendation: 'Add pagination to limit the number of records returned. Use cursor-based pagination for large datasets.',
    languages: ['javascript', 'typescript', 'python', 'java'],
  },
  // Image without dimensions
  {
    id: 'img-no-dimensions',
    name: 'Image Without Explicit Dimensions',
    pattern: /<img[^>]+(?!width|height)[^>]*>/gi,
    severity: 'low',
    category: 'performance',
    description: 'Image element may be missing width and height attributes',
    explanation: 'Images without explicit dimensions cause layout shifts as the page loads, negatively impacting Core Web Vitals and user experience.',
    impact: 'Page content jumps around as images load, creating a poor user experience and hurting search rankings.',
    recommendation: 'Add width and height attributes to images, or use CSS aspect-ratio to reserve space.',
    languages: ['javascript', 'typescript'],
  },
  // Expensive operations in render
  {
    id: 'expensive-render',
    name: 'Expensive Operation in Render',
    pattern: /(?:return|render)\s*\([^)]*(?:\.filter\(|\.map\(|\.sort\(|\.reduce\()[^)]*\.(?:filter|map|sort|reduce)\(/g,
    severity: 'medium',
    category: 'performance',
    description: 'Multiple array operations chained in render path may be expensive',
    explanation: 'Chaining multiple array operations (filter, map, sort) creates intermediate arrays and runs on every render. This can cause noticeable lag in large lists.',
    impact: 'UI may feel sluggish, especially with large datasets. Each render repeats all the work.',
    recommendation: 'Use useMemo to memoize the result, or combine operations into a single reduce call.',
    languages: ['javascript', 'typescript'],
  },
];

export class PerformanceAnalyzer {
  /**
   * Analyze code for performance issues
   */
  analyze(context: AnalyzerContext): Finding[] {
    const findings: Finding[] = [];

    for (const pattern of PERFORMANCE_PATTERNS) {
      if (!pattern.languages.includes(context.language)) {
        continue;
      }

      const matches = this.findMatches(context, pattern);
      findings.push(...matches);
    }

    return findings;
  }

  private findMatches(context: AnalyzerContext, pattern: PerformancePattern): Finding[] {
    const findings: Finding[] = [];
    let match;

    pattern.pattern.lastIndex = 0;

    while ((match = pattern.pattern.exec(context.content)) !== null) {
      const line = this.getLineNumber(context.content, match.index);
      const codeSnippet = this.getCodeSnippet(context.lines, line);

      findings.push({
        id: `${pattern.id}-${context.file}-${line}`,
        category: 'performance',
        severity: pattern.severity,
        title: pattern.name,
        description: pattern.description,
        explanation: pattern.explanation,
        file: context.file,
        line,
        codeSnippet,
        impact: pattern.impact,
        affectedArea: 'Performance',
        recommendation: pattern.recommendation,
        aiPrompt: this.generateAIPrompt(pattern, context, codeSnippet, line),
        tags: ['performance', pattern.id],
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
    pattern: PerformancePattern,
    context: AnalyzerContext,
    codeSnippet: string,
    line: number
  ): AIPrompt {
    const shortPrompt = `Optimize performance in ${context.file} at line ${line}: ${pattern.recommendation}`;

    const detailedPrompt = `
I need to fix a performance issue in my codebase. A ${pattern.severity} priority "${pattern.name}" issue was found.

File: ${context.file}
Line: ${line}

The problem: ${pattern.description}

Code context:
\`\`\`
${codeSnippet}
\`\`\`

Why this is a performance problem:
${pattern.explanation}

Impact on the application:
${pattern.impact}

Please optimize this code by:
${pattern.recommendation}

Ensure the functionality remains exactly the same - only improve the performance.
`.trim();

    return {
      shortPrompt,
      detailedPrompt,
      steps: [
        `Open ${context.file} and find line ${line}`,
        'Understand the current implementation and its purpose',
        `Apply the optimization: ${pattern.recommendation}`,
        'Verify the functionality is unchanged',
        'Consider measuring the performance improvement',
      ],
      expectedOutcome: `The code should perform the same operation more efficiently, with identical output but better performance characteristics.`,
    };
  }
}
