// Lizard Integration - Code Complexity Analyzer
// License: MIT
// Website: https://github.com/terryyin/lizard

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface LizardFunction {
  name: string;
  long_name: string;
  filename: string;
  nloc: number;
  complexity: number;
  token_count: number;
  parameters: number;
  start_line: number;
  end_line: number;
}

interface LizardFileResult {
  filename: string;
  nloc: number;
  function_list: LizardFunction[];
}

interface LizardOutput {
  files: LizardFileResult[];
  total: {
    nloc: number;
    ccn: number;
    token_count: number;
    function_count: number;
    file_count: number;
  };
}

export class LizardIntegration implements ToolIntegration {
  name = 'lizard';
  category = 'complexity' as const;
  description = 'Code complexity analyzer supporting multiple languages with cyclomatic complexity metrics';
  website = 'https://github.com/terryyin/lizard';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('lizard --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        ccnThreshold: 15,       // Cyclomatic complexity threshold
        nlccThreshold: 100,      // Lines of code threshold per function
        parametersThreshold: 7,  // Max parameters per function
        extensions: [],          // Additional file extensions
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const targetDir = target.directory || '.';
      const ccnThreshold = (config?.options?.ccnThreshold as number) || 15;
      const nlocThreshold = (config?.options?.nlocThreshold as number) || 100;
      const paramsThreshold = (config?.options?.parametersThreshold as number) || 7;

      // Run lizard with XML output for structured data
      const result = execSync(
        `lizard "${targetDir}" --xml`,
        { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 300000 }
      );

      // Parse XML output
      const functions = this.parseXmlOutput(result);

      for (const func of functions) {
        // Check cyclomatic complexity
        if (func.complexity > ccnThreshold) {
          findings.push(this.createComplexityFinding(func, ccnThreshold));
        }

        // Check function length
        if (func.nloc > nlocThreshold) {
          findings.push(this.createLengthFinding(func, nlocThreshold));
        }

        // Check parameter count
        if (func.parameters > paramsThreshold) {
          findings.push(this.createParametersFinding(func, paramsThreshold));
        }
      }

      return this.createResult(findings, Date.now() - startTime, functions.length);
    } catch (error) {
      // Try alternative JSON-like parsing approach
      try {
        const { execSync } = await import('child_process');
        const targetDir = target.directory || '.';
        const ccnThreshold = (config?.options?.ccnThreshold as number) || 15;
        const nlocThreshold = (config?.options?.nlocThreshold as number) || 100;
        const paramsThreshold = (config?.options?.parametersThreshold as number) || 7;

        // Fallback: parse CSV output
        const csvResult = execSync(
          `lizard "${targetDir}" --csv`,
          { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024, timeout: 300000 }
        );

        const functions = this.parseCsvOutput(csvResult);

        for (const func of functions) {
          if (func.complexity > ccnThreshold) {
            findings.push(this.createComplexityFinding(func, ccnThreshold));
          }
          if (func.nloc > nlocThreshold) {
            findings.push(this.createLengthFinding(func, nlocThreshold));
          }
          if (func.parameters > paramsThreshold) {
            findings.push(this.createParametersFinding(func, paramsThreshold));
          }
        }

        return this.createResult(findings, Date.now() - startTime, functions.length);
      } catch {
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
  }

  private parseXmlOutput(xml: string): LizardFunction[] {
    const functions: LizardFunction[] = [];

    // Simple XML parsing for lizard output
    const itemRegex = /<item\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const name = match[1];
      const content = match[2];

      // Extract metrics from the item content
      const getValue = (tag: string): number => {
        const tagMatch = content.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
        return tagMatch ? parseInt(tagMatch[1], 10) || 0 : 0;
      };

      const getStringValue = (tag: string): string => {
        const tagMatch = content.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
        return tagMatch ? tagMatch[1] : '';
      };

      functions.push({
        name: name.split('::').pop() || name,
        long_name: name,
        filename: getStringValue('file') || '',
        nloc: getValue('nloc'),
        complexity: getValue('cyclomatic_complexity') || getValue('ccn'),
        token_count: getValue('token_count'),
        parameters: getValue('parameter_count') || getValue('params'),
        start_line: getValue('start_line'),
        end_line: getValue('end_line'),
      });
    }

    // Fallback: try to parse function elements directly
    if (functions.length === 0) {
      const funcRegex = /<function[^>]*>([\s\S]*?)<\/function>/g;
      while ((match = funcRegex.exec(xml)) !== null) {
        const content = match[1];

        const getValue = (attr: string): number => {
          const attrMatch = content.match(new RegExp(`<${attr}>([^<]+)</${attr}>`));
          return attrMatch ? parseInt(attrMatch[1], 10) || 0 : 0;
        };

        const getStringValue = (attr: string): string => {
          const attrMatch = content.match(new RegExp(`<${attr}>([^<]+)</${attr}>`));
          return attrMatch ? attrMatch[1] : '';
        };

        const name = getStringValue('name') || 'unknown';
        functions.push({
          name: name.split('::').pop() || name,
          long_name: name,
          filename: getStringValue('file') || getStringValue('filename') || '',
          nloc: getValue('nloc'),
          complexity: getValue('cyclomatic_complexity') || getValue('ccn'),
          token_count: getValue('token_count'),
          parameters: getValue('parameter_count') || getValue('parameters'),
          start_line: getValue('start_line'),
          end_line: getValue('end_line'),
        });
      }
    }

    return functions;
  }

  private parseCsvOutput(csv: string): LizardFunction[] {
    const functions: LizardFunction[] = [];
    const lines = csv.trim().split('\n');

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length >= 7) {
        // CSV format: NLOC,CCN,token,PARAM,length,location,file,function,long_name,start,end
        functions.push({
          nloc: parseInt(cols[0], 10) || 0,
          complexity: parseInt(cols[1], 10) || 0,
          token_count: parseInt(cols[2], 10) || 0,
          parameters: parseInt(cols[3], 10) || 0,
          filename: cols[6] || '',
          name: cols[7] || '',
          long_name: cols[8] || cols[7] || '',
          start_line: parseInt(cols[9], 10) || 0,
          end_line: parseInt(cols[10], 10) || 0,
        });
      }
    }

    return functions;
  }

  private createComplexityFinding(func: LizardFunction, threshold: number): AuditFinding {
    const severity: Severity = func.complexity > threshold * 2 ? 'high' : func.complexity > threshold * 1.5 ? 'medium' : 'low';

    return {
      id: `lizard-ccn-${func.filename}-${func.start_line}-${func.name}`,
      tool: this.name,
      category: this.category,
      severity,
      title: `High Complexity: ${func.name} (CCN: ${func.complexity})`,
      description: `Function "${func.name}" has a cyclomatic complexity of ${func.complexity}, exceeding the threshold of ${threshold}.`,
      explanation: `Cyclomatic complexity measures the number of independent paths through a function. High complexity (>${threshold}) indicates code that is difficult to test, understand, and maintain. Each decision point (if, switch, loop, &&, ||) adds to complexity.`,
      impact: 'Complex functions are harder to test (need more test cases), understand (cognitive load), and maintain (higher bug probability).',
      file: func.filename,
      line: func.start_line,
      endLine: func.end_line,
      recommendation: `Reduce complexity by:
1. Extract helper functions for distinct logic blocks
2. Replace nested conditionals with early returns/guard clauses
3. Use polymorphism instead of type checks
4. Simplify boolean expressions
5. Consider the Strategy or State pattern for complex branching`,
      aiPrompt: {
        short: `Reduce complexity of ${func.name}`,
        detailed: `Function has high cyclomatic complexity:

File: ${func.filename}
Function: ${func.name}
Lines: ${func.start_line}-${func.end_line}
Complexity: ${func.complexity} (threshold: ${threshold})
Parameters: ${func.parameters}
Lines of code: ${func.nloc}

Refactor to reduce complexity by extracting methods, simplifying conditions, or using design patterns.`,
        steps: [
          'Identify independent logic blocks',
          'Extract each block into a well-named helper function',
          'Replace nested ifs with guard clauses',
          'Consider using polymorphism for type-based branching',
          'Run tests after each refactoring step',
        ],
      },
      ruleId: 'high-cyclomatic-complexity',
      tags: ['lizard', 'complexity', 'maintainability', 'ccn'],
      effort: func.complexity > threshold * 2 ? 'hard' : 'moderate',
    };
  }

  private createLengthFinding(func: LizardFunction, threshold: number): AuditFinding {
    return {
      id: `lizard-nloc-${func.filename}-${func.start_line}-${func.name}`,
      tool: this.name,
      category: this.category,
      severity: 'low',
      title: `Long Function: ${func.name} (${func.nloc} lines)`,
      description: `Function "${func.name}" has ${func.nloc} lines of code, exceeding the threshold of ${threshold}.`,
      explanation: 'Long functions are harder to understand, test, and maintain. They often indicate that the function is doing too much.',
      impact: 'Reduced readability and increased maintenance burden.',
      file: func.filename,
      line: func.start_line,
      endLine: func.end_line,
      recommendation: `Break down the function into smaller, focused functions. Each function should do one thing well.`,
      aiPrompt: {
        short: `Split ${func.name} into smaller functions`,
        detailed: `Long function detected:

File: ${func.filename}
Function: ${func.name}
Lines: ${func.start_line}-${func.end_line}
NLOC: ${func.nloc} (threshold: ${threshold})

Break this down into smaller, focused functions with clear responsibilities.`,
        steps: [
          'Identify logical sections within the function',
          'Extract each section into a named function',
          'Ensure each new function has a single responsibility',
          'Update tests to cover new functions',
        ],
      },
      ruleId: 'long-function',
      tags: ['lizard', 'length', 'maintainability', 'nloc'],
      effort: 'moderate',
    };
  }

  private createParametersFinding(func: LizardFunction, threshold: number): AuditFinding {
    return {
      id: `lizard-params-${func.filename}-${func.start_line}-${func.name}`,
      tool: this.name,
      category: this.category,
      severity: 'low',
      title: `Too Many Parameters: ${func.name} (${func.parameters} params)`,
      description: `Function "${func.name}" has ${func.parameters} parameters, exceeding the threshold of ${threshold}.`,
      explanation: 'Functions with many parameters are hard to call correctly and often indicate that the function is doing too much or needs restructuring.',
      impact: 'Poor API design, harder to use and test.',
      file: func.filename,
      line: func.start_line,
      recommendation: `Consider:
1. Grouping related parameters into an options object
2. Using builder pattern for complex construction
3. Breaking into multiple functions with fewer parameters`,
      aiPrompt: {
        short: `Reduce parameters in ${func.name}`,
        detailed: `Function has too many parameters:

File: ${func.filename}
Function: ${func.name}
Line: ${func.start_line}
Parameters: ${func.parameters} (threshold: ${threshold})

Refactor to use an options object or split into smaller functions.`,
        steps: [
          'Identify related parameters that can be grouped',
          'Create a typed options/config object',
          'Update function signature',
          'Update all call sites',
        ],
      },
      ruleId: 'too-many-parameters',
      tags: ['lizard', 'parameters', 'api-design'],
      effort: 'moderate',
    };
  }

  private createResult(findings: AuditFinding[], duration: number, functionsAnalyzed: number): AuditResult {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => bySeverity[f.severity]++);

    return {
      tool: this.name,
      category: this.category,
      success: true,
      duration,
      findings,
      summary: {
        total: findings.length,
        bySeverity,
        passed: functionsAnalyzed - findings.length,
        failed: findings.length,
      },
      metadata: { functionsAnalyzed },
    };
  }
}
