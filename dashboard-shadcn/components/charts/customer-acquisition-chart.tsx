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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface MonthData {
  kpis: {
    unique_customers?: number;
    new_customers?: number;
    returning_customers?: number;
  };
}

interface CustomerAcquisitionChartProps {
  monthlyData: { [key: string]: MonthData };
}

const chartConfig = {
  new: {
    label: 'New Customers',
    color: 'hsl(217 91% 60%)',
  },
  returning: {
    label: 'Returning Customers',
    color: 'hsl(217 91% 75%)',
  },
};

export function CustomerAcquisitionChart({ monthlyData }: CustomerAcquisitionChartProps) {
  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyData).sort();

  const chartData = sortedMonths.map((month) => {
    const data = monthlyData[month];
    const newCustomers = data.kpis?.new_customers || 0;
    const returningCustomers = data.kpis?.returning_customers || 0;

    return {
      name: month,
      new: newCustomers,
      returning: returningCustomers,
    };
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Customer Acquisition</CardTitle>
        <CardDescription>
          New vs. returning customer breakdown over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <AreaChart data={chartData}>
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
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const labels: { [key: string]: string } = {
                      new: 'New',
                      returning: 'Returning',
                    };
                    return [Number(value).toLocaleString(), labels[name as string] || name];
                  }}
                  labelFormatter={(label) => `Month: ${label}`}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="returning"
              stackId="1"
              stroke="var(--color-returning)"
              fill="var(--color-returning)"
              fillOpacity={0.8}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="new"
              stackId="1"
              stroke="var(--color-new)"
              fill="var(--color-new)"
              fillOpacity={0.8}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
