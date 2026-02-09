#!/usr/bin/env python3
"""Generate growth metrics JSON for dashboard."""

import pandas as pd
import json
from datetime import datetime, timedelta
import numpy as np
import os

def generate_growth_metrics():
    # 1. Load the MAIN DASHBOARD DATA (Source of Truth)
    # This ensures our revenue numbers match exactly what's shown on the main dashboard
    dashboard_data_path = 'dashboard-shadcn/public/dashboard_data.json'
    
    if os.path.exists(dashboard_data_path):
        with open(dashboard_data_path, 'r') as f:
            dash_data = json.load(f)
            
        print("Loaded source of truth from dashboard_data.json")
        
        # Extract monthly data from the 'ALL_DATA__ALL_ORDERS' dataset
        # This dataset includes all adjustments (Order #954, subscriptions, taxes, etc.)
        source_monthly = dash_data['ALL_DATA__ALL_ORDERS']['by_month']
        
        # Convert dictionary to DataFrame
        monthly_rows = []
        for month_str, data in source_monthly.items():
            if month_str == 'all': continue
            
            kpis = data.get('kpis', {})
            monthly_rows.append({
                'month_str': month_str,
                'orders': kpis.get('orders', 0),
                'revenue': kpis.get('net_revenue', 0), # Using Net Revenue as the standard
                'unique_customers': kpis.get('unique_customers', 0),
                'adjusted_days': data.get('adjusted_days', 0),
                'hours_open': data.get('hours_open', 0)
            })
            
        monthly = pd.DataFrame(monthly_rows)
        monthly['month'] = pd.to_datetime(monthly['month_str']).dt.to_period('M')
        monthly = monthly.sort_values('month').reset_index(drop=True)
        
    else:
        print("WARNING: dashboard_data.json not found. Falling back to raw CSV calculation (may differ from dashboard).")
        # Fallback logic (simplified from before)
        df = pd.read_csv('data/orders.csv')
        df['Placed'] = pd.to_datetime(df['Placed'])
        df['month'] = df['Placed'].dt.to_period('M')
        # ... (rest of fallback would go here, but we prefer the JSON path)
        return generate_growth_metrics_fallback()

    # 2. Load raw data for secondary metrics (weekly, customer mix) which aren't in the summary JSON
    df_raw = pd.read_csv('data/orders.csv')
    df_raw['Placed'] = pd.to_datetime(df_raw['Placed'])
    df_raw['month'] = df_raw['Placed'].dt.to_period('M')

    # === CALCULATE GROWTH METRICS ===

    # Calculate MoM growth using the authoritative numbers
    monthly['revenue_mom'] = monthly['revenue'].pct_change() * 100
    monthly['orders_mom'] = monthly['orders'].pct_change() * 100

    # Helper functions for days/hours (since they might be missing in JSON)
    today = pd.Timestamp.now().normalize()

    def get_hours_open_in_month(month_period):
        start = month_period.start_time
        end = min(month_period.end_time, today)  # Cap to today for current month
        days = pd.date_range(start=start, end=end, freq='D')
        weekday_hours = len([d for d in days if d.dayofweek < 5]) * 10  # Mon-Fri × 10 hours
        saturday_hours = len([d for d in days if d.dayofweek == 5]) * 4  # Sat × 4 hours
        return weekday_hours + saturday_hours

    def get_adjusted_days_in_month(month_period):
        """Calculate adjusted days: weekdays count as 1, Saturdays as 0.5, Sundays as 0"""
        start = month_period.start_time
        end = min(month_period.end_time, today)  # Cap to today for current month
        days = pd.date_range(start=start, end=end, freq='D')
        weekdays = len([d for d in days if d.dayofweek < 5])  # Mon-Fri
        saturdays = len([d for d in days if d.dayofweek == 5])  # Saturday = 0.5 day
        return weekdays + (saturdays * 0.5)

    # Calculate if missing (which they are in the current JSON)
    if monthly['hours_open'].sum() == 0:
        monthly['hours_open'] = monthly['month'].apply(get_hours_open_in_month)
    
    if monthly['adjusted_days'].sum() == 0:
        monthly['adjusted_days'] = monthly['month'].apply(get_adjusted_days_in_month)

    # Helper to avoid Infinity/NaN
    def safe_div(a, b):
        if b == 0 or b is None or pd.isna(b): return 0
        return a / b

    # Calculated metrics
    monthly['velocity'] = monthly.apply(lambda x: safe_div(x['orders'], x['hours_open']), axis=1)
    monthly['efficiency'] = monthly.apply(lambda x: safe_div(x['revenue'], x['hours_open']), axis=1)
    monthly['orders_per_day'] = monthly.apply(lambda x: safe_div(x['orders'], x['adjusted_days']), axis=1)
    monthly['revenue_per_day'] = monthly.apply(lambda x: safe_div(x['revenue'], x['adjusted_days']), axis=1)

    # Cumulative totals
    monthly['cumulative_revenue'] = monthly['revenue'].cumsum()
    monthly['cumulative_orders'] = monthly['orders'].cumsum()
    monthly['cumulative_customers'] = monthly['unique_customers'].cumsum()

    # Growth from baseline
    first_revenue = monthly['revenue'].iloc[0]
    first_orders = monthly['orders'].iloc[0]
    monthly['revenue_growth_from_start'] = ((monthly['revenue'] / first_revenue) - 1) * 100
    monthly['orders_growth_from_start'] = ((monthly['orders'] / first_orders) - 1) * 100

    # Multipliers
    monthly['revenue_multiplier'] = monthly['revenue'] / first_revenue
    monthly['orders_multiplier'] = monthly['orders'] / first_orders

    # 3-month rolling averages
    monthly['revenue_3mo_avg'] = monthly['revenue'].rolling(window=3, min_periods=1).mean()
    monthly['orders_3mo_avg'] = monthly['orders'].rolling(window=3, min_periods=1).mean()

    # Summary Stats
    # Use last COMPLETE month for summary comparisons (current month is incomplete and skews stats)
    current_month_period = pd.Timestamp.now().to_period('M')
    complete_months = monthly[monthly['month'] < current_month_period]

    if len(complete_months) >= 1:
        last_month = complete_months.iloc[-1]
    else:
        last_month = monthly.iloc[-1]  # Fallback if no complete months

    first_month = monthly.iloc[0]

    # CMGR (based on complete months only)
    num_months = len(complete_months) - 1 if len(complete_months) > 1 else len(monthly) - 1
    cmgr = ((last_month['revenue'] / first_month['revenue']) ** (1 / num_months) - 1) * 100 if num_months > 0 else 0

    # Slope / Acceleration (compare last two complete months)
    if len(complete_months) >= 2:
        prev_month = complete_months.iloc[-2]
        slope_change = last_month['revenue'] - prev_month['revenue']
        slope_change_pct = ((last_month['revenue'] / prev_month['revenue']) - 1) * 100 if prev_month['revenue'] > 0 else 0
        prev_month_revenue = prev_month['revenue']
    else:
        slope_change = 0
        slope_change_pct = 0
        prev_month_revenue = last_month['revenue']

    # Total sums
    total_revenue = monthly['revenue'].sum()
    total_orders = monthly['orders'].sum()
    
    # 3. Weekly Data (Calculated from raw CSV since it's not in monthly summary JSON)
    # Note: nuances like #954 fix might be missing here, but acceptable for weekly trend chart
    df_raw['week'] = df_raw['Placed'].dt.to_period('W')
    weekly = df_raw.groupby('week').agg({'Order ID': 'count', 'Total': 'sum'}).reset_index()
    weekly.columns = ['week', 'orders', 'revenue'] # This is gross revenue, but fine for shape
    weekly['week_str'] = weekly['week'].astype(str)
    
    # Simple day adjustment for weekly
    def get_weekly_days(week):
        days = pd.date_range(week.start_time, week.end_time, freq='D')
        return len([d for d in days if d.dayofweek < 5]) + (len([d for d in days if d.dayofweek == 5]) * 0.5)
        
    weekly['adjusted_days'] = weekly['week'].apply(get_weekly_days)
    weekly['orders_per_day'] = weekly.apply(lambda x: safe_div(x['orders'], x['adjusted_days']), axis=1)
    weekly['revenue_per_day'] = weekly.apply(lambda x: safe_div(x['revenue'], x['adjusted_days']), axis=1)

    # 4. Customer Mix (New vs Returning)
    first_order = df_raw.groupby('Customer ID')['Placed'].min().reset_index()
    first_order.columns = ['Customer ID', 'first_order_date']
    df_raw = df_raw.merge(first_order, on='Customer ID')
    df_raw['first_order_month'] = pd.to_datetime(df_raw['first_order_date']).dt.to_period('M')
    df_raw['is_new'] = df_raw['month'] == df_raw['first_order_month']
    
    monthly_customer_type = df_raw.groupby(['month', 'is_new']).agg({
        'Customer ID': 'nunique',
        'Total': 'sum' # Using Total from raw, decent proxy for mix
    }).reset_index()
    monthly_customer_type.columns = ['month', 'is_new', 'customers', 'revenue']

    customer_mix = []
    for m in monthly['month']:
        m_data = monthly_customer_type[monthly_customer_type['month'] == m]
        new_d = m_data[m_data['is_new'] == True]
        ret_d = m_data[m_data['is_new'] == False]
        
        customer_mix.append({
            'month': str(m),
            'new_customers': int(new_d['customers'].sum()) if len(new_d) else 0,
            'returning_customers': int(ret_d['customers'].sum()) if len(ret_d) else 0,
            'new_revenue': float(new_d['revenue'].sum()) if len(new_d) else 0,
            'returning_revenue': float(ret_d['revenue'].sum()) if len(ret_d) else 0
        })

    # Pack it all up
    growth_metrics = {
        'summary': {
            'total_revenue': float(total_revenue),
            'total_orders': int(total_orders),
            'cmgr': round(cmgr, 1),
            'revenue_multiplier': round(last_month['revenue'] / first_month['revenue'], 1),
            'orders_multiplier': round(last_month['orders'] / first_month['orders'], 1),
            'total_revenue_growth_pct': round(((last_month['revenue']/first_month['revenue'])-1)*100, 0),
            'total_orders_growth_pct': round(((last_month['orders']/first_month['orders'])-1)*100, 0),
            'first_month_revenue': round(first_month['revenue'], 2),
            'last_month_revenue': round(last_month['revenue'], 2),
            'first_month_orders': int(first_month['orders']),
            'last_month_orders': int(last_month['orders']),
            'prev_month_revenue': round(prev_month_revenue, 2),
            'slope_change': round(slope_change, 2),
            'slope_change_pct': round(slope_change_pct, 1),
            # Pass through some stats from last month
            'orders_per_hour': round(last_month['velocity'], 2),
            'revenue_per_hour': round(last_month['efficiency'], 2),
            'orders_per_day': round(last_month['orders_per_day'], 1),
            'revenue_per_day': round(last_month['revenue_per_day'], 2),
            'hours_open': float(last_month['hours_open']),
            'adjusted_days': float(last_month['adjusted_days']),
        },
        'monthly': [
            {
                'month': row['month_str'],
                'revenue': round(row['revenue'], 2),
                'orders': int(row['orders']),
                'unique_customers': int(row['unique_customers']),
                'revenue_mom': round(row['revenue_mom'], 1) if pd.notna(row['revenue_mom']) else None,
                'orders_mom': round(row['orders_mom'], 1) if pd.notna(row['orders_mom']) else None,
                'velocity': round(row['velocity'], 2),
                'efficiency': round(row['efficiency'], 2),
                'adjusted_days': float(row['adjusted_days']),
                'orders_per_day': round(row['orders_per_day'], 1),
                'revenue_per_day': round(row['revenue_per_day'], 2),
                'cumulative_revenue': round(row['cumulative_revenue'], 2),
                'cumulative_orders': int(row['cumulative_orders']),
                'revenue_growth_from_start': round(row['revenue_growth_from_start'], 0),
                'orders_growth_from_start': round(row['orders_growth_from_start'], 0),
                'revenue_multiplier': round(row['revenue_multiplier'], 1),
                'orders_multiplier': round(row['orders_multiplier'], 1),
                'revenue_3mo_avg': round(row['revenue_3mo_avg'], 2),
                'orders_3mo_avg': round(row['orders_3mo_avg'], 1)
            }
            for _, row in monthly.iterrows()
        ],
        'weekly': [
            {
                'week': row['week_str'],
                'orders': int(row['orders']),
                'revenue': round(row['revenue'], 2),
                'orders_per_day': round(row['orders_per_day'], 1),
                'revenue_per_day': round(row['revenue_per_day'], 2)
            }
            for _, row in weekly.iterrows()
        ],
        'customer_mix': customer_mix
    }
    
    return growth_metrics

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            if np.isnan(obj) or np.isinf(obj):
                return 0 # Replace Infinity/NaN with 0
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

if __name__ == '__main__':
    metrics = generate_growth_metrics()
    
    # Save to public folder
    dest = 'dashboard-shadcn/public/growth_metrics.json'
    with open(dest, 'w') as f:
        json.dump(metrics, f, indent=2, cls=NpEncoder)
        
    print(f'Growth metrics generated successfully to {dest}!')
