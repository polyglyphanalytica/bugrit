// Types for GitHub Integration

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
  type: 'User' | 'Organization';
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  owner: GitHubUser;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  language: string | null;
  languages: Record<string, number>;
  topics: string[];
  size: number;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  content?: string;
  encoding?: 'base64' | 'utf-8';
  downloadUrl?: string;
  htmlUrl?: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  tree: {
    sha: string;
    url: string;
  };
  parents: Array<{
    sha: string;
    url: string;
  }>;
  htmlUrl: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  mergedAt: string | null;
  user: GitHubUser;
  htmlUrl: string;
  head: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  base: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  changedFiles: number;
  additions: number;
  deletions: number;
  commits: number;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubInstallation {
  id: number;
  appId: number;
  targetId: number;
  targetType: 'User' | 'Organization';
  permissions: Record<string, 'read' | 'write' | 'admin'>;
  repositorySelection: 'all' | 'selected';
  createdAt: string;
  updatedAt: string;
  account: GitHubUser;
}

export interface RepositoryContent {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  sha: string;
}

export interface GitHubAuthToken {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt?: Date;
  refreshToken?: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubWebhook {
  id: number;
  name: string;
  active: boolean;
  events: string[];
  config: {
    url: string;
    contentType: string;
    secret?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GitHubCheck {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  startedAt: string | null;
  completedAt: string | null;
  output?: {
    title: string | null;
    summary: string | null;
    text: string | null;
    annotationsCount: number;
  };
}
