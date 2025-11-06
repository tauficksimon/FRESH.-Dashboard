'use client';

import { useEffect, useState } from 'react';
import { FilterBar } from '@/components/filter-bar';
import { KPIGrid } from '@/components/kpi-grid';
import { RevenueCostProfitChart } from '@/components/charts/revenue-cost-profit-chart';
import { OrdersAOVChart } from '@/components/charts/orders-aov-chart';
import { CategoryRevenueChart } from '@/components/charts/category-revenue-chart';
import { CustomerAcquisitionChart } from '@/components/charts/customer-acquisition-chart';
import { AdvancedTables } from '@/components/tables/advanced-tables';
import {
  loadDashboardData,
  getDataSet,
  getAvailableMonths,
  getAvailableWeeks,
  getCurrentPack,
} from '@/lib/data-utils';
import { StoreData, PeriodType, ModeType } from '@/lib/types';

export default function DashboardPage() {
  const [store, setStore] = useState<StoreData | null>(null);
  const [period, setPeriod] = useState<PeriodType>('ALL_DATA');
  const [mode, setMode] = useState<ModeType>('ALL_ORDERS');
  const [month, setMonth] = useState<string>('__ALL__');
  const [week, setWeek] = useState<string>('__ALL__');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Load data on mount
  useEffect(() => {
    loadDashboardData()
      .then((data) => {
        setStore(data);
        setLastUpdated(new Date().toLocaleString());
      })
      .catch((error) => {
        console.error('Failed to load dashboard data:', error);
      });
  }, []);

  // Reset week when month changes to "All months"
  useEffect(() => {
    if (month === '__ALL__') {
      setWeek('__ALL__');
    }
  }, [month]);

  if (!store) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const availableMonths = getAvailableMonths(store, period, mode);
  const availableWeeks = getAvailableWeeks(store, period, mode, month);
  const currentData = getDataSet(store, period, mode, month, week);
  const currentPack = getCurrentPack(store, period, mode);

  return (
    <div className="hidden flex-col md:flex">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex h-16 items-center px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              F
            </div>
            <div>
              <h2 className="text-lg font-bold">FRESH</h2>
              <span className="text-xs text-muted-foreground">Dry Cleaning Analytics</span>
            </div>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <FilterBar
              period={period}
              mode={mode}
              month={month}
              week={week}
              availableMonths={availableMonths}
              availableWeeks={availableWeeks}
              onPeriodChange={setPeriod}
              onModeChange={setMode}
              onMonthChange={setMonth}
              onWeekChange={setWeek}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 p-8 pt-6 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              Overview of your business performance metrics
            </p>
          </div>
          {lastUpdated && (
            <div className="text-sm text-muted-foreground bg-background px-3 py-1.5 rounded-md border">
              Last updated: {lastUpdated}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* KPIs */}
          <KPIGrid data={currentData.kpis} customerData={currentData.advanced?.customer} />

          {/* Charts Grid - Better proportions */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueCostProfitChart data={currentData.series} />
            </div>
            <div>
              <OrdersAOVChart data={currentData.series} />
            </div>
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <CategoryRevenueChart data={currentData.category} />
            <CustomerAcquisitionChart monthlyData={currentPack.by_month} />
          </div>

          {/* Advanced Tables */}
          <AdvancedTables data={currentData.advanced} kpiData={currentData.kpis} />
        </div>
      </div>
    </div>
  );
}
