import { KPICard } from './kpi-card';
import { KPIData } from '@/lib/types';
import { formatCurrency, formatPercent, formatNumber, formatDecimal } from '@/lib/data-utils';

interface KPIGridProps {
  data: KPIData;
  customerData?: {
    unique_customers?: number;
    new_customers?: number;
    returning_customers?: number;
    new_share_pct?: number;
  };
}

export function KPIGrid({ data, customerData }: KPIGridProps) {
  // Calculate returning metrics
  const uniqC = Number(customerData?.unique_customers ?? data?.unique_customers ?? 0);
  const newC = Number(customerData?.new_customers ?? 0);
  const returningC = Number(customerData?.returning_customers ?? Math.max(0, uniqC - newC));
  let returningShare = (uniqC > 0) ? (100 * returningC / uniqC) : 0;
  if (typeof customerData?.new_share_pct === 'number') {
    returningShare = 100 - Number(customerData.new_share_pct);
  }
  const ratio = (newC > 0) ? (returningC / newC) : 0;

  const dryCleanItems = Math.round(data?.dry_clean_items || 0);
  const wfLbs = Math.round(data?.wf_lbs || 0);
  const itemsDisplay = `${dryCleanItems.toLocaleString()} + ${wfLbs.toLocaleString()} lbs`;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <KPICard
        label="Net Revenue"
        value={formatCurrency(data?.net_revenue)}
        description="Total revenue after adjustments"
      />
      <KPICard
        label="Cost HAAP"
        value={formatCurrency(data?.cost)}
        description="Cost of goods sold"
      />
      <KPICard
        label="Profit"
        value={formatCurrency(data?.profit)}
        description="Net revenue minus costs"
      />
      <KPICard
        label="Gross Margin"
        value={formatPercent(data?.margin_pct)}
        description="Profit percentage"
      />
      <KPICard
        label="Orders"
        value={formatNumber(data?.orders)}
        description="Total completed orders"
      />
      <KPICard
        label="Average Order Value"
        value={formatCurrency(data?.aov)}
        description="Revenue per order"
      />
      <KPICard
        label="Items Processed"
        value={itemsDisplay}
        description="Dry cleaning + W&F pounds"
      />
      <KPICard
        label="Unique Customers"
        value={formatNumber(data?.unique_customers)}
        description="Distinct customer count"
      />
      <KPICard
        label="Express Rate"
        value={formatPercent(data?.express_rate)}
        description="Express order percentage"
      />
      <KPICard
        label="Total Refunds"
        value={formatCurrency(data?.refund_amount)}
        description="Refunded amount"
      />
      <KPICard
        label="Returning Share"
        value={formatPercent(returningShare)}
        description="Returning customer rate"
      />
      <KPICard
        label="Return/New Ratio"
        value={formatDecimal(ratio, 2)}
        description="Customer retention metric"
      />
    </div>
  );
}
