import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdvancedMetrics, KPIData } from '@/lib/types';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/data-utils';

interface AdvancedTablesProps {
  data: AdvancedMetrics;
  kpiData?: KPIData;
}

export function AdvancedTables({ data, kpiData }: AdvancedTablesProps) {
  const { revenue_quality, aov_stats, customer, ar, service_mix, unit_prices, top_products } = data;

  // Calculate Financial Quality with Cost breakdown
  const grossSales = revenue_quality.gross_sales || 0;
  const subscriptionRevenue = kpiData?.subscription_revenue || 0;
  const refunds = revenue_quality.refunds || 0;
  const discounts = revenue_quality.discounts || 0;
  const tips = revenue_quality.tips || 0;
  const tax = revenue_quality.tax || 0;
  const netRevenue = revenue_quality.net_revenue || 0;

  // Get cost from KPI data
  const totalCost = kpiData?.cost || 0;
  const profit = netRevenue - totalCost;
  const marginPct = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  const financialRows = [
    { label: 'Gross Sales', value: grossSales, format: 'currency' },
    { label: 'Subscription Revenue', value: subscriptionRevenue, format: 'currency', highlight: 'positive' },
    { label: 'Refunds', value: -refunds, format: 'currency', highlight: 'negative' },
    { label: 'Discounts', value: -discounts, format: 'currency', highlight: 'negative' },
    { label: 'Tips', value: tips, format: 'currency' },
    { label: 'Tax', value: tax, format: 'currency' },
    { label: 'Net Revenue', value: netRevenue, format: 'currency', highlight: 'total', bold: true },
    { label: '', value: null, format: 'separator' },
    { label: 'HAAP Cost', value: -totalCost, format: 'currency', highlight: 'negative' },
    { label: '', value: null, format: 'separator' },
    { label: 'Profit', value: profit, format: 'currency', highlight: 'total', bold: true },
    { label: 'Gross Margin %', value: marginPct, format: 'percent', bold: true },
  ];

  return (
    <div className="grid gap-6">
      {/* Financial Quality Table */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle>Financial Quality</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12">Metric</TableHead>
                <TableHead className="text-right h-12">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialRows.map((row, index) => {
                if (row.format === 'separator') {
                  return (
                    <TableRow key={`sep-${index}`} className="hover:bg-transparent">
                      <TableCell colSpan={2} className="py-0 h-2"></TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow
                    key={row.label}
                    className={`border-b last:border-0 ${row.highlight === 'total' ? 'bg-muted/30' : ''}`}
                  >
                    <TableCell className={`py-4 ${row.bold ? 'font-bold' : 'font-medium'}`}>
                      {row.label}
                    </TableCell>
                    <TableCell
                      className={`text-right py-4 font-mono ${
                        row.bold ? 'font-bold text-base' : ''
                      } ${
                        row.highlight === 'negative' ? 'text-red-600 dark:text-red-400' : ''
                      } ${
                        row.highlight === 'positive' ? 'text-green-600 dark:text-green-400' : ''
                      } ${
                        row.highlight === 'total' ? 'text-foreground' : ''
                      }`}
                    >
                      {row.format === 'currency'
                        ? formatCurrency(row.value || 0)
                        : row.format === 'percent'
                        ? formatPercent(row.value || 0)
                        : row.value}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* AOV Distribution & Margin */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle>AOV Distribution & Margin</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12">Metric</TableHead>
                  <TableHead className="text-right h-12">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(aov_stats).map(([key, value]) => (
                  <TableRow key={key} className="border-b last:border-0">
                    <TableCell className="font-medium py-4">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </TableCell>
                    <TableCell className="text-right py-4 font-mono">
                      {key.includes('margin') || key.includes('percent')
                        ? formatPercent(value)
                        : typeof value === 'number'
                        ? formatCurrency(value)
                        : value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Customer Health */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle>Customer Health</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12">Metric</TableHead>
                  <TableHead className="text-right h-12">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(customer).map(([key, value]) => (
                  <TableRow key={key} className="border-b last:border-0">
                    <TableCell className="font-medium py-4">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </TableCell>
                    <TableCell className="text-right py-4 font-mono">
                      {key.includes('rate') ||
                      key.includes('share') ||
                      key.includes('percent')
                        ? formatPercent(value)
                        : typeof value === 'number'
                        ? formatNumber(value)
                        : value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Receivable */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle>Accounts Receivable</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12">Metric</TableHead>
                <TableHead className="text-right h-12">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ar).map(([key, value]) => (
                <TableRow key={key} className="border-b last:border-0">
                  <TableCell className="font-medium py-4">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </TableCell>
                  <TableCell className="text-right py-4 font-mono">
                    {key.includes('share') || key.includes('percent') || key.includes('pct')
                      ? formatPercent(value)
                      : key.includes('orders') || key.includes('count')
                      ? formatNumber(value)
                      : typeof value === 'number'
                      ? formatCurrency(value)
                      : value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Service Mix (Revenue) */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle>Service Mix (Revenue)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12">Category</TableHead>
                <TableHead className="text-right h-12">Revenue</TableHead>
                <TableHead className="text-right h-12">Share %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {service_mix.map((item, index) => (
                <TableRow key={index} className="border-b last:border-0">
                  <TableCell className="font-medium py-4">{item.category}</TableCell>
                  <TableCell className="text-right py-4 font-mono">{formatCurrency(item.revenue || 0)}</TableCell>
                  <TableCell className="text-right py-4 font-mono">{formatPercent(item.share_pct || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Implied Realized Unit Prices (Top 10) */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle>Implied Realized Unit Prices (Top 10)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12">Item</TableHead>
                <TableHead className="text-right h-12">Units</TableHead>
                <TableHead className="text-right h-12">Revenue</TableHead>
                <TableHead className="text-right h-12">Unit Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unit_prices.slice(0, 10).map((item, index) => (
                <TableRow key={index} className="border-b last:border-0">
                  <TableCell className="font-medium py-4">{item.item}</TableCell>
                  <TableCell className="text-right py-4 font-mono">{formatNumber(item.units)}</TableCell>
                  <TableCell className="text-right py-4 font-mono">{formatCurrency(item.revenue)}</TableCell>
                  <TableCell className="text-right py-4 font-mono">{formatCurrency(item.unit_price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top 10 Products by Revenue */}
      {top_products && top_products.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle>Top 10 Products by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12">Item</TableHead>
                  <TableHead className="text-right h-12">Units</TableHead>
                  <TableHead className="text-right h-12">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top_products.slice(0, 10).map((item, index) => (
                  <TableRow key={index} className="border-b last:border-0">
                    <TableCell className="font-medium py-4">{item.item}</TableCell>
                    <TableCell className="text-right py-4 font-mono">{formatNumber(item.units)}</TableCell>
                    <TableCell className="text-right py-4 font-mono">{formatCurrency(item.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
