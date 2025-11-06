import { StoreData, DashboardData, DataSet, PeriodType, ModeType } from './types';

export async function loadDashboardData(): Promise<StoreData> {
  const response = await fetch('/dashboard_data.json');
  if (!response.ok) {
    throw new Error('Failed to load dashboard data');
  }
  return response.json();
}

export function getKey(period: PeriodType, mode: ModeType): string {
  return `${period}__${mode}`;
}

export function getCurrentPack(store: StoreData, period: PeriodType, mode: ModeType): DashboardData {
  return store[getKey(period, mode)];
}

export function getDataSet(
  store: StoreData,
  period: PeriodType,
  mode: ModeType,
  month: string,
  week: string
): DataSet {
  const pack = getCurrentPack(store, period, mode);

  // If "All months" selected, return all data
  if (month === '__ALL__') return pack.all;

  // Get the month data
  const monthData = pack.by_month[month] || pack.all;

  // If "Entire month" selected or no weeks available, return month data
  if (week === '__ALL__' || !monthData.by_week) return monthData;

  // Return specific week data
  return monthData.by_week[week] || monthData;
}

export function getAvailableMonths(store: StoreData, period: PeriodType, mode: ModeType): string[] {
  const pack = getCurrentPack(store, period, mode);
  return Object.keys(pack.by_month || {}).sort();
}

export function getAvailableWeeks(
  store: StoreData,
  period: PeriodType,
  mode: ModeType,
  month: string
): string[] {
  if (month === '__ALL__') return [];

  const pack = getCurrentPack(store, period, mode);
  const monthData = pack.by_month[month];

  if (!monthData || !monthData.by_week) return [];

  return Object.keys(monthData.by_week).sort();
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDecimal(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  return value.toFixed(decimals);
}

export function formatWeekLabel(weekKey: string): string {
  const dayRanges: { [key: string]: string } = {
    '1': 'Days 1-7',
    '2': 'Days 8-14',
    '3': 'Days 15-21',
    '4': 'Days 22-28',
    '5': 'Days 29-31'
  };

  const weekNum = weekKey.replace('week_', '');
  const dayRange = dayRanges[weekNum] || `Week ${weekNum}`;
  return `Week ${weekNum} (${dayRange})`;
}
