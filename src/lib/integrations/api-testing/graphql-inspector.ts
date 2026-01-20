// GraphQL Inspector Integration (Self-hosted)
// License: MIT
// Website: https://graphql-inspector.com

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';

interface GraphQLChange {
  type: string;
  criticality: {
    level: 'BREAKING' | 'DANGEROUS' | 'NON_BREAKING';
    reason?: string;
  };
  message: string;
  path?: string;
}

interface GraphQLCoverage {
  types: number;
  fields: number;
  covered: {
    types: number;
    fields: number;
  };
  sources: Array<{
    name: string;
    body: string;
  }>;
}

interface GraphQLValidation {
  errors: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
  warnings: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
  }>;
}

export class GraphQLInspectorIntegration implements ToolIntegration {
  name = 'GraphQL Inspector';
  category = 'api-testing' as const;
  description = 'Tooling for GraphQL to detect breaking changes, coverage, and validation';
  website = 'https://graphql-inspector.com';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('npx graphql-inspector --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        checkDeprecations: true,
        checkCoverage: true,
        checkDiff: true,
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    if (!target.graphqlSchema) {
      return {
        tool: this.name,
        category: this.category,
        success: false,
        duration: Date.now() - startTime,
        findings: [],
        summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 }, passed: 0, failed: 0 },
        error: 'GraphQL schema file is required',
      };
    }

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      // Validate schema
      findings.push(...this.validateSchema(target.graphqlSchema));

      // Check for breaking changes if comparing schemas
      if (target.graphqlSchemaOld) {
        findings.push(...this.diffSchemas(target.graphqlSchemaOld, target.graphqlSchema));
      }

      // Check coverage if operations file provided
      if (target.graphqlOperations) {
        findings.push(...this.checkCoverage(target.graphqlSchema, target.graphqlOperations));
      }

      // Run similar operation analysis
      findings.push(...this.analyzeSimilarOperations(target.graphqlSchema));

      return this.createResult(findings, Date.now() - startTime);
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

  private validateSchema(schemaPath: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = require('child_process');
      const result = execSync(
        `npx graphql-inspector validate "${schemaPath}" --json`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const validation: GraphQLValidation = JSON.parse(result);

      for (const error of validation.errors || []) {
        findings.push({
          id: `gql-validate-${error.message}`.replace(/[^a-z0-9-]/gi, '-').substring(0, 100),
          tool: this.name,
          category: this.category,
          severity: 'high',
          title: 'GraphQL: Schema Validation Error',
          description: error.message,
          explanation: 'The GraphQL schema has validation errors that will cause runtime failures.',
          impact: 'Schema errors will prevent the GraphQL API from functioning correctly.',
          file: schemaPath,
          line: error.locations?.[0]?.line,
          recommendation: 'Fix the schema validation error.',
          documentationUrl: 'https://graphql-inspector.com/docs/essentials/validate',
          aiPrompt: {
            short: 'Fix GraphQL schema validation error',
            detailed: `
Fix the GraphQL schema validation error.

Schema: ${schemaPath}
Error: ${error.message}
${error.locations ? `Location: Line ${error.locations[0].line}, Column ${error.locations[0].column}` : ''}

Fix the schema to resolve this validation error.
            `.trim(),
            steps: ['Locate the error in schema', 'Fix the issue', 'Re-validate'],
          },
          ruleId: 'schema-validation',
          tags: ['graphql', 'schema', 'validation'],
          effort: 'easy',
        });
      }

      for (const warning of validation.warnings || []) {
        findings.push({
          id: `gql-warn-${warning.message}`.replace(/[^a-z0-9-]/gi, '-').substring(0, 100),
          tool: this.name,
          category: this.category,
          severity: 'low',
          title: 'GraphQL: Schema Warning',
          description: warning.message,
          explanation: 'Schema warning that should be reviewed.',
          impact: 'Minor issue that may affect schema quality.',
          file: schemaPath,
          line: warning.locations?.[0]?.line,
          recommendation: 'Review and address the warning if appropriate.',
          documentationUrl: 'https://graphql-inspector.com/docs/essentials/validate',
          aiPrompt: {
            short: 'Review GraphQL schema warning',
            detailed: `Review and fix: ${warning.message}`,
            steps: ['Review warning', 'Fix if appropriate'],
          },
          ruleId: 'schema-warning',
          tags: ['graphql', 'schema', 'warning'],
          effort: 'trivial',
        });
      }
    } catch {
      // Validation command failed - may not have valid schema
    }

    return findings;
  }

  private diffSchemas(oldSchema: string, newSchema: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = require('child_process');
      const result = execSync(
        `npx graphql-inspector diff "${oldSchema}" "${newSchema}" --json`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const changes: GraphQLChange[] = JSON.parse(result);

      for (const change of changes) {
        const severity: Severity = change.criticality.level === 'BREAKING' ? 'high'
          : change.criticality.level === 'DANGEROUS' ? 'medium' : 'info';

        findings.push({
          id: `gql-diff-${change.type}-${change.path || 'schema'}`.replace(/[^a-z0-9-]/gi, '-'),
          tool: this.name,
          category: this.category,
          severity,
          title: `GraphQL: ${change.criticality.level} Change - ${change.type}`,
          description: change.message,
          explanation: change.criticality.reason || `${change.criticality.level} schema change detected.`,
          impact: change.criticality.level === 'BREAKING'
            ? 'This change will break existing clients using the old schema.'
            : change.criticality.level === 'DANGEROUS'
              ? 'This change may cause issues for some clients.'
              : 'Non-breaking change.',
          file: newSchema,
          recommendation: this.getChangeRecommendation(change),
          documentationUrl: 'https://graphql-inspector.com/docs/essentials/diff',
          aiPrompt: {
            short: `Review GraphQL ${change.criticality.level} change: ${change.type}`,
            detailed: `
GraphQL schema change detected.

Type: ${change.type}
Criticality: ${change.criticality.level}
Path: ${change.path || 'N/A'}

${change.message}

${change.criticality.reason || ''}

Review this change and ensure clients are updated if necessary.
            `.trim(),
            steps: [
              'Review the change impact',
              'Update affected clients if breaking',
              'Consider deprecation for breaking changes',
            ],
          },
          ruleId: `diff-${change.criticality.level.toLowerCase()}`,
          tags: ['graphql', 'schema-diff', change.criticality.level.toLowerCase()],
          effort: change.criticality.level === 'BREAKING' ? 'hard' : 'easy',
        });
      }
    } catch {
      // Diff command failed
    }

    return findings;
  }

  private checkCoverage(schemaPath: string, operationsPath: string): AuditFinding[] {
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = require('child_process');
      const result = execSync(
        `npx graphql-inspector coverage "${operationsPath}" "${schemaPath}" --json`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      const coverage: GraphQLCoverage = JSON.parse(result);
      const typeCoverage = (coverage.covered.types / coverage.types) * 100;
      const fieldCoverage = (coverage.covered.fields / coverage.fields) * 100;

      if (typeCoverage < 50) {
        findings.push({
          id: 'gql-coverage-types',
          tool: this.name,
          category: this.category,
          severity: 'medium',
          title: 'GraphQL: Low Type Coverage',
          description: `Only ${typeCoverage.toFixed(1)}% of types are covered by operations.`,
          explanation: 'Many schema types are not being used by any operations.',
          impact: 'Unused types may indicate dead code or missing functionality.',
          recommendation: 'Review unused types and either add operations or remove them.',
          documentationUrl: 'https://graphql-inspector.com/docs/essentials/coverage',
          aiPrompt: {
            short: 'Improve GraphQL type coverage',
            detailed: `Improve GraphQL type coverage (${typeCoverage.toFixed(1)}%)`,
            steps: ['Identify unused types', 'Add operations or remove types'],
          },
          ruleId: 'type-coverage',
          tags: ['graphql', 'coverage'],
          effort: 'moderate',
        });
      }

      if (fieldCoverage < 50) {
        findings.push({
          id: 'gql-coverage-fields',
          tool: this.name,
          category: this.category,
          severity: 'medium',
          title: 'GraphQL: Low Field Coverage',
          description: `Only ${fieldCoverage.toFixed(1)}% of fields are covered by operations.`,
          explanation: 'Many schema fields are not being used by any operations.',
          impact: 'Unused fields may indicate dead code or over-fetching issues.',
          recommendation: 'Review unused fields and either add them to operations or remove them.',
          documentationUrl: 'https://graphql-inspector.com/docs/essentials/coverage',
          aiPrompt: {
            short: 'Improve GraphQL field coverage',
            detailed: `Improve GraphQL field coverage (${fieldCoverage.toFixed(1)}%)`,
            steps: ['Identify unused fields', 'Add to operations or remove'],
          },
          ruleId: 'field-coverage',
          tags: ['graphql', 'coverage'],
          effort: 'moderate',
        });
      }
    } catch {
      // Coverage command failed
    }

    return findings;
  }

  private analyzeSimilarOperations(schemaPath: string): AuditFinding[] {
    // This would analyze the schema for potential issues
    // For now, return empty - could be enhanced with more checks
    return [];
  }

  private getChangeRecommendation(change: GraphQLChange): string {
    if (change.criticality.level === 'BREAKING') {
      return 'Consider using @deprecated directive before removing. Update all clients before deploying this change.';
    }
    if (change.criticality.level === 'DANGEROUS') {
      return 'Review this change carefully and test with existing clients.';
    }
    return 'This is a safe, non-breaking change.';
  }

  private createResult(findings: AuditFinding[], duration: number): AuditResult {
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
        passed: 0,
        failed: findings.filter(f => f.severity !== 'info').length,
      },
      metadata: {},
    };
  }
}
