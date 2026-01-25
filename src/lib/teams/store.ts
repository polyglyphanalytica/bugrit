/**
 * Team Store
 *
 * Manages team data, memberships, and policies.
 * Uses Firebase Admin SDK for server-side operations.
 */

import { getDb, FieldValue } from '@/lib/firestore';
import type { Team, TeamMember, TeamPolicy } from '@/lib/vibe-score/types';

const TEAMS_COLLECTION = 'teams';

/**
 * Create a new team
 */
export async function createTeam(
  name: string,
  ownerId: string,
  ownerEmail: string
): Promise<Team> {
  const db = getDb();
  if (!db) throw new Error('Database not available');

  const teamId = generateTeamId();
  const slug = slugify(name);

  const team: Team = {
    id: teamId,
    name,
    slug,
    members: [
      {
        userId: ownerId,
        email: ownerEmail,
        role: 'owner',
        joinedAt: new Date(),
      },
    ],
    repos: [],
    aggregateScore: null,
    policies: getDefaultPolicies(),
    plan: 'free',
    credits: 100, // Free tier starter credits
    createdAt: new Date(),
  };

  await db.collection(TEAMS_COLLECTION).doc(teamId).set(serializeTeam(team));

  return team;
}

/**
 * Get a team by ID
 */
export async function getTeam(teamId: string): Promise<Team | null> {
  const db = getDb();
  if (!db) return null;

  const docSnap = await db.collection(TEAMS_COLLECTION).doc(teamId).get();

  if (!docSnap.exists) return null;

  return deserializeTeam(docSnap.data() as Record<string, unknown>);
}

/**
 * Get a team by slug
 */
export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const db = getDb();
  if (!db) return null;

  const snapshot = await db
    .collection(TEAMS_COLLECTION)
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  return deserializeTeam(snapshot.docs[0].data() as Record<string, unknown>);
}

/**
 * Get all teams for a user
 */
export async function getTeamsForUser(userId: string): Promise<Team[]> {
  const db = getDb();
  if (!db) return [];

  // Query teams where user is a member
  const snapshot = await db
    .collection(TEAMS_COLLECTION)
    .where('memberIds', 'array-contains', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) =>
    deserializeTeam(doc.data() as Record<string, unknown>)
  );
}

/**
 * Add a member to a team
 */
export async function addTeamMember(
  teamId: string,
  member: Omit<TeamMember, 'joinedAt'>
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  // Check if already a member
  if (team.members.some((m) => m.userId === member.userId)) {
    throw new Error('User is already a member');
  }

  const newMember: TeamMember = {
    ...member,
    joinedAt: new Date(),
  };

  await db
    .collection(TEAMS_COLLECTION)
    .doc(teamId)
    .update({
      members: FieldValue.arrayUnion({
        ...newMember,
        joinedAt: newMember.joinedAt.toISOString(),
      }),
      memberIds: FieldValue.arrayUnion(member.userId),
    });
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  const updatedMembers = team.members.filter((m) => m.userId !== userId);

  // Prevent removing the last owner
  if (!updatedMembers.some((m) => m.role === 'owner')) {
    throw new Error('Cannot remove the last owner');
  }

  await db
    .collection(TEAMS_COLLECTION)
    .doc(teamId)
    .update({
      members: updatedMembers.map((m) => ({
        ...m,
        joinedAt: m.joinedAt.toISOString(),
      })),
      memberIds: updatedMembers.map((m) => m.userId),
    });
}

/**
 * Update member role
 */
export async function updateMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamMember['role']
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  const updatedMembers = team.members.map((m) =>
    m.userId === userId ? { ...m, role: newRole } : m
  );

  await db
    .collection(TEAMS_COLLECTION)
    .doc(teamId)
    .update({
      members: updatedMembers.map((m) => ({
        ...m,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
}

/**
 * Add a repo to a team
 */
export async function addRepoToTeam(
  teamId: string,
  repoUrl: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  if (team.repos.includes(repoUrl)) {
    throw new Error('Repo already added');
  }

  await db
    .collection(TEAMS_COLLECTION)
    .doc(teamId)
    .update({
      repos: FieldValue.arrayUnion(repoUrl),
    });
}

/**
 * Remove a repo from a team
 */
export async function removeRepoFromTeam(
  teamId: string,
  repoUrl: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db
    .collection(TEAMS_COLLECTION)
    .doc(teamId)
    .update({
      repos: FieldValue.arrayRemove(repoUrl),
    });
}

/**
 * Update team policies
 */
export async function updateTeamPolicies(
  teamId: string,
  policies: TeamPolicy[]
): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.collection(TEAMS_COLLECTION).doc(teamId).update({
    policies,
  });
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.collection(TEAMS_COLLECTION).doc(teamId).delete();
}

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

function generateTeamId(): string {
  const randomBytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    const nodeRandom = nodeCrypto.randomBytes(5);
    randomBytes.set(nodeRandom);
  }
  const random = Array.from(randomBytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 9);
  return `team_${Date.now()}_${random}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getDefaultPolicies(): TeamPolicy[] {
  return [
    {
      id: 'block-critical',
      name: 'Block Critical Issues',
      description: 'Prevent merging PRs with critical security vulnerabilities',
      enabled: true,
      trigger: 'on-pr',
      conditions: [{ type: 'severity-found', value: 'critical' }],
      actions: [{ type: 'block-merge', config: {} }],
    },
    {
      id: 'notify-secrets',
      name: 'Alert on Exposed Secrets',
      description: 'Send immediate notification when secrets are detected',
      enabled: true,
      trigger: 'on-scan',
      conditions: [{ type: 'tool-failed', value: 'gitleaks' }],
      actions: [
        {
          type: 'notify-email',
          config: { to: 'team-admins' },
        },
      ],
    },
    {
      id: 'score-threshold',
      name: 'Minimum Score Requirement',
      description: 'Require a minimum Vibe Score for merging',
      enabled: false,
      trigger: 'on-pr',
      conditions: [{ type: 'score-below', value: 70 }],
      actions: [{ type: 'block-merge', config: {} }],
    },
  ];
}

function serializeTeam(team: Team): Record<string, unknown> {
  return {
    ...team,
    members: team.members.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
    })),
    memberIds: team.members.map((m) => m.userId),
    createdAt: team.createdAt.toISOString(),
  };
}

function deserializeTeam(data: Record<string, unknown>): Team {
  return {
    ...data,
    members: (data.members as Array<Record<string, unknown>>).map((m) => ({
      ...m,
      joinedAt: new Date(m.joinedAt as string),
    })) as TeamMember[],
    createdAt: new Date(data.createdAt as string),
  } as Team;
}
