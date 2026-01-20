// GitHub API Client

import {
  GitHubRepository,
  GitHubFile,
  GitHubCommit,
  GitHubPullRequest,
  GitHubUser,
  GitHubTree,
  GitHubBranch,
  RepositoryContent,
} from './types';

const GITHUB_API_URL = 'https://api.github.com';

export class GitHubClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string, baseUrl?: string) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl || GITHUB_API_URL;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // ==================== User ====================

  /**
   * Get authenticated user
   */
  async getUser(): Promise<GitHubUser> {
    const data = await this.request<Record<string, unknown>>('/user');
    return this.mapUser(data);
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<GitHubUser> {
    const data = await this.request<Record<string, unknown>>(`/users/${username}`);
    return this.mapUser(data);
  }

  // ==================== Repositories ====================

  /**
   * List repositories for authenticated user
   */
  async listRepositories(options?: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  }): Promise<GitHubRepository[]> {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.direction) params.set('direction', options.direction);
    if (options?.perPage) params.set('per_page', String(options.perPage));
    if (options?.page) params.set('page', String(options.page));

    const data = await this.request<Record<string, unknown>[]>(
      `/user/repos?${params.toString()}`
    );
    return data.map((repo) => this.mapRepository(repo));
  }

  /**
   * Get repository
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const data = await this.request<Record<string, unknown>>(`/repos/${owner}/${repo}`);
    return this.mapRepository(data);
  }

  /**
   * Get repository languages
   */
  async getRepositoryLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    return this.request<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
  }

  // ==================== Contents ====================

  /**
   * Get repository content (file or directory)
   */
  async getContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitHubFile | GitHubFile[]> {
    const params = ref ? `?ref=${ref}` : '';
    const data = await this.request<Record<string, unknown> | Record<string, unknown>[]>(
      `/repos/${owner}/${repo}/contents/${path}${params}`
    );

    if (Array.isArray(data)) {
      return data.map((item) => this.mapFile(item));
    }
    return this.mapFile(data);
  }

  /**
   * Get file content with decoded text
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<RepositoryContent> {
    const file = await this.getContent(owner, repo, path, ref);

    if (Array.isArray(file)) {
      throw new Error('Path is a directory, not a file');
    }

    if (!file.content) {
      throw new Error('File content not available');
    }

    const content = file.encoding === 'base64'
      ? Buffer.from(file.content, 'base64').toString('utf-8')
      : file.content;

    return {
      path: file.path,
      content,
      encoding: 'utf-8',
      sha: file.sha,
    };
  }

  /**
   * Get repository tree (recursive file listing)
   */
  async getTree(
    owner: string,
    repo: string,
    treeSha: string,
    recursive?: boolean
  ): Promise<GitHubTree> {
    const params = recursive ? '?recursive=1' : '';
    return this.request<GitHubTree>(
      `/repos/${owner}/${repo}/git/trees/${treeSha}${params}`
    );
  }

  /**
   * Get all files in repository
   */
  async getAllFiles(
    owner: string,
    repo: string,
    branch?: string
  ): Promise<string[]> {
    const repoData = await this.getRepository(owner, repo);
    const targetBranch = branch || repoData.defaultBranch;

    const branchData = await this.getBranch(owner, repo, targetBranch);
    const tree = await this.getTree(owner, repo, branchData.commit.sha, true);

    return tree.tree
      .filter((item) => item.type === 'blob')
      .map((item) => item.path);
  }

  // ==================== Branches ====================

  /**
   * List branches
   */
  async listBranches(
    owner: string,
    repo: string
  ): Promise<GitHubBranch[]> {
    return this.request<GitHubBranch[]>(`/repos/${owner}/${repo}/branches`);
  }

  /**
   * Get branch
   */
  async getBranch(
    owner: string,
    repo: string,
    branch: string
  ): Promise<GitHubBranch> {
    return this.request<GitHubBranch>(`/repos/${owner}/${repo}/branches/${branch}`);
  }

  // ==================== Commits ====================

  /**
   * List commits
   */
  async listCommits(
    owner: string,
    repo: string,
    options?: {
      sha?: string;
      path?: string;
      author?: string;
      since?: string;
      until?: string;
      perPage?: number;
      page?: number;
    }
  ): Promise<GitHubCommit[]> {
    const params = new URLSearchParams();
    if (options?.sha) params.set('sha', options.sha);
    if (options?.path) params.set('path', options.path);
    if (options?.author) params.set('author', options.author);
    if (options?.since) params.set('since', options.since);
    if (options?.until) params.set('until', options.until);
    if (options?.perPage) params.set('per_page', String(options.perPage));
    if (options?.page) params.set('page', String(options.page));

    const data = await this.request<Record<string, unknown>[]>(
      `/repos/${owner}/${repo}/commits?${params.toString()}`
    );
    return data.map((commit) => this.mapCommit(commit));
  }

  /**
   * Get commit
   */
  async getCommit(owner: string, repo: string, ref: string): Promise<GitHubCommit> {
    const data = await this.request<Record<string, unknown>>(
      `/repos/${owner}/${repo}/commits/${ref}`
    );
    return this.mapCommit(data);
  }

  // ==================== Pull Requests ====================

  /**
   * List pull requests
   */
  async listPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      sort?: 'created' | 'updated' | 'popularity' | 'long-running';
      direction?: 'asc' | 'desc';
      perPage?: number;
      page?: number;
    }
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams();
    if (options?.state) params.set('state', options.state);
    if (options?.head) params.set('head', options.head);
    if (options?.base) params.set('base', options.base);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.direction) params.set('direction', options.direction);
    if (options?.perPage) params.set('per_page', String(options.perPage));
    if (options?.page) params.set('page', String(options.page));

    const data = await this.request<Record<string, unknown>[]>(
      `/repos/${owner}/${repo}/pulls?${params.toString()}`
    );
    return data.map((pr) => this.mapPullRequest(pr));
  }

  /**
   * Get pull request
   */
  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GitHubPullRequest> {
    const data = await this.request<Record<string, unknown>>(
      `/repos/${owner}/${repo}/pulls/${pullNumber}`
    );
    return this.mapPullRequest(data);
  }

  /**
   * Get pull request files
   */
  async getPullRequestFiles(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>> {
    return this.request(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`);
  }

  // ==================== Mappers ====================

  private mapUser(data: Record<string, unknown>): GitHubUser {
    return {
      id: data.id as number,
      login: data.login as string,
      name: data.name as string | null,
      email: data.email as string | null,
      avatarUrl: data.avatar_url as string,
      type: data.type as 'User' | 'Organization',
    };
  }

  private mapRepository(data: Record<string, unknown>): GitHubRepository {
    const owner = data.owner as Record<string, unknown>;
    return {
      id: data.id as number,
      name: data.name as string,
      fullName: data.full_name as string,
      description: data.description as string | null,
      private: data.private as boolean,
      owner: this.mapUser(owner),
      htmlUrl: data.html_url as string,
      cloneUrl: data.clone_url as string,
      sshUrl: data.ssh_url as string,
      defaultBranch: data.default_branch as string,
      language: data.language as string | null,
      languages: {},
      topics: (data.topics as string[]) || [],
      size: data.size as number,
      stargazersCount: data.stargazers_count as number,
      forksCount: data.forks_count as number,
      openIssuesCount: data.open_issues_count as number,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
      pushedAt: data.pushed_at as string,
    };
  }

  private mapFile(data: Record<string, unknown>): GitHubFile {
    return {
      name: data.name as string,
      path: data.path as string,
      sha: data.sha as string,
      size: data.size as number,
      type: data.type as 'file' | 'dir' | 'symlink' | 'submodule',
      content: data.content as string | undefined,
      encoding: data.encoding as 'base64' | 'utf-8' | undefined,
      downloadUrl: data.download_url as string | undefined,
      htmlUrl: data.html_url as string | undefined,
    };
  }

  private mapCommit(data: Record<string, unknown>): GitHubCommit {
    const commit = data.commit as Record<string, unknown>;
    const author = commit.author as Record<string, unknown>;
    const committer = commit.committer as Record<string, unknown>;
    const tree = commit.tree as Record<string, unknown>;
    const parents = data.parents as Record<string, unknown>[];

    return {
      sha: data.sha as string,
      message: commit.message as string,
      author: {
        name: author.name as string,
        email: author.email as string,
        date: author.date as string,
      },
      committer: {
        name: committer.name as string,
        email: committer.email as string,
        date: committer.date as string,
      },
      tree: {
        sha: tree.sha as string,
        url: tree.url as string,
      },
      parents: parents.map((p) => ({
        sha: p.sha as string,
        url: p.url as string,
      })),
      htmlUrl: data.html_url as string,
      stats: data.stats as GitHubCommit['stats'],
      files: data.files as GitHubCommit['files'],
    };
  }

  private mapPullRequest(data: Record<string, unknown>): GitHubPullRequest {
    const user = data.user as Record<string, unknown>;
    const head = data.head as Record<string, unknown>;
    const base = data.base as Record<string, unknown>;
    const headRepo = head.repo as Record<string, unknown>;
    const baseRepo = base.repo as Record<string, unknown>;

    return {
      id: data.id as number,
      number: data.number as number,
      title: data.title as string,
      body: data.body as string | null,
      state: data.state as 'open' | 'closed',
      draft: data.draft as boolean,
      merged: data.merged as boolean,
      mergedAt: data.merged_at as string | null,
      user: this.mapUser(user),
      htmlUrl: data.html_url as string,
      head: {
        ref: head.ref as string,
        sha: head.sha as string,
        repo: this.mapRepository(headRepo),
      },
      base: {
        ref: base.ref as string,
        sha: base.sha as string,
        repo: this.mapRepository(baseRepo),
      },
      changedFiles: data.changed_files as number,
      additions: data.additions as number,
      deletions: data.deletions as number,
      commits: data.commits as number,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}
