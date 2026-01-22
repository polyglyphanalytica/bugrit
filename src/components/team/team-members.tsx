'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/lib/subscriptions/context';

interface Member {
  userId: string;
  email: string;
  displayName?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt?: Date;
}

interface PendingInvite {
  email: string;
  role: 'owner' | 'admin' | 'member';
  token: string;
  expiresAt: Date;
}

export function TeamMembers() {
  const { organization, canInviteMembers, canManageBilling, hasPermission, membersRemaining } = useSubscription();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchMembers();
      fetchInvites();
    }
  }, [organization?.id]);

  const fetchMembers = async () => {
    if (!organization?.id) return;
    try {
      const res = await fetch(`/api/organizations/${organization.id}/members`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    if (!organization?.id) return;
    try {
      const res = await fetch(`/api/organizations/${organization.id}/invites`);
      const data = await res.json();
      setInvites(data.invites || []);
    } catch {
      // Silently fail for invites
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !organization?.id) return;

    setInviting(true);
    setError(null);

    try {
      const res = await fetch(`/api/organizations/${organization.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invite');
      }

      setInviteEmail('');
      fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!organization?.id || !confirm('Remove this team member?')) return;

    try {
      await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      fetchMembers();
    } catch (err) {
      setError('Failed to remove member');
    }
  };

  const handleCancelInvite = async (token: string) => {
    if (!organization?.id) return;

    try {
      await fetch(`/api/organizations/${organization.id}/invites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      fetchInvites();
    } catch (err) {
      setError('Failed to cancel invite');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    if (!organization?.id) return;

    try {
      await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      fetchMembers();
    } catch (err) {
      setError('Failed to update role');
    }
  };

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No organization selected
        </CardContent>
      </Card>
    );
  }

  const canManageMembers = hasPermission('canRemoveMembers');
  const remaining = membersRemaining();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {organization.name} has {members.length} member{members.length !== 1 ? 's' : ''}.
            {(remaining === 'unlimited' || remaining > 0) && ` You can add ${remaining === 'unlimited' ? 'unlimited' : remaining} more.`}
            {remaining === 0 && ' Upgrade to add more team members.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {(member.displayName || member.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.displayName || member.email}
                      </div>
                      {member.displayName && (
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={member.role} />
                    {canManageMembers && member.role !== 'owner' && (
                      <div className="flex gap-1">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value as 'admin' | 'member')}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.token}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{invite.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Invited as {invite.role}
                    </div>
                  </div>
                  {canManageMembers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvite(invite.token)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Form */}
      {canInviteMembers() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="px-3 py-2 border rounded-md"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" disabled={inviting}>
                {inviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </form>
            {error && (
              <p className="text-sm text-destructive mt-2">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {!canInviteMembers() && remaining === 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              You've reached the team member limit for your plan.
            </p>
            {canManageBilling() && (
              <Button variant="outline">Upgrade Plan</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: 'owner' | 'admin' | 'member' }) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    owner: 'default',
    admin: 'secondary',
    member: 'outline',
  };

  return (
    <Badge variant={variants[role]}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Badge>
  );
}
