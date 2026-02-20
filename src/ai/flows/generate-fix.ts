'use server';

/**
 * AI-Powered Fix Generation
 *
 * Generates PR-ready code fixes for findings.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod/v3';

// Input schema
const GenerateFixInputSchema = z.object({
  finding: z.object({
    id: z.string(),
    tool: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    title: z.string(),
    description: z.string(),
    file: z.string().optional(),
    line: z.number().optional(),
    codeSnippet: z.string().optional(),
    recommendation: z.string().optional(),
  }),
  fileContent: z.string().optional(),
  language: z.string().optional(),
  context: z.object({
    framework: z.string().optional(),
    projectType: z.string().optional(),
    styleGuide: z.string().optional(),
  }).optional(),
});

// Output schema
const GenerateFixOutputSchema = z.object({
  canFix: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),

  // The fix
  fix: z.object({
    description: z.string(),
    diff: z.string(), // Unified diff format
    beforeCode: z.string(),
    afterCode: z.string(),
    explanation: z.string(),
  }).optional(),

  // If can't auto-fix, provide manual steps
  manualSteps: z.array(z.string()).optional(),

  // Warnings about the fix
  warnings: z.array(z.string()).optional(),

  // Related fixes that might also be needed
  relatedFixes: z.array(z.string()).optional(),
});

export type GenerateFixInput = z.infer<typeof GenerateFixInputSchema>;
export type GenerateFixOutput = z.infer<typeof GenerateFixOutputSchema>;

/**
 * Generate a fix for a single finding
 */
export async function generateFix(input: GenerateFixInput): Promise<GenerateFixOutput> {
  const { finding, fileContent, language, context } = input;

  const prompt = buildPrompt(finding, fileContent, language, context);

  // @ts-expect-error — zod v3 compat layer hits TS depth limit with Genkit generics
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt,
    output: {
      schema: GenerateFixOutputSchema,
    },
    config: {
      temperature: 0.2, // Low temperature for consistent code generation
    },
  });

  return response.output || {
    canFix: false,
    confidence: 'low',
    manualSteps: ['Unable to generate automatic fix. Please review the finding manually.'],
  };
}

function buildPrompt(
  finding: GenerateFixInput['finding'],
  fileContent?: string,
  language?: string,
  context?: GenerateFixInput['context']
): string {
  let prompt = `You are an expert code security and quality engineer. Generate a fix for the following issue.

## Issue Details
- **Tool**: ${finding.tool}
- **Severity**: ${finding.severity}
- **Title**: ${finding.title}
- **Description**: ${finding.description}
${finding.file ? `- **File**: ${finding.file}` : ''}
${finding.line ? `- **Line**: ${finding.line}` : ''}
${finding.recommendation ? `- **Recommendation**: ${finding.recommendation}` : ''}

`;

  if (finding.codeSnippet) {
    prompt += `## Problematic Code
\`\`\`${language || ''}
${finding.codeSnippet}
\`\`\`

`;
  }

  if (fileContent) {
    prompt += `## Full File Content
\`\`\`${language || ''}
${fileContent}
\`\`\`

`;
  }

  if (context) {
    prompt += `## Project Context
${context.framework ? `- Framework: ${context.framework}` : ''}
${context.projectType ? `- Project Type: ${context.projectType}` : ''}
${context.styleGuide ? `- Style Guide: ${context.styleGuide}` : ''}

`;
  }

  prompt += `## Instructions
1. Analyze the issue and determine if it can be automatically fixed
2. If fixable, provide:
   - A clear description of what the fix does
   - The exact code change in unified diff format
   - Before and after code snippets
   - An explanation of why this fix works
3. If not automatically fixable, provide clear manual steps
4. Note any warnings (e.g., "test after applying", "may need additional changes")
5. Mention any related fixes that might be needed

Generate a safe, minimal fix that solves the issue without introducing new problems.
Prefer simple, readable solutions over clever ones.
Match the existing code style.`;

  return prompt;
}

/**
 * Generate fixes for multiple findings (batch mode)
 */
export async function generateBatchFixes(
  findings: GenerateFixInput['finding'][],
  fileContents: Map<string, string>,
  context?: GenerateFixInput['context']
): Promise<Map<string, GenerateFixOutput>> {
  const results = new Map<string, GenerateFixOutput>();

  // Process in parallel with concurrency limit
  const concurrency = 5;
  const chunks: GenerateFixInput['finding'][][] = [];

  for (let i = 0; i < findings.length; i += concurrency) {
    chunks.push(findings.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (finding) => {
      const fileContent = finding.file ? fileContents.get(finding.file) : undefined;
      const language = finding.file ? detectLanguage(finding.file) : undefined;

      const fix = await generateFix({
        finding,
        fileContent,
        language,
        context,
      });

      return { id: finding.id, fix };
    });

    const chunkResults = await Promise.all(promises);
    for (const { id, fix } of chunkResults) {
      results.set(id, fix);
    }
  }

  return results;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'kt': 'kotlin',
    'swift': 'swift',
    'php': 'php',
    'cs': 'csharp',
    'cpp': 'cpp',
    'c': 'c',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
    'json': 'json',
    'md': 'markdown',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
  };
  return langMap[ext || ''] || ext || 'text';
}

/**
 * Generate AI agent prompt for reviewing and merging a fix branch
 *
 * This prompt guides an AI coding agent (Claude, Cursor, Copilot, etc.)
 * to verify the fix branch, confirm it resolves the issues, and merge it.
 */
export async function generateReviewMergePrompt(options: {
  repoUrl: string;
  baseBranch: string;
  fixBranch: string;
  scanId: string;
  findings: Array<{
    id: string;
    severity: string;
    title: string;
    file?: string;
    line?: number;
  }>;
  prUrl?: string;
}): Promise<string> {
  const { repoUrl, baseBranch, fixBranch, scanId, findings, prUrl } = options;

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;

  const findingsList = findings
    .slice(0, 20) // Limit to first 20 for prompt size
    .map((f, i) => {
      let line = `${i + 1}. [${f.severity.toUpperCase()}] ${f.title}`;
      if (f.file) line += ` in \`${f.file}\``;
      if (f.line) line += `:${f.line}`;
      return line;
    })
    .join('\n');

  const remainingCount = findings.length - 20;

  return `# Review and Merge Bugrit Fix Branch

Bugrit has automatically generated fixes for security and quality issues found in scan \`${scanId}\`.

## Repository Information
- **Repository**: ${repoUrl}
- **Base Branch**: \`${baseBranch}\`
- **Fix Branch**: \`${fixBranch}\`
${prUrl ? `- **Pull Request**: ${prUrl}` : ''}

## Issues Fixed (${findings.length} total)
- Critical: ${criticalCount}
- High: ${highCount}
- Medium: ${mediumCount}
- Low: ${lowCount}

### Finding Details
${findingsList}
${remainingCount > 0 ? `\n... and ${remainingCount} more issues` : ''}

## Your Task

Please review the fix branch and merge it if all checks pass.

### Step 1: Fetch and Review the Branch

\`\`\`bash
git fetch origin ${fixBranch}
git diff ${baseBranch}...origin/${fixBranch}
\`\`\`

Review each change and verify:
- [ ] The fix addresses the specific issue mentioned
- [ ] No new security vulnerabilities are introduced
- [ ] Code style matches the existing codebase
- [ ] No unrelated changes are included

### Step 2: Run Tests Locally

\`\`\`bash
git checkout ${fixBranch}
npm install  # or your package manager
npm test     # run test suite
npm run build  # ensure it builds
\`\`\`

Verify:
- [ ] All existing tests pass
- [ ] The build completes without errors
- [ ] No new TypeScript/lint errors introduced

### Step 3: Verify Fixes Are Effective

For each critical/high severity issue, confirm the fix actually resolves it:

${findings
  .filter(f => f.severity === 'critical' || f.severity === 'high')
  .slice(0, 10)
  .map(f => `- [ ] **${f.title}**${f.file ? ` in \`${f.file}\`` : ''}: Verify the vulnerable pattern is removed`)
  .join('\n')}

### Step 4: Merge the Branch

If all checks pass:

\`\`\`bash
git checkout ${baseBranch}
git merge origin/${fixBranch} --no-ff -m "fix: apply Bugrit security fixes from scan ${scanId}

Fixes ${findings.length} issues:
- ${criticalCount} critical
- ${highCount} high
- ${mediumCount} medium
- ${lowCount} low

Scan: https://bugrit.dev/scans/${scanId}"
git push origin ${baseBranch}
\`\`\`

### Step 5: Report Back

After merging (or if issues are found), provide a summary:

1. **Merge Status**: Success / Failed / Needs Manual Review
2. **Issues Found** (if any): List any problems with the fixes
3. **Test Results**: Pass / Fail (with details)
4. **Recommendations**: Any follow-up actions needed

## Important Notes

- **Do NOT merge** if any test fails or if you find issues with the fixes
- If a fix looks incorrect, document the problem and skip that specific change
- You can cherry-pick individual commits if some fixes are good and others need work
- After merging, the next Bugrit scan will verify the issues are resolved

## Need Help?

If you encounter issues:
- View full scan details: https://bugrit.dev/scans/${scanId}
- Re-run specific tool: Use Bugrit dashboard to re-scan specific tools
- Contact support: https://bugrit.dev/support
`;
}

/**
 * Generate a shorter AI agent prompt for quick review
 */
export async function generateQuickReviewPrompt(options: {
  repoUrl: string;
  baseBranch: string;
  fixBranch: string;
  findingCount: number;
  criticalCount: number;
  highCount: number;
}): Promise<string> {
  const { repoUrl, baseBranch, fixBranch, findingCount, criticalCount, highCount } = options;

  return `# Quick Review: Bugrit Fix Branch

Review and merge the automated fixes from Bugrit.

**Repo**: ${repoUrl}
**Fix Branch**: \`${fixBranch}\` → \`${baseBranch}\`
**Fixes**: ${findingCount} issues (${criticalCount} critical, ${highCount} high)

## Commands

\`\`\`bash
# 1. Review changes
git fetch origin ${fixBranch}
git diff ${baseBranch}...origin/${fixBranch}

# 2. Test locally
git checkout ${fixBranch}
npm test && npm run build

# 3. Merge if tests pass
git checkout ${baseBranch}
git merge origin/${fixBranch} --no-ff -m "fix: apply Bugrit security fixes"
git push origin ${baseBranch}
\`\`\`

Verify each fix addresses the actual issue before merging. Do not merge if tests fail.
`;
}

/**
 * Generate a combined fix prompt for copying to AI assistants
 */
export async function generateCopyablePrompt(
  findings: GenerateFixInput['finding'][],
  groupByFile: boolean = true
): Promise<string> {
  if (groupByFile) {
    // Group findings by file
    const byFile = new Map<string, GenerateFixInput['finding'][]>();
    for (const finding of findings) {
      const file = finding.file || 'unknown';
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push(finding);
    }

    let prompt = `Fix the following issues in my codebase:\n\n`;

    for (const [file, fileFindings] of byFile) {
      prompt += `## ${file}\n`;
      for (const finding of fileFindings) {
        prompt += `- **${finding.severity.toUpperCase()}**: ${finding.title}`;
        if (finding.line) prompt += ` (line ${finding.line})`;
        prompt += `\n  ${finding.description}\n`;
      }
      prompt += '\n';
    }

    prompt += `Please provide the fixed code for each file.`;
    return prompt;
  }

  // Simple list format
  let prompt = `Fix the following ${findings.length} issues:\n\n`;
  for (const finding of findings) {
    prompt += `${findings.indexOf(finding) + 1}. **${finding.severity.toUpperCase()}** in ${finding.file || 'unknown'}`;
    if (finding.line) prompt += `:${finding.line}`;
    prompt += `\n   ${finding.title}: ${finding.description}\n\n`;
  }
  return prompt;
}
