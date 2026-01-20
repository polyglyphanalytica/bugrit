// AI Intelligence Layer

export { FindingIntelligence } from './finding-intelligence';
export type {
  IntelligenceReport,
  CorrelationGroup,
  PrioritizedFinding,
  SmartRecommendation,
  Contradiction,
} from './finding-intelligence';

export { ReportGenerator } from './report-generator';
export type {
  ExecutiveSummary,
  DeveloperReport,
  FileHealthScore,
  ActionItem,
  CodePattern,
  LearningResource,
  ComplianceMapping,
  DigestReport,
  DigestSection,
} from './report-generator';

export {
  TOOL_PROFILES,
  getToolsForEnvironment,
  getProductionProfile,
  getQAProfile,
  getCIProfile,
  generateEnvironmentReport,
} from './environment-profiles';
export type { Environment, ToolProfile } from './environment-profiles';
