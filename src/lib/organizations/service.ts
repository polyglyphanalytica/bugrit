import { db } from '@/lib/firebase/admin';
import { Organization, OrganizationMember, PendingInvite, MemberRole } from './types';
import { getTier, TierName } from '@/lib/subscriptions/tiers';
import { randomBytes } from 'crypto';

/**
 * Create a new organization
 */
export async function createOrganization(
  ownerId: string,
  ownerEmail: string,
  name: string
): Promise<Organization> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const orgRef = db.collection('organizations').doc();
  const now = new Date();

  const organization: Organization = {
    id: orgRef.id,
    name,
    slug,
    ownerId,
    createdAt: now,
    updatedAt: now,
    subscription: {
      tier: 'starter',
      status: 'active',
    },
    usage: {
      scansThisMonth: 0,
      monthStartedAt: now,
    },
  };

  // Create organization and add owner as member in a batch
  const batch = db.batch();

  batch.set(orgRef, organization);

  // Add owner as first member
  const memberRef = orgRef.collection('members').doc(ownerId);
  const ownerMember: OrganizationMember = {
    userId: ownerId,
    email: ownerEmail,
    role: 'owner',
    invitedAt: now,
    joinedAt: now,
    invitedBy: ownerId,
  };
  batch.set(memberRef, ownerMember);

  // Update user's organizations list
  const userOrgRef = db.collection('users').doc(ownerId).collection('organizations').doc(orgRef.id);
  batch.set(userOrgRef, {
    organizationId: orgRef.id,
    organizationName: name,
    role: 'owner',
    isDefault: true,
  });

  await batch.commit();

  return organization;
}

/**
 * Get organization by ID
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const doc = await db.collection('organizations').doc(orgId).get();
  if (!doc.exists) return null;
  return doc.data() as Organization;
}

/**
 * Get organization members
 */
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const snapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .get();

  return snapshot.docs.map((doc) => doc.data() as OrganizationMember);
}

/**
 * Get member count for an organization
 */
export async function getMemberCount(orgId: string): Promise<number> {
  const snapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .count()
    .get();

  return snapshot.data().count;
}

/**
 * Check if organization can add more members
 */
export async function canAddMember(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
  const org = await getOrganization(orgId);
  if (!org) {
    return { allowed: false, reason: 'Organization not found' };
  }

  const tier = getTier(org.subscription.tier as TierName);
  const currentCount = await getMemberCount(orgId);

  if (currentCount >= tier.limits.teamMembers) {
    return {
      allowed: false,
      reason: `Your ${tier.displayName} plan allows ${tier.limits.teamMembers} team member${tier.limits.teamMembers > 1 ? 's' : ''}. Upgrade to add more.`,
    };
  }

  return { allowed: true };
}

/**
 * Create an invite for a new member
 */
export async function createInvite(
  orgId: string,
  email: string,
  role: MemberRole,
  invitedBy: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  // Check if can add member
  const canAdd = await canAddMember(orgId);
  if (!canAdd.allowed) {
    return { success: false, error: canAdd.reason };
  }

  // Check if already a member
  const existingMember = await db
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .where('email', '==', email)
    .get();

  if (!existingMember.empty) {
    return { success: false, error: 'User is already a member' };
  }

  // Check for existing pending invite
  const existingInvite = await db
    .collection('organizations')
    .doc(orgId)
    .collection('invites')
    .where('email', '==', email)
    .get();

  if (!existingInvite.empty) {
    // Delete old invite
    await existingInvite.docs[0].ref.delete();
  }

  // Create new invite
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite: PendingInvite = {
    email,
    role,
    invitedAt: now,
    invitedBy,
    token,
    expiresAt,
  };

  await db
    .collection('organizations')
    .doc(orgId)
    .collection('invites')
    .doc(token)
    .set(invite);

  return { success: true, token };
}

/**
 * Accept an invite
 */
export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string,
  displayName?: string
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  // Find the invite across all organizations
  const orgsSnapshot = await db.collection('organizations').get();

  for (const orgDoc of orgsSnapshot.docs) {
    const inviteDoc = await orgDoc.ref.collection('invites').doc(token).get();

    if (inviteDoc.exists) {
      const invite = inviteDoc.data() as PendingInvite;

      // Check expiration
      if (new Date() > invite.expiresAt) {
        await inviteDoc.ref.delete();
        return { success: false, error: 'Invite has expired' };
      }

      // Verify email matches
      if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
        return { success: false, error: 'Email does not match invite' };
      }

      const now = new Date();

      // Add as member
      const batch = db.batch();

      const memberRef = orgDoc.ref.collection('members').doc(userId);
      const member: OrganizationMember = {
        userId,
        email: userEmail,
        displayName,
        role: invite.role,
        invitedAt: invite.invitedAt,
        joinedAt: now,
        invitedBy: invite.invitedBy,
      };
      batch.set(memberRef, member);

      // Add to user's organizations
      const userOrgRef = db
        .collection('users')
        .doc(userId)
        .collection('organizations')
        .doc(orgDoc.id);
      batch.set(userOrgRef, {
        organizationId: orgDoc.id,
        organizationName: orgDoc.data().name,
        role: invite.role,
        isDefault: false,
      });

      // Delete the invite
      batch.delete(inviteDoc.ref);

      await batch.commit();

      return { success: true, organizationId: orgDoc.id };
    }
  }

  return { success: false, error: 'Invalid or expired invite' };
}

/**
 * Remove a member from an organization
 */
export async function removeMember(
  orgId: string,
  userId: string,
  removedBy: string
): Promise<{ success: boolean; error?: string }> {
  const org = await getOrganization(orgId);
  if (!org) {
    return { success: false, error: 'Organization not found' };
  }

  // Cannot remove owner
  if (userId === org.ownerId) {
    return { success: false, error: 'Cannot remove organization owner' };
  }

  // Check if remover has permission
  const removerDoc = await db
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .doc(removedBy)
    .get();

  if (!removerDoc.exists) {
    return { success: false, error: 'You are not a member of this organization' };
  }

  const removerRole = removerDoc.data()?.role as MemberRole;
  if (removerRole === 'member') {
    return { success: false, error: 'You do not have permission to remove members' };
  }

  // Remove member
  const batch = db.batch();

  batch.delete(db.collection('organizations').doc(orgId).collection('members').doc(userId));
  batch.delete(db.collection('users').doc(userId).collection('organizations').doc(orgId));

  await batch.commit();

  return { success: true };
}

/**
 * Update member role
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: MemberRole,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const org = await getOrganization(orgId);
  if (!org) {
    return { success: false, error: 'Organization not found' };
  }

  // Cannot change owner's role
  if (userId === org.ownerId) {
    return { success: false, error: 'Cannot change owner role' };
  }

  // Only owner can set admin role
  if (newRole === 'admin' && updatedBy !== org.ownerId) {
    return { success: false, error: 'Only owner can assign admin role' };
  }

  await db.collection('organizations').doc(orgId).collection('members').doc(userId).update({
    role: newRole,
  });

  await db.collection('users').doc(userId).collection('organizations').doc(orgId).update({
    role: newRole,
  });

  return { success: true };
}

/**
 * Get user's organizations
 */
export async function getUserOrganizations(userId: string) {
  const snapshot = await db.collection('users').doc(userId).collection('organizations').get();

  return snapshot.docs.map((doc) => doc.data());
}

/**
 * Get pending invites for an organization
 */
export async function getPendingInvites(orgId: string): Promise<PendingInvite[]> {
  const snapshot = await db
    .collection('organizations')
    .doc(orgId)
    .collection('invites')
    .get();

  const now = new Date();
  const invites: PendingInvite[] = [];

  for (const doc of snapshot.docs) {
    const invite = doc.data() as PendingInvite;
    if (invite.expiresAt > now) {
      invites.push(invite);
    } else {
      // Clean up expired invite
      await doc.ref.delete();
    }
  }

  return invites;
}

/**
 * Cancel a pending invite
 */
export async function cancelInvite(orgId: string, token: string): Promise<void> {
  await db.collection('organizations').doc(orgId).collection('invites').doc(token).delete();
}
