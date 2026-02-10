/**
 * Multi-Provider AI Abstraction
 *
 * Unified interface for generating code fixes via Claude, Gemini,
 * OpenAI, GROK, DeepSeek, and GitHub Copilot. All providers use
 * the same prompt format and return normalized results.
 */

import { AIProviderID, FindingForFix, GeneratedFix } from './types';
import { logger } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// Provider Interface
// ═══════════════════════════════════════════════════════════════

interface FixGenerationRequest {
  finding: FindingForFix;
  fileContent: string;
  filePath: string;
  language: string;
}

interface FixGenerationResponse {
  success: boolean;
  fixedContent?: string;
  explanation?: string;
  confidence?: 'high' | 'medium' | 'low';
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// Shared prompt builder
// ═══════════════════════════════════════════════════════════════

function buildFixPrompt(req: FixGenerationRequest): string {
  return `You are an expert code security and quality engineer. Fix the following issue in the provided source file.

## Issue
- **Tool**: ${req.finding.tool}
- **Severity**: ${req.finding.severity}
- **Title**: ${req.finding.title}
- **Description**: ${req.finding.description}
${req.finding.line ? `- **Line**: ${req.finding.line}` : ''}
${req.finding.recommendation ? `- **Recommendation**: ${req.finding.recommendation}` : ''}

## Source File: ${req.filePath}
\`\`\`${req.language}
${req.fileContent}
\`\`\`

## Instructions
1. Return ONLY the complete fixed file content — no markdown fences, no explanation before or after.
2. Fix ONLY the specific issue described above. Do not refactor or change anything else.
3. Preserve all existing formatting, comments, and code style.
4. If you cannot fix the issue without risking breakage, return the original file unchanged.

Return the complete file content now:`;
}

function buildExplanationPrompt(req: FixGenerationRequest): string {
  return `In one sentence, explain the fix you would apply for this issue:
- ${req.finding.severity.toUpperCase()}: ${req.finding.title} in ${req.filePath}${req.finding.line ? `:${req.finding.line}` : ''}
- ${req.finding.description}`;
}

// ═══════════════════════════════════════════════════════════════
// Claude (Anthropic)
// ═══════════════════════════════════════════════════════════════

async function callClaude(
  apiKey: string,
  model: string,
  req: FixGenerationRequest
): Promise<FixGenerationResponse> {
  const [fixResp, explainResp] = await Promise.all([
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 16384,
        temperature: 0.1,
        messages: [{ role: 'user', content: buildFixPrompt(req) }],
      }),
    }),
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        temperature: 0.2,
        messages: [{ role: 'user', content: buildExplanationPrompt(req) }],
      }),
    }),
  ]);

  if (!fixResp.ok) {
    const err = await fixResp.text();
    return { success: false, error: `Claude API error: ${fixResp.status} — ${err}` };
  }

  const fixData = await fixResp.json();
  const fixedContent = fixData.content?.[0]?.text?.trim() || '';

  let explanation = '';
  if (explainResp.ok) {
    const explainData = await explainResp.json();
    explanation = explainData.content?.[0]?.text?.trim() || '';
  }

  return { success: true, fixedContent, explanation, confidence: 'high' };
}

// ═══════════════════════════════════════════════════════════════
// OpenAI / Grok / DeepSeek / Copilot (OpenAI-compatible)
// ═══════════════════════════════════════════════════════════════

async function callOpenAICompatible(
  apiKey: string,
  model: string,
  baseUrl: string,
  req: FixGenerationRequest,
  extraHeaders?: Record<string, string>
): Promise<FixGenerationResponse> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const [fixResp, explainResp] = await Promise.all([
    fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 16384,
        messages: [
          { role: 'system', content: 'You are a code security engineer. Return only the fixed file content with no extra commentary.' },
          { role: 'user', content: buildFixPrompt(req) },
        ],
      }),
    }),
    fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 256,
        messages: [
          { role: 'user', content: buildExplanationPrompt(req) },
        ],
      }),
    }),
  ]);

  if (!fixResp.ok) {
    const err = await fixResp.text();
    return { success: false, error: `API error: ${fixResp.status} — ${err}` };
  }

  const fixData = await fixResp.json();
  const fixedContent = fixData.choices?.[0]?.message?.content?.trim() || '';

  let explanation = '';
  if (explainResp.ok) {
    const explainData = await explainResp.json();
    explanation = explainData.choices?.[0]?.message?.content?.trim() || '';
  }

  return { success: true, fixedContent, explanation, confidence: 'high' };
}

// ═══════════════════════════════════════════════════════════════
// Gemini (Google)
// ═══════════════════════════════════════════════════════════════

async function callGemini(
  apiKey: string,
  model: string,
  req: FixGenerationRequest
): Promise<FixGenerationResponse> {
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;

  const [fixResp, explainResp] = await Promise.all([
    fetch(`${baseUrl}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildFixPrompt(req) }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 16384 },
      }),
    }),
    fetch(`${baseUrl}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildExplanationPrompt(req) }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
      }),
    }),
  ]);

  if (!fixResp.ok) {
    const err = await fixResp.text();
    return { success: false, error: `Gemini API error: ${fixResp.status} — ${err}` };
  }

  const fixData = await fixResp.json();
  const fixedContent = fixData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  let explanation = '';
  if (explainResp.ok) {
    const explainData = await explainResp.json();
    explanation = explainData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  return { success: true, fixedContent, explanation, confidence: 'high' };
}

// ═══════════════════════════════════════════════════════════════
// Router — dispatch to the right provider
// ═══════════════════════════════════════════════════════════════

export async function generateFixWithProvider(
  providerId: AIProviderID,
  apiKey: string,
  model: string,
  req: FixGenerationRequest
): Promise<FixGenerationResponse> {
  switch (providerId) {
    case 'claude':
      return callClaude(apiKey, model, req);

    case 'gemini':
      return callGemini(apiKey, model, req);

    case 'openai':
      return callOpenAICompatible(apiKey, model, 'https://api.openai.com', req);

    case 'grok':
      return callOpenAICompatible(apiKey, model, 'https://api.x.ai', req);

    case 'deepseek':
      return callOpenAICompatible(apiKey, model, 'https://api.deepseek.com', req);

    case 'copilot':
      return callOpenAICompatible(apiKey, model, 'https://api.githubcopilot.com', req, {
        'Copilot-Integration-Id': 'bugrit-autofix',
      });

    default:
      return { success: false, error: `Unknown provider: ${providerId}` };
  }
}

// ═══════════════════════════════════════════════════════════════
// Batch fix generation
// ═══════════════════════════════════════════════════════════════

export async function generateBatchFixesWithProvider(
  providerId: AIProviderID,
  apiKey: string,
  model: string,
  findings: FindingForFix[],
  fileContents: Map<string, string>,
  onProgress?: (fixed: number, total: number, current: string) => void
): Promise<GeneratedFix[]> {
  const fixes: GeneratedFix[] = [];
  const concurrency = 3;

  // Filter to findings that have file paths and content
  const fixable = findings.filter(f => f.file && fileContents.has(f.file));

  for (let i = 0; i < fixable.length; i += concurrency) {
    const chunk = fixable.slice(i, i + concurrency);

    const results = await Promise.all(
      chunk.map(async (finding) => {
        const filePath = finding.file!;
        const fileContent = fileContents.get(filePath)!;
        const language = detectLanguage(filePath);

        onProgress?.(fixes.length, fixable.length, finding.title);

        try {
          const result = await generateFixWithProvider(providerId, apiKey, model, {
            finding,
            fileContent,
            filePath,
            language,
          });

          if (result.success && result.fixedContent && result.fixedContent !== fileContent) {
            return {
              findingId: finding.id,
              file: filePath,
              originalContent: fileContent,
              fixedContent: result.fixedContent,
              explanation: result.explanation || `Fixed: ${finding.title}`,
              confidence: result.confidence || 'medium',
            } as GeneratedFix;
          }
          return null;
        } catch (error) {
          logger.error('Fix generation failed for finding', { findingId: finding.id, error });
          return null;
        }
      })
    );

    fixes.push(...results.filter((r): r is GeneratedFix => r !== null));
  }

  return fixes;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    kt: 'kotlin', swift: 'swift', php: 'php', cs: 'csharp',
    cpp: 'cpp', c: 'c', sql: 'sql', yaml: 'yaml', yml: 'yaml',
    json: 'json', html: 'html', css: 'css', scss: 'scss', tf: 'hcl',
  };
  return langMap[ext || ''] || ext || 'text';
}
