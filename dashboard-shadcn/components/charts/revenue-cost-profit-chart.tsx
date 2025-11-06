'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { SeriesData } from '@/lib/types';

interface RevenueCostProfitChartProps {
  data: SeriesData;
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-1))',
  },
  cost: {
    label: 'Cost',
    color: 'hsl(var(--chart-3))',
  },
  profit: {
    label: 'Profit',
    color: 'hsl(var(--chart-2))',
  },
};

export function RevenueCostProfitChart({ data }: RevenueCostProfitChartProps) {
  const labels = data?.months || [];
  const revenues = data?.Revenue || data?.revenue || [];
  const costs = data?.Cost || data?.cost || [];
  const profits = data?.Profit || data?.profit || [];

  const chartData = labels.map((label: string, index: number) => ({
    name: label,
    revenue: revenues[index] || 0,
    cost: costs[index] || 0,
    profit: profits[index] || 0,
  }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Revenue, Cost & Profit Trends</CardTitle>
        <CardDescription>
          Track financial performance across time periods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
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
                    const labels: { [key: string]: string } = {
                      revenue: 'Revenue',
                      cost: 'Cost',
                      profit: 'Profit',
                    };
                    return [`$${Number(value).toLocaleString()}`, labels[name as string] || name];
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="cost"
              fill="var(--color-cost)"
              radius={[4, 4, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke="var(--color-profit)"
              strokeWidth={3}
              dot={{
                fill: 'var(--color-profit)',
                r: 4,
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
