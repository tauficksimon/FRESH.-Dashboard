export interface KPIData {
  net_revenue?: number;
  cost?: number;
  profit?: number;
  margin_pct?: number;
  orders?: number;
  aov?: number;
  dry_clean_items?: number;
  wf_lbs?: number;
  unique_customers?: number;
  express_rate?: number;
  refund_amount?: number;
}

export interface SeriesData {
  months?: string[];
  Revenue?: number[];
  Cost?: number[];
  Profit?: number[];
  Orders?: number[];
  AOV?: number[];
  revenue?: number[];
  cost?: number[];
  profit?: number[];
  orders?: number[];
  aov?: number[];
}

export type CategoryData =
  | { [key: string]: number }
  | Array<{ category?: string; name?: string; revenue?: number; value?: number }>;

export type PaymentData =
  | { [key: string]: number }
  | Array<{ type?: string; label?: string; count?: number; value?: number }>;

export type StatusData =
  | { [key: string]: number }
  | Array<{ type?: string; label?: string; count?: number; value?: number }>;

export interface AdvancedMetrics {
  revenue_quality: {
    [key: string]: number;
  };
  aov_stats: {
    [key: string]: number;
  };
  customer: {
    [key: string]: number;
  };
  ar: {
    [key: string]: number;
  };
  service_mix: Array<{
    category: string;
    revenue: number;
    orders: number;
    items: number;
    share_pct?: number;
  }>;
  unit_prices: Array<{
    item: string;
    units: number;
    revenue: number;
    unit_price: number;
  }>;
  top_products?: Array<{
    item: string;
    units: number;
    revenue: number;
  }>;
}

export interface DataSet {
  kpis: KPIData;
  series: SeriesData;
  category: CategoryData;
  payment: PaymentData;
  status: StatusData;
  advanced: AdvancedMetrics;
  by_week?: {
    [weekKey: string]: DataSet;
  };
}

export interface MonthData {
  [monthKey: string]: DataSet;
}

export interface DashboardData {
  all: DataSet;
  by_month: MonthData;
}

export interface StoreData {
  [key: string]: DashboardData | Metadata;
  _metadata?: Metadata;
}

export interface Metadata {
  last_updated: string;
  last_updated_display: string;
}

export type PeriodType = 'ALL_DATA';
export type ModeType = 'ALL_ORDERS' | 'PAID_ONLY';
