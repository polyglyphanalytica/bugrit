// Repository Analyzer - Fetches and prepares code for QA analysis

import { GitHubClient } from './client';
import { GitHubRepository, RepositoryContent } from './types';

export interface RepoAnalysisConfig {
  owner: string;
  repo: string;
  branch?: string;
  paths?: string[];
  excludePaths?: string[];
  maxFileSize?: number;
  includeExtensions?: string[];
  excludeExtensions?: string[];
}

export interface RepoSnapshot {
  repository: GitHubRepository;
  branch: string;
  commitSha: string;
  files: RepositoryContent[];
  languages: Record<string, number>;
  stats: {
    totalFiles: number;
    totalSize: number;
    languageBreakdown: Record<string, number>;
  };
}

export class RepoAnalyzer {
  private client: GitHubClient;

  constructor(accessToken: string) {
    this.client = new GitHubClient(accessToken);
  }

  /**
   * Get a snapshot of repository code for analysis
   */
  async getRepoSnapshot(config: RepoAnalysisConfig): Promise<RepoSnapshot> {
    const { owner, repo, branch } = config;

    // Get repository info
    const repository = await this.client.getRepository(owner, repo);
    const targetBranch = branch || repository.defaultBranch;

    // Get branch info
    const branchData = await this.client.getBranch(owner, repo, targetBranch);

    // Get languages
    const languages = await this.client.getRepositoryLanguages(owner, repo);

    // Get all files
    const allFiles = await this.client.getAllFiles(owner, repo, targetBranch);

    // Filter files
    const filteredFiles = this.filterFiles(allFiles, config);

    // Fetch file contents
    const files = await this.fetchFileContents(owner, repo, filteredFiles, targetBranch);

    // Calculate stats
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.content.length, 0),
      languageBreakdown: this.calculateLanguageBreakdown(files),
    };

    return {
      repository,
      branch: targetBranch,
      commitSha: branchData.commit.sha,
      files,
      languages,
      stats,
    };
  }

  /**
   * Filter files based on configuration
   */
  private filterFiles(files: string[], config: RepoAnalysisConfig): string[] {
    let filtered = files;

    // Include only specific paths
    if (config.paths?.length) {
      filtered = filtered.filter((f) =>
        config.paths!.some((p) => f.startsWith(p))
      );
    }

    // Exclude paths
    if (config.excludePaths?.length) {
      const defaultExcludes = [
        'node_modules/',
        '.git/',
        'dist/',
        'build/',
        'coverage/',
        '.next/',
        'vendor/',
        '__pycache__/',
        '.venv/',
        'target/',
      ];
      const excludes = [...defaultExcludes, ...config.excludePaths];
      filtered = filtered.filter((f) =>
        !excludes.some((e) => f.includes(e))
      );
    } else {
      // Apply default excludes
      const defaultExcludes = [
        'node_modules/',
        '.git/',
        'dist/',
        'build/',
        'coverage/',
        '.next/',
        'vendor/',
        '__pycache__/',
        '.venv/',
        'target/',
      ];
      filtered = filtered.filter((f) =>
        !defaultExcludes.some((e) => f.includes(e))
      );
    }

    // Include only specific extensions
    if (config.includeExtensions?.length) {
      filtered = filtered.filter((f) =>
        config.includeExtensions!.some((ext) => f.endsWith(ext))
      );
    }

    // Exclude extensions
    if (config.excludeExtensions?.length) {
      filtered = filtered.filter((f) =>
        !config.excludeExtensions!.some((ext) => f.endsWith(ext))
      );
    }

    // Filter by size (will be checked during fetch)
    return filtered;
  }

  /**
   * Fetch contents of multiple files
   */
  private async fetchFileContents(
    owner: string,
    repo: string,
    files: string[],
    branch: string
  ): Promise<RepositoryContent[]> {
    const contents: RepositoryContent[] = [];

    // Fetch in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((path) =>
          this.client.getFileContent(owner, repo, path, branch)
        )
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          contents.push(result.value);
        }
      }

      // Small delay between batches
      if (i + batchSize < files.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return contents;
  }

  /**
   * Calculate language breakdown from file extensions
   */
  private calculateLanguageBreakdown(
    files: RepositoryContent[]
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};

    const extensionToLanguage: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.kt': 'Kotlin',
      '.swift': 'Swift',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.c': 'C',
      '.h': 'C',
      '.php': 'PHP',
      '.vue': 'Vue',
      '.svelte': 'Svelte',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.html': 'HTML',
      '.md': 'Markdown',
      '.json': 'JSON',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.xml': 'XML',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.dockerfile': 'Dockerfile',
    };

    for (const file of files) {
      const ext = '.' + file.path.split('.').pop()?.toLowerCase();
      const language = extensionToLanguage[ext] || 'Other';
      breakdown[language] = (breakdown[language] || 0) + file.content.length;
    }

    return breakdown;
  }

  /**
   * Get specific file content
   */
  async getFile(
    owner: string,
    repo: string,
    path: string,
    branch?: string
  ): Promise<RepositoryContent> {
    return this.client.getFileContent(owner, repo, path, branch);
  }

  /**
   * Get changed files in a pull request
   */
  async getPullRequestChanges(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<{
    files: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      patch?: string;
    }>;
    pr: {
      title: string;
      number: number;
      base: string;
      head: string;
    };
  }> {
    const pr = await this.client.getPullRequest(owner, repo, pullNumber);
    const files = await this.client.getPullRequestFiles(owner, repo, pullNumber);

    return {
      files,
      pr: {
        title: pr.title,
        number: pr.number,
        base: pr.base.ref,
        head: pr.head.ref,
      },
    };
  }

  /**
   * Get commit changes
   */
  async getCommitChanges(
    owner: string,
    repo: string,
    commitSha: string
  ): Promise<{
    message: string;
    author: string;
    files: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      patch?: string;
    }>;
  }> {
    const commit = await this.client.getCommit(owner, repo, commitSha);

    return {
      message: commit.message,
      author: commit.author.name,
      files: commit.files || [],
    };
  }
}
