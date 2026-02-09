/**
 * Sensei Chat — AI Copilot Flow
 *
 * Powers the Sensei conversational interface. Handles:
 * - General questions about scans, security, code quality
 * - Action orchestration: create apps, start scans, manage subscriptions
 * - Context-aware responses based on user state
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// --- Input Schema ---

const SenseiMessageSchema = z.object({
  role: z.enum(['user', 'sensei']),
  content: z.string(),
});

const SenseiContextSchema = z.object({
  userName: z.string().optional(),
  apps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
  })).optional(),
  recentScans: z.array(z.object({
    id: z.string(),
    status: z.string(),
    appName: z.string().optional(),
    findings: z.number().optional(),
    repoUrl: z.string().optional(),
  })).optional(),
  credits: z.object({
    remaining: z.number(),
    included: z.number(),
    tier: z.string(),
  }).optional(),
  currentPage: z.string().optional(),
  scanContext: z.object({
    scanId: z.string(),
    status: z.string(),
    totalFindings: z.number().optional(),
    topFindings: z.array(z.object({
      severity: z.string(),
      title: z.string(),
      tool: z.string(),
      file: z.string().optional(),
    })).optional(),
  }).optional(),
  openTickets: z.array(z.object({
    id: z.string(),
    subject: z.string(),
    status: z.string(),
    lastResponse: z.string().optional(),
    lastResponseFrom: z.string().optional(),
    updatedAt: z.string().optional(),
  })).optional(),
});

const SenseiInputSchema = z.object({
  message: z.string(),
  history: z.array(SenseiMessageSchema).optional(),
  context: SenseiContextSchema.optional(),
});

// --- Output Schema ---

const SenseiResponseSchema = z.object({
  message: z.string().describe('Conversational response to show the user. Use markdown for formatting.'),
  actionType: z.enum([
    'none',
    'create_app',
    'start_scan',
    'navigate',
    'checkout',
    'show_billing',
    'escalate_to_human',
    'reply_to_ticket',
  ]).describe('Action to take. Use none for purely conversational responses.'),
  appName: z.string().optional().describe('For create_app: the application name'),
  appType: z.string().optional().describe('For create_app: web, mobile, desktop, or hybrid'),
  appDescription: z.string().optional().describe('For create_app: short description'),
  targetUrl: z.string().optional().describe('For create_app: application URL'),
  repoUrl: z.string().optional().describe('For start_scan: full GitHub repo URL'),
  applicationId: z.string().optional().describe('For start_scan: existing app ID to scan under'),
  branch: z.string().optional().describe('For start_scan: git branch name'),
  path: z.string().optional().describe('For navigate: page path like /scans/new or /applications'),
  tier: z.string().optional().describe('For checkout: solo, scale, or business'),
  interval: z.string().optional().describe('For checkout: month or year'),
  ticketSubject: z.string().optional().describe('For escalate_to_human: brief subject summarizing the issue'),
  ticketSummary: z.string().optional().describe('For escalate_to_human: AI-generated summary of the issue for the support team'),
  ticketId: z.string().optional().describe('For reply_to_ticket: the ticket ID to reply to'),
  ticketReply: z.string().optional().describe('For reply_to_ticket: the user\'s response message to send'),
  suggestedQuestions: z.array(z.string()).optional().describe('2-3 follow-up questions'),
});

export type SenseiInput = z.infer<typeof SenseiInputSchema>;
export type SenseiContext = z.infer<typeof SenseiContextSchema>;
export type SenseiResponse = z.infer<typeof SenseiResponseSchema>;
export type SenseiMessage = z.infer<typeof SenseiMessageSchema>;

// --- System Prompt ---

function buildSystemPrompt(context?: SenseiContext): string {
  let prompt = `You are Sensei, the AI copilot for Bugrit — a code security and quality scanning platform with 150+ tools.

You are the primary interface. Users talk to you to get things done. Be direct, concise, and action-oriented.

## What You Can Do

### create_app — Register a new application
Set actionType to "create_app" with appName and appType (web/mobile/desktop/hybrid).
Optionally include appDescription and targetUrl.

### start_scan — Scan code for security and quality issues
Set actionType to "start_scan" with repoUrl (GitHub URL).
Include applicationId if the user has apps. Include branch if specified (defaults to main).
Each scan costs ~2-5 credits. Always mention the cost if relevant.
If the user has no apps, create one first, then scan.

### navigate — Go to a page
Set actionType to "navigate" with path.
Paths: /scans/new, /applications, /dashboard, /settings, /settings/api-keys, /pricing, /docs, /scans, /scans/{id}

### checkout — Subscribe or upgrade
Set actionType to "checkout" with tier (solo/scale/business) and interval (month/year).
Plans: Solo $19/mo (50 credits), Scale $49/mo (200 credits), Business $99/mo (500 credits).
Free tier: 10 credits included.

### show_billing — Show credit balance and plan info
Set actionType to "show_billing". No extra params needed.

### escalate_to_human — Escalate to human support
Set actionType to "escalate_to_human" when:
- The user explicitly asks to talk to a human, support team, or asks to escalate
- The user expresses strong frustration (e.g. "this is broken", "nothing works", repeated failed attempts)
- You genuinely cannot help with their issue (billing disputes, account recovery, bugs you can't fix)
- The user has asked the same question 3+ times without resolution

Include ticketSubject (brief subject line) and ticketSummary (2-3 sentence summary of the issue for the support team, including what was tried).
IMPORTANT: Before escalating, ALWAYS ask the user first: "Would you like me to escalate this to our support team?" Only escalate if they confirm. The conversation transcript will be included automatically.

### reply_to_ticket — Respond to an open support ticket
Set actionType to "reply_to_ticket" with ticketId and ticketReply.
Use this when the user wants to respond to a support ticket or when they reply to an admin's response.
Extract the user's intended message as ticketReply — this is what gets sent to the support team.

### none — Just respond conversationally
For questions, explanations, advice, or when no action is needed.

## Scan Capabilities
Bugrit scans for: security vulnerabilities (OWASP, SAST, DAST), dependency issues, code quality, accessibility, performance, API security, mobile security, container security, cloud-native, SBOM, git history, documentation.
Tools include: Semgrep, ESLint, Gitleaks, OWASP ZAP, Trivy, Bandit, MobSF, Lighthouse, and 90+ more.

## Guidelines
- Keep responses to 1-3 short paragraphs. Use bullet points for lists.
- When taking an action, tell the user what you are doing.
- If a request is ambiguous, ask ONE clarifying question — do not guess.
- Mention credit costs when starting scans or recommending plans.
- Answer scan result questions directly from the context.
- Always suggest 2-3 follow-up questions in suggestedQuestions.
- Be warm but professional. No emoji overload.
- If the user needs help you cannot provide, offer to escalate to a human via escalate_to_human.
- Watch for signs of frustration: repeated complaints, strong negative language, expressions of confusion. Gently offer escalation.`;

  if (context) {
    prompt += '\n\n## User Context\n';

    if (context.credits) {
      prompt += `Plan: ${context.credits.tier} | Credits: ${context.credits.remaining} of ${context.credits.included} remaining\n`;
    }

    if (context.apps && context.apps.length > 0) {
      prompt += `Apps (${context.apps.length}): ${context.apps.map((a: { name: string; type: string; id: string }) => `${a.name} [${a.type}] (id:${a.id})`).join(', ')}\n`;
    } else {
      prompt += 'Apps: none registered yet\n';
    }

    if (context.recentScans && context.recentScans.length > 0) {
      prompt += 'Recent scans:\n';
      for (const scan of context.recentScans.slice(0, 5)) {
        prompt += `  - ${scan.appName || 'Unknown'}: ${scan.status}${scan.findings !== undefined ? ` (${scan.findings} findings)` : ''} [id:${scan.id}]\n`;
      }
    } else {
      prompt += 'Recent scans: none\n';
    }

    if (context.currentPage) {
      prompt += `Currently viewing: ${context.currentPage}\n`;
    }

    if (context.openTickets && context.openTickets.length > 0) {
      prompt += '\nOpen support tickets:\n';
      for (const ticket of context.openTickets) {
        prompt += `  - [${ticket.id}] "${ticket.subject}" (${ticket.status})`;
        if (ticket.lastResponse) {
          prompt += ` — Last response from ${ticket.lastResponseFrom}: "${ticket.lastResponse.slice(0, 100)}${ticket.lastResponse.length > 100 ? '...' : ''}"`;
        }
        prompt += '\n';
      }
      prompt += 'If the user mentions a ticket or wants to reply to support, use reply_to_ticket with the ticket ID and their message.\n';
    }

    if (context.scanContext) {
      prompt += `\nActive Scan (${context.scanContext.scanId}): ${context.scanContext.status}`;
      if (context.scanContext.totalFindings !== undefined) {
        prompt += ` — ${context.scanContext.totalFindings} findings`;
      }
      prompt += '\n';
      if (context.scanContext.topFindings && context.scanContext.topFindings.length > 0) {
        prompt += 'Top findings:\n';
        for (const f of context.scanContext.topFindings.slice(0, 10)) {
          prompt += `  [${f.severity}] ${f.title} (${f.tool})${f.file ? ` in ${f.file}` : ''}\n`;
        }
      }
    }
  }

  return prompt;
}

// --- Generate Response ---

async function loadKnowledgeBase(): Promise<string> {
  try {
    const { getDb } = await import('@/lib/firestore');
    const db = getDb();
    if (!db) return '';

    const snapshot = await db.collection('sensei_knowledge')
      .where('enabled', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) return '';

    let kb = '\n\n## Knowledge Base (use these for answering common questions)\n';
    for (const doc of snapshot.docs) {
      const entry = doc.data();
      kb += `Q: ${entry.question}\nA: ${entry.answer}\n\n`;
    }
    return kb;
  } catch {
    return '';
  }
}

export async function generateSenseiResponse(input: SenseiInput): Promise<SenseiResponse> {
  const systemPrompt = buildSystemPrompt(input.context);
  const knowledgeBase = await loadKnowledgeBase();

  // Build conversation as a single prompt string for reliable structured output
  let conversationText = '';
  if (input.history && input.history.length > 0) {
    const recent = input.history.slice(-10);
    conversationText = '\n## Conversation\n';
    for (const msg of recent) {
      conversationText += `${msg.role === 'user' ? 'User' : 'Sensei'}: ${msg.content}\n`;
    }
  }

  const fullPrompt = `${systemPrompt}${knowledgeBase}${conversationText}
## Current Message
User: ${input.message}

Respond as Sensei. Include actionType and action parameters if the user is requesting an action.`;

  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: fullPrompt,
    output: {
      schema: SenseiResponseSchema,
    },
    config: {
      temperature: 0.4,
    },
  });

  return response.output || {
    message: "I'm having trouble right now. Try again in a moment, or type **/help** for other options.",
    actionType: 'none',
  };
}
