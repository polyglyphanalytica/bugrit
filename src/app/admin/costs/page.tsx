'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Server,
  Cpu,
  Database,
  Cloud,
  Zap,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface MonthlyBudget {
  month: string;
  prepaidRevenue: number;
  costsIncurred: number;
  budgetRemaining: number;
  budgetUtilization: number;
  daysElapsed: number;
  daysRemaining: number;
  projectedEndOfMonth: number;
  projectedProfit: number;
  status: 'on_track' | 'at_risk' | 'over_budget';
  dailyBudget: number;
  dailyActual: number;
}

interface CostData {
  period: {
    start: string;
    end: string;
    days: number;
  };
  currentMonthBudget: MonthlyBudget;
  previousMonths: MonthlyBudget[];
  infrastructure: {
    summary: {
      totalCost: number;
      totalCredits: number;
      netCost: number;
      currency: string;
      byService: Record<string, number>;
    } | null;
    trend: {
      daily: Array<{ date: string; cost: number; credits: number; netCost: number }>;
      weeklyAverage: number;
      monthlyProjection: number;
      previousMonthTotal: number;
      percentChange: number;
    } | null;
    breakdown: {
      compute: number;
      storage: number;
      networking: number;
      ai: number;
      database: number;
      other: number;
      total: number;
    } | null;
  };
  revenue: {
    totalCreditsCharged: number;
    totalRevenue: number;
    subscriptionRevenue: number;
    creditPurchaseRevenue: number;
    autoTopupRevenue: number;
    transactionCount: number;
  };
  profitability: {
    grossProfit: number;
    grossMargin: number;
    costPerScan: number;
    revenuePerScan: number;
    profitPerScan: number;
    breakEvenScans: number;
    status: 'healthy' | 'warning' | 'critical';
    recommendation: string;
  };
  usage: {
    totalScans: number;
    totalUsers: number;
    activeUsers: number;
    avgScansPerUser: number;
  };
  alerts: Array<{
    type: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

export default function CostsManagementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CostData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCostData = async () => {
    try {
      setRefreshing(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/costs?days=${days}&mock=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch cost data');
      }

      const costData = await res.json();
      setData(costData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCostData();
    }
  }, [user, days]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchCostData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { currentMonthBudget, previousMonths, infrastructure, revenue, profitability, usage, alerts } = data;

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'over_budget':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getBudgetStatusLabel = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'at_risk':
        return 'At Risk';
      case 'over_budget':
        return 'Over Budget';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cost Management</h1>
          <p className="text-muted-foreground">
            Track platform costs vs revenue and monitor profitability
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchCostData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg flex items-start gap-3 ${
                alert.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              {alert.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />}
              {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />}
              {alert.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />}
              <p className={`text-sm ${
                alert.type === 'error' ? 'text-red-700' :
                alert.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Monthly Budget Card - Primary Focus */}
      <Card className={`border-2 ${getBudgetStatusColor(currentMonthBudget.status)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {new Date(currentMonthBudget.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Budget
              </CardTitle>
              <CardDescription>
                Prepaid revenue available for infrastructure costs (resets monthly)
              </CardDescription>
            </div>
            <Badge className={getBudgetStatusColor(currentMonthBudget.status)}>
              {getBudgetStatusLabel(currentMonthBudget.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Budget Progress Bar */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Budget Utilization</span>
                <span className="text-sm font-medium">{currentMonthBudget.budgetUtilization.toFixed(1)}%</span>
              </div>
              <div className="h-6 bg-gray-200 rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all ${
                    currentMonthBudget.budgetUtilization > 100
                      ? 'bg-red-500'
                      : currentMonthBudget.budgetUtilization > 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(currentMonthBudget.budgetUtilization, 100)}%` }}
                />
                {/* Projected line */}
                {currentMonthBudget.projectedEndOfMonth > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-black/50"
                    style={{
                      left: `${Math.min((currentMonthBudget.projectedEndOfMonth / currentMonthBudget.prepaidRevenue) * 100, 100)}%`
                    }}
                    title={`Projected: ${formatCurrency(currentMonthBudget.projectedEndOfMonth)}`}
                  />
                )}
              </div>
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{formatCurrency(currentMonthBudget.costsIncurred)} spent</span>
                <span>{formatCurrency(currentMonthBudget.budgetRemaining)} remaining</span>
              </div>
            </div>

            {/* Key Budget Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-3 bg-white/50 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Prepaid Revenue</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(currentMonthBudget.prepaidRevenue)}</p>
                <p className="text-xs text-muted-foreground">This month's budget</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Costs Incurred</p>
                <p className="text-xl font-bold">{formatCurrency(currentMonthBudget.costsIncurred)}</p>
                <p className="text-xs text-muted-foreground">{currentMonthBudget.daysElapsed} days elapsed</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Projected Total</p>
                <p className={`text-xl font-bold ${
                  currentMonthBudget.projectedEndOfMonth > currentMonthBudget.prepaidRevenue
                    ? 'text-red-600'
                    : 'text-blue-600'
                }`}>
                  {formatCurrency(currentMonthBudget.projectedEndOfMonth)}
                </p>
                <p className="text-xs text-muted-foreground">{currentMonthBudget.daysRemaining} days left</p>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Projected Profit</p>
                <p className={`text-xl font-bold ${
                  currentMonthBudget.projectedProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(currentMonthBudget.projectedProfit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentMonthBudget.prepaidRevenue > 0
                    ? `${((currentMonthBudget.projectedProfit / currentMonthBudget.prepaidRevenue) * 100).toFixed(0)}% margin`
                    : '0% margin'}
                </p>
              </div>
            </div>

            {/* Daily Burn Rate */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Daily Budget</span>
                  <span className="text-lg font-bold">{formatCurrency(currentMonthBudget.dailyBudget)}/day</span>
                </div>
                <Progress
                  value={100}
                  className="h-2 mt-2"
                />
              </div>
              <div className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Actual Daily Spend</span>
                  <span className={`text-lg font-bold ${
                    currentMonthBudget.dailyActual > currentMonthBudget.dailyBudget
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {formatCurrency(currentMonthBudget.dailyActual)}/day
                  </span>
                </div>
                <Progress
                  value={Math.min((currentMonthBudget.dailyActual / currentMonthBudget.dailyBudget) * 100, 100)}
                  className={`h-2 mt-2 ${
                    currentMonthBudget.dailyActual > currentMonthBudget.dailyBudget ? '[&>div]:bg-red-500' : ''
                  }`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previous Months Comparison */}
      {previousMonths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previous Months (Profit Realized)</CardTitle>
            <CardDescription>
              Each month stands alone - unused budget becomes profit, not carried forward
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {previousMonths.map((month) => (
                <div key={month.month} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <Badge variant={month.projectedProfit >= 0 ? 'default' : 'destructive'}>
                      {month.projectedProfit >= 0 ? 'Profit' : 'Loss'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue</span>
                      <span>{formatCurrency(month.prepaidRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Costs</span>
                      <span>{formatCurrency(month.costsIncurred)}</span>
                    </div>
                    <div className="flex justify-between font-medium pt-1 border-t">
                      <span>Profit</span>
                      <span className={month.projectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(month.projectedProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Margin</span>
                      <span>{((month.projectedProfit / month.prepaidRevenue) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Infrastructure Costs */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Infrastructure Costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(infrastructure.summary?.netCost || 0)}
            </p>
            {infrastructure.trend && (
              <p className={`text-sm flex items-center gap-1 ${
                infrastructure.trend.percentChange > 0 ? 'text-red-500' : 'text-green-500'
              }`}>
                {infrastructure.trend.percentChange > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(infrastructure.trend.percentChange).toFixed(1)}% vs last month
              </p>
            )}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(revenue.totalRevenue)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatNumber(revenue.transactionCount)} transactions
            </p>
          </CardContent>
        </Card>

        {/* Gross Profit */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gross Profit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              profitability.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(profitability.grossProfit)}
            </p>
            <p className="text-sm text-muted-foreground">
              {profitability.grossMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        {/* Health Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profitability Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {getStatusIcon(profitability.status)}
              <span className="text-2xl font-bold capitalize">{profitability.status}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {profitability.costPerScan > 0 && `$${profitability.profitPerScan.toFixed(2)}/scan`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subscriptions</span>
                <span className="font-medium">{formatCurrency(revenue.subscriptionRevenue)}</span>
              </div>
              <Progress
                value={(revenue.subscriptionRevenue / revenue.totalRevenue) * 100}
                className="h-2"
              />

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Credit Purchases</span>
                <span className="font-medium">{formatCurrency(revenue.creditPurchaseRevenue)}</span>
              </div>
              <Progress
                value={(revenue.creditPurchaseRevenue / revenue.totalRevenue) * 100}
                className="h-2"
              />

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Auto Top-ups</span>
                <span className="font-medium">{formatCurrency(revenue.autoTopupRevenue)}</span>
              </div>
              <Progress
                value={(revenue.autoTopupRevenue / revenue.totalRevenue) * 100}
                className="h-2"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Credits Charged</span>
                <span className="text-lg font-bold">{formatNumber(revenue.totalCreditsCharged)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Avg ${(revenue.totalRevenue / revenue.totalCreditsCharged || 0).toFixed(3)}/credit
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Infrastructure Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {infrastructure.breakdown && (
              <div className="space-y-4">
                {[
                  { label: 'Compute (Cloud Run, Functions)', value: infrastructure.breakdown.compute, icon: Cpu },
                  { label: 'AI Services (Vertex AI)', value: infrastructure.breakdown.ai, icon: Zap },
                  { label: 'Storage', value: infrastructure.breakdown.storage, icon: Database },
                  { label: 'Database (Firestore)', value: infrastructure.breakdown.database, icon: Database },
                  { label: 'Networking', value: infrastructure.breakdown.networking, icon: Cloud },
                  { label: 'Other', value: infrastructure.breakdown.other, icon: Server },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                    <Progress
                      value={(item.value / infrastructure.breakdown!.total) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profitability Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability Analysis</CardTitle>
          <CardDescription>{profitability.recommendation}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Cost per Scan</p>
              <p className="text-2xl font-bold">{formatCurrency(profitability.costPerScan)}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Revenue per Scan</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(profitability.revenuePerScan)}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Profit per Scan</p>
              <p className={`text-2xl font-bold ${profitability.profitPerScan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profitability.profitPerScan)}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Break-even Scans</p>
              <p className="text-2xl font-bold">
                {profitability.breakEvenScans === Infinity ? 'N/A' : formatNumber(profitability.breakEvenScans)}
              </p>
            </div>
          </div>

          {/* Margin Gauge */}
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Gross Margin</span>
              <span className="text-sm font-medium">{profitability.grossMargin.toFixed(1)}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  profitability.grossMargin >= 30
                    ? 'bg-green-500'
                    : profitability.grossMargin >= 10
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(Math.max(profitability.grossMargin, 0), 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>0%</span>
              <span className="text-yellow-600">10% (Warning)</span>
              <span className="text-green-600">30% (Healthy)</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>Platform usage during the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold">{formatNumber(usage.totalScans)}</p>
              <p className="text-sm text-muted-foreground">Total Scans</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold">{formatNumber(usage.totalUsers)}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold">{formatNumber(usage.activeUsers)}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold">{usage.avgScansPerUser.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Avg Scans/User</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Projection */}
      {infrastructure.trend && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Projection</CardTitle>
            <CardDescription>Based on current spending trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Weekly Average</p>
                <p className="text-2xl font-bold">{formatCurrency(infrastructure.trend.weeklyAverage * 7)}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Monthly Projection</p>
                <p className="text-2xl font-bold">{formatCurrency(infrastructure.trend.monthlyProjection)}</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Previous Month</p>
                <p className="text-2xl font-bold">{formatCurrency(infrastructure.trend.previousMonthTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Note */}
      <p className="text-sm text-muted-foreground text-center">
        Data shown uses mock values for demonstration. Connect GCP Billing Export to BigQuery for real data.
        Set <code className="bg-muted px-1 rounded">GCP_PROJECT_ID</code> and configure billing export.
      </p>
    </div>
  );
}
