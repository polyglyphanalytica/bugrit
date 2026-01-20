/**
 * Organization Types
 *
 * Organizations are the billing unit - subscriptions belong to organizations,
 * and users are members of organizations.
 */

export type MemberRole = 'owner' | 'admin' | 'member';

export interface OrganizationMember {
  userId: string;
  email: string;
  displayName?: string;
  role: MemberRole;
  invitedAt: Date;
  joinedAt?: Date;
  invitedBy: string;
}

export interface PendingInvite {
  email: string;
  role: MemberRole;
  invitedAt: Date;
  invitedBy: string;
  token: string;
  expiresAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;

  // Subscription info (denormalized for quick access)
  subscription: {
    tier: 'starter' | 'pro' | 'business';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
  };

  // Usage tracking
  usage: {
    scansThisMonth: number;
    lastScanAt?: Date;
    monthStartedAt: Date;
  };
}

export interface UserOrganization {
  organizationId: string;
  organizationName: string;
  role: MemberRole;
  isDefault: boolean;
}

// Permission checks based on role
export const ROLE_PERMISSIONS = {
  owner: {
    canManageBilling: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditOrganization: true,
    canDeleteOrganization: true,
    canRunScans: true,
    canViewReports: true,
  },
  admin: {
    canManageBilling: false,
    canInviteMembers: true,
    canRemoveMembers: true,
    canEditOrganization: true,
    canDeleteOrganization: false,
    canRunScans: true,
    canViewReports: true,
  },
  member: {
    canManageBilling: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canEditOrganization: false,
    canDeleteOrganization: false,
    canRunScans: true,
    canViewReports: true,
  },
} as const;

export type Permission = keyof typeof ROLE_PERMISSIONS.owner;

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role][permission];
}
