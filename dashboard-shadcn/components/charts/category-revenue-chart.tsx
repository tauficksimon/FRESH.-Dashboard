'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CategoryData } from '@/lib/types';

interface CategoryRevenueChartProps {
  data: CategoryData;
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-4))',
  },
};

export function CategoryRevenueChart({ data }: CategoryRevenueChartProps) {
  let chartData: Array<{ name: string; revenue: number }> = [];

  if (Array.isArray(data)) {
    // Array format
    chartData = data.map((item) => ({
      name: item.category || item.name || 'Unknown',
      revenue: item.revenue || item.value || 0,
    }));
  } else if (data && typeof data === 'object') {
    // Object format
    chartData = Object.entries(data).map(([key, value]) => ({
      name: key,
      revenue: value || 0,
    }));
  }

  // Sort by revenue descending
  chartData.sort((a, b) => b.revenue - a.revenue);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Revenue by Category</CardTitle>
        <CardDescription>
          Top categories ranked by revenue contribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              width={120}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => label}
                />
              }
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
