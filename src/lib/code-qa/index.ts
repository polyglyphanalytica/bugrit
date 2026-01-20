// Code QA Module
// Analyzes code for quality, errors, performance, and security issues
// Presents findings in plain English with AI prompts for fixes

export { CodeQAAnalyzer } from './analyzer';
export { QualityAnalyzer } from './analyzers/quality';
export { SecurityAnalyzer } from './analyzers/security';
export { PerformanceAnalyzer } from './analyzers/performance';
export { ErrorAnalyzer } from './analyzers/errors';
export { FindingFormatter } from './formatter';
export type {
  CodeQAReport,
  Finding,
  FindingSeverity,
  FindingCategory,
  AIPrompt,
  Recommendation,
} from './types';
