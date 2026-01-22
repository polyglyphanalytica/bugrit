'use client';

/**
 * Subscription Context
 *
 * Provides subscription state and methods to all components.
 * Subscriptions belong to organizations - users access them via membership.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  TierName,
  TierLimits,
  TIERS,
  canAccessPlatform,
  canAccessFeature,
  getScansLimit,
  isUnlimited,
} from './tiers';
import { Organization, OrganizationMember, MemberRole, hasPermission, Permission } from '../organizations/types';

export interface UserSubscription {
  tier: TierName;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  scansUsedThisMonth: number;
  projectCount: number;
}

export interface OrganizationContext {
  id: string;
  name: string;
  role: MemberRole;
  memberCount: number;
  memberLimit: number;
}

interface SubscriptionContextValue {
  // Subscription
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;

  // Superadmin (bypasses all limits)
  isSuperadmin: boolean;

  // Organization
  organization: OrganizationContext | null;
  organizations: OrganizationContext[];
  switchOrganization: (orgId: string) => Promise<void>;

  // Access checks (superadmin always returns true)
  canUsePlatform: (platform: 'web' | 'mobile' | 'desktop') => boolean;
  canUseFeature: (feature: keyof TierLimits['features']) => boolean;
  canScan: () => boolean;
  canCreateProject: () => boolean;

  // Permission checks (organization role-based)
  hasPermission: (permission: Permission) => boolean;
  canInviteMembers: () => boolean;
  canManageBilling: () => boolean;

  // Limits info
  scansRemaining: () => number | 'unlimited';
  projectsRemaining: () => number | 'unlimited';
  membersRemaining: () => number | 'unlimited';

  // Actions
  refreshSubscription: () => Promise<void>;
  openCheckout: (tier: TierName, interval: 'month' | 'year') => Promise<void>;
  openBillingPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [organization, setOrganization] = useState<OrganizationContext | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationContext[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription and organizations on mount
  useEffect(() => {
    refreshSubscription();
  }, []);

  const refreshSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch subscription (which now includes organization info)
      const response = await fetch('/api/subscription');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data.subscription);
      setOrganization(data.organization);
      setOrganizations(data.organizations || []);
      setIsSuperadmin(data.isSuperadmin || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Default to free tier on error
      setSubscription({
        tier: 'free',
        status: 'none',
        scansUsedThisMonth: 0,
        projectCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch organization');
      }

      await refreshSubscription();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
    } finally {
      setLoading(false);
    }
  };

  const currentTier = subscription?.tier || 'free';
  const currentRole = organization?.role || 'member';

  // Superadmins bypass ALL limits
  const canUsePlatform = (platform: 'web' | 'mobile' | 'desktop') => {
    if (isSuperadmin) return true;
    return canAccessPlatform(currentTier, platform);
  };

  const canUseFeature = (feature: keyof TierLimits['features']) => {
    if (isSuperadmin) return true;
    return canAccessFeature(currentTier, feature);
  };

  const canScan = () => {
    if (isSuperadmin) return true;
    const limit = getScansLimit(currentTier);
    if (isUnlimited(limit)) return true;
    return (subscription?.scansUsedThisMonth || 0) < limit;
  };

  const canCreateProject = () => {
    if (isSuperadmin) return true;
    const limit = TIERS[currentTier].limits.projects;
    if (isUnlimited(limit)) return true;
    return (subscription?.projectCount || 0) < limit;
  };

  const checkPermission = (permission: Permission) => {
    if (isSuperadmin) return true;
    return hasPermission(currentRole, permission);
  };

  const canInviteMembers = () => {
    if (isSuperadmin) return true;
    // Must have permission AND not at member limit
    if (!checkPermission('canInviteMembers')) return false;
    const memberLimit = TIERS[currentTier].limits.teamMembers;
    const currentMembers = organization?.memberCount || 1;
    return currentMembers < memberLimit;
  };

  const canManageBilling = () => {
    if (isSuperadmin) return true;
    return checkPermission('canManageBilling');
  };

  const scansRemaining = (): number | 'unlimited' => {
    if (isSuperadmin) return 'unlimited';
    const limit = getScansLimit(currentTier);
    if (isUnlimited(limit)) return 'unlimited';
    return Math.max(0, limit - (subscription?.scansUsedThisMonth || 0));
  };

  const projectsRemaining = (): number | 'unlimited' => {
    if (isSuperadmin) return 'unlimited';
    const limit = TIERS[currentTier].limits.projects;
    if (isUnlimited(limit)) return 'unlimited';
    return Math.max(0, limit - (subscription?.projectCount || 0));
  };

  const membersRemaining = (): number | 'unlimited' => {
    if (isSuperadmin) return 'unlimited';
    const limit = TIERS[currentTier].limits.teamMembers;
    const current = organization?.memberCount || 1;
    return Math.max(0, limit - current);
  };

  const openCheckout = async (tier: TierName, interval: 'month' | 'year') => {
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          interval,
          organizationId: organization?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    }
  };

  const openBillingPortal = async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization?.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to open billing portal');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        error,
        isSuperadmin,
        organization,
        organizations,
        switchOrganization,
        canUsePlatform,
        canUseFeature,
        canScan,
        canCreateProject,
        hasPermission: checkPermission,
        canInviteMembers,
        canManageBilling,
        scansRemaining,
        projectsRemaining,
        membersRemaining,
        refreshSubscription,
        openCheckout,
        openBillingPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
}
