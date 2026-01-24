/**
 * Team Store
 *
 * Manages team data, memberships, and policies.
 */

import { db } from '@/lib/firestore';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import type { Team, TeamMember, TeamPolicy } from '@/lib/vibe-score/types';

const TEAMS_COLLECTION = 'teams';
const TEAM_MEMBERS_COLLECTION = 'teamMembers';

/**
 * Create a new team
 */
export async function createTeam(
  name: string,
  ownerId: string,
  ownerEmail: string
): Promise<Team> {
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

  if (db) {
    await setDoc(doc(db, TEAMS_COLLECTION, teamId), serializeTeam(team));
  }

  return team;
}

/**
 * Get a team by ID
 */
export async function getTeam(teamId: string): Promise<Team | null> {
  if (!db) return null;

  const docRef = doc(db, TEAMS_COLLECTION, teamId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return deserializeTeam(docSnap.data());
}

/**
 * Get a team by slug
 */
export async function getTeamBySlug(slug: string): Promise<Team | null> {
  if (!db) return null;

  const q = query(collection(db, TEAMS_COLLECTION), where('slug', '==', slug));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return deserializeTeam(snapshot.docs[0].data());
}

/**
 * Get all teams for a user
 */
export async function getTeamsForUser(userId: string): Promise<Team[]> {
  if (!db) return [];

  // Query teams where user is a member
  const q = query(
    collection(db, TEAMS_COLLECTION),
    where('memberIds', 'array-contains', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => deserializeTeam(doc.data()));
}

/**
 * Add a member to a team
 */
export async function addTeamMember(
  teamId: string,
  member: Omit<TeamMember, 'joinedAt'>
): Promise<void> {
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

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    members: [...team.members, newMember],
    memberIds: [...team.members.map((m) => m.userId), member.userId],
  });
}

/**
 * Remove a member from a team
 */
export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<void> {
  if (!db) return;

  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  const updatedMembers = team.members.filter((m) => m.userId !== userId);

  // Prevent removing the last owner
  if (!updatedMembers.some((m) => m.role === 'owner')) {
    throw new Error('Cannot remove the last owner');
  }

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    members: updatedMembers,
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
  if (!db) return;

  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  const updatedMembers = team.members.map((m) =>
    m.userId === userId ? { ...m, role: newRole } : m
  );

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    members: updatedMembers,
  });
}

/**
 * Add a repo to a team
 */
export async function addRepoToTeam(
  teamId: string,
  repoUrl: string
): Promise<void> {
  if (!db) return;

  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  if (team.repos.includes(repoUrl)) {
    throw new Error('Repo already added');
  }

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    repos: [...team.repos, repoUrl],
  });
}

/**
 * Remove a repo from a team
 */
export async function removeRepoFromTeam(
  teamId: string,
  repoUrl: string
): Promise<void> {
  if (!db) return;

  const team = await getTeam(teamId);
  if (!team) throw new Error('Team not found');

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    repos: team.repos.filter((r) => r !== repoUrl),
  });
}

/**
 * Update team policies
 */
export async function updateTeamPolicies(
  teamId: string,
  policies: TeamPolicy[]
): Promise<void> {
  if (!db) return;

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), {
    policies,
  });
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string): Promise<void> {
  if (!db) return;

  await deleteDoc(doc(db, TEAMS_COLLECTION, teamId));
}

// ═══════════════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════════════

function generateTeamId(): string {
  const randomBytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    const nodeCrypto = require('crypto');
    const nodeRandom = nodeCrypto.randomBytes(5);
    randomBytes.set(nodeRandom);
  }
  const random = Array.from(randomBytes)
    .map(b => b.toString(36).padStart(2, '0'))
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
