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

interface OrdersAOVChartProps {
  data: SeriesData;
}

const chartConfig = {
  orders: {
    label: 'Orders',
    color: 'hsl(var(--chart-1))',
  },
  aov: {
    label: 'AOV',
    color: 'hsl(var(--chart-4))',
  },
};

export function OrdersAOVChart({ data }: OrdersAOVChartProps) {
  const labels = data?.months || [];
  const orders = data?.Orders || data?.orders || [];
  const aovs = data?.AOV || data?.aov || [];

  const chartData = labels.map((label: string, index: number) => ({
    name: label,
    orders: orders[index] || 0,
    aov: aovs[index] || 0,
  }));

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Orders & Average Order Value</CardTitle>
        <CardDescription>
          Volume and value per order trends
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
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) =>
                    name === 'aov'
                      ? `$${Number(value).toFixed(2)}`
                      : Number(value).toLocaleString()
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="left"
              dataKey="orders"
              fill="var(--color-orders)"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="aov"
              stroke="var(--color-aov)"
              strokeWidth={3}
              dot={{
                fill: 'var(--color-aov)',
                r: 4,
              }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
