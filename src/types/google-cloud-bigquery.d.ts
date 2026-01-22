/**
 * Type declarations for @google-cloud/bigquery
 *
 * This is a minimal declaration for the parts we use.
 * Install @google-cloud/bigquery when ready for production.
 */

declare module '@google-cloud/bigquery' {
  export interface BigQueryOptions {
    projectId?: string;
    keyFilename?: string;
  }

  export interface QueryOptions {
    query: string;
    params?: Record<string, unknown>;
  }

  export interface QueryResult {
    [key: string]: unknown;
  }

  export class BigQuery {
    constructor(options?: BigQueryOptions);
    query(options: QueryOptions): Promise<[QueryResult[]]>;
  }
}
