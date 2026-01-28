'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/kpi-card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { ArrowLeft, TrendingUp } from 'lucide-react';

interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
  revenue_mom: number | null;
  velocity: number;  // orders per hour
  efficiency: number;  // revenue per hour
  adjusted_days: number;  // exact adjusted days for this month
  orders_per_day: number;  // using exact adjusted_days
  revenue_per_day: number;  // using exact adjusted_days
  // Compelling growth metrics
  cumulative_revenue: number;
  cumulative_orders: number;
  revenue_growth_from_start: number;  // % vs first month
  orders_growth_from_start: number;
  revenue_multiplier: number;  // x times first month
  orders_multiplier: number;
  revenue_3mo_avg: number;
  orders_3mo_avg: number;
}

interface GrowthMetrics {
  summary: {
    total_revenue: number;
    cmgr: number;
    orders_per_hour: number;
    revenue_per_hour: number;
    orders_per_day: number;
    revenue_per_day: number;
    adjusted_days: number;
    // Compelling growth metrics
    revenue_multiplier: number;
    orders_multiplier: number;
    total_revenue_growth_pct: number;
    total_orders_growth_pct: number;
    first_month_revenue: number;
    last_month_revenue: number;
    first_month_orders: number;
    last_month_orders: number;
    // Growth acceleration
    prev_month_revenue: number;
    slope_change: number;
    slope_change_pct: number;
  };
  monthly: MonthlyData[];
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-1))',
  },
  growth: {
    label: 'Growth from Start',
    color: 'hsl(142, 76%, 36%)',  // Green for positive growth
  },
  cumulative: {
    label: 'Cumulative Revenue',
    color: 'hsl(221, 83%, 53%)',  // Blue
  },
  rolling: {
    label: '3-Mo Avg',
    color: 'hsl(262, 83%, 58%)',  // Purple
  },
};

export default function GrowthPage() {
  const [data, setData] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'hour' | 'day'>('day');
  const [chartView, setChartView] = useState<'standard' | 'cumulative' | 'growth'>('growth');

  useEffect(() => {
    fetch('/growth_metrics.json')
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
        <div className="text-lg">Loading growth metrics...</div>
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

  // Standard chart data with multiple views
  const chartData = data.monthly.map(m => ({
    name: m.month.replace('2025-', '').replace('2026-', ''),
    revenue: m.revenue,
    growth: m.revenue_mom || 0,
    cumulative: m.cumulative_revenue,
    growthFromStart: m.revenue_growth_from_start,
    rolling3mo: m.revenue_3mo_avg,
    multiplier: m.revenue_multiplier,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Growth</h1>
        <p className="text-muted-foreground">
          Business health at a glance
        </p>
      </div>

      {/* GROWTH STORY - The Big Picture */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Growth Summary</CardTitle>
          <CardDescription>
            Since launch in July 2025
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {data.summary.revenue_multiplier}x
              </div>
              <div className="text-sm text-muted-foreground">Revenue Growth</div>
              <div className="text-xs text-muted-foreground mt-1">
                ${data.summary.first_month_revenue.toLocaleString()} → ${data.summary.last_month_revenue.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {data.summary.orders_multiplier}x
              </div>
              <div className="text-sm text-muted-foreground">Order Growth</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.summary.first_month_orders} → {data.summary.last_month_orders} orders/mo
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                +{data.summary.total_revenue_growth_pct}%
              </div>
              <div className="text-sm text-muted-foreground">Total Growth</div>
              <div className="text-xs text-muted-foreground mt-1">
                From first to current month
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {data.summary.cmgr}%
              </div>
              <div className="text-sm text-muted-foreground">CMGR</div>
              <div className="text-xs text-muted-foreground mt-1">
                Compound monthly growth
              </div>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold ${data.summary.slope_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.summary.slope_change >= 0 ? '+' : ''}{data.summary.slope_change_pct}%
              </div>
              <div className="text-sm text-muted-foreground">Acceleration</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.summary.slope_change >= 0 ? 'Growing faster' : 'Slowing down'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          label="Velocity"
          value={`${data.summary.orders_per_day} orders/day`}
          description="Current operational velocity"
        />
        <KPICard
          label="Efficiency"
          value={`$${data.summary.revenue_per_day.toLocaleString()}/day`}
          description="Revenue per day open"
        />
        <KPICard
          label="Total Revenue"
          value={`$${data.summary.total_revenue.toLocaleString()}`}
          description="All-time earnings"
        />
      </div>

      {/* Monthly Revenue Chart - Multiple Views */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue Visualization</CardTitle>
            <CardDescription>
              {chartView === 'growth' && 'Growth from starting month - shows total progress'}
              {chartView === 'cumulative' && 'Cumulative (area) + rate of change (yellow line) - rising line = accelerating'}
              {chartView === 'standard' && 'Monthly with MoM % change'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setChartView('growth')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chartView === 'growth'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Growth
            </button>
            <button
              onClick={() => setChartView('cumulative')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chartView === 'cumulative'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Cumulative
            </button>
            <button
              onClick={() => setChartView('standard')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chartView === 'standard'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Monthly
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {/* GROWTH VIEW - Default, most compelling */}
          {chartView === 'growth' && (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  yAxisId="revenue"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="revenue"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === 'revenue') {
                          return [`$${Number(value).toLocaleString()}`, 'Revenue'];
                        }
                        return [`$${Number(value).toLocaleString()}`, '3-Mo Avg'];
                      }}
                    />
                  }
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="rolling3mo"
                  stroke="hsl(45, 93%, 47%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="rolling3mo"
                />
              </ComposedChart>

            </ChartContainer>
          )}

          {/* CUMULATIVE VIEW - Shows cumulative + rate of change */}
          {chartView === 'cumulative' && (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  yAxisId="cumulative"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="growth"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  domain={[-50, 100]}
                />
                <ReferenceLine yAxisId="growth" y={0} stroke="#888" strokeDasharray="3 3" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === 'cumulative') {
                          return [`$${Number(value).toLocaleString()}`, 'Total Revenue'];
                        }
                        return [`${Number(value).toFixed(1)}%`, 'Rate of Change (MoM)'];
                      }}
                    />
                  }
                />
                <Area
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={3}
                  fill="url(#cumulativeGradient)"
                  name="cumulative"
                />
                <Line
                  yAxisId="growth"
                  type="monotone"
                  dataKey="growth"
                  stroke="hsl(45, 93%, 47%)"
                  strokeWidth={2}
                  dot={{
                    fill: 'hsl(45, 93%, 47%)',
                    r: 4,
                    strokeWidth: 0,
                  }}
                  name="growth"
                />
              </ComposedChart>
            </ChartContainer>
          )}

          {/* STANDARD VIEW - Monthly + MoM % */}
          {chartView === 'standard' && (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  yAxisId="revenue"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="growth"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  domain={[-50, 100]}
                />
                <ReferenceLine yAxisId="growth" y={0} stroke="#888" strokeDasharray="3 3" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === 'revenue') {
                          return [`$${Number(value).toLocaleString()}`, 'Revenue'];
                        }
                        return [`${Number(value).toFixed(1)}%`, 'MoM Growth'];
                      }}
                    />
                  }
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="growth"
                  type="monotone"
                  dataKey="growth"
                  stroke="var(--color-growth)"
                  strokeWidth={3}
                  dot={{
                    fill: 'var(--color-growth)',
                    r: 5,
                    strokeWidth: 2,
                  }}
                />
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Monthly Comparison Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Monthly Breakdown</CardTitle>
            <CardDescription>Compare KPIs across all months</CardDescription>
          </div>
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('hour')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'hour'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Per Hour
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'day'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Per Day
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Month</th>
                  <th className="text-right p-3 font-medium">Revenue</th>
                  <th className="text-right p-3 font-medium">MoM %</th>
                  <th className="text-right p-3 font-medium">
                    Velocity {viewMode === 'hour' ? '(/hr)' : '(/day)'}
                  </th>
                  <th className="text-right p-3 font-medium">
                    Efficiency {viewMode === 'hour' ? '(/hr)' : '(/day)'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((m, idx) => (
                  <tr key={m.month} className={`border-b hover:bg-muted/50 ${idx === data.monthly.length - 1 ? 'bg-primary/5 font-medium' : ''}`}>
                    <td className="p-3">{m.month}</td>
                    <td className="text-right p-3">${m.revenue.toLocaleString()}</td>
                    <td className={`text-right p-3 ${m.revenue_mom === null ? '' : m.revenue_mom >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.revenue_mom !== null ? `${m.revenue_mom > 0 ? '+' : ''}${m.revenue_mom.toFixed(1)}%` : '—'}
                    </td>
                    <td className="text-right p-3">
                      {viewMode === 'hour'
                        ? `${m.velocity.toFixed(2)}`
                        : `${m.orders_per_day.toFixed(1)}`}
                    </td>
                    <td className="text-right p-3">
                      {viewMode === 'hour'
                        ? `$${m.efficiency.toFixed(0)}`
                        : `$${m.revenue_per_day.toLocaleString()}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
