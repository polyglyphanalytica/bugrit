'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, Zap, TrendingUp, Clock, Package } from 'lucide-react';

interface Subscription {
  tier: string;
  status: 'active' | 'canceled' | 'past_due' | 'none';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

interface Usage {
  credits: {
    used: number;
    limit: number;
    rollover: number;
  };
  projects: {
    used: number;
    limit: number;
  };
  teamMembers: {
    used: number;
    limit: number;
  };
}

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  isFeatured: boolean;
}

interface AutoTopupConfig {
  enabled: boolean;
  triggerThreshold: number;
  packageId: string;
  maxPerMonth: number;
}

// Separate component to handle URL params (needs Suspense boundary)
function PurchaseParamsHandler({ onRefresh }: { onRefresh: () => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const purchase = searchParams.get('purchase');
    const credits = searchParams.get('credits');

    if (purchase === 'success') {
      toast({
        title: 'Credits purchased!',
        description: credits
          ? `${credits} credits have been added to your account.`
          : 'Your credits have been added to your account.',
      });
      router.replace('/settings/subscription', { scroll: false });
      onRefresh();
    } else if (purchase === 'canceled') {
      toast({
        title: 'Purchase canceled',
        description: 'No charges were made. You can try again anytime.',
        variant: 'default',
      });
      router.replace('/settings/subscription', { scroll: false });
    }
  }, [searchParams, toast, router, onRefresh]);

  return null;
}

export default function SubscriptionSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [autoTopup, setAutoTopup] = useState<AutoTopupConfig>({
    enabled: false,
    triggerThreshold: 10,
    packageId: '',
    maxPerMonth: 3,
  });
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [savingAutoTopup, setSavingAutoTopup] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
      fetchCreditPackages();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/settings/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
        setUsage(data.usage);
        if (data.autoTopup) {
          setAutoTopup(data.autoTopup);
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditPackages = async () => {
    try {
      const res = await fetch('/api/credit-packages');
      if (res.ok) {
        const data = await res.json();
        setCreditPackages(data.packages || []);
      }
    } catch (error) {
      console.error('Failed to fetch credit packages:', error);
    }
  };

  const handlePurchaseCredits = async () => {
    if (!selectedPackage) return;

    setPurchasing(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/billing/purchase-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: selectedPackage.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          // Redirect to Stripe checkout
          window.location.href = data.checkoutUrl;
        } else {
          toast({
            title: 'Credits purchased',
            description: `${selectedPackage.credits} credits have been added to your account.`,
          });
          setShowTopupDialog(false);
          fetchSubscriptionData();
        }
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to purchase credits',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to purchase credits',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleSaveAutoTopup = async () => {
    setSavingAutoTopup(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/settings/subscription/auto-topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(autoTopup),
      });

      if (res.ok) {
        toast({
          title: 'Auto top-up settings saved',
          description: autoTopup.enabled
            ? `Auto top-up will trigger when credits fall below ${autoTopup.triggerThreshold}`
            : 'Auto top-up has been disabled',
        });
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save auto top-up settings',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save auto top-up settings',
        variant: 'destructive',
      });
    } finally {
      setSavingAutoTopup(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        toast({
          title: 'Error',
          description: 'Failed to open billing portal',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal',
        variant: 'destructive',
      });
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Unlimited';
    return limit.toLocaleString();
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
      <Suspense fallback={null}>
        <PurchaseParamsHandler onRefresh={fetchSubscriptionData} />
      </Suspense>
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Plan</span>
            {subscription && (
              <Badge
                variant={subscription.status === 'active' ? 'default' : 'destructive'}
              >
                {subscription.status === 'active' && 'Active'}
                {subscription.status === 'past_due' && 'Payment Failed'}
                {subscription.status === 'canceled' && 'Canceled'}
                {subscription.status === 'none' && 'No Subscription'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Manage your subscription and billing.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Payment Failed Warning */}
          {subscription?.status === 'past_due' && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="font-medium text-destructive">Your payment failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please update your payment method to continue using premium features.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                onClick={handleManageSubscription}
              >
                Update Payment Method
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold capitalize">
                {subscription?.tier || 'Free'} Plan
              </h3>
              {subscription?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  {subscription.cancelAtPeriodEnd
                    ? 'Cancels'
                    : 'Renews'} on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {subscription?.tier !== 'business' && (
                <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
                  Upgrade Plan
                </Button>
              )}
              {subscription && subscription.status !== 'none' && (
                <Button variant="outline" onClick={handleManageSubscription}>
                  Manage Billing
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage This Period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credits */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">Credits</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {usage?.credits.used.toLocaleString()} / {formatLimit(usage?.credits.limit || 0)} used
              </span>
            </div>
            <Progress value={getUsagePercentage(usage?.credits.used || 0, usage?.credits.limit || 1)} />
            {usage?.credits.rollover ? (
              <p className="text-xs text-muted-foreground">
                +{usage.credits.rollover} rollover credits available
              </p>
            ) : null}
          </div>

          {/* Projects */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Projects</span>
              <span className="text-sm text-muted-foreground">
                {usage?.projects.used} / {formatLimit(usage?.projects.limit || 0)}
              </span>
            </div>
            <Progress value={getUsagePercentage(usage?.projects.used || 0, usage?.projects.limit || 1)} />
          </div>

          {/* Team Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Team Members</span>
              <span className="text-sm text-muted-foreground">
                {usage?.teamMembers.used} / {formatLimit(usage?.teamMembers.limit || 0)}
              </span>
            </div>
            <Progress value={getUsagePercentage(usage?.teamMembers.used || 0, usage?.teamMembers.limit || 1)} />
          </div>
        </CardContent>
      </Card>

      {/* Buy Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Buy Credits
          </CardTitle>
          <CardDescription>
            Purchase additional credits to use when you run out of your monthly allocation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {creditPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary ${
                  pkg.isFeatured ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => {
                  setSelectedPackage(pkg);
                  setShowTopupDialog(true);
                }}
              >
                {pkg.isFeatured && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Best Value</Badge>
                  </div>
                )}
                <div className="text-center">
                  <p className="font-semibold">{pkg.name}</p>
                  <p className="text-3xl font-bold text-primary my-2">{pkg.credits}</p>
                  <p className="text-sm text-muted-foreground mb-2">credits</p>
                  <p className="text-lg font-semibold">${pkg.price}</p>
                  <p className="text-xs text-muted-foreground">
                    ${(pkg.price / pkg.credits).toFixed(3)}/credit
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Auto Top-up */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto Top-up
          </CardTitle>
          <CardDescription>
            Automatically purchase credits when your balance falls below a threshold.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-topup">Enable Auto Top-up</Label>
              <p className="text-sm text-muted-foreground">
                Automatically add credits when your balance is low
              </p>
            </div>
            <Switch
              id="auto-topup"
              checked={autoTopup.enabled}
              onCheckedChange={(checked) => setAutoTopup({ ...autoTopup, enabled: checked })}
            />
          </div>

          {autoTopup.enabled && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="threshold">Trigger Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={autoTopup.triggerThreshold}
                    onChange={(e) => setAutoTopup({ ...autoTopup, triggerThreshold: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Top-up when credits fall below this amount
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-per-month">Max Top-ups Per Month</Label>
                  <Input
                    id="max-per-month"
                    type="number"
                    value={autoTopup.maxPerMonth}
                    onChange={(e) => setAutoTopup({ ...autoTopup, maxPerMonth: parseInt(e.target.value) || 1 })}
                    placeholder="e.g., 3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Limit automatic purchases to prevent unexpected charges
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package">Credit Package</Label>
                <Select
                  value={autoTopup.packageId}
                  onValueChange={(v) => setAutoTopup({ ...autoTopup, packageId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditPackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.credits} credits (${pkg.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button
            onClick={handleSaveAutoTopup}
            disabled={savingAutoTopup || (autoTopup.enabled && !autoTopup.packageId)}
          >
            {savingAutoTopup ? 'Saving...' : 'Save Auto Top-up Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={showTopupDialog} onOpenChange={setShowTopupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Credits</DialogTitle>
            <DialogDescription>
              Add {selectedPackage?.credits} credits to your account for ${selectedPackage?.price}.
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="font-semibold">{selectedPackage.name}</p>
                <p className="text-4xl font-bold text-primary my-2">{selectedPackage.credits}</p>
                <p className="text-muted-foreground">credits</p>
                <p className="mt-4 text-2xl font-bold">${selectedPackage.price}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePurchaseCredits} disabled={purchasing}>
              <CreditCard className="h-4 w-4 mr-2" />
              {purchasing ? 'Processing...' : 'Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
