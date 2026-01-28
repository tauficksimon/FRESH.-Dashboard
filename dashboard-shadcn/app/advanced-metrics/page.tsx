'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  AlertTriangle,
  DollarSign,
  UserX,
  Calendar,
  TrendingUp,
  Clock,
  Crown,
  RefreshCw,
  UserPlus,
  Target,
} from 'lucide-react';

interface Customer {
  customer_id: string;
  name: string;
  email: string;
  ltv: number;
  orders: number;
  aov: number;
  first_order: string;
  last_order: string;
  days_since_last: number;
  segment: string;
}

interface ChurnPrediction {
  customer_id: string;
  name: string;
  email: string;
  last_order: string;
  expected_next: string;
  days_overdue: number;
  churn_risk: number;
  avg_order_interval: number;
}

interface CohortMonth {
  count: number;
  rate: number;
}

interface Cohort {
  cohort: string;
  size: number;
  months: Record<string, CohortMonth>;
}

interface PredictiveLTV {
  customer_id: string;
  name: string;
  email: string;
  order_count: number;
  current_ltv: number;
  predicted_ltv: number;
  potential_score: number;
  potential_category: string;
  first_order_value: number;
  days_to_second_order?: number;
}

interface SeasonalPatterns {
  monthly: Array<{
    month: string;
    orders: number;
    revenue: number;
    avg_order_value: number;
  }>;
  daily: Array<{
    day: string;
    orders: number;
    revenue: number;
    avg_order_value: number;
  }>;
  hourly: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  current_month_projection?: {
    month: string;
    current_orders: number;
    current_revenue: number;
    projected_orders: number;
    projected_revenue: number;
    days_elapsed: number;
    days_remaining: number;
    daily_run_rate: number;
    growth_rate: number;
  };
  forecast_7_days: Array<{
    date: string;
    day: string;
    predicted_orders: number;
    confidence_low: number;
    confidence_high: number;
  }>;
  insights: {
    busiest_month: string;
    slowest_month: string;
    busiest_day: string;
    slowest_day: string;
    peak_hours: Array<{ hour: number; orders: number }>;
  };
}

interface UnitEconomicsMonth {
  month: string;
  orders: number;
  revenue_per_order: number;
  fixed_cost_per_order: number;
  contribution_margin: number;
  total_fixed_costs: number;
  break_even_orders: number;
}

interface AdvancedMetrics {
  ltv: {
    customers: Customer[];
    segment_stats: Record<string, { count: number; revenue: number }>;
    top_10: Customer[];
    at_risk: Customer[];
    churned: Customer[];
    avg_ltv?: number;
    avg_vip_ltv?: number;
    avg_repeat_ltv?: number;
    avg_first_time_ltv?: number;
    vip_count?: number;
    repeat_count?: number;
    first_time_count?: number;
  };
  cohorts: Cohort[];
  churn: ChurnPrediction[];
  unit_economics: {
    monthly: UnitEconomicsMonth[];
    fixed_costs: Record<string, number>;
  };
  order_interval: {
    avg_days: number;
    median_days: number;
    min_days: number;
    max_days: number;
    total_repeat_customers: number;
  };
  predictive_ltv: {
    predictions: PredictiveLTV[];
    high_potential: PredictiveLTV[];
    avg_loyal_ltv: number;
    total_predicted: number;
  };
  seasonal_patterns: SeasonalPatterns;
  cac?: {
    monthly: Array<{
      month: string;
      new_customers: number;
      ad_spend: number;
      cac: number;
    }>;
    total_ad_spend: number;
    avg_new_customers_per_month: number;
    avg_cac: number;
    total_new_customers: number;
    default_monthly_spend: number;
  };
}

export default function AdvancedMetrics() {
  const [data, setData] = useState<AdvancedMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/advanced_metrics.json')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load metrics:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading advanced metrics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Failed to load metrics</div>
      </div>
    );
  }

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'VIP': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Loyal': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Active': return 'bg-green-100 text-green-800 border-green-300';
      case 'At-Risk': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Churned': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Metrics</h1>
        <p className="text-muted-foreground">
          Customer insights, retention analysis, and predictive analytics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.ltv.customers.length}</div>
            <p className="text-xs text-muted-foreground">
              {data.ltv.segment_stats.VIP?.count || 0} VIP customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Interval</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.order_interval.avg_days} days</div>
            <p className="text-xs text-muted-foreground">
              Median: {data.order_interval.median_days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.ltv.at_risk.length}</div>
            <p className="text-xs text-muted-foreground">
              Need attention soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Churn Risk</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.churn.filter(c => c.churn_risk >= 60).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.churn.filter(c => c.churn_risk >= 80).length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer LTV</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.ltv.avg_ltv?.toFixed(0) || (data.ltv.customers.reduce((sum, c) => sum + c.ltv, 0) / data.ltv.customers.length).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.ltv.customers.length} customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LTV Breakdown by Customer Type */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customer LTV</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.ltv.avg_vip_ltv?.toFixed(0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.ltv.vip_count || 0} VIP customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customer LTV</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.ltv.avg_repeat_ltv?.toFixed(0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.ltv.repeat_count || 0} repeat customers (2+ orders)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First-Time Customer LTV</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.ltv.avg_first_time_ltv?.toFixed(0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.ltv.first_time_count || 0} one-time customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CAC & LTV:CAC Ratio */}
      {data.cac && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CAC</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data.cac.avg_cac?.toFixed(2) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Cost per new customer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LTV:CAC Ratio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.cac.avg_cac > 0 ? ((data.ltv.avg_ltv || 67) / data.cac.avg_cac).toFixed(1) : 0}:1
              </div>
              <p className="text-xs text-muted-foreground">
                Target: 3:1 or higher
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ad Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data.cac.total_ad_spend?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Google Ads (all time)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg New Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.cac.avg_new_customers_per_month?.toFixed(0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Per month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Customers by LTV</CardTitle>
          <CardDescription>Your most valuable customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.ltv.top_10.map((customer, idx) => (
              <div key={customer.customer_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${customer.ltv.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.orders} orders • ${customer.aov.toFixed(0)} AOV
                  </p>
                </div>
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getSegmentColor(customer.segment)}`}>
                    {customer.segment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Churn Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Churn Predictions</CardTitle>
          <CardDescription>
            Customers at risk (20-80% churn probability) - Click to expand each category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const actionableChurn = data.churn.filter(c => c.churn_risk >= 20 && c.churn_risk < 90);
            const criticalChurn = actionableChurn.filter(c => c.churn_risk >= 60);
            const mediumChurn = actionableChurn.filter(c => c.churn_risk >= 40 && c.churn_risk < 60);
            const earlyChurn = actionableChurn.filter(c => c.churn_risk < 40);

            if (actionableChurn.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-lg">No customers at immediate risk</p>
                  <p className="text-sm mt-2">All customers are either active or already churned.</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Critical Risk Section */}
                {criticalChurn.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full text-sm font-medium border">
                            Critical Risk (60-80%)
                          </span>
                          <span className="text-sm text-muted-foreground">{criticalChurn.length} customers</span>
                        </div>
                        <p className="text-sm text-muted-foreground">30-60 days overdue</p>
                      </div>
                    </summary>
                    <div className="mt-4 space-y-2 pl-4">
                      {criticalChurn.map((customer) => (
                        <div key={customer.customer_id} className="flex items-center justify-between p-3 border-l-2 border-muted bg-muted/20 rounded-r">
                          <div className="flex-1">
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                          <div className="flex-1 text-center text-sm">
                            <p>Last: {customer.last_order}</p>
                            <p className="text-muted-foreground">{customer.days_overdue} days overdue</p>
                          </div>
                          <div className="flex-1 text-center text-sm">
                            <p className="text-muted-foreground">Orders every {customer.avg_order_interval} days</p>
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-lg font-semibold">{customer.churn_risk}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Medium Risk Section */}
                {mediumChurn.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full text-sm font-medium border">
                            Medium Risk (40-60%)
                          </span>
                          <span className="text-sm text-muted-foreground">{mediumChurn.length} customers</span>
                        </div>
                        <p className="text-sm text-muted-foreground">14-30 days overdue</p>
                      </div>
                    </summary>
                    <div className="mt-4 space-y-2 pl-4">
                      {mediumChurn.map((customer) => (
                        <div key={customer.customer_id} className="flex items-center justify-between p-3 border-l-2 border-muted bg-muted/20 rounded-r">
                          <div className="flex-1">
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                          <div className="flex-1 text-center text-sm">
                            <p>Last: {customer.last_order}</p>
                            <p className="text-muted-foreground">{customer.days_overdue} days overdue</p>
                          </div>
                          <div className="flex-1 text-center text-sm">
                            <p className="text-muted-foreground">Orders every {customer.avg_order_interval} days</p>
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-lg font-semibold">{customer.churn_risk}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Early Warning Section */}
                {earlyChurn.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full text-sm font-medium border">
                            Early Warning (20-40%)
                          </span>
                          <span className="text-sm text-muted-foreground">{earlyChurn.length} customers</span>
                        </div>
                        <p className="text-sm text-muted-foreground">7-14 days overdue</p>
                      </div>
                    </summary>
                    <div className="mt-4 space-y-2 pl-4">
                      {earlyChurn.map((customer) => (
                        <div key={customer.customer_id} className="flex items-center justify-between p-3 border-l-2 border-muted bg-muted/20 rounded-r">
                          <div className="flex-1">
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                          <div className="flex-1 text-center text-sm">
                            <p>Last: {customer.last_order}</p>
                            <p className="text-muted-foreground">{customer.days_overdue} days overdue</p>
                          </div>
                          <div className="flex-1 text-center text-sm">
                            <p className="text-muted-foreground">Orders every {customer.avg_order_interval} days</p>
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-lg font-semibold">{customer.churn_risk}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Cohort Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Retention Analysis</CardTitle>
          <CardDescription>Customer retention by signup month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cohort</th>
                  <th className="text-right p-2">Size</th>
                  <th className="text-right p-2">M0</th>
                  <th className="text-right p-2">M1</th>
                  <th className="text-right p-2">M2</th>
                  <th className="text-right p-2">M3</th>
                  <th className="text-right p-2">M4</th>
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((cohort) => (
                  <tr key={cohort.cohort} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{cohort.cohort}</td>
                    <td className="text-right p-2">{cohort.size}</td>
                    <td className="text-right p-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        100%
                      </span>
                    </td>
                    {['M1', 'M2', 'M3', 'M4'].map((month) => (
                      <td key={month} className="text-right p-2">
                        {cohort.months[month] ? (
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: `rgba(34, 197, 94, ${cohort.months[month].rate / 100})`,
                              color: cohort.months[month].rate > 50 ? 'white' : 'black'
                            }}
                          >
                            {cohort.months[month].rate}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
          <CardDescription>Distribution of customer types - Click to see customers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.ltv.segment_stats).map(([segment, stats]) => {
              const customersInSegment = data.ltv.customers.filter(c => c.segment === segment);

              return (
                <details key={segment} className="group">
                  <summary className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getSegmentColor(segment)}`}>
                          {segment}
                        </span>
                        <div>
                          <p className="text-2xl font-bold inline">{stats.count}</p>
                          <span className="text-sm text-muted-foreground ml-2">customers</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">${stats.revenue.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Total revenue</p>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 space-y-2 pl-4">
                    {customersInSegment.map((customer) => (
                      <div key={customer.customer_id} className="flex items-center justify-between p-3 border-l-2 border-muted bg-muted/20 rounded-r">
                        <div className="flex-1">
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        </div>
                        <div className="flex-1 text-center text-sm">
                          <p className="font-semibold">${customer.ltv.toFixed(2)} LTV</p>
                          <p className="text-muted-foreground">{customer.orders} orders • ${customer.aov.toFixed(0)} AOV</p>
                        </div>
                        <div className="flex-1 text-right text-sm">
                          <p>Last: {customer.last_order}</p>
                          <p className={customer.days_since_last > 60 ? 'text-red-500' : 'text-muted-foreground'}>
                            {customer.days_since_last} days ago
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal & Time-Based Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Seasonal & Time-Based Patterns
          </CardTitle>
          <CardDescription>
            When your customers order - optimize staffing and promotions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Month Projection */}
          {data.seasonal_patterns.current_month_projection && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {data.seasonal_patterns.current_month_projection.month} Projection
                </CardTitle>
                <CardDescription>
                  Day {data.seasonal_patterns.current_month_projection.days_elapsed} of {data.seasonal_patterns.current_month_projection.days_elapsed + data.seasonal_patterns.current_month_projection.days_remaining} • {data.seasonal_patterns.current_month_projection.days_remaining} days remaining
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Orders</p>
                    <p className="text-2xl font-bold">{data.seasonal_patterns.current_month_projection.current_orders}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.seasonal_patterns.current_month_projection.daily_run_rate} orders/day
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Projected Total</p>
                    <p className="text-2xl font-bold">{data.seasonal_patterns.current_month_projection.projected_orders}</p>
                    <p className="text-xs text-muted-foreground">
                      +{data.seasonal_patterns.current_month_projection.projected_orders - data.seasonal_patterns.current_month_projection.current_orders} more expected
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Growth Trend</p>
                    <p className={`text-2xl font-bold ${data.seasonal_patterns.current_month_projection.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.seasonal_patterns.current_month_projection.growth_rate > 0 ? '+' : ''}{data.seasonal_patterns.current_month_projection.growth_rate}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      vs previous 4 weeks
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current Revenue</p>
                    <p className="text-2xl font-bold">${data.seasonal_patterns.current_month_projection.current_revenue.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Projected Revenue</p>
                    <p className="text-2xl font-bold">${data.seasonal_patterns.current_month_projection.projected_revenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 7-Day Forecast */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>7-Day Forecast</CardTitle>
              <CardDescription>
                Predicted orders for the next week based on historical patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {data.seasonal_patterns.forecast_7_days.map((forecast) => (
                  <Card key={forecast.date} className="text-center">
                    <CardContent className="pt-4 pb-4 px-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {forecast.day.slice(0, 3)}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(forecast.date).getDate()}
                      </p>
                      <p className="text-2xl font-bold">{forecast.predicted_orders}</p>
                      <p className="text-xs text-muted-foreground mt-1">orders</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {forecast.confidence_low}-{forecast.confidence_high}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <p className="text-sm text-center text-muted-foreground">
                  Total projected: <span className="font-semibold text-foreground">
                    {data.seasonal_patterns.forecast_7_days.reduce((sum, f) => sum + f.predicted_orders, 0)} orders
                  </span> over next 7 days
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  Range: {data.seasonal_patterns.forecast_7_days.reduce((sum, f) => sum + f.confidence_low, 0)}-{data.seasonal_patterns.forecast_7_days.reduce((sum, f) => sum + f.confidence_high, 0)} orders
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Busiest Month</p>
              <p className="text-lg font-bold">{data.seasonal_patterns.insights.busiest_month}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Slowest Month</p>
              <p className="text-lg font-bold">{data.seasonal_patterns.insights.slowest_month}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Busiest Day</p>
              <p className="text-lg font-bold">{data.seasonal_patterns.insights.busiest_day}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Peak Hours</p>
              <p className="text-lg font-bold">
                {data.seasonal_patterns.insights.peak_hours.map(h => h.hour).join(', ')}:00
              </p>
            </div>
          </div>

          {/* Monthly Patterns */}
          <details className="group mb-4">
            <summary className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Monthly Trends</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Month</th>
                    <th className="text-right p-2">Orders</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {data.seasonal_patterns.monthly.map((month) => (
                    <tr key={month.month} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{month.month}</td>
                      <td className="text-right p-2">{month.orders}</td>
                      <td className="text-right p-2">${month.revenue.toFixed(2)}</td>
                      <td className="text-right p-2">${month.avg_order_value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {/* Daily Patterns */}
          <details className="group mb-4">
            <summary className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Day of Week Patterns</span>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Day</th>
                    <th className="text-right p-2">Orders</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">AOV</th>
                  </tr>
                </thead>
                <tbody>
                  {data.seasonal_patterns.daily.map((day) => (
                    <tr key={day.day} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{day.day}</td>
                      <td className="text-right p-2">{day.orders}</td>
                      <td className="text-right p-2">${day.revenue.toFixed(2)}</td>
                      <td className="text-right p-2">${day.avg_order_value.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {/* Hourly Patterns */}
          <details className="group">
            <summary className="cursor-pointer p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Hourly Order Distribution</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </summary>
            <div className="mt-4">
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {data.seasonal_patterns.hourly.map((hour) => (
                  <div
                    key={hour.hour}
                    className="p-2 border rounded text-center hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground">{hour.hour}:00</p>
                    <p className="font-bold text-sm">{hour.orders}</p>
                    <p className="text-xs text-muted-foreground">${hour.revenue.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
