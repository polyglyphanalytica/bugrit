// GitHub Integration
// Supports OAuth authentication and repository access (including private repos)

export { GitHubClient } from './client';
export { GitHubOAuth } from './oauth';
export { RepoAnalyzer } from './repo-analyzer';
export type {
  GitHubRepository,
  GitHubFile,
  GitHubCommit,
  GitHubPullRequest,
  GitHubUser,
  GitHubInstallation,
  RepositoryContent,
} from './types';
