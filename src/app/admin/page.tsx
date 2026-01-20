'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { Logo } from '@/components/ui/logo';

type TabType = 'stripe' | 'pricing' | 'features' | 'admins' | 'audit';

const tabs: { id: TabType; label: string; icon: JSX.Element }[] = [
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
  const [activeTab, setActiveTab] = useState<TabType>('stripe');

  return (
    <div className="min-h-screen mesh-gradient">
      {/* Header */}
      <header className="glass border-b border-white/10 sticky top-0 z-50">
        <div className="container-wide flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Logo href="/" showText={false} />
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="font-semibold">Platform Admin</h1>
              <p className="text-xs text-muted-foreground">Manage your platform</p>
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
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
              {activeTab === 'features' && <FeaturesPanel />}
              {activeTab === 'admins' && <AdminsPanel />}
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
      console.error('Failed to fetch config:', error);
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
      console.error('Failed to save:', error);
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
      console.error('Sync failed:', error);
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
          <p className="text-muted-foreground">Manage your payment integration</p>
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
        <p className="text-sm text-muted-foreground mb-6">
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

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const res = await fetch('/api/admin/pricing');
      const data = await res.json();
      setTiers(data.tiers || []);
    } catch (error) {
      console.error('Failed to fetch tiers:', error);
    } finally {
      setLoading(false);
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
      console.error('Failed to update tier:', error);
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
        <h2 className="text-2xl font-bold">Pricing Tiers</h2>
        <p className="text-muted-foreground">Manage subscription plans and limits</p>
      </div>

      <div className="grid gap-6">
        {tiers.map((tier) => (
          <GlassCard key={tier.tierName} hover className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold">{tier.displayName}</h3>
                  {!tier.isActive && (
                    <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Inactive</span>
                  )}
                  {tier.stripeProductId && (
                    <span className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary border border-primary/20">
                      Stripe Linked
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  ${tier.priceMonthly}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </div>
                <div className="text-sm text-muted-foreground">${tier.priceYearly}/year</div>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatBox label="Scans/Month" value={tier.limits?.scansPerMonth === -1 ? '∞' : tier.limits?.scansPerMonth} />
                  <StatBox label="Projects" value={tier.limits?.projects === -1 ? '∞' : tier.limits?.projects} />
                  <StatBox label="Team Members" value={tier.limits?.teamMembers} />
                  <StatBox label="History" value={`${tier.limits?.historyDays}d`} />
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {tier.limits?.platforms?.web && <FeaturePill>Web</FeaturePill>}
                  {tier.limits?.platforms?.mobile && <FeaturePill>Mobile</FeaturePill>}
                  {tier.limits?.platforms?.desktop && <FeaturePill>Desktop</FeaturePill>}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {tier.features?.aiReports && <FeaturePill variant="secondary">AI Reports</FeaturePill>}
                  {tier.features?.customRules && <FeaturePill variant="secondary">Custom Rules</FeaturePill>}
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
    <div className="p-4 rounded-xl bg-muted/50">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FeaturePill({ children, variant = 'primary' }: { children: React.ReactNode; variant?: 'primary' | 'secondary' }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        variant === 'primary'
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {children}
    </span>
  );
}

function TierEditor({ tier, onSave, onCancel }: { tier: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    displayName: tier.displayName,
    description: tier.description,
    priceMonthly: tier.priceMonthly,
    priceYearly: tier.priceYearly,
    isActive: tier.isActive,
    limits: { ...tier.limits },
    features: { ...tier.features },
  });

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

  return (
    <div className="space-y-6 pt-4 border-t border-border">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Monthly Price ($)</label>
          <input
            type="number"
            value={form.priceMonthly}
            onChange={(e) => setForm({ ...form, priceMonthly: parseFloat(e.target.value) })}
            className="input-modern"
            disabled={tier.tierName === 'starter'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Yearly Price ($)</label>
          <input
            type="number"
            value={form.priceYearly}
            onChange={(e) => setForm({ ...form, priceYearly: parseFloat(e.target.value) })}
            className="input-modern"
            disabled={tier.tierName === 'starter'}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Scans/Month</label>
          <input
            type="number"
            value={form.limits.scansPerMonth}
            onChange={(e) => updateLimits('scansPerMonth', parseInt(e.target.value))}
            className="input-modern"
            placeholder="-1 for unlimited"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Projects</label>
          <input
            type="number"
            value={form.limits.projects}
            onChange={(e) => updateLimits('projects', parseInt(e.target.value))}
            className="input-modern"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Team Members</label>
          <input
            type="number"
            value={form.limits.teamMembers}
            onChange={(e) => updateLimits('teamMembers', parseInt(e.target.value))}
            className="input-modern"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">History (days)</label>
          <input
            type="number"
            value={form.limits.historyDays}
            onChange={(e) => updateLimits('historyDays', parseInt(e.target.value))}
            className="input-modern"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">Platforms</label>
        <div className="flex gap-6">
          {['web', 'mobile', 'desktop'].map((platform) => (
            <label key={platform} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.limits.platforms?.[platform]}
                onChange={(e) => updatePlatforms(platform, e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-3">Features</label>
        <div className="grid grid-cols-3 gap-3">
          {Object.keys(form.features).map((feature) => (
            <label key={feature} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.features[feature]}
                onChange={(e) => updateFeatures(feature, e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
        />
        <span className="text-sm font-medium">Active</span>
      </label>

      <div className="flex gap-3">
        <GradientButton onClick={() => onSave(form)}>Save Changes</GradientButton>
        <GradientButton variant="ghost" onClick={onCancel}>Cancel</GradientButton>
      </div>
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
      console.error('Failed to fetch flags:', error);
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
      console.error('Failed to toggle flag:', error);
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
      console.error('Failed to create flag:', error);
    }
  };

  const handleDelete = async (flagId: string) => {
    if (!confirm('Delete this feature flag?')) return;
    try {
      await fetch(`/api/admin/features/${flagId}`, { method: 'DELETE' });
      fetchFlags();
    } catch (error) {
      console.error('Failed to delete flag:', error);
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
        <p className="text-muted-foreground">Control feature availability across the platform</p>
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
          <p className="text-muted-foreground text-center py-8">No feature flags configured</p>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <div className="font-medium">{flag.name}</div>
                  <div className="text-sm text-muted-foreground">{flag.description}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(flag.id, !flag.isEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      flag.isEnabled ? 'bg-primary' : 'bg-muted'
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
      console.error('Failed to fetch admins:', error);
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
      console.error('Failed to add admin:', error);
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
      console.error('Failed to remove admin:', error);
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
        <p className="text-muted-foreground">Manage who can access the admin dashboard</p>
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
              className="flex items-center justify-between p-4 rounded-xl bg-muted/30"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium">
                  {admin.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{admin.email}</div>
                  <div className="text-sm text-muted-foreground">ID: {admin.userId}</div>
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
      console.error('Failed to fetch logs:', error);
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
        <p className="text-muted-foreground">Track all administrative actions</p>
      </div>

      <GlassCard className="p-6">
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No audit logs yet</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-primary">{log.action}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
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
