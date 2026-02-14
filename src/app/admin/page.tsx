'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { Logo } from '@/components/ui/logo';
import { devConsole } from '@/lib/console';

type TabType = 'stripe' | 'pricing' | 'credit-packages' | 'promo-codes' | 'features' | 'admins' | 'users' | 'refunds' | 'audit';

const tabs: { id: TabType; label: string; icon: React.ReactElement }[] = [
  {
    id: 'stripe',
    label: 'Stripe',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'credit-packages',
    label: 'Credit Packs',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    id: 'promo-codes',
    label: 'Promo Codes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: 'features',
    label: 'Features',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    id: 'admins',
    label: 'Admins',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'users',
    label: 'Users',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'refunds',
    label: 'Refunds',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
  },
  {
    id: 'audit',
    label: 'Audit',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('stripe');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/auth/check-admin', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isAdmin) {
            setIsAdmin(true);
          } else {
            router.replace('/dashboard');
          }
        } else {
          router.replace('/dashboard');
        }
      } catch {
        router.replace('/dashboard');
      }
    }
    checkAdmin();
  }, [user, router]);

  if (isAdmin !== true) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="container-wide flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Logo href="/" showText={false} />
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="font-semibold">Platform Admin</h1>
              <p className="text-xs text-gray-500">Manage your platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500/10 to-orange-500/10 text-red-500 border border-red-500/20">
              Superadmin
            </span>
            <Link href="/">
              <GradientButton variant="ghost" size="sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to App
              </GradientButton>
            </Link>
          </div>
        </div>
      </header>

      <div className="container-wide py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <GlassCard className="p-2 sticky top-24">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary text-white shadow-lg shadow-primary/25'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </GlassCard>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="animate-fade-up">
              {activeTab === 'stripe' && <StripeConfigPanel />}
              {activeTab === 'pricing' && <PricingPanel />}
              {activeTab === 'credit-packages' && <CreditPackagesPanel />}
              {activeTab === 'promo-codes' && <PromoCodesPanel />}
              {activeTab === 'features' && <FeaturesPanel />}
              {activeTab === 'admins' && <AdminsPanel />}
              {activeTab === 'users' && <UsersPanel />}
              {activeTab === 'refunds' && <RefundsPanel />}
              {activeTab === 'audit' && <AuditPanel />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ==================== STRIPE CONFIG PANEL ====================

function StripeConfigPanel() {
  const [config, setConfig] = useState<{
    publishableKey: string;
    isConfigured: boolean;
    mode?: 'test' | 'live';
    lastSyncAt?: string;
  } | null>(null);
  const [connection, setConnection] = useState<{ success: boolean; mode?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [secretKey, setSecretKey] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/stripe');
      const data = await res.json();
      setConfig(data.config);
      setConnection(data.connection);
      setPublishableKey(data.config?.publishableKey || '');
    } catch (error) {
      devConsole.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: secretKey || undefined,
          publishableKey: publishableKey || undefined,
          webhookSecret: webhookSecret || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSecretKey('');
        setWebhookSecret('');
        fetchConfig();
      }
    } catch (error) {
      devConsole.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (direction: 'toStripe' | 'fromStripe') => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/stripe/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      alert(data.success ? `Synced: ${data.synced.join(', ')}` : `Errors: ${JSON.stringify(data.errors)}`);
      fetchConfig();
    } catch (error) {
      devConsole.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stripe Configuration</h2>
          <p className="text-gray-500">Manage your payment integration</p>
        </div>
        <StatusBadge connected={connection?.success ?? false} mode={connection?.mode} />
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          API Keys
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Secret Key</label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder={config?.isConfigured ? '••••••••••••••••' : 'sk_test_... or sk_live_...'}
              className="input-modern font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Publishable Key</label>
            <input
              type="text"
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
              placeholder="pk_test_... or pk_live_..."
              className="input-modern font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Webhook Secret</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={config?.isConfigured ? '••••••••••••••••' : 'whsec_...'}
              className="input-modern font-mono text-sm"
            />
          </div>
          <GradientButton onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </GradientButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync with Stripe
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Sync pricing tiers with Stripe products and prices.
          {config?.lastSyncAt && (
            <span className="ml-2">Last sync: {new Date(config.lastSyncAt).toLocaleString()}</span>
          )}
        </p>
        <div className="flex gap-3">
          <GradientButton
            variant="outline"
            onClick={() => handleSync('toStripe')}
            disabled={syncing || !connection?.success}
          >
            Push to Stripe
          </GradientButton>
          <GradientButton
            variant="outline"
            onClick={() => handleSync('fromStripe')}
            disabled={syncing || !connection?.success}
          >
            Import from Stripe
          </GradientButton>
        </div>
      </GlassCard>
    </div>
  );
}

function StatusBadge({ connected, mode }: { connected: boolean; mode?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
        connected
          ? 'bg-green-900 text-green-200 border border-green-700'
          : 'bg-red-900 text-red-200 border border-red-700'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
      {connected ? `Connected (${mode})` : 'Not Connected'}
    </div>
  );
}

// ==================== PRICING PANEL ====================

function PricingPanel() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showPromoSection, setShowPromoSection] = useState(false);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: '',
    percentOff: 0,
    amountOff: 0,
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationInMonths: 3,
    maxRedemptions: 0,
    expiresAt: '',
  });

  useEffect(() => {
    fetchTiers();
  }, []);

  useEffect(() => {
    if (showPromoSection && promoCodes.length === 0) {
      fetchPromoCodes();
    }
  }, [showPromoSection]);

  const fetchTiers = async () => {
    try {
      const res = await fetch('/api/admin/pricing');
      const data = await res.json();
      setTiers(data.tiers || []);
    } catch (error) {
      devConsole.error('Failed to fetch tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromoCodes = async () => {
    setPromoLoading(true);
    try {
      const res = await fetch('/api/admin/promo-codes');
      const data = await res.json();
      setPromoCodes(data.promoCodes || []);
    } catch (error) {
      devConsole.error('Failed to fetch promo codes:', error);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code || (newPromo.percentOff === 0 && newPromo.amountOff === 0)) {
      alert('Please enter a code and either a percent or amount off');
      return;
    }
    setCreatingPromo(true);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPromo,
          maxRedemptions: newPromo.maxRedemptions || null,
          expiresAt: newPromo.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setNewPromo({
          code: '',
          percentOff: 0,
          amountOff: 0,
          duration: 'once',
          durationInMonths: 3,
          maxRedemptions: 0,
          expiresAt: '',
        });
        fetchPromoCodes();
      }
    } catch (error) {
      devConsole.error('Failed to create promo code:', error);
      alert('Failed to create promo code');
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleDeactivatePromo = async (promoCodeId: string) => {
    if (!confirm('Deactivate this promo code?')) return;
    try {
      await fetch(`/api/admin/promo-codes/${promoCodeId}`, { method: 'DELETE' });
      fetchPromoCodes();
    } catch (error) {
      devConsole.error('Failed to deactivate promo code:', error);
    }
  };

  const handleUpdateTier = async (tierName: string, updates: any) => {
    try {
      await fetch(`/api/admin/pricing/${tierName}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      fetchTiers();
      setEditingTier(null);
    } catch (error) {
      devConsole.error('Failed to update tier:', error);
    }
  };

  const handleSyncToStripe = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/stripe/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'toStripe' }),
      });
      const data = await res.json();
      alert(data.success ? `Synced to Stripe: ${data.synced.join(', ')}` : `Errors: ${JSON.stringify(data.errors)}`);
      fetchTiers();
    } catch (error) {
      devConsole.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num === -1) return '∞';
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pricing Tiers</h2>
          <p className="text-gray-500">Manage subscription plans and limits</p>
        </div>
        <div className="flex gap-3">
          <GradientButton variant="outline" onClick={() => setShowPromoSection(!showPromoSection)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {showPromoSection ? 'Hide Promo Codes' : 'Promo Codes'}
          </GradientButton>
          <GradientButton onClick={handleSyncToStripe} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync All to Stripe'}
          </GradientButton>
        </div>
      </div>

      {/* Promo Codes Section */}
      {showPromoSection && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Create Promo Code
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Code</label>
              <input
                value={newPromo.code}
                onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SAVE20"
                className="input-modern font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Percent Off</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newPromo.percentOff || ''}
                onChange={(e) => setNewPromo({ ...newPromo, percentOff: parseInt(e.target.value) || 0, amountOff: 0 })}
                placeholder="e.g., 20"
                className="input-modern"
                disabled={newPromo.amountOff > 0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Amount Off ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newPromo.amountOff || ''}
                onChange={(e) => setNewPromo({ ...newPromo, amountOff: parseFloat(e.target.value) || 0, percentOff: 0 })}
                placeholder="e.g., 10"
                className="input-modern"
                disabled={newPromo.percentOff > 0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <select
                value={newPromo.duration}
                onChange={(e) => setNewPromo({ ...newPromo, duration: e.target.value as any })}
                className="input-modern"
              >
                <option value="once">Once (first payment)</option>
                <option value="repeating">Repeating</option>
                <option value="forever">Forever</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {newPromo.duration === 'repeating' && (
              <div>
                <label className="block text-sm font-medium mb-2">Months</label>
                <input
                  type="number"
                  min="1"
                  value={newPromo.durationInMonths}
                  onChange={(e) => setNewPromo({ ...newPromo, durationInMonths: parseInt(e.target.value) || 1 })}
                  className="input-modern"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">Max Redemptions</label>
              <input
                type="number"
                min="0"
                value={newPromo.maxRedemptions || ''}
                onChange={(e) => setNewPromo({ ...newPromo, maxRedemptions: parseInt(e.target.value) || 0 })}
                placeholder="Unlimited"
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Expires At</label>
              <input
                type="date"
                value={newPromo.expiresAt}
                onChange={(e) => setNewPromo({ ...newPromo, expiresAt: e.target.value })}
                className="input-modern"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <GradientButton onClick={handleCreatePromo} disabled={creatingPromo}>
              {creatingPromo ? 'Creating...' : 'Create Promo Code'}
            </GradientButton>
          </div>

          {/* Active Promo Codes List */}
          {promoLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : promoCodes.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-semibold mb-3 text-gray-500">Active Promo Codes ({promoCodes.filter(p => p.active).length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {promoCodes.filter(p => p.active).map((promo) => (
                  <div
                    key={promo.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold">{promo.code}</span>
                      <span className="text-sm text-gray-500">
                        {promo.percentOff > 0 ? `${promo.percentOff}% off` : `$${promo.amountOff} off`}
                      </span>
                      <span className="text-xs text-gray-500">
                        {promo.duration === 'once' && 'First payment'}
                        {promo.duration === 'repeating' && `${promo.durationInMonths}mo`}
                        {promo.duration === 'forever' && 'Forever'}
                      </span>
                      {promo.timesRedeemed > 0 && (
                        <span className="text-xs text-gray-500">
                          {promo.timesRedeemed} used
                        </span>
                      )}
                    </div>
                    <GradientButton variant="ghost" size="sm" onClick={() => handleDeactivatePromo(promo.id)}>
                      Deactivate
                    </GradientButton>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      <div className="grid gap-6">
        {tiers.map((tier) => (
          <GlassCard key={tier.tierName} hover className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold">{tier.displayName}</h3>
                  {tier.highlighted && (
                    <span className="px-2 py-0.5 rounded text-xs bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/20">
                      Most Popular
                    </span>
                  )}
                  {!tier.isActive && (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Inactive</span>
                  )}
                  {tier.stripeProductId && (
                    <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-600 border border-green-500/20">
                      Stripe Linked
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{tier.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  ${tier.priceMonthly}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </div>
                <div className="text-sm text-gray-500">${tier.priceYearly}/year</div>
              </div>
            </div>

            {editingTier === tier.tierName ? (
              <TierEditor
                tier={tier}
                onSave={(updates: any) => handleUpdateTier(tier.tierName, updates)}
                onCancel={() => setEditingTier(null)}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                  <StatBox label="Credits/Month" value={formatNumber(tier.limits?.credits || 0)} />
                  <StatBox label="Max Lines" value={formatNumber(tier.limits?.maxRepoSize || 0)} />
                  <StatBox label="Projects" value={formatNumber(tier.limits?.projects || 0)} />
                  <StatBox label="Team Members" value={tier.limits?.teamMembers || 1} />
                  <StatBox label="History" value={`${tier.limits?.historyDays || 7}d`} />
                  <StatBox label="Rollover" value={formatNumber(tier.limits?.creditsRollover || 0)} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Overage Rate:</span>
                    <span className="font-medium">
                      {tier.limits?.overageRate != null ? `$${tier.limits.overageRate}/credit` : 'Not allowed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">API Rate:</span>
                    <span className="font-medium">{tier.limits?.apiRequestsPerMinute || 0} req/min</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-sm text-gray-500 mr-2">Platforms:</span>
                  {tier.limits?.platforms?.web && <FeaturePill>Web</FeaturePill>}
                  {tier.limits?.platforms?.mobile && <FeaturePill>Mobile</FeaturePill>}
                  {tier.limits?.platforms?.desktop && <FeaturePill>Desktop</FeaturePill>}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="text-sm text-gray-500 mr-2">Features:</span>
                  {tier.features?.aiSummary && <FeaturePill variant="secondary">AI Summary</FeaturePill>}
                  {tier.features?.aiExplanations && <FeaturePill variant="secondary">AI Explanations</FeaturePill>}
                  {tier.features?.aiFixSuggestions && <FeaturePill variant="secondary">AI Fix Suggestions</FeaturePill>}
                  {tier.features?.githubIntegration && <FeaturePill variant="secondary">GitHub</FeaturePill>}
                  {tier.features?.slackIntegration && <FeaturePill variant="secondary">Slack</FeaturePill>}
                  {tier.features?.webhooks && <FeaturePill variant="secondary">Webhooks</FeaturePill>}
                  {tier.features?.apiAccess && <FeaturePill variant="secondary">API Access</FeaturePill>}
                  {tier.features?.prioritySupport && <FeaturePill variant="secondary">Priority Support</FeaturePill>}
                </div>

                <GradientButton variant="outline" size="sm" onClick={() => setEditingTier(tier.tierName)}>
                  Edit Tier
                </GradientButton>
              </>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-xl bg-gray-100">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function FeaturePill({ children, variant = 'primary' }: { children: React.ReactNode; variant?: 'primary' | 'secondary' }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        variant === 'primary'
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      {children}
    </span>
  );
}

function TierEditor({ tier, onSave, onCancel }: { tier: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const defaultLimits = {
    credits: 10,
    creditsRollover: 0,
    overageRate: null as number | null,
    maxRepoSize: 10000,
    projects: 1,
    teamMembers: 1,
    historyDays: 7,
    apiRequestsPerMinute: 5,
    platforms: { web: true, mobile: false, desktop: false },
  };

  const defaultFeatures = {
    aiSummary: false,
    aiExplanations: false,
    aiFixSuggestions: false,
    aiPrioritization: false,
    githubIntegration: false,
    slackIntegration: false,
    webhooks: false,
    apiAccess: false,
    prioritySupport: false,
  };

  const [form, setForm] = useState({
    displayName: tier.displayName || '',
    description: tier.description || '',
    priceMonthly: tier.priceMonthly || 0,
    priceYearly: tier.priceYearly || 0,
    isActive: tier.isActive ?? true,
    highlighted: tier.highlighted ?? false,
    limits: { ...defaultLimits, ...tier.limits },
    features: { ...defaultFeatures, ...tier.features },
  });

  const [allowOverage, setAllowOverage] = useState(tier.limits?.overageRate != null);

  const updateLimits = (key: string, value: any) => {
    setForm({ ...form, limits: { ...form.limits, [key]: value } });
  };

  const updateFeatures = (key: string, value: boolean) => {
    setForm({ ...form, features: { ...form.features, [key]: value } });
  };

  const updatePlatforms = (key: string, value: boolean) => {
    setForm({
      ...form,
      limits: {
        ...form.limits,
        platforms: { ...form.limits.platforms, [key]: value },
      },
    });
  };

  const featureLabels: Record<string, string> = {
    aiSummary: 'AI Scan Summaries',
    aiExplanations: 'AI Explanations',
    aiFixSuggestions: 'AI Fix Suggestions',
    aiPrioritization: 'AI Prioritization',
    githubIntegration: 'GitHub Integration',
    slackIntegration: 'Slack Integration',
    webhooks: 'Webhooks',
    apiAccess: 'API Access',
    prioritySupport: 'Priority Support',
  };

  return (
    <div className="space-y-6 pt-4 border-t border-border">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="input-modern"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-modern"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Monthly Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.priceMonthly}
            onChange={(e) => setForm({ ...form, priceMonthly: parseFloat(e.target.value) || 0 })}
            className="input-modern"
            disabled={tier.tierName === 'free'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Yearly Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.priceYearly}
            onChange={(e) => setForm({ ...form, priceYearly: parseFloat(e.target.value) || 0 })}
            className="input-modern"
            disabled={tier.tierName === 'free'}
          />
        </div>
      </div>

      {/* Credits & Usage */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-primary">Credits & Usage</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Credits/Month</label>
            <input
              type="number"
              value={form.limits.credits}
              onChange={(e) => updateLimits('credits', parseInt(e.target.value) || 0)}
              className="input-modern"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Credit Rollover</label>
            <input
              type="number"
              value={form.limits.creditsRollover}
              onChange={(e) => updateLimits('creditsRollover', parseInt(e.target.value) || 0)}
              className="input-modern"
              placeholder="0 = no rollover"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Allow Overage</label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allowOverage}
                onChange={(e) => {
                  setAllowOverage(e.target.checked);
                  if (!e.target.checked) {
                    updateLimits('overageRate', null);
                  } else {
                    updateLimits('overageRate', 0.25);
                  }
                }}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              {allowOverage && (
                <input
                  type="number"
                  step="0.01"
                  value={form.limits.overageRate || 0}
                  onChange={(e) => updateLimits('overageRate', parseFloat(e.target.value) || 0)}
                  className="input-modern w-24"
                  placeholder="$/credit"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">API Rate Limit</label>
            <input
              type="number"
              value={form.limits.apiRequestsPerMinute}
              onChange={(e) => updateLimits('apiRequestsPerMinute', parseInt(e.target.value) || 0)}
              className="input-modern"
              placeholder="req/min"
            />
          </div>
        </div>
      </div>

      {/* Resource Limits */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-primary">Resource Limits</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Max Lines of Code</label>
            <input
              type="number"
              value={form.limits.maxRepoSize}
              onChange={(e) => updateLimits('maxRepoSize', parseInt(e.target.value) || 0)}
              className="input-modern"
              placeholder="-1 for unlimited"
            />
            <p className="text-xs text-gray-500 mt-1">
              {form.limits.maxRepoSize >= 1000 ? `${(form.limits.maxRepoSize / 1000).toFixed(0)}K lines` : `${form.limits.maxRepoSize} lines`}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Projects</label>
            <input
              type="number"
              value={form.limits.projects}
              onChange={(e) => updateLimits('projects', parseInt(e.target.value) || 0)}
              className="input-modern"
              placeholder="-1 for unlimited"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Team Members</label>
            <input
              type="number"
              value={form.limits.teamMembers}
              onChange={(e) => updateLimits('teamMembers', parseInt(e.target.value) || 0)}
              className="input-modern"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">History (days)</label>
            <input
              type="number"
              value={form.limits.historyDays}
              onChange={(e) => updateLimits('historyDays', parseInt(e.target.value) || 0)}
              className="input-modern"
            />
          </div>
        </div>
      </div>

      {/* Platforms */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-primary">Platforms</h4>
        <div className="flex gap-6">
          {['web', 'mobile', 'desktop'].map((platform) => (
            <label key={platform} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.limits.platforms?.[platform] ?? false}
                onChange={(e) => updatePlatforms(platform, e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <h4 className="text-sm font-semibold mb-3 text-primary">Features</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.keys(form.features).map((feature) => (
            <label key={feature} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.features[feature] ?? false}
                onChange={(e) => updateFeatures(feature, e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{featureLabels[feature] || feature}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.highlighted}
            onChange={(e) => setForm({ ...form, highlighted: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium">Highlighted (Most Popular)</span>
        </label>
      </div>

      <div className="flex gap-3">
        <GradientButton onClick={() => onSave(form)}>Save Changes</GradientButton>
        <GradientButton variant="ghost" onClick={onCancel}>Cancel</GradientButton>
      </div>
    </div>
  );
}

// ==================== CREDIT PACKAGES PANEL ====================

function CreditPackagesPanel() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    credits: 50,
    price: 10,
    isFeatured: false,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/admin/credit-packages');
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (error) {
      devConsole.error('Failed to fetch packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPackage.name) return;
    try {
      await fetch('/api/admin/credit-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPackage),
      });
      setNewPackage({ name: '', description: '', credits: 50, price: 10, isFeatured: false });
      setShowCreate(false);
      fetchPackages();
    } catch (error) {
      devConsole.error('Failed to create package:', error);
    }
  };

  const handleUpdate = async (packageId: string, updates: any) => {
    try {
      await fetch(`/api/admin/credit-packages/${packageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      fetchPackages();
      setEditingPackage(null);
    } catch (error) {
      devConsole.error('Failed to update package:', error);
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm('Delete this credit package?')) return;
    try {
      await fetch(`/api/admin/credit-packages/${packageId}`, { method: 'DELETE' });
      fetchPackages();
    } catch (error) {
      devConsole.error('Failed to delete package:', error);
    }
  };

  const formatPrice = (price: number, credits: number) => {
    const perCredit = (price / credits).toFixed(2);
    return `$${price} ($${perCredit}/credit)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Credit Packages</h2>
          <p className="text-gray-500">Manage credit top-up packages for users</p>
        </div>
        <GradientButton onClick={() => setShowCreate(true)}>
          + New Package
        </GradientButton>
      </div>

      {showCreate && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Package</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                value={newPackage.name}
                onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                placeholder="e.g., Starter Pack"
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Credits</label>
              <input
                type="number"
                value={newPackage.credits}
                onChange={(e) => setNewPackage({ ...newPackage, credits: parseInt(e.target.value) || 0 })}
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={newPackage.price}
                onChange={(e) => setNewPackage({ ...newPackage, price: parseFloat(e.target.value) || 0 })}
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <input
                value={newPackage.description}
                onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                placeholder="Optional description"
                className="input-modern"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newPackage.isFeatured}
                onChange={(e) => setNewPackage({ ...newPackage, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">Featured (Best Value)</span>
            </label>
          </div>
          <div className="flex gap-3">
            <GradientButton onClick={handleCreate}>Create Package</GradientButton>
            <GradientButton variant="ghost" onClick={() => setShowCreate(false)}>Cancel</GradientButton>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <GlassCard key={pkg.id} hover className={`p-6 ${pkg.isFeatured ? 'ring-2 ring-primary' : ''}`}>
            {pkg.isFeatured && (
              <div className="text-xs font-semibold text-primary mb-2">BEST VALUE</div>
            )}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{pkg.name}</h3>
                <p className="text-sm text-gray-500">{pkg.description}</p>
              </div>
              {!pkg.isActive && (
                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Inactive</span>
              )}
            </div>

            {editingPackage === pkg.id ? (
              <CreditPackageEditor
                pkg={pkg}
                onSave={(updates) => handleUpdate(pkg.id, updates)}
                onCancel={() => setEditingPackage(null)}
              />
            ) : (
              <>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-primary">{pkg.credits}</div>
                  <div className="text-sm text-gray-500">credits</div>
                </div>
                <div className="mb-4">
                  <div className="text-xl font-semibold">${pkg.price}</div>
                  <div className="text-xs text-gray-500">
                    ${(pkg.price / pkg.credits).toFixed(3)} per credit
                  </div>
                </div>
                {pkg.stripeProductId && (
                  <div className="mb-4">
                    <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-600 border border-green-500/20">
                      Stripe Linked
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <GradientButton variant="outline" size="sm" onClick={() => setEditingPackage(pkg.id)}>
                    Edit
                  </GradientButton>
                  <GradientButton variant="ghost" size="sm" onClick={() => handleDelete(pkg.id)}>
                    Delete
                  </GradientButton>
                </div>
              </>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function CreditPackageEditor({ pkg, onSave, onCancel }: { pkg: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: pkg.name || '',
    description: pkg.description || '',
    credits: pkg.credits || 50,
    price: pkg.price || 10,
    isActive: pkg.isActive ?? true,
    isFeatured: pkg.isFeatured ?? false,
    sortOrder: pkg.sortOrder || 0,
  });

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div>
        <label className="block text-sm font-medium mb-2">Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input-modern"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-modern"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Credits</label>
          <input
            type="number"
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) || 0 })}
            className="input-modern"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            className="input-modern"
          />
        </div>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm">Active</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm">Featured</span>
        </label>
      </div>
      <div className="flex gap-3">
        <GradientButton onClick={() => onSave(form)}>Save</GradientButton>
        <GradientButton variant="ghost" onClick={onCancel}>Cancel</GradientButton>
      </div>
    </div>
  );
}

// ==================== PROMO CODES PANEL ====================

function PromoCodesPanel() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState({
    code: '',
    percentOff: 0,
    amountOff: 0,
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationInMonths: 3,
    maxRedemptions: 0,
    expiresAt: '',
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const res = await fetch('/api/admin/promo-codes');
      const data = await res.json();
      setPromoCodes(data.promoCodes || []);
    } catch (error) {
      devConsole.error('Failed to fetch promo codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCode.code || (newCode.percentOff === 0 && newCode.amountOff === 0)) {
      alert('Please enter a code and either a percent or amount off');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCode,
          maxRedemptions: newCode.maxRedemptions || null,
          expiresAt: newCode.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setNewCode({
          code: '',
          percentOff: 0,
          amountOff: 0,
          duration: 'once',
          durationInMonths: 3,
          maxRedemptions: 0,
          expiresAt: '',
        });
        fetchPromoCodes();
      }
    } catch (error) {
      devConsole.error('Failed to create promo code:', error);
      alert('Failed to create promo code');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (promoCodeId: string) => {
    if (!confirm('Deactivate this promo code? Users will no longer be able to use it.')) return;
    try {
      await fetch(`/api/admin/promo-codes/${promoCodeId}`, {
        method: 'DELETE',
      });
      fetchPromoCodes();
    } catch (error) {
      devConsole.error('Failed to deactivate promo code:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Promo Codes</h2>
        <p className="text-gray-500">Create and manage discount codes for subscriptions</p>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Promo Code</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Code</label>
            <input
              value={newCode.code}
              onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
              placeholder="e.g., SAVE20"
              className="input-modern font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Percent Off</label>
            <input
              type="number"
              min="0"
              max="100"
              value={newCode.percentOff || ''}
              onChange={(e) => setNewCode({ ...newCode, percentOff: parseInt(e.target.value) || 0, amountOff: 0 })}
              placeholder="e.g., 20"
              className="input-modern"
              disabled={newCode.amountOff > 0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Amount Off ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newCode.amountOff || ''}
              onChange={(e) => setNewCode({ ...newCode, amountOff: parseFloat(e.target.value) || 0, percentOff: 0 })}
              placeholder="e.g., 10"
              className="input-modern"
              disabled={newCode.percentOff > 0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Duration</label>
            <select
              value={newCode.duration}
              onChange={(e) => setNewCode({ ...newCode, duration: e.target.value as any })}
              className="input-modern"
            >
              <option value="once">Once (first payment only)</option>
              <option value="repeating">Repeating (multiple months)</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          {newCode.duration === 'repeating' && (
            <div>
              <label className="block text-sm font-medium mb-2">Duration (months)</label>
              <input
                type="number"
                min="1"
                value={newCode.durationInMonths}
                onChange={(e) => setNewCode({ ...newCode, durationInMonths: parseInt(e.target.value) || 1 })}
                className="input-modern"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Max Redemptions</label>
            <input
              type="number"
              min="0"
              value={newCode.maxRedemptions || ''}
              onChange={(e) => setNewCode({ ...newCode, maxRedemptions: parseInt(e.target.value) || 0 })}
              placeholder="Unlimited"
              className="input-modern"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Expires At</label>
            <input
              type="date"
              value={newCode.expiresAt}
              onChange={(e) => setNewCode({ ...newCode, expiresAt: e.target.value })}
              className="input-modern"
            />
          </div>
        </div>
        <GradientButton onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating...' : 'Create Promo Code'}
        </GradientButton>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Active Promo Codes</h3>
        {promoCodes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No promo codes yet. Create one above!</p>
        ) : (
          <div className="space-y-3">
            {promoCodes.map((promo) => (
              <div
                key={promo.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-lg">{promo.code}</span>
                    {promo.active ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-600 border border-green-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {promo.percentOff > 0 ? `${promo.percentOff}% off` : `$${promo.amountOff} off`}
                    <span className="mx-2">•</span>
                    {promo.duration === 'once' && 'First payment'}
                    {promo.duration === 'repeating' && `${promo.durationInMonths} months`}
                    {promo.duration === 'forever' && 'Forever'}
                    {promo.timesRedeemed > 0 && (
                      <>
                        <span className="mx-2">•</span>
                        {promo.timesRedeemed} redeemed
                        {promo.maxRedemptions && ` / ${promo.maxRedemptions} max`}
                      </>
                    )}
                    {promo.expiresAt && (
                      <>
                        <span className="mx-2">•</span>
                        Expires {new Date(promo.expiresAt).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                {promo.active && (
                  <GradientButton variant="ghost" size="sm" onClick={() => handleDeactivate(promo.id)}>
                    Deactivate
                  </GradientButton>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ==================== FEATURES PANEL ====================

function FeaturesPanel() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFlag, setNewFlag] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const res = await fetch('/api/admin/features');
      const data = await res.json();
      setFlags(data.flags || []);
    } catch (error) {
      devConsole.error('Failed to fetch flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (flagId: string, isEnabled: boolean) => {
    try {
      await fetch(`/api/admin/features/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled }),
      });
      fetchFlags();
    } catch (error) {
      devConsole.error('Failed to toggle flag:', error);
    }
  };

  const handleCreate = async () => {
    if (!newFlag.name) return;
    try {
      await fetch('/api/admin/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlag),
      });
      setNewFlag({ name: '', description: '' });
      fetchFlags();
    } catch (error) {
      devConsole.error('Failed to create flag:', error);
    }
  };

  const handleDelete = async (flagId: string) => {
    if (!confirm('Delete this feature flag?')) return;
    try {
      await fetch(`/api/admin/features/${flagId}`, { method: 'DELETE' });
      fetchFlags();
    } catch (error) {
      devConsole.error('Failed to delete flag:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Feature Flags</h2>
        <p className="text-gray-500">Control feature availability across the platform</p>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Create New Flag</h3>
        <div className="flex gap-4">
          <input
            placeholder="Flag name"
            value={newFlag.name}
            onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
            className="input-modern flex-1"
          />
          <input
            placeholder="Description"
            value={newFlag.description}
            onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
            className="input-modern flex-1"
          />
          <GradientButton onClick={handleCreate}>Create</GradientButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Active Flags</h3>
        {flags.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No feature flags configured</p>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div>
                  <div className="font-medium">{flag.name}</div>
                  <div className="text-sm text-gray-500">{flag.description}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(flag.id, !flag.isEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      flag.isEnabled ? 'bg-orange-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        flag.isEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                  <GradientButton variant="ghost" size="sm" onClick={() => handleDelete(flag.id)}>
                    Delete
                  </GradientButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ==================== ADMINS PANEL ====================

function AdminsPanel() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdmin, setNewAdmin] = useState({ userId: '', email: '', role: 'admin' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/admins');
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (error) {
      devConsole.error('Failed to fetch admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newAdmin.userId || !newAdmin.email) return;
    try {
      await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      setNewAdmin({ userId: '', email: '', role: 'admin' });
      fetchAdmins();
    } catch (error) {
      devConsole.error('Failed to add admin:', error);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Remove this admin?')) return;
    try {
      await fetch('/api/admin/admins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      fetchAdmins();
    } catch (error) {
      devConsole.error('Failed to remove admin:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Platform Admins</h2>
        <p className="text-gray-500">Manage who can access the admin dashboard</p>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Add Admin</h3>
        <div className="flex gap-4">
          <input
            placeholder="User ID"
            value={newAdmin.userId}
            onChange={(e) => setNewAdmin({ ...newAdmin, userId: e.target.value })}
            className="input-modern flex-1"
          />
          <input
            placeholder="Email"
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            className="input-modern flex-1"
          />
          <select
            value={newAdmin.role}
            onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
            className="input-modern w-40"
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
          <GradientButton onClick={handleAdd}>Add</GradientButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Current Admins</h3>
        <div className="space-y-3">
          {admins.map((admin) => (
            <div
              key={admin.userId}
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium">
                  {admin.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{admin.email}</div>
                  <div className="text-sm text-gray-500">ID: {admin.userId}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    admin.role === 'superadmin'
                      ? 'bg-red-900 text-red-200 border border-red-700'
                      : 'bg-primary/20 text-primary-foreground border border-primary/40'
                  }`}
                >
                  {admin.role}
                </span>
                <GradientButton variant="ghost" size="sm" onClick={() => handleRemove(admin.userId)}>
                  Remove
                </GradientButton>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ==================== USERS PANEL ====================

function UsersPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustCredits, setAdjustCredits] = useState({ show: false, userId: '', amount: 0, note: '' });
  const [changeTier, setChangeTier] = useState({ show: false, userId: '', tier: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [tierFilter, offset]);

  const fetchUsers = async (searchQuery?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery || search) params.set('search', searchQuery || search);
      if (tierFilter) params.set('tier', tierFilter);
      params.set('offset', offset.toString());
      params.set('limit', '25');

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setHasMore(data.hasMore || false);
    } catch (error) {
      devConsole.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setOffset(0);
    fetchUsers(search);
  };

  const viewUserDetail = async (userId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      setSelectedUser(data);
    } catch (error) {
      devConsole.error('Failed to fetch user details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAdjustCredits = async () => {
    if (!adjustCredits.userId || adjustCredits.amount === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${adjustCredits.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_credits',
          amount: adjustCredits.amount,
          note: adjustCredits.note,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdjustCredits({ show: false, userId: '', amount: 0, note: '' });
        fetchUsers();
        if (selectedUser?.user?.userId === adjustCredits.userId) {
          viewUserDetail(adjustCredits.userId);
        }
      } else {
        alert(data.error || 'Failed to adjust credits');
      }
    } catch (error) {
      devConsole.error('Failed to adjust credits:', error);
      alert('Failed to adjust credits');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeTier = async () => {
    if (!changeTier.userId || !changeTier.tier) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${changeTier.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_tier', tier: changeTier.tier }),
      });
      const data = await res.json();
      if (data.success) {
        setChangeTier({ show: false, userId: '', tier: '' });
        fetchUsers();
        if (selectedUser?.user?.userId === changeTier.userId) {
          viewUserDetail(changeTier.userId);
        }
      } else {
        alert(data.error || 'Failed to change tier');
      }
    } catch (error) {
      devConsole.error('Failed to change tier:', error);
      alert('Failed to change tier');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDisable = async (userId: string, currentlyDisabled: boolean) => {
    const action = currentlyDisabled ? 'enable' : 'disable';
    if (!confirm(`${currentlyDisabled ? 'Enable' : 'Disable'} this user account?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (error) {
      devConsole.error('Failed to toggle user:', error);
    }
  };

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    business: 'bg-orange-100 text-orange-700',
    enterprise: 'bg-red-100 text-red-700',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    past_due: 'bg-yellow-100 text-yellow-700',
    canceled: 'bg-red-100 text-red-700',
    trialing: 'bg-blue-100 text-blue-700',
    none: 'bg-gray-100 text-gray-500',
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Manage Users</h2>
        <p className="text-gray-500">View and manage platform users, credits, and subscriptions</p>
      </div>

      {/* Search and Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by email..."
              className="input-modern flex-1"
            />
            <GradientButton onClick={handleSearch}>Search</GradientButton>
          </div>
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setOffset(0); }}
            className="input-modern w-40"
          >
            <option value="">All Tiers</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </GlassCard>

      {/* Adjust Credits Modal */}
      {adjustCredits.show && (
        <GlassCard className="p-6 ring-2 ring-primary">
          <h3 className="text-lg font-semibold mb-4">Adjust Credits</h3>
          <p className="text-sm text-gray-500 mb-4">User: {adjustCredits.userId}</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Amount (positive to add, negative to deduct)</label>
              <input
                type="number"
                value={adjustCredits.amount || ''}
                onChange={(e) => setAdjustCredits({ ...adjustCredits, amount: parseInt(e.target.value) || 0 })}
                className="input-modern"
                placeholder="e.g., 50 or -10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Note / Reason</label>
              <input
                value={adjustCredits.note}
                onChange={(e) => setAdjustCredits({ ...adjustCredits, note: e.target.value })}
                className="input-modern"
                placeholder="e.g., Compensation for issue"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <GradientButton onClick={handleAdjustCredits} disabled={actionLoading || adjustCredits.amount === 0}>
              {actionLoading ? 'Adjusting...' : 'Apply Adjustment'}
            </GradientButton>
            <GradientButton variant="ghost" onClick={() => setAdjustCredits({ show: false, userId: '', amount: 0, note: '' })}>
              Cancel
            </GradientButton>
          </div>
        </GlassCard>
      )}

      {/* Change Tier Modal */}
      {changeTier.show && (
        <GlassCard className="p-6 ring-2 ring-primary">
          <h3 className="text-lg font-semibold mb-4">Change Subscription Tier</h3>
          <p className="text-sm text-gray-500 mb-4">User: {changeTier.userId}</p>
          <p className="text-xs text-yellow-600 mb-4">
            Note: This changes the tier in Firestore only. For Stripe subscription changes, use the Stripe dashboard.
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">New Tier</label>
            <select
              value={changeTier.tier}
              onChange={(e) => setChangeTier({ ...changeTier, tier: e.target.value })}
              className="input-modern w-48"
            >
              <option value="">Select tier...</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div className="flex gap-3">
            <GradientButton onClick={handleChangeTier} disabled={actionLoading || !changeTier.tier}>
              {actionLoading ? 'Updating...' : 'Change Tier'}
            </GradientButton>
            <GradientButton variant="ghost" onClick={() => setChangeTier({ show: false, userId: '', tier: '' })}>
              Cancel
            </GradientButton>
          </div>
        </GlassCard>
      )}

      {/* User Detail Panel */}
      {selectedUser && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">User Details</h3>
            <GradientButton variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
              Close
            </GradientButton>
          </div>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="font-medium">{selectedUser.user?.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">User ID</div>
                  <div className="font-mono text-xs">{selectedUser.user?.userId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Tier</div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[selectedUser.subscription?.tier || 'free']}`}>
                    {selectedUser.subscription?.tier || 'free'}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Stripe Customer</div>
                  <div className="font-mono text-xs">{selectedUser.user?.stripeCustomerId || 'None'}</div>
                </div>
              </div>

              {/* Credit Balance */}
              {selectedUser.billing?.credits && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary">Credit Balance</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <StatBox label="Remaining" value={selectedUser.billing.credits.remaining ?? 0} />
                    <StatBox label="Included" value={selectedUser.billing.credits.included ?? 0} />
                    <StatBox label="Used" value={selectedUser.billing.credits.used ?? 0} />
                    <StatBox label="Purchased" value={selectedUser.billing.credits.purchased ?? 0} />
                    <StatBox label="Rollover" value={selectedUser.billing.credits.rollover ?? 0} />
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {selectedUser.recentTransactions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary">Recent Transactions</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedUser.recentTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 rounded bg-gray-50 text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </span>
                          <span className="text-gray-500">{tx.type}</span>
                          {tx.details?.note && <span className="text-xs text-gray-400">{tx.details.note}</span>}
                        </div>
                        <span className="text-xs text-gray-400">
                          {tx.timestamp?.toDate ? new Date(tx.timestamp.toDate()).toLocaleString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Scans */}
              {selectedUser.recentScans?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-primary">Recent Scans</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedUser.recentScans.map((scan: any) => (
                      <div key={scan.id} className="flex items-center justify-between p-2 rounded bg-gray-50 text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            scan.status === 'completed' ? 'bg-green-100 text-green-700' :
                            scan.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {scan.status}
                          </span>
                          <span className="text-gray-600">{scan.creditsUsed} credits</span>
                          <span className="text-gray-400">{scan.issuesFound} issues</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {scan.createdAt?.toDate ? new Date(scan.createdAt.toDate()).toLocaleString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Users List */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Users {!loading && <span className="text-sm font-normal text-gray-500">({users.length}{hasMore ? '+' : ''} results)</span>}
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No users found</p>
        ) : (
          <>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium flex-shrink-0">
                      {(user.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{user.email}</div>
                      <div className="text-xs text-gray-500 truncate">
                        ID: {user.userId}
                        {user.organizations?.length > 0 && (
                          <span className="ml-2">
                            Orgs: {user.organizations.map((o: any) => o.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Tier Badge */}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[user.tier] || tierColors.free}`}>
                      {user.tier}
                    </span>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[user.subscriptionStatus] || statusColors.none}`}>
                      {user.subscriptionStatus}
                    </span>

                    {/* Credits */}
                    {user.credits && (
                      <span className="text-xs text-gray-500" title="Credits remaining">
                        {user.credits.remaining ?? 0} cr
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex gap-1">
                      <GradientButton variant="ghost" size="sm" onClick={() => viewUserDetail(user.userId)}>
                        View
                      </GradientButton>
                      <GradientButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdjustCredits({ show: true, userId: user.userId, amount: 0, note: '' })}
                      >
                        Credits
                      </GradientButton>
                      <GradientButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setChangeTier({ show: true, userId: user.userId, tier: user.tier })}
                      >
                        Tier
                      </GradientButton>
                      <GradientButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleDisable(user.userId, user.disabled)}
                      >
                        {user.disabled ? 'Enable' : 'Disable'}
                      </GradientButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <GradientButton
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - 25))}
                disabled={offset === 0}
              >
                Previous
              </GradientButton>
              <span className="text-sm text-gray-500">
                Showing {offset + 1}-{offset + users.length}
              </span>
              <GradientButton
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + 25)}
                disabled={!hasMore}
              >
                Next
              </GradientButton>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}

// ==================== REFUNDS PANEL ====================

function RefundsPanel() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRefund, setNewRefund] = useState({
    paymentIntentId: '',
    chargeId: '',
    amount: 0,
    reason: 'requested_by_customer',
    userId: '',
    note: '',
  });

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const res = await fetch('/api/admin/refunds?limit=50');
      const data = await res.json();
      setRefunds(data.refunds || []);
      setDisputes(data.disputes || []);
    } catch (error) {
      devConsole.error('Failed to fetch refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRefund = async () => {
    if (!newRefund.paymentIntentId && !newRefund.chargeId) {
      alert('Please provide either a Payment Intent ID or Charge ID');
      return;
    }
    if (!confirm('Are you sure you want to issue this refund? This action cannot be undone.')) return;

    setCreating(true);
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRefund,
          amount: newRefund.amount || undefined, // 0 means full refund
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setNewRefund({
          paymentIntentId: '',
          chargeId: '',
          amount: 0,
          reason: 'requested_by_customer',
          userId: '',
          note: '',
        });
        fetchRefunds();
        alert(`Refund processed: $${(data.refund.amount / 100).toFixed(2)} ${data.refund.currency.toUpperCase()}`);
      } else {
        alert(data.error || 'Failed to process refund');
      }
    } catch (error) {
      devConsole.error('Failed to create refund:', error);
      alert('Failed to process refund');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateVal: any): string => {
    if (!dateVal) return '';
    if (dateVal.toDate) return new Date(dateVal.toDate()).toLocaleString();
    if (dateVal._seconds) return new Date(dateVal._seconds * 1000).toLocaleString();
    return new Date(dateVal).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Manage Refunds</h2>
          <p className="text-gray-500">View refund history and process new refunds</p>
        </div>
        <GradientButton onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New Refund'}
        </GradientButton>
      </div>

      {/* Create Refund Form */}
      {showCreate && (
        <GlassCard className="p-6 ring-2 ring-primary">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Issue Refund via Stripe
          </h3>
          <p className="text-sm text-yellow-600 mb-4">
            This will process a real refund through Stripe. Double-check the details before submitting.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Payment Intent ID</label>
              <input
                value={newRefund.paymentIntentId}
                onChange={(e) => setNewRefund({ ...newRefund, paymentIntentId: e.target.value, chargeId: '' })}
                placeholder="pi_..."
                className="input-modern font-mono text-sm"
                disabled={!!newRefund.chargeId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Or Charge ID</label>
              <input
                value={newRefund.chargeId}
                onChange={(e) => setNewRefund({ ...newRefund, chargeId: e.target.value, paymentIntentId: '' })}
                placeholder="ch_..."
                className="input-modern font-mono text-sm"
                disabled={!!newRefund.paymentIntentId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Amount ($, 0 for full refund)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newRefund.amount || ''}
                onChange={(e) => setNewRefund({ ...newRefund, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0 = full refund"
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <select
                value={newRefund.reason}
                onChange={(e) => setNewRefund({ ...newRefund, reason: e.target.value })}
                className="input-modern"
              >
                <option value="requested_by_customer">Requested by Customer</option>
                <option value="duplicate">Duplicate Charge</option>
                <option value="fraudulent">Fraudulent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">User ID (optional)</label>
              <input
                value={newRefund.userId}
                onChange={(e) => setNewRefund({ ...newRefund, userId: e.target.value })}
                placeholder="For credit adjustment"
                className="input-modern font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Internal Note</label>
              <input
                value={newRefund.note}
                onChange={(e) => setNewRefund({ ...newRefund, note: e.target.value })}
                placeholder="e.g., Customer reported issue #123"
                className="input-modern"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <GradientButton onClick={handleCreateRefund} disabled={creating}>
              {creating ? 'Processing...' : 'Process Refund'}
            </GradientButton>
            <GradientButton variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </GradientButton>
          </div>
        </GlassCard>
      )}

      {/* Disputes Section */}
      {disputes.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Active Disputes / Chargebacks
            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">{disputes.length}</span>
          </h3>
          <div className="space-y-3">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className="p-4 rounded-xl bg-red-50 border border-red-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{dispute.stripeDisputeId}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      dispute.status === 'won' ? 'bg-green-100 text-green-700' :
                      dispute.status === 'lost' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {dispute.status}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-red-600">
                    ${((dispute.amount || 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span>Reason: {dispute.reason}</span>
                  <span className="mx-2">|</span>
                  <span>Charge: {dispute.stripeChargeId}</span>
                  {dispute.evidenceDueBy && (
                    <>
                      <span className="mx-2">|</span>
                      <span className="text-red-600 font-medium">
                        Evidence due: {formatDate(dispute.evidenceDueBy)}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Created: {formatDate(dispute.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Refunds List */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Refund History
          <span className="text-sm font-normal text-gray-500 ml-2">({refunds.length} records)</span>
        </h3>

        {refunds.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No refunds recorded yet</p>
        ) : (
          <div className="space-y-3">
            {refunds.map((refund) => (
              <div
                key={refund.id}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-bold">
                      ${((refund.amountRefunded || refund.amount || 0) / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 uppercase">
                      {refund.currency || 'usd'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      refund.status === 'full' || refund.status === 'succeeded'
                        ? 'bg-green-100 text-green-700'
                        : refund.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {refund.status}
                    </span>
                    {refund.source === 'stripe' && (
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">Stripe</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {refund.reason && <span>Reason: {refund.reason}</span>}
                    {refund.stripeChargeId && (
                      <>
                        <span className="mx-2">|</span>
                        <span className="font-mono text-xs">Charge: {refund.stripeChargeId}</span>
                      </>
                    )}
                    {refund.userId && (
                      <>
                        <span className="mx-2">|</span>
                        <span className="font-mono text-xs">User: {refund.userId}</span>
                      </>
                    )}
                    {refund.issuedBy && (
                      <>
                        <span className="mx-2">|</span>
                        <span>By: {refund.issuedBy}</span>
                      </>
                    )}
                    {refund.note && (
                      <>
                        <span className="mx-2">|</span>
                        <span className="italic">{refund.note}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-400 flex-shrink-0 ml-4">
                  {formatDate(refund.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ==================== AUDIT PANEL ====================

function AuditPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit?limit=50');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (error) {
      devConsole.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Logs</h2>
        <p className="text-gray-500">Track all administrative actions</p>
      </div>

      <GlassCard className="p-6">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No audit logs yet</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-primary">{log.action}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{log.adminEmail}</span>
                  <span className="mx-2">•</span>
                  <span>{log.resource}</span>
                  {log.resourceId && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-mono text-xs">{log.resourceId}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
