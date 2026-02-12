'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { Logo } from '@/components/ui/logo';
import { apiClient } from '@/lib/api-client';
import { devConsole } from '@/lib/console';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  BookOpen,
} from 'lucide-react';

interface Ticket {
  id: string;
  userId?: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  source: string;
  channel?: string;
  transcript?: Array<{ role: string; text: string; timestamp?: string }>;
  status: string;
  priority: string;
  responses: Array<{
    id: string;
    authorName: string;
    message: string;
    createdAt: string;
    internal: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  waiting_on_customer: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-600',
  high: 'text-orange-600',
  normal: 'text-gray-600',
  low: 'text-gray-400',
};

const SOURCE_LABELS: Record<string, string> = {
  contact_form: 'Contact Form',
  sensei_escalation: 'Sensei Escalation',
  api: 'System / Telemetry',
};

export default function AdminTicketsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Verify admin status before showing admin UI
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/auth/check-admin', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          setIsAdmin(true);
        } else {
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      }
    })();
  }, [user, router]);

  useEffect(() => {
    if (user && isAdmin) fetchTickets();
  }, [user, isAdmin, statusFilter]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiClient.get<{ tickets: Ticket[] }>(
        user,
        `/api/admin/tickets?status=${statusFilter}`,
      );
      if (res.ok && res.data) {
        setTickets(res.data.tickets);
      }
    } catch (error) {
      devConsole.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!user || !selectedTicket || !replyMessage.trim()) return;
    setSending(true);
    try {
      const res = await apiClient.post(
        user,
        `/api/admin/tickets/${selectedTicket.id}`,
        { message: replyMessage, internal: replyInternal },
      );
      if (res.ok) {
        setReplyMessage('');
        // Refresh the ticket
        const detail = await apiClient.get<{ ticket: Ticket }>(
          user,
          `/api/admin/tickets/${selectedTicket.id}`,
        );
        if (detail.ok && detail.data) {
          setSelectedTicket(detail.data.ticket);
          setTickets(prev => prev.map(t =>
            t.id === detail.data!.ticket.id ? detail.data!.ticket : t,
          ));
        }
      }
    } catch (error) {
      devConsole.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    if (!user) return;
    try {
      await apiClient.patch(user, `/api/admin/tickets/${ticketId}`, { status: newStatus });
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      devConsole.error('Failed to update status:', error);
    }
  };

  const handleSaveToKnowledge = async (ticket: Ticket, responseMessage: string) => {
    if (!user) return;
    try {
      await apiClient.post(user, '/api/admin/knowledge', {
        question: ticket.subject,
        answer: responseMessage,
        category: ticket.category,
        keywords: ticket.subject.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3),
        sourceTicketId: ticket.id,
      });
      alert('Saved to Sensei knowledge base');
    } catch (error) {
      devConsole.error('Failed to save to knowledge base:', error);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="container-wide flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Logo href="/" showText={false} />
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="font-semibold">Support Tickets</h1>
              <p className="text-xs text-gray-500">Manage user inquiries and escalations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <GradientButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Admin Panel
              </GradientButton>
            </Link>
            <Link href="/dashboard">
              <GradientButton variant="ghost" size="sm">Dashboard</GradientButton>
            </Link>
          </div>
        </div>
      </header>

      <div className="container-wide py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Ticket List */}
          <div className="lg:w-1/3">
            {/* Status Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? STATUS_COLORS[s]
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">No {statusFilter.replace(/_/g, ' ')} tickets</p>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => { setSelectedTicket(ticket); setShowTranscript(false); }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedTicket?.id === ticket.id
                        ? 'border-orange-500 bg-orange-50/50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
                      <span className={`text-xs font-medium shrink-0 ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority === 'urgent' && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                        {ticket.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{ticket.name}</span>
                      <span className="text-gray-300">|</span>
                      <span>{SOURCE_LABELS[ticket.source] || ticket.source}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-gray-400">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {formatDate(ticket.createdAt)}
                      </span>
                      {ticket.responses.length > 0 && (
                        <span className="text-gray-400">
                          <MessageSquare className="w-3 h-3 inline mr-0.5" />
                          {ticket.responses.length}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Detail */}
          <div className="lg:w-2/3">
            {selectedTicket ? (
              <GlassCard className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold">{selectedTicket.subject}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedTicket.name} ({selectedTicket.email})
                      {selectedTicket.channel && selectedTicket.channel !== 'web' && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">{selectedTicket.channel}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(selectedTicket.id, 'in_progress')}
                          className="px-3 py-1.5 text-xs rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                          className="px-3 py-1.5 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          Resolve
                        </button>
                      </>
                    )}
                    {selectedTicket.status === 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(selectedTicket.id, 'closed')}
                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>

                {/* Original Message */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(selectedTicket.createdAt)}</p>
                </div>

                {/* Sensei Transcript (collapsible) */}
                {selectedTicket.transcript && selectedTicket.transcript.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowTranscript(!showTranscript)}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
                    >
                      {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Sensei Conversation ({selectedTicket.transcript.length} messages)
                    </button>
                    {showTranscript && (
                      <div className="border rounded-lg p-3 space-y-2 bg-white max-h-80 overflow-y-auto">
                        {selectedTicket.transcript.map((msg, i) => (
                          <div key={i} className={`flex gap-2 text-sm ${msg.role === 'user' ? '' : 'ml-4'}`}>
                            <div className="shrink-0 mt-0.5">
                              {msg.role === 'user' ? (
                                <User className="w-4 h-4 text-gray-400" />
                              ) : (
                                <Bot className="w-4 h-4 text-orange-400" />
                              )}
                            </div>
                            <p className="text-gray-600">{msg.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Response Thread */}
                {selectedTicket.responses.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <h3 className="text-sm font-medium text-gray-500">Responses</h3>
                    {selectedTicket.responses.map(resp => (
                      <div
                        key={resp.id}
                        className={`rounded-lg p-3 text-sm ${
                          resp.internal
                            ? 'bg-yellow-50 border border-yellow-200'
                            : 'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs">
                            {resp.authorName}
                            {resp.internal && <span className="ml-2 text-yellow-600">(internal note)</span>}
                          </span>
                          <div className="flex items-center gap-2">
                            {!resp.internal && (
                              <button
                                onClick={() => handleSaveToKnowledge(selectedTicket, resp.message)}
                                className="text-xs text-gray-400 hover:text-orange-600 flex items-center gap-1"
                                title="Save to Sensei knowledge base"
                              >
                                <BookOpen className="w-3 h-3" />
                                Save to KB
                              </button>
                            )}
                            <span className="text-xs text-gray-400">{formatDate(resp.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{resp.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                {selectedTicket.status !== 'closed' && (
                  <div className="border-t pt-4">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-y"
                      placeholder="Type your response..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <label className="flex items-center gap-2 text-sm text-gray-500">
                        <input
                          type="checkbox"
                          checked={replyInternal}
                          onChange={(e) => setReplyInternal(e.target.checked)}
                          className="rounded"
                        />
                        Internal note (not visible to user)
                      </label>
                      <GradientButton
                        size="sm"
                        onClick={handleReply}
                        disabled={sending || !replyMessage.trim()}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        {sending ? 'Sending...' : replyInternal ? 'Add Note' : 'Send Reply'}
                      </GradientButton>
                    </div>
                  </div>
                )}
              </GlassCard>
            ) : (
              <GlassCard className="p-12 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select a ticket to view details</p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
