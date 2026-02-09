'use client';

import { useState, useRef, useEffect, KeyboardEvent, FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSensei, type ChatMessage } from '@/contexts/sensei-context';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Send, RotateCcw } from 'lucide-react';

// Pages where Sensei should NOT render
const EXCLUDED_PATHS = ['/', '/login', '/signup'];

// --- Typing Indicator ---

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// --- Action Badge ---

function ActionBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    create_app: 'App created',
    start_scan: 'Scan started',
    checkout: 'Checkout',
    navigate: 'Navigated',
    show_billing: 'Billing info',
  };

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 mt-1">
      {labels[type] || type}
    </span>
  );
}

// --- Render markdown-like bold ---

function RenderBold({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*.*?\*\*)/).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// --- Message Bubble ---

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-slate-100 rounded-2xl rounded-bl-sm">
          <TypingIndicator />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-orange-500 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-900 rounded-bl-sm'
        )}
      >
        <RenderBold text={message.content} />

        {message.actionType && (
          <div className="mt-1.5">
            <ActionBadge type={message.actionType} />
          </div>
        )}

        {message.actionResult && (
          <div className="mt-2 text-xs bg-white/60 rounded-lg p-2 border border-slate-200">
            <RenderBold text={message.actionResult} />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Quick Action Chip ---

function QuickAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors whitespace-nowrap"
    >
      {label}
    </button>
  );
}

// --- Main SenseiChat Component ---

export function SenseiChat() {
  const { user } = useAuth();
  const pathname = usePathname();
  const {
    messages,
    isExpanded,
    isLoading,
    sendMessage,
    expand,
    collapse,
    clearMessages,
  } = useSensei();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const shouldShow = !!user && !EXCLUDED_PATHS.includes(pathname);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldShow && isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded, shouldShow]);

  // Focus input when expanded
  useEffect(() => {
    if (shouldShow && isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded, shouldShow]);

  // Keyboard shortcut: Escape to collapse
  useEffect(() => {
    if (!shouldShow) return;
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        collapse();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isExpanded, collapse, shouldShow]);

  // Don't render on excluded paths or when not logged in
  if (!shouldShow) {
    return null;
  }

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (text: string) => {
    setInput('');
    sendMessage(text);
  };

  // Get the last message's suggested questions
  const lastSenseiMsg = [...messages].reverse().find(m => m.role === 'sensei' && !m.isLoading);
  const suggestedQuestions = lastSenseiMsg?.suggestedQuestions;

  return (
    <>
      {/* Spacer to prevent content from hiding behind the bar */}
      <div className="h-14" />

      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-30 transition-opacity"
          onClick={collapse}
        />
      )}

      {/* Main panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-white border-t border-slate-200 shadow-lg transition-all duration-300 ease-in-out',
          isExpanded
            ? 'h-[70vh] sm:h-[60vh] shadow-2xl'
            : 'h-14'
        )}
      >
        {/* Expanded: Header */}
        {isExpanded && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm font-semibold">Sensei</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">AI Copilot</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearMessages}
                className="p-1.5 rounded-md hover:bg-slate-700 transition-colors"
                title="Clear conversation"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={collapse}
                className="p-1.5 rounded-md hover:bg-slate-700 transition-colors"
                title="Minimize (Esc)"
              >
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* Expanded: Messages */}
        {isExpanded && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />

            {/* Suggested questions */}
            {suggestedQuestions && suggestedQuestions.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestedQuestions.map((q, i) => (
                  <QuickAction
                    key={i}
                    label={q}
                    onClick={() => handleQuickAction(q)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input bar — always visible */}
        <form
          onSubmit={handleSubmit}
          className={cn(
            'flex items-center gap-2 px-3 shrink-0',
            isExpanded
              ? 'py-2.5 border-t border-slate-100 bg-white'
              : 'py-0 h-14 bg-white'
          )}
        >
          {/* Collapsed: Sensei indicator */}
          {!isExpanded && (
            <button
              type="button"
              onClick={expand}
              className="flex items-center gap-1.5 shrink-0 mr-1"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              <span className="text-xs font-semibold text-slate-600">Sensei</span>
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (!isExpanded) expand(); }}
            placeholder={isExpanded ? 'Ask anything or describe what you need...' : 'Ask Sensei anything...'}
            disabled={isLoading}
            className={cn(
              'flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm',
              'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300',
              'disabled:opacity-50 transition-colors'
            )}
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={cn(
              'shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors',
              input.trim()
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-slate-100 text-slate-400'
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>

          {/* Collapsed: Expand button */}
          {!isExpanded && (
            <button
              type="button"
              onClick={expand}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </form>
      </div>
    </>
  );
}
