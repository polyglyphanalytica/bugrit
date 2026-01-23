'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { VibeScoreCard } from '@/components/vibe-score/score-card';
import type { Team } from '@/lib/vibe-score/types';

interface TeamDashboardProps {
  team: Team;
  repoScores: Map<string, { score: number; grade: string; lastScan: Date }>;
}

export function TeamDashboard({ team, repoScores }: TeamDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'repos' | 'members' | 'policies'>('overview');

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{team.name}</h1>
              <p className="text-slate-400">
                {team.repos.length} repos · {team.members.length} members · {team.plan} plan
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                {team.credits} credits
              </span>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 mt-6 -mb-px">
            {(['overview', 'repos', 'members', 'policies'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                  activeTab === tab
                    ? 'bg-slate-900 text-white border-t border-x border-slate-700'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <OverviewTab team={team} repoScores={repoScores} />
        )}
        {activeTab === 'repos' && (
          <ReposTab team={team} repoScores={repoScores} />
        )}
        {activeTab === 'members' && (
          <MembersTab team={team} />
        )}
        {activeTab === 'policies' && (
          <PoliciesTab team={team} />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Tab Components
// ═══════════════════════════════════════════════════════════════

function OverviewTab({
  team,
  repoScores,
}: {
  team: Team;
  repoScores: Map<string, { score: number; grade: string; lastScan: Date }>;
}) {
  // Calculate aggregate score
  const scores = Array.from(repoScores.values()).map((r) => r.score);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Aggregate Score */}
      <div className="lg:col-span-1">
        {team.aggregateScore ? (
          <VibeScoreCard
            score={team.aggregateScore.overall}
            grade={team.aggregateScore.grade}
            components={team.aggregateScore.components}
            trend={team.aggregateScore.trend}
            size="medium"
          />
        ) : (
          <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 text-center">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-slate-400">
              Aggregate score: <span className="text-white font-bold">{avgScore}</span>/100
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Based on {scores.length} repos
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Repos"
          value={team.repos.length}
          icon="📁"
        />
        <StatCard
          label="Team Members"
          value={team.members.length}
          icon="👥"
        />
        <StatCard
          label="Active Policies"
          value={team.policies.filter((p) => p.enabled).length}
          icon="🛡️"
        />
        <StatCard
          label="Credits Left"
          value={team.credits}
          icon="💳"
        />
      </div>

      {/* Recent Activity */}
      <div className="lg:col-span-3">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Scans</h2>
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Repo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Scan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {team.repos.slice(0, 5).map((repoUrl) => {
                const repoName = repoUrl.split('/').slice(-2).join('/');
                const scoreData = repoScores.get(repoUrl);

                return (
                  <tr key={repoUrl} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white">{repoName}</td>
                    <td className="px-4 py-3">
                      {scoreData ? (
                        <span className="font-medium text-white">
                          {scoreData.score} <span className="text-slate-400">({scoreData.grade})</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Not scanned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {scoreData ? formatRelativeTime(scoreData.lastScan) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {scoreData && scoreData.score >= 80 ? (
                        <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">Healthy</span>
                      ) : scoreData ? (
                        <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">Needs Work</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReposTab({
  team,
  repoScores,
}: {
  team: Team;
  repoScores: Map<string, { score: number; grade: string; lastScan: Date }>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Repositories ({team.repos.length})</h2>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
          Add Repository
        </button>
      </div>

      <div className="grid gap-4">
        {team.repos.map((repoUrl) => {
          const repoName = repoUrl.split('/').slice(-2).join('/');
          const scoreData = repoScores.get(repoUrl);

          return (
            <div
              key={repoUrl}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700"
            >
              <div>
                <h3 className="font-medium text-white">{repoName}</h3>
                <p className="text-sm text-slate-400">{repoUrl}</p>
              </div>
              <div className="flex items-center gap-4">
                {scoreData && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{scoreData.score}</p>
                    <p className="text-xs text-slate-400">{scoreData.grade}</p>
                  </div>
                )}
                <button className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600">
                  Scan Now
                </button>
              </div>
            </div>
          );
        })}

        {team.repos.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-4">📁</p>
            <p>No repositories added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MembersTab({ team }: { team: Team }) {
  const roleColors = {
    owner: 'bg-purple-500/20 text-purple-400',
    admin: 'bg-blue-500/20 text-blue-400',
    member: 'bg-green-500/20 text-green-400',
    viewer: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Team Members ({team.members.length})</h2>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
          Invite Member
        </button>
      </div>

      <div className="rounded-xl bg-slate-800/50 border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Member</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Joined</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {team.members.map((member) => (
              <tr key={member.userId} className="hover:bg-slate-700/30">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white font-medium">{member.email}</p>
                    <p className="text-xs text-slate-500">{member.userId}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-1 rounded-full text-xs capitalize', roleColors[member.role])}>
                    {member.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {formatDate(member.joinedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {member.role !== 'owner' && (
                    <button className="text-slate-400 hover:text-red-400 text-sm">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PoliciesTab({ team }: { team: Team }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Security Policies</h2>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
          Create Policy
        </button>
      </div>

      <div className="space-y-4">
        {team.policies.map((policy) => (
          <div
            key={policy.id}
            className={cn(
              'p-4 rounded-xl border transition-colors',
              policy.enabled
                ? 'bg-slate-800/50 border-slate-700'
                : 'bg-slate-800/20 border-slate-800'
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn('font-medium', policy.enabled ? 'text-white' : 'text-slate-500')}>
                    {policy.name}
                  </h3>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs',
                    policy.enabled
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-500/20 text-slate-500'
                  )}>
                    {policy.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">{policy.description}</p>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span>Trigger: {policy.trigger}</span>
                  <span>Conditions: {policy.conditions.length}</span>
                  <span>Actions: {policy.actions.map((a) => a.type).join(', ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-slate-400 hover:text-white">
                  Edit
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policy.enabled}
                    className="sr-only peer"
                    readOnly
                  />
                  <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
