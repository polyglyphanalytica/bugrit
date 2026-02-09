'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';

// Server context shape (mirrored from ai/flows/sensei-chat to avoid importing server module)
interface SenseiServerContext {
  userName?: string;
  apps?: Array<{ id: string; name: string; type: string }>;
  recentScans?: Array<{ id: string; status: string; appName?: string; findings?: number; repoUrl?: string }>;
  credits?: { remaining: number; included: number; tier: string };
  currentPage?: string;
  scanContext?: {
    scanId: string;
    status: string;
    totalFindings?: number;
    topFindings?: Array<{ severity: string; title: string; tool: string; file?: string }>;
  };
}

// Response shape from /api/sensei/chat
interface SenseiResponse {
  message: string;
  actionType: 'none' | 'create_app' | 'start_scan' | 'navigate' | 'checkout' | 'show_billing';
  appName?: string;
  appType?: string;
  appDescription?: string;
  targetUrl?: string;
  repoUrl?: string;
  applicationId?: string;
  branch?: string;
  path?: string;
  tier?: string;
  interval?: string;
  suggestedQuestions?: string[];
}

// --- Types ---

export interface ChatMessage {
  id: string;
  role: 'user' | 'sensei';
  content: string;
  timestamp: number;
  actionType?: string;
  actionResult?: string;
  suggestedQuestions?: string[];
  isLoading?: boolean;
}

export interface PageContext {
  scanId?: string;
  scanStatus?: string;
  totalFindings?: number;
  topFindings?: Array<{
    severity: string;
    title: string;
    tool: string;
    file?: string;
  }>;
  applicationId?: string;
}

interface SenseiContextType {
  messages: ChatMessage[];
  isExpanded: boolean;
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  setPageContext: (ctx: PageContext) => void;
  clearMessages: () => void;
}

const SenseiContext = createContext<SenseiContextType | undefined>(undefined);

// --- Helpers ---

let msgCounter = 0;
function generateMessageId(): string {
  return `msg_${Date.now()}_${++msgCounter}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'sensei',
  content:
    "Hi, I'm Sensei — your code security copilot. I can scan repos, create apps, manage your subscription, explain findings, and more. What would you like to do?",
  timestamp: Date.now(),
  suggestedQuestions: [
    'Scan a GitHub repo',
    'Create a new application',
    'What can you do?',
  ],
};

// Pages where Sensei should NOT show
const EXCLUDED_PATHS = ['/', '/login', '/signup'];

// --- Provider ---

export function SenseiProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pageContextRef = useRef<PageContext>({});
  const userContextRef = useRef<{
    apps?: Array<{ id: string; name: string; type: string }>;
    recentScans?: Array<{
      id: string;
      status: string;
      appName?: string;
      findings?: number;
      repoUrl?: string;
    }>;
    credits?: { remaining: number; included: number; tier: string };
    lastFetched?: number;
  }>({});

  // Fetch user context periodically (apps, scans, billing)
  const fetchUserContext = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    // Cache for 30 seconds
    if (userContextRef.current.lastFetched && now - userContextRef.current.lastFetched < 30000) {
      return;
    }

    try {
      const [appsRes, scansRes, billingRes] = await Promise.all([
        apiClient.get<{ applications: Array<{ id: string; name: string; type: string }> }>(
          user,
          '/api/applications'
        ),
        apiClient.get<{ scans: Array<{ id: string; status: string; applicationName?: string; summary?: { critical: number; high: number; medium: number; low: number }; sourceType: string }> }>(
          user,
          '/api/scans?limit=5'
        ),
        apiClient.get<{ tier: string; credits: { remaining: number; included: number } }>(
          user,
          '/api/billing/status'
        ),
      ]);

      userContextRef.current = {
        apps: appsRes.ok && appsRes.data
          ? appsRes.data.applications?.map(a => ({ id: a.id, name: a.name, type: a.type }))
          : undefined,
        recentScans: scansRes.ok && scansRes.data
          ? scansRes.data.scans?.map(s => ({
              id: s.id,
              status: s.status,
              appName: s.applicationName,
              findings: s.summary
                ? s.summary.critical + s.summary.high + s.summary.medium + s.summary.low
                : undefined,
            }))
          : undefined,
        credits: billingRes.ok && billingRes.data
          ? {
              remaining: billingRes.data.credits?.remaining ?? 0,
              included: billingRes.data.credits?.included ?? 0,
              tier: billingRes.data.tier ?? 'free',
            }
          : undefined,
        lastFetched: now,
      };
    } catch {
      // Non-critical, continue with stale context
    }
  }, [user]);

  // Build server context from cached data
  const buildServerContext = useCallback((): SenseiServerContext => {
    const ctx: SenseiServerContext = {
      currentPage: pathname,
    };

    if (user?.email) {
      ctx.userName = user.email.split('@')[0];
    }

    if (userContextRef.current.apps) {
      ctx.apps = userContextRef.current.apps;
    }

    if (userContextRef.current.recentScans) {
      ctx.recentScans = userContextRef.current.recentScans;
    }

    if (userContextRef.current.credits) {
      ctx.credits = userContextRef.current.credits;
    }

    const pc = pageContextRef.current;
    if (pc.scanId) {
      ctx.scanContext = {
        scanId: pc.scanId,
        status: pc.scanStatus || 'unknown',
        totalFindings: pc.totalFindings,
        topFindings: pc.topFindings,
      };
    }

    return ctx;
  }, [pathname, user]);

  // Execute an action returned by the AI
  const executeAction = useCallback(
    async (response: SenseiResponse): Promise<string | null> => {
      if (!user || response.actionType === 'none') return null;

      switch (response.actionType) {
        case 'create_app': {
          if (!response.appName || !response.appType) {
            return 'I need a name and type to create an app. Could you provide those?';
          }
          const res = await apiClient.post<{ application: { id: string; name: string } }>(
            user,
            '/api/applications',
            {
              name: response.appName,
              type: response.appType,
              description: response.appDescription || '',
              targetUrl: response.targetUrl || '',
            }
          );
          if (res.ok && res.data) {
            // Invalidate cache
            userContextRef.current.lastFetched = 0;
            return `Created **${res.data.application.name}**. You can now scan it or configure settings.`;
          }
          return `Could not create the app: ${res.error || 'Unknown error'}. Check if the name is already taken.`;
        }

        case 'start_scan': {
          if (!response.repoUrl) {
            return 'I need a GitHub URL to start a scan. What repo would you like to scan?';
          }

          let appId = response.applicationId;

          // If no app ID, try to use the first app or create one
          if (!appId) {
            await fetchUserContext();
            if (userContextRef.current.apps && userContextRef.current.apps.length > 0) {
              appId = userContextRef.current.apps[0].id;
            } else {
              // Auto-create an app from the repo URL
              const repoName = response.repoUrl.split('/').pop()?.replace('.git', '') || 'my-app';
              const createRes = await apiClient.post<{ application: { id: string } }>(
                user,
                '/api/applications',
                { name: repoName, type: 'web', description: `Auto-created for ${response.repoUrl}` }
              );
              if (createRes.ok && createRes.data) {
                appId = createRes.data.application.id;
                userContextRef.current.lastFetched = 0;
              } else {
                return `I need to create an app first, but hit an error: ${createRes.error}. Try creating one manually at /applications.`;
              }
            }
          }

          const scanRes = await apiClient.post<{ scan: { id: string } }>(
            user,
            '/api/scans',
            {
              applicationId: appId,
              sourceType: 'github',
              repoUrl: response.repoUrl,
              branch: response.branch || 'main',
            }
          );

          if (scanRes.ok && scanRes.data) {
            userContextRef.current.lastFetched = 0;
            setTimeout(() => router.push(`/scans/${scanRes.data!.scan.id}`), 500);
            return `Scan started! Navigating to the results page. This usually takes 1-2 minutes.`;
          }

          const errMsg = scanRes.error || 'Unknown error';
          if (scanRes.status === 402) {
            return `You don't have enough credits for this scan. Would you like to upgrade your plan?`;
          }
          return `Could not start the scan: ${errMsg}`;
        }

        case 'checkout': {
          if (!response.tier) {
            return 'Which plan would you like? Solo ($19/mo), Scale ($49/mo), or Business ($99/mo)?';
          }
          const checkoutRes = await apiClient.post<{ url: string }>(
            user,
            '/api/subscription/checkout',
            {
              tier: response.tier,
              interval: response.interval || 'month',
            }
          );
          if (checkoutRes.ok && checkoutRes.data?.url) {
            window.location.href = checkoutRes.data.url;
            return `Redirecting to checkout for the **${response.tier}** plan...`;
          }
          return `Could not start checkout: ${checkoutRes.error}. Try going to /pricing.`;
        }

        case 'navigate': {
          if (response.path) {
            router.push(response.path);
          }
          return null;
        }

        case 'show_billing': {
          const billingRes = await apiClient.get<{
            tier: string;
            tierName: string;
            credits: { remaining: number; included: number; used: number };
            subscription?: { status: string; renewsAt?: string };
          }>(user, '/api/billing/status');

          if (billingRes.ok && billingRes.data) {
            const d = billingRes.data;
            let info = `**${d.tierName || d.tier} Plan** — ${d.credits.remaining} of ${d.credits.included} credits remaining (${d.credits.used} used)`;
            if (d.subscription?.renewsAt) {
              info += `\nRenews ${new Date(d.subscription.renewsAt).toLocaleDateString()}`;
            }
            if (d.subscription?.status === 'past_due') {
              info += '\n**Warning:** Your payment is past due. Update your payment method in settings.';
            }
            return info;
          }
          return 'Could not fetch billing info. Try /settings for account details.';
        }

        default:
          return null;
      }
    },
    [user, router, fetchUserContext]
  );

  // Send a message to Sensei
  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || !text.trim() || isLoading) return;

      const trimmed = text.trim();

      // Add user message
      const userMsg: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      // Add placeholder for Sensei's response
      const loadingMsg: ChatMessage = {
        id: generateMessageId(),
        role: 'sensei',
        content: '',
        timestamp: Date.now(),
        isLoading: true,
      };

      setMessages(prev => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);
      setIsExpanded(true);

      // Fetch fresh context
      await fetchUserContext();

      try {
        // Build history from recent messages (excluding loading placeholder)
        const history = messages
          .filter(m => m.id !== 'welcome' && !m.isLoading)
          .slice(-10)
          .map(m => ({ role: m.role, content: m.content }));

        const serverContext = buildServerContext();

        const res = await apiClient.post<SenseiResponse>(user, '/api/sensei/chat', {
          message: trimmed,
          history,
          context: serverContext,
        });

        if (res.ok && res.data) {
          const aiResponse = res.data;

          // Execute action if needed
          let actionResult: string | null = null;
          if (aiResponse.actionType && aiResponse.actionType !== 'none') {
            actionResult = await executeAction(aiResponse);
          }

          // Replace loading message with actual response
          const senseiMsg: ChatMessage = {
            id: loadingMsg.id,
            role: 'sensei',
            content: aiResponse.message,
            timestamp: Date.now(),
            actionType: aiResponse.actionType !== 'none' ? aiResponse.actionType : undefined,
            actionResult: actionResult || undefined,
            suggestedQuestions: aiResponse.suggestedQuestions,
          };

          setMessages(prev => prev.map(m => (m.id === loadingMsg.id ? senseiMsg : m)));
        } else {
          // Error response
          setMessages(prev =>
            prev.map(m =>
              m.id === loadingMsg.id
                ? {
                    ...m,
                    content: 'Something went wrong. Try again, or check your connection.',
                    isLoading: false,
                  }
                : m
            )
          );
        }
      } catch {
        setMessages(prev =>
          prev.map(m =>
            m.id === loadingMsg.id
              ? { ...m, content: 'Network error. Please try again.', isLoading: false }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [user, isLoading, messages, fetchUserContext, buildServerContext, executeAction]
  );

  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);
  const toggle = useCallback(() => setIsExpanded(prev => !prev), []);

  const setPageContext = useCallback((ctx: PageContext) => {
    pageContextRef.current = ctx;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  // Don't render Sensei on excluded paths or when not logged in
  const shouldShow = user && !EXCLUDED_PATHS.includes(pathname);

  if (!shouldShow) {
    return (
      <SenseiContext.Provider
        value={{
          messages: [],
          isExpanded: false,
          isLoading: false,
          sendMessage: async () => {},
          expand: () => {},
          collapse: () => {},
          toggle: () => {},
          setPageContext: () => {},
          clearMessages: () => {},
        }}
      >
        {children}
      </SenseiContext.Provider>
    );
  }

  return (
    <SenseiContext.Provider
      value={{
        messages,
        isExpanded,
        isLoading,
        sendMessage,
        expand,
        collapse,
        toggle,
        setPageContext,
        clearMessages,
      }}
    >
      {children}
    </SenseiContext.Provider>
  );
}

export function useSensei(): SenseiContextType {
  const context = useContext(SenseiContext);
  if (context === undefined) {
    throw new Error('useSensei must be used within a SenseiProvider');
  }
  return context;
}
