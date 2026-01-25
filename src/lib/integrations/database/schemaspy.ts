// SchemaSpy Integration - Database Documentation Generator
// License: LGPL-3.0
// Website: https://schemaspy.org

import { ToolIntegration, ToolConfig, AuditTarget, AuditResult, AuditFinding, Severity } from '../types';
import { safeRequire } from '@/lib/utils/safe-require';

interface SchemaAnalysis {
  tables: TableInfo[];
  relationships: RelationshipInfo[];
  anomalies: AnomalyInfo[];
}

interface TableInfo {
  name: string;
  columns: number;
  rows?: number;
  primaryKey?: string;
  indexes: number;
  foreignKeys: number;
  comments?: string;
}

interface RelationshipInfo {
  parentTable: string;
  parentColumn: string;
  childTable: string;
  childColumn: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

interface AnomalyInfo {
  type: 'missing-primary-key' | 'missing-index' | 'implied-relationship' | 'orphan-table' | 'naming-convention';
  table: string;
  column?: string;
  description: string;
  severity: Severity;
}

export class SchemaSpyIntegration implements ToolIntegration {
  name = 'schemaspy';
  category = 'database' as const;
  description = 'Database documentation generator that analyzes schema metadata and relationships';
  website = 'https://schemaspy.org/';

  async isAvailable(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      // SchemaSpy is a Java application, check if java is available
      execSync('java -version', { stdio: 'ignore' });
      // Check for schemaspy jar or docker
      try {
        execSync('docker images schemaspy/schemaspy -q', { stdio: 'ignore' });
        return true;
      } catch {
        // Check for local jar
        const fs = await import('fs');
        return fs.existsSync('/opt/schemaspy/schemaspy.jar') ||
               fs.existsSync('./schemaspy.jar');
      }
    } catch {
      return false;
    }
  }

  getDefaultConfig(): ToolConfig {
    return {
      enabled: true,
      options: {
        databaseType: 'pgsql',  // pgsql, mysql, sqlite, etc.
        outputDir: './schemaspy-output',
        analyzeOnly: true,      // Don't generate full HTML docs
      },
    };
  }

  async run(target: AuditTarget, config?: ToolConfig): Promise<AuditResult> {
    const startTime = Date.now();
    const findings: AuditFinding[] = [];

    try {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      const glob = safeRequire<typeof import('glob')>('glob');
      const targetDir = target.directory || '.';

      // Look for database configuration files
      const configFiles = await glob.glob('**/{database.yml,database.json,.env,config/database.*}', {
        cwd: targetDir,
        ignore: ['**/node_modules/**'],
        absolute: true,
      });

      // Also analyze SQL migration files for schema structure
      const migrationFiles = await glob.glob('**/{migrations,db/migrate}/**/*.sql', {
        cwd: targetDir,
        ignore: ['**/node_modules/**'],
        absolute: true,
      });

      // Analyze schema files
      const schemaFiles = await glob.glob('**/{schema.sql,schema.prisma,*.prisma,schema.rb}', {
        cwd: targetDir,
        ignore: ['**/node_modules/**'],
        absolute: true,
      });

      const analysis: SchemaAnalysis = {
        tables: [],
        relationships: [],
        anomalies: [],
      };

      // Parse schema files for analysis
      for (const schemaFile of schemaFiles) {
        const content = fs.readFileSync(schemaFile, 'utf-8');

        if (schemaFile.endsWith('.prisma')) {
          this.analyzePrismaSchema(content, analysis);
        } else if (schemaFile.endsWith('.sql')) {
          this.analyzeSqlSchema(content, analysis);
        } else if (schemaFile.endsWith('.rb')) {
          this.analyzeRailsSchema(content, analysis);
        }
      }

      // Also analyze migration files
      for (const migrationFile of migrationFiles) {
        const content = fs.readFileSync(migrationFile, 'utf-8');
        this.analyzeSqlSchema(content, analysis);
      }

      // Generate findings from analysis
      for (const anomaly of analysis.anomalies) {
        findings.push(this.createAnomalyFinding(anomaly));
      }

      // Check for common schema issues
      for (const table of analysis.tables) {
        // Check for missing primary key
        if (!table.primaryKey) {
          findings.push(this.createMissingPrimaryKeyFinding(table));
        }

        // Check for tables with no indexes (potential performance issue for large tables)
        if (table.indexes === 0 && table.columns > 3) {
          findings.push(this.createMissingIndexFinding(table));
        }

        // Check for missing comments/documentation
        if (!table.comments) {
          findings.push(this.createMissingDocsFinding(table));
        }
      }

      // Check for orphan tables (no relationships)
      const tablesWithRelations = new Set([
        ...analysis.relationships.map(r => r.parentTable),
        ...analysis.relationships.map(r => r.childTable),
      ]);

      for (const table of analysis.tables) {
        if (!tablesWithRelations.has(table.name) && !this.isLookupTable(table)) {
          findings.push(this.createOrphanTableFinding(table));
        }
      }

      return this.createResult(findings, Date.now() - startTime, analysis);
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

  private analyzePrismaSchema(content: string, analysis: SchemaAnalysis): void {
    // Parse Prisma schema model definitions
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];

      const columns = (body.match(/^\s+\w+\s+/gm) || []).length;
      const hasId = /@id/.test(body);
      const indexes = (body.match(/@@index/g) || []).length;
      const foreignKeys = (body.match(/@relation/g) || []).length;
      const commentMatch = body.match(/\/\/\/\s*(.+)/);

      analysis.tables.push({
        name: tableName,
        columns,
        primaryKey: hasId ? 'id' : undefined,
        indexes,
        foreignKeys,
        comments: commentMatch?.[1],
      });

      // Parse relationships
      const relationRegex = /@relation\([^)]*references:\s*\[(\w+)\][^)]*\)/g;
      const fieldRegex = /(\w+)\s+(\w+)(\[\])?\s+@relation/g;
      let relMatch;

      while ((relMatch = fieldRegex.exec(body)) !== null) {
        const childColumn = relMatch[1];
        const parentTable = relMatch[2];
        const isArray = !!relMatch[3];

        analysis.relationships.push({
          parentTable,
          parentColumn: 'id',
          childTable: tableName,
          childColumn,
          type: isArray ? 'one-to-many' : 'one-to-one',
        });
      }
    }
  }

  private analyzeSqlSchema(content: string, analysis: SchemaAnalysis): void {
    // Parse CREATE TABLE statements
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(([^;]+)\)/gi;
    let match: RegExpExecArray | null;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];

      // Skip if already analyzed
      if (analysis.tables.find(t => t.name === tableName)) continue;

      const columns = (body.match(/^\s*["'`]?\w+["'`]?\s+\w+/gm) || []).length;
      const hasPrimaryKey = /PRIMARY\s+KEY/i.test(body);
      const primaryKeyMatch = body.match(/["'`]?(\w+)["'`]?\s+[^,]+PRIMARY\s+KEY/i);
      const indexes = (body.match(/INDEX|KEY/gi) || []).length - (hasPrimaryKey ? 1 : 0);
      const foreignKeys = (body.match(/FOREIGN\s+KEY|REFERENCES/gi) || []).length;
      const commentMatch = body.match(/COMMENT\s+['"](.*?)['"]/i);

      analysis.tables.push({
        name: tableName,
        columns,
        primaryKey: primaryKeyMatch?.[1] || (hasPrimaryKey ? 'id' : undefined),
        indexes: Math.max(0, indexes),
        foreignKeys,
        comments: commentMatch?.[1],
      });

      // Parse foreign key relationships
      const fkRegex = /FOREIGN\s+KEY\s*\(["'`]?(\w+)["'`]?\)\s*REFERENCES\s+["'`]?(\w+)["'`]?\s*\(["'`]?(\w+)["'`]?\)/gi;
      let fkMatch: RegExpExecArray | null;

      while ((fkMatch = fkRegex.exec(body)) !== null) {
        analysis.relationships.push({
          childTable: tableName,
          childColumn: fkMatch[1],
          parentTable: fkMatch[2],
          parentColumn: fkMatch[3],
          type: 'one-to-many',
        });
      }
    }

    // Parse CREATE INDEX statements
    const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+\w+\s+ON\s+["'`]?(\w+)["'`]?/gi;
    let indexMatch: RegExpExecArray | null;
    while ((indexMatch = indexRegex.exec(content)) !== null) {
      const tableName = indexMatch[1];
      const table = analysis.tables.find(t => t.name === tableName);
      if (table) {
        table.indexes++;
      }
    }
  }

  private analyzeRailsSchema(content: string, analysis: SchemaAnalysis): void {
    // Parse Rails schema.rb
    const tableRegex = /create_table\s+["':]+(\w+)["']?[^do]*do\s*\|t\|([^end]+)end/gi;
    let match: RegExpExecArray | null;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];

      const columns = (body.match(/t\.\w+\s+["':]+\w+/g) || []).length;
      const hasId = !/id:\s*false/.test(match[0]);
      const indexes = (body.match(/t\.index/g) || []).length;
      const foreignKeys = (body.match(/t\.references|t\.belongs_to/g) || []).length;
      const commentMatch = body.match(/comment:\s*["'](.*?)["']/);

      analysis.tables.push({
        name: tableName,
        columns,
        primaryKey: hasId ? 'id' : undefined,
        indexes,
        foreignKeys,
        comments: commentMatch?.[1],
      });
    }
  }

  private isLookupTable(table: TableInfo): boolean {
    // Lookup tables typically have few columns and specific naming
    const lookupPatterns = ['type', 'status', 'category', 'role', 'permission', 'setting', 'config'];
    return table.columns <= 3 || lookupPatterns.some(p => table.name.toLowerCase().includes(p));
  }

  private createAnomalyFinding(anomaly: AnomalyInfo): AuditFinding {
    return {
      id: `schemaspy-${anomaly.type}-${anomaly.table}${anomaly.column ? `-${anomaly.column}` : ''}`,
      tool: this.name,
      category: this.category,
      severity: anomaly.severity,
      title: `Schema: ${anomaly.description}`,
      description: anomaly.description,
      explanation: this.getAnomalyExplanation(anomaly.type),
      impact: this.getAnomalyImpact(anomaly.type),
      recommendation: this.getAnomalyRecommendation(anomaly.type, anomaly.table, anomaly.column),
      aiPrompt: {
        short: `Fix schema issue in ${anomaly.table}`,
        detailed: `Database schema issue:\n\nTable: ${anomaly.table}${anomaly.column ? `\nColumn: ${anomaly.column}` : ''}\nType: ${anomaly.type}\n\n${anomaly.description}`,
        steps: ['Review the schema issue', 'Create a migration to fix it', 'Test the migration', 'Deploy'],
      },
      ruleId: anomaly.type,
      tags: ['schemaspy', 'database', 'schema', anomaly.type],
      effort: 'moderate',
    };
  }

  private createMissingPrimaryKeyFinding(table: TableInfo): AuditFinding {
    return {
      id: `schemaspy-missing-pk-${table.name}`,
      tool: this.name,
      category: this.category,
      severity: 'high',
      title: `Missing Primary Key: ${table.name}`,
      description: `Table "${table.name}" does not have a primary key defined.`,
      explanation: 'Every table should have a primary key to uniquely identify rows. Missing primary keys can lead to data integrity issues and poor performance.',
      impact: 'Cannot reliably update or delete specific rows. No guaranteed row uniqueness. Performance issues with large datasets.',
      recommendation: `Add a primary key to the "${table.name}" table. Consider using an auto-incrementing ID or a natural key.`,
      aiPrompt: {
        short: `Add primary key to ${table.name}`,
        detailed: `Table "${table.name}" is missing a primary key.\n\nColumns: ${table.columns}\n\nAdd a primary key column, typically an auto-incrementing integer ID or UUID.`,
        steps: ['Identify the best primary key (ID or natural key)', 'Create migration to add PK column', 'Add constraint', 'Backfill existing rows', 'Test'],
      },
      ruleId: 'missing-primary-key',
      tags: ['schemaspy', 'database', 'primary-key', 'data-integrity'],
      effort: 'moderate',
    };
  }

  private createMissingIndexFinding(table: TableInfo): AuditFinding {
    return {
      id: `schemaspy-missing-index-${table.name}`,
      tool: this.name,
      category: this.category,
      severity: 'low',
      title: `No Indexes: ${table.name}`,
      description: `Table "${table.name}" has ${table.columns} columns but no indexes (besides primary key).`,
      explanation: 'Tables with multiple columns often benefit from indexes on frequently queried columns. Missing indexes can cause slow queries as the table grows.',
      impact: 'Potential performance degradation for queries filtering or joining on unindexed columns.',
      recommendation: `Analyze query patterns for "${table.name}" and add indexes on frequently used columns in WHERE clauses and JOINs.`,
      aiPrompt: {
        short: `Add indexes to ${table.name}`,
        detailed: `Table "${table.name}" has no indexes.\n\nColumns: ${table.columns}\n\nAnalyze query patterns and add indexes for frequently filtered columns.`,
        steps: ['Review queries using this table', 'Identify columns in WHERE/JOIN clauses', 'Create indexes for those columns', 'Test query performance'],
      },
      ruleId: 'missing-index',
      tags: ['schemaspy', 'database', 'index', 'performance'],
      effort: 'easy',
    };
  }

  private createMissingDocsFinding(table: TableInfo): AuditFinding {
    return {
      id: `schemaspy-missing-docs-${table.name}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `Undocumented Table: ${table.name}`,
      description: `Table "${table.name}" has no comment/documentation.`,
      explanation: 'Table comments help developers understand the purpose of each table and its relationships.',
      impact: 'Reduced maintainability and onboarding difficulty for new team members.',
      recommendation: `Add a COMMENT to the "${table.name}" table explaining its purpose.`,
      aiPrompt: {
        short: `Document ${table.name} table`,
        detailed: `Table "${table.name}" lacks documentation.\n\nAdd a comment explaining the table's purpose, relationships, and any important constraints.`,
        steps: ['Understand the table purpose', 'Write a clear description', 'Add COMMENT ON TABLE statement', 'Document key columns'],
      },
      ruleId: 'missing-documentation',
      tags: ['schemaspy', 'database', 'documentation'],
      effort: 'trivial',
    };
  }

  private createOrphanTableFinding(table: TableInfo): AuditFinding {
    return {
      id: `schemaspy-orphan-${table.name}`,
      tool: this.name,
      category: this.category,
      severity: 'info',
      title: `Orphan Table: ${table.name}`,
      description: `Table "${table.name}" has no foreign key relationships with other tables.`,
      explanation: 'Orphan tables might indicate missing relationships, unused tables, or standalone lookup tables.',
      impact: 'May indicate data model issues or unused tables.',
      recommendation: `Review if "${table.name}" should have relationships with other tables, or if it's intentionally standalone.`,
      aiPrompt: {
        short: `Review orphan table ${table.name}`,
        detailed: `Table "${table.name}" has no relationships.\n\nColumns: ${table.columns}\n\nDetermine if this is intentional or if relationships should be added.`,
        steps: ['Review table purpose', 'Identify if relationships are missing', 'Add foreign keys if needed', 'Or document as standalone'],
      },
      ruleId: 'orphan-table',
      tags: ['schemaspy', 'database', 'relationships'],
      effort: 'easy',
    };
  }

  private getAnomalyExplanation(type: AnomalyInfo['type']): string {
    const explanations: Record<AnomalyInfo['type'], string> = {
      'missing-primary-key': 'Primary keys ensure data integrity and uniqueness.',
      'missing-index': 'Indexes improve query performance on large tables.',
      'implied-relationship': 'Column naming suggests a relationship that is not enforced.',
      'orphan-table': 'Table has no relationships, may be unused or improperly connected.',
      'naming-convention': 'Inconsistent naming makes the schema harder to understand.',
    };
    return explanations[type];
  }

  private getAnomalyImpact(type: AnomalyInfo['type']): string {
    const impacts: Record<AnomalyInfo['type'], string> = {
      'missing-primary-key': 'Data integrity issues and performance problems.',
      'missing-index': 'Slow queries on large datasets.',
      'implied-relationship': 'Data integrity not enforced at database level.',
      'orphan-table': 'Potential dead code or missing relationships.',
      'naming-convention': 'Confusion and maintenance burden.',
    };
    return impacts[type];
  }

  private getAnomalyRecommendation(type: AnomalyInfo['type'], table: string, column?: string): string {
    const recommendations: Record<AnomalyInfo['type'], string> = {
      'missing-primary-key': `Add a primary key to ${table}.`,
      'missing-index': `Add indexes to frequently queried columns in ${table}.`,
      'implied-relationship': `Add a foreign key constraint for ${column} in ${table}.`,
      'orphan-table': `Review if ${table} needs relationships or can be removed.`,
      'naming-convention': `Rename ${column || table} to follow naming conventions.`,
    };
    return recommendations[type];
  }

  private createResult(findings: AuditFinding[], duration: number, analysis: SchemaAnalysis): AuditResult {
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
        passed: analysis.tables.length - findings.filter(f => f.severity !== 'info').length,
        failed: findings.filter(f => f.severity !== 'info').length,
      },
      metadata: {
        tablesAnalyzed: analysis.tables.length,
        relationshipsFound: analysis.relationships.length,
      },
    };
  }
}
