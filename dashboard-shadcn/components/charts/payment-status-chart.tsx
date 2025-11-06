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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { PaymentData, StatusData } from '@/lib/types';

interface PaymentStatusChartProps {
  paymentData: PaymentData;
  statusData: StatusData;
}

const chartConfig = {
  payment: {
    label: 'Payment',
    color: 'hsl(var(--chart-1))',
  },
  status: {
    label: 'Status',
    color: 'hsl(var(--chart-5))',
  },
};

export function PaymentStatusChart({ paymentData, statusData }: PaymentStatusChartProps) {
  // Parse payment data
  let payLabels: string[] = [];
  let payValues: number[] = [];
  if (Array.isArray(paymentData)) {
    payLabels = paymentData.map((p) => p.type || p.label || 'Unknown');
    payValues = paymentData.map((p) => p.count || p.value || 0);
  } else if (paymentData && typeof paymentData === 'object') {
    payLabels = Object.keys(paymentData);
    payValues = Object.values(paymentData);
  }

  // Parse status data
  let stLabels: string[] = [];
  let stValues: number[] = [];
  if (Array.isArray(statusData)) {
    stLabels = statusData.map((s) => s.type || s.label || 'Unknown');
    stValues = statusData.map((s) => s.count || s.value || 0);
  } else if (statusData && typeof statusData === 'object') {
    stLabels = Object.keys(statusData);
    stValues = Object.values(statusData);
  }

  // Combine all labels
  const allLabels = Array.from(new Set([...payLabels, ...stLabels]));
  const chartData = allLabels.map((label) => {
    const payIndex = payLabels.indexOf(label);
    const stIndex = stLabels.indexOf(label);
    return {
      name: label,
      payment: payIndex >= 0 ? payValues[payIndex] : 0,
      status: stIndex >= 0 ? stValues[stIndex] : 0,
    };
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Payment Mix & Order Status</CardTitle>
        <CardDescription>
          Distribution of payment methods and order statuses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <BarChart data={chartData}>
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
                  formatter={(value) => Number(value).toLocaleString()}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="payment"
              stackId="a"
              fill="var(--color-payment)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="status"
              stackId="a"
              fill="var(--color-status)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
