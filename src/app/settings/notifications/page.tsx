'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Bell, CheckCircle2, Loader2, Mail, Smartphone, Monitor, Clock, Lock } from 'lucide-react';

interface ChannelSettings {
  email: {
    enabled: boolean;
    digestMode: 'immediate' | 'daily' | 'weekly';
  };
  inApp: {
    enabled: boolean;
    showBadge: boolean;
    playSound: boolean;
  };
  push: {
    enabled: boolean;
    deviceTokens: string[];
  };
}

interface EventSettings {
  enabled: boolean;
  channels: ('email' | 'in_app' | 'push')[];
}

interface NotificationPreferences {
  globalEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  channels: ChannelSettings;
  events: {
    scan_completed: EventSettings;
    scan_failed: EventSettings;
    test_completed: EventSettings;
    test_failed: EventSettings;
    fix_branch_ready: EventSettings;
    weekly_summary: EventSettings;
    security_alert: EventSettings;
    credit_low: EventSettings;
    subscription_update: EventSettings;
    team_invite: EventSettings;
  };
}

const TRANSACTIONAL_EVENTS = ['security_alert', 'credit_low', 'subscription_update', 'team_invite'];

const EVENT_LABELS: Record<string, { label: string; description: string }> = {
  scan_completed: {
    label: 'Scan Completed',
    description: 'When a scan finishes successfully',
  },
  scan_failed: {
    label: 'Scan Failed',
    description: 'When a scan encounters an error',
  },
  test_completed: {
    label: 'Test Completed',
    description: 'When tests finish running',
  },
  test_failed: {
    label: 'Test Failed',
    description: 'When tests fail',
  },
  fix_branch_ready: {
    label: 'Fix Branch Ready',
    description: 'When an AI-generated fix branch is ready',
  },
  weekly_summary: {
    label: 'Weekly Summary',
    description: 'Weekly report of your scan activity',
  },
  security_alert: {
    label: 'Security Alerts',
    description: 'Critical or high severity security findings',
  },
  credit_low: {
    label: 'Low Credits',
    description: 'When your credit balance is running low',
  },
  subscription_update: {
    label: 'Subscription Updates',
    description: 'Billing and subscription changes',
  },
  team_invite: {
    label: 'Team Invitations',
    description: 'When you receive a team invitation',
  },
};

export default function NotificationsSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const data = await res.json();
          setPreferences(data);
        }
      } catch (error) {
        console.error('Failed to fetch notification preferences:', error);
        setMessage({ type: 'error', text: 'Failed to load notification preferences' });
      } finally {
        setLoading(false);
      }
    }

    fetchPreferences();
  }, []);

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Notification preferences saved' });
        setHasChanges(false);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (path: string[], value: unknown) => {
    if (!preferences) return;

    setHasChanges(true);
    setPreferences((prev) => {
      if (!prev) return prev;

      const updated = { ...prev };
      let current: Record<string, unknown> = updated;

      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...(current[path[i]] as Record<string, unknown>) };
        current = current[path[i]] as Record<string, unknown>;
      }

      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const toggleEventChannel = (eventType: string, channel: 'email' | 'in_app' | 'push') => {
    if (!preferences) return;

    const event = preferences.events[eventType as keyof typeof preferences.events];
    const isTransactional = TRANSACTIONAL_EVENTS.includes(eventType);

    // Prevent removing email from transactional events
    if (isTransactional && channel === 'email' && event.channels.includes('email')) {
      return;
    }

    const newChannels = event.channels.includes(channel)
      ? event.channels.filter((c) => c !== channel)
      : [...event.channels, channel];

    updatePreference(['events', eventType, 'channels'], newChannels);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-600">Failed to load notification preferences</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Notifications</h2>
          <p className="text-muted-foreground">
            Configure how and when you receive notifications.
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        )}
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Global Settings
          </CardTitle>
          <CardDescription>
            Master controls for all notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="global-enabled" className="font-medium">
                Enable Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn off to pause all non-essential notifications
              </p>
            </div>
            <Switch
              id="global-enabled"
              checked={preferences.globalEnabled}
              onCheckedChange={(checked) => updatePreference(['globalEnabled'], checked)}
            />
          </div>

          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label htmlFor="quiet-hours" className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quiet Hours
                </Label>
                <p className="text-sm text-muted-foreground">
                  Pause non-urgent notifications during specific hours
                </p>
              </div>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHoursEnabled}
                onCheckedChange={(checked) => updatePreference(['quietHoursEnabled'], checked)}
              />
            </div>

            {preferences.quietHoursEnabled && (
              <div className="flex items-center gap-4 pl-6">
                <div className="flex items-center gap-2">
                  <Label htmlFor="quiet-start" className="text-sm">From</Label>
                  <input
                    type="time"
                    id="quiet-start"
                    value={preferences.quietHoursStart || '22:00'}
                    onChange={(e) => updatePreference(['quietHoursStart'], e.target.value)}
                    className="px-3 py-1.5 rounded-md border bg-background text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="quiet-end" className="text-sm">To</Label>
                  <input
                    type="time"
                    id="quiet-end"
                    value={preferences.quietHoursEnd || '08:00'}
                    onChange={(e) => updatePreference(['quietHoursEnd'], e.target.value)}
                    className="px-3 py-1.5 rounded-md border bg-background text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Configure each notification channel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Channel */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label className="font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.channels.email.enabled}
                onCheckedChange={(checked) => updatePreference(['channels', 'email', 'enabled'], checked)}
              />
            </div>

            {preferences.channels.email.enabled && (
              <div className="pl-12">
                <Label htmlFor="digest-mode" className="text-sm font-medium">
                  Delivery Mode
                </Label>
                <Select
                  value={preferences.channels.email.digestMode}
                  onValueChange={(value) => updatePreference(['channels', 'email', 'digestMode'], value)}
                >
                  <SelectTrigger className="w-48 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* In-App Channel */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Monitor className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <Label className="font-medium">In-App</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications in the Bugrit dashboard
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.channels.inApp.enabled}
                onCheckedChange={(checked) => updatePreference(['channels', 'inApp', 'enabled'], checked)}
              />
            </div>

            {preferences.channels.inApp.enabled && (
              <div className="pl-12 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-badge" className="text-sm">
                    Show notification badge
                  </Label>
                  <Switch
                    id="show-badge"
                    checked={preferences.channels.inApp.showBadge}
                    onCheckedChange={(checked) => updatePreference(['channels', 'inApp', 'showBadge'], checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="play-sound" className="text-sm">
                    Play notification sound
                  </Label>
                  <Switch
                    id="play-sound"
                    checked={preferences.channels.inApp.playSound}
                    onCheckedChange={(checked) => updatePreference(['channels', 'inApp', 'playSound'], checked)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Push Channel */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Smartphone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <Label className="font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Mobile and desktop push notifications
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.channels.push.enabled}
                onCheckedChange={(checked) => updatePreference(['channels', 'push', 'enabled'], checked)}
              />
            </div>

            {preferences.channels.push.enabled && preferences.channels.push.deviceTokens.length === 0 && (
              <div className="pl-12">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  No devices registered. Push notifications will be enabled once you allow notifications in your browser or mobile app.
                </p>
              </div>
            )}

            {preferences.channels.push.enabled && preferences.channels.push.deviceTokens.length > 0 && (
              <div className="pl-12">
                <p className="text-sm text-muted-foreground">
                  {preferences.channels.push.deviceTokens.length} device{preferences.channels.push.deviceTokens.length > 1 ? 's' : ''} registered
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Event Preferences</CardTitle>
          <CardDescription>
            Choose which events trigger notifications and on which channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(EVENT_LABELS).map(([eventType, { label, description }]) => {
              const event = preferences.events[eventType as keyof typeof preferences.events];
              const isTransactional = TRANSACTIONAL_EVENTS.includes(eventType);

              return (
                <div key={eventType} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">{label}</Label>
                        {isTransactional && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full">
                            <Lock className="h-3 w-3" />
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    {!isTransactional && (
                      <Switch
                        checked={event.enabled}
                        onCheckedChange={(checked) => updatePreference(['events', eventType, 'enabled'], checked)}
                      />
                    )}
                  </div>

                  {(event.enabled || isTransactional) && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                      <span className="text-sm text-muted-foreground">Channels:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleEventChannel(eventType, 'email')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
                            event.channels.includes('email')
                              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          } ${isTransactional ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          disabled={isTransactional && event.channels.includes('email')}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Email
                          {isTransactional && <Lock className="h-3 w-3 ml-1" />}
                        </button>
                        <button
                          onClick={() => toggleEventChannel(eventType, 'in_app')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                            event.channels.includes('in_app')
                              ? 'bg-purple-500/10 text-purple-600 border border-purple-500/30'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          <Monitor className="h-3.5 w-3.5" />
                          In-App
                        </button>
                        <button
                          onClick={() => toggleEventChannel(eventType, 'push')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                            event.channels.includes('push')
                              ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          Push
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Required Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Security alerts, low credit warnings, subscription updates, and team invitations
                  will always be sent via email to ensure you don&apos;t miss critical updates.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (sticky at bottom on mobile) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end md:hidden">
          <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
