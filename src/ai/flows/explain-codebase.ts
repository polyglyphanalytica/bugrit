/**
 * Explain My Codebase
 *
 * AI-powered codebase understanding - answers questions about
 * security risks, architecture, and code patterns.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { AuditFinding } from '@/lib/integrations/types';
import type { VibeScore } from '@/lib/vibe-score/types';

// Input schema
const ExplainCodebaseInputSchema = z.object({
  question: z.string(),
  findings: z.array(z.object({
    tool: z.string(),
    severity: z.string(),
    title: z.string(),
    description: z.string(),
    file: z.string().optional(),
    line: z.number().optional(),
    category: z.string(),
  })),
  vibeScore: z.object({
    overall: z.number(),
    components: z.object({
      security: z.number(),
      quality: z.number(),
      accessibility: z.number(),
      performance: z.number(),
      dependencies: z.number(),
      documentation: z.number(),
    }),
  }).optional(),
  repoInfo: z.object({
    name: z.string(),
    language: z.string().optional(),
    framework: z.string().optional(),
    linesOfCode: z.number().optional(),
    fileCount: z.number().optional(),
  }).optional(),
});

// Output schema
const ExplainCodebaseOutputSchema = z.object({
  answer: z.string(),

  // Structured insights
  insights: z.array(z.object({
    title: z.string(),
    description: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    affectedFiles: z.array(z.string()).optional(),
    recommendation: z.string().optional(),
  })).optional(),

  // Suggested follow-up questions
  followUpQuestions: z.array(z.string()).optional(),

  // Offer to fix
  canOfferFix: z.boolean(),
  fixSuggestion: z.string().optional(),
});

export type ExplainCodebaseInput = z.infer<typeof ExplainCodebaseInputSchema>;
export type ExplainCodebaseOutput = z.infer<typeof ExplainCodebaseOutputSchema>;

/**
 * Answer questions about the codebase based on scan results
 */
export async function explainCodebase(input: ExplainCodebaseInput): Promise<ExplainCodebaseOutput> {
  const { question, findings, vibeScore, repoInfo } = input;

  const prompt = buildExplainPrompt(question, findings, vibeScore, repoInfo);

  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt,
    output: {
      schema: ExplainCodebaseOutputSchema,
    },
    config: {
      temperature: 0.3,
    },
  });

  return response.output || {
    answer: 'I was unable to analyze your codebase. Please try rephrasing your question.',
    canOfferFix: false,
  };
}

function buildExplainPrompt(
  question: string,
  findings: ExplainCodebaseInput['findings'],
  vibeScore?: ExplainCodebaseInput['vibeScore'],
  repoInfo?: ExplainCodebaseInput['repoInfo']
): string {
  let prompt = `You are a friendly, expert code reviewer helping a developer understand their codebase.
Your tone should be helpful and constructive, like a senior engineer mentoring a junior.

## User's Question
"${question}"

`;

  if (repoInfo) {
    prompt += `## Repository Info
- Name: ${repoInfo.name}
${repoInfo.language ? `- Primary Language: ${repoInfo.language}` : ''}
${repoInfo.framework ? `- Framework: ${repoInfo.framework}` : ''}
${repoInfo.linesOfCode ? `- Lines of Code: ${repoInfo.linesOfCode.toLocaleString()}` : ''}
${repoInfo.fileCount ? `- File Count: ${repoInfo.fileCount}` : ''}

`;
  }

  if (vibeScore) {
    prompt += `## Vibe Score Summary
- Overall: ${vibeScore.overall}/100
- Security: ${vibeScore.components.security}/100
- Quality: ${vibeScore.components.quality}/100
- Accessibility: ${vibeScore.components.accessibility}/100
- Performance: ${vibeScore.components.performance}/100
- Dependencies: ${vibeScore.components.dependencies}/100
- Documentation: ${vibeScore.components.documentation}/100

`;
  }

  prompt += `## Scan Findings (${findings.length} total)

`;

  // Group findings by category for better context
  const byCategory = new Map<string, typeof findings>();
  for (const finding of findings) {
    if (!byCategory.has(finding.category)) {
      byCategory.set(finding.category, []);
    }
    byCategory.get(finding.category)!.push(finding);
  }

  for (const [category, categoryFindings] of byCategory) {
    prompt += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryFindings.length} issues)\n`;

    // Show top 5 most severe for each category
    const sorted = categoryFindings.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (severityOrder[a.severity as keyof typeof severityOrder] || 5) -
             (severityOrder[b.severity as keyof typeof severityOrder] || 5);
    }).slice(0, 5);

    for (const finding of sorted) {
      prompt += `- **${finding.severity.toUpperCase()}** [${finding.tool}]: ${finding.title}`;
      if (finding.file) prompt += ` (${finding.file}${finding.line ? `:${finding.line}` : ''})`;
      prompt += '\n';
    }

    if (categoryFindings.length > 5) {
      prompt += `  ... and ${categoryFindings.length - 5} more\n`;
    }
    prompt += '\n';
  }

  prompt += `## Instructions
1. Answer the user's question based on the scan findings and scores
2. Be specific - reference actual files, line numbers, and tool names
3. Prioritize the most important issues
4. Provide actionable insights, not just observations
5. If appropriate, suggest follow-up questions they might want to ask
6. If you can help fix something, offer to do so

Keep your answer concise but thorough. Use bullet points and structure for readability.`;

  return prompt;
}

/**
 * Pre-defined questions for common queries
 */
export async function getSuggestedQuestions() {
  return [
    {
      category: 'security',
      questions: [
        'What are the main security risks in my repo?',
        'Are there any exposed secrets or credentials?',
        'Do I have any SQL injection or XSS vulnerabilities?',
        'How secure are my dependencies?',
      ],
    },
    {
      category: 'quality',
      questions: [
        'Where is the most technical debt in my codebase?',
        'What files should I refactor first?',
        'Are there any code duplication issues?',
        'How is my test coverage?',
      ],
    },
    {
      category: 'accessibility',
      questions: [
        'Is my app accessible to screen reader users?',
        'What WCAG guidelines am I failing?',
        'How can I improve keyboard navigation?',
      ],
    },
    {
      category: 'performance',
      questions: [
        'What is slowing down my app?',
        'How can I reduce my bundle size?',
        'Are there any performance bottlenecks?',
      ],
    },
    {
      category: 'general',
      questions: [
        'Give me an executive summary of my codebase health',
        'What should I fix first?',
        'How does my code compare to best practices?',
        'What would it take to get to a 90+ vibe score?',
      ],
    },
  ];
}

/**
 * Quick insights without requiring a question
 */
export async function generateQuickInsights(
  findings: ExplainCodebaseInput['findings'],
  vibeScore: ExplainCodebaseInput['vibeScore']
): Promise<{
  topConcerns: string[];
  quickWins: string[];
  positives: string[];
}> {
  const prompt = `Based on these scan results, identify:
1. Top 3 concerns that need immediate attention
2. Top 3 quick wins (easy fixes with high impact)
3. Top 3 positive things about the codebase

## Vibe Score: ${vibeScore?.overall || 'N/A'}/100

## Findings by Severity:
- Critical: ${findings.filter(f => f.severity === 'critical').length}
- High: ${findings.filter(f => f.severity === 'high').length}
- Medium: ${findings.filter(f => f.severity === 'medium').length}
- Low: ${findings.filter(f => f.severity === 'low').length}
- Info: ${findings.filter(f => f.severity === 'info').length}

## Sample Findings:
${findings.slice(0, 20).map(f => `- [${f.severity}] ${f.title} (${f.tool})`).join('\n')}

Return JSON with keys: topConcerns, quickWins, positives (each an array of strings).`;

  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt,
    output: {
      schema: z.object({
        topConcerns: z.array(z.string()),
        quickWins: z.array(z.string()),
        positives: z.array(z.string()),
      }),
    },
    config: {
      temperature: 0.2,
    },
  });

  return response.output || {
    topConcerns: ['Unable to analyze findings'],
    quickWins: [],
    positives: [],
  };
}
