#!/usr/bin/env python3
"""
CSV Merge & Dashboard Data Generation Script

Merges orders and items CSV files, applies business logic for cost calculations,
and generates dashboard-ready JSON data with comprehensive analytics.

Author: Claude Code
Date: 2025-11-03
"""

import pandas as pd
import numpy as np
import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

class CSVMerger:
    """Main class for processing CSV files and generating dashboard data"""
    
    def __init__(self, orders_file: str, items_file: str):
        self.orders_file = orders_file
        self.items_file = items_file
        self.orders_df = None
        self.items_df = None
        self.merged_df = None
        
    def load_and_clean_data(self) -> None:
        """Load CSV files and perform initial data cleaning"""
        print("Loading CSV files...")
        
        # Load orders CSV
        self.orders_df = pd.read_csv(self.orders_file)
        print(f"Loaded {len(self.orders_df)} orders")
        
        # Load items CSV  
        self.items_df = pd.read_csv(self.items_file)
        print(f"Loaded {len(self.items_df)} items")
        
        # Clean orders data
        self._clean_orders_data()
        
        # Clean items data
        self._clean_items_data()
        
        # Fix Order ID data type mismatch - ensure both are same type
        # Remove rows with NaN Order IDs first
        self.orders_df = self.orders_df.dropna(subset=['Order ID'])
        self.items_df = self.items_df.dropna(subset=['Order ID'])
        
        self.orders_df['Order ID'] = self.orders_df['Order ID'].astype(int)
        self.items_df['Order ID'] = self.items_df['Order ID'].astype(int)
        
        print("Data cleaning completed")
        
    def _clean_orders_data(self) -> None:
        """Clean and standardize orders data"""
        # Remove invalid rows
        self.orders_df = self.orders_df[self.orders_df['Placed'] != 'Price'].copy()
        
        # Convert date column
        self.orders_df['Date Placed'] = pd.to_datetime(self.orders_df['Placed'], format='%d %b %Y %H:%M', errors='coerce')
        
        # Clean numeric columns
        numeric_cols = ['Total after Credit Used', 'Tax', 'Discount', 'Order ID']
        for col in numeric_cols:
            if col in self.orders_df.columns:
                self.orders_df[col] = pd.to_numeric(self.orders_df[col], errors='coerce')
        
        # Fill NaN values
        self.orders_df['Discount'] = self.orders_df['Discount'].fillna(0)
        self.orders_df['Tax'] = self.orders_df['Tax'].fillna(0)
        self.orders_df['Notes'] = self.orders_df['Notes'].fillna('')
        self.orders_df['Address'] = self.orders_df['Address'].fillna('')

        # Recalculate tax for orders on/after Jan 5, 2026 (tax rate changed from 7% to 2%)
        tax_change_date = pd.to_datetime('2026-01-05')
        new_tax_rate = 0.02

        # For orders after tax change, recalculate: Tax = Total * (rate / (1 + rate))
        # This extracts tax from a tax-inclusive total
        mask = self.orders_df['Date Placed'] >= tax_change_date
        self.orders_df.loc[mask, 'Tax'] = (
            self.orders_df.loc[mask, 'Total after Credit Used'] * (new_tax_rate / (1 + new_tax_rate))
        ).round(2)

        print(f"  📋 Recalculated tax (2%) for {mask.sum()} orders on/after {tax_change_date.strftime('%Y-%m-%d')}")

        # Create month column for filtering
        self.orders_df['Month'] = self.orders_df['Date Placed'].dt.strftime('%Y-%m')
        
    def _clean_items_data(self) -> None:
        """Clean and standardize items data"""
        # Convert numeric columns
        numeric_cols = ['Order ID', 'Quantity', 'Cost Price', 'Total', 'Express']
        for col in numeric_cols:
            if col in self.items_df.columns:
                self.items_df[col] = pd.to_numeric(self.items_df[col], errors='coerce')

        # Clean text columns - strip whitespace and control characters
        self.items_df['Item'] = self.items_df['Item'].fillna('').str.strip()
        self.items_df['Item Notes'] = self.items_df['Item Notes'].fillna('').str.strip()

        # Convert date column
        self.items_df['Date Placed'] = pd.to_datetime(self.items_df['Placed'], format='%d %b %Y', errors='coerce')
        
    def categorize_items(self, item_name: str) -> str:
        """Categorize items based on name (case-insensitive)"""
        item_lower = item_name.lower()
        
        # Check for Wash & Fold Delicate (both "delicate" and "wash"/"fold")
        if 'delicate' in item_lower and ('wash' in item_lower or 'fold' in item_lower):
            return 'wf_delicate'
        
        # Check for regular Wash & Fold (wash/fold but not delicate)  
        elif ('wash' in item_lower or 'fold' in item_lower) and 'delicate' not in item_lower:
            return 'wf_regular'
        
        # All other items
        else:
            return 'other'
    
    def extract_lb_amount(self, quantity: float, item_name: str) -> float:
        """Extract pound amount from quantity or item name"""
        # For W&F items, quantity typically represents pounds
        if pd.notna(quantity):
            return float(quantity)
        
        # Try to extract from item name if quantity is missing
        lb_match = re.search(r'(\d+\.?\d*)\s*lb', item_name.lower())
        if lb_match:
            return float(lb_match.group(1))
        
        return 0.0
    
    def calculate_order_costs(self) -> pd.DataFrame:
        """Calculate costs for each order applying business rules"""
        print("Calculating order costs with business rules...")
        
        # Group items by order ID
        order_groups = self.items_df.groupby('Order ID')
        
        cost_data = []
        
        for order_id, items in order_groups:
            # Calculate total base cost from all items
            total_base_cost = items['Cost Price'].sum()
            express = 0  # Default to non-express
            
            # Track express status (if any item is express, whole order is express)
            if items['Express'].sum() > 0:
                express = 1
            
            # Create items summary for order categorization
            items_summary = '; '.join(items['Item'].unique())
            items_summary_lower = items_summary.lower()
            
            # Determine order type based on Items Summary and apply minimums
            if 'delicate' in items_summary_lower and ('wash' in items_summary_lower or 'fold' in items_summary_lower):
                # Delicate W&F order - apply $24.95 minimum
                if total_base_cost < 24.95:
                    total_base_cost = 24.95
                order_type = 'wf_delicate'
            elif 'wash' in items_summary_lower or 'fold' in items_summary_lower:
                # Regular W&F order - apply $19.95 minimum  
                if total_base_cost < 19.95:
                    total_base_cost = 19.95
                order_type = 'wf_regular'
            else:
                # Other order types - no minimum
                order_type = 'other'
            
            # Apply express multiplier to entire order
            if express == 1:
                final_cost = total_base_cost * 1.5
            else:
                final_cost = total_base_cost
            
            # Calculate category costs for reporting (after minimums applied)
            wf_regular_cost = total_base_cost if order_type == 'wf_regular' else 0.0
            wf_delicate_cost = total_base_cost if order_type == 'wf_delicate' else 0.0
            other_cost = total_base_cost if order_type == 'other' else 0.0
            
            # Aggregate item data
            total_items = items['Quantity'].sum()
            
            cost_data.append({
                'Order ID': order_id,
                'Base Cost': total_base_cost,
                'Final Cost': final_cost,
                'Express': express,
                'WF Regular Cost': wf_regular_cost,
                'WF Delicate Cost': wf_delicate_cost,
                'Other Cost': other_cost,
                'Total Items': total_items,
                'Items Summary': items_summary
            })
        
        return pd.DataFrame(cost_data)
    
    def apply_special_rules(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply special business rules for costs and revenue"""
        print("Applying special business rules...")
        
        # Rule 1: "450" special account - cost becomes 0
        apt_450_mask = df['Address'].str.contains('450', case=False, na=False)
        notes_450_mask = df['Notes'].str.contains('450', case=False, na=False)
        df.loc[apt_450_mask | notes_450_mask, 'Final Cost'] = 0.0
        
        # Rule 2: Camille Simon - revenue becomes 0 (cost stays calculated)
        camille_mask = df['Customer'].str.contains('Camille Simon', case=False, na=False)
        df.loc[camille_mask, 'Total after Credit Used'] = 0.0
        
        return df
    
    def merge_data(self) -> pd.DataFrame:
        """Merge orders and items data with cost calculations"""
        print("Merging orders and items data...")
        
        # Calculate costs from items
        cost_df = self.calculate_order_costs()
        
        # Merge with orders data
        merged = self.orders_df.merge(cost_df, on='Order ID', how='left')
        
        # Apply special business rules
        merged = self.apply_special_rules(merged)
        
        # Calculate derived fields
        merged['Revenue Net Tax'] = merged['Total after Credit Used'] - merged['Tax']
        merged['Profit'] = merged['Revenue Net Tax'] - merged['Final Cost']
        merged['Profit Margin %'] = np.where(
            merged['Revenue Net Tax'] != 0,
            (merged['Profit'] / merged['Revenue Net Tax']) * 100,
            0
        )
        
        # Fill NaN values for orders without items
        merged['Final Cost'] = merged['Final Cost'].fillna(0)
        merged['Total Items'] = merged['Total Items'].fillna(0)
        merged['Items Summary'] = merged['Items Summary'].fillna('')
        
        self.merged_df = merged
        return merged
    
    def add_customer_analytics(self) -> None:
        """Add customer analytics (new vs returning customers)"""
        print("Adding customer analytics...")
        
        # Sort by date to find first orders
        self.merged_df = self.merged_df.sort_values('Date Placed')
        
        # Find first order date for each customer
        first_orders = self.merged_df.groupby('Customer')['Date Placed'].min().reset_index()
        first_orders.columns = ['Customer', 'First Order Date']
        
        # Merge back to main data
        self.merged_df = self.merged_df.merge(first_orders, on='Customer', how='left')
        
        # Mark new customers
        self.merged_df['IsNewCustomer'] = (
            self.merged_df['Date Placed'] == self.merged_df['First Order Date']
        )
    
    def filter_by_date_range(self, start_date: str = None, end_date: str = None) -> pd.DataFrame:
        """Filter data by date range"""
        if start_date is None and end_date is None:
            return self.merged_df
        
        filtered_df = self.merged_df.copy()
        
        if start_date:
            start_dt = pd.to_datetime(start_date)
            filtered_df = filtered_df[filtered_df['Date Placed'] >= start_dt]
        
        if end_date:
            end_dt = pd.to_datetime(end_date)
            filtered_df = filtered_df[filtered_df['Date Placed'] <= end_dt]
        
        return filtered_df
    
    def save_merged_csv(self, filename: str = 'orders_ALL.csv') -> None:
        """Save merged data to CSV"""
        print(f"Saving merged data to {filename}...")
        self.merged_df.to_csv(filename, index=False)
        print(f"Saved {len(self.merged_df)} orders to {filename}")
    
    def save_monthly_csvs(self) -> None:
        """Save separate CSV files for each month"""
        print("Saving monthly CSV files...")
        
        # Get unique months
        months = sorted(self.merged_df['Month'].dropna().unique())
        
        for month in months:
            month_data = self.merged_df[self.merged_df['Month'] == month]
            filename = f"orders_{month}.csv"
            month_data.to_csv(filename, index=False)
            
            # Calculate month summary using net revenue
            total_revenue_net = month_data['Revenue Net Tax'].sum()
            total_cost = month_data['Final Cost'].sum()
            profit = month_data['Profit'].sum()
            margin = (profit / total_revenue_net * 100) if total_revenue_net != 0 else 0
            
            print(f"  📁 {filename}: {len(month_data)} orders, Revenue Net: ${total_revenue_net:,.2f}, Cost: ${total_cost:,.2f}, Profit: ${profit:,.2f} ({margin:.1f}%)")
        
        print(f"✅ Created {len(months)} monthly CSV files")
    
    def calculate_kpis(self, df: pd.DataFrame) -> Dict:
        """Calculate KPIs for a given dataset"""
        # Handle refunds (negative revenue)
        positive_revenue = df[df['Total after Credit Used'] >= 0]['Total after Credit Used'].sum()
        negative_revenue = df[df['Total after Credit Used'] < 0]['Total after Credit Used'].sum()
        refund_amount = abs(negative_revenue)
        refund_count = len(df[df['Total after Credit Used'] < 0])
        
        total_revenue = df['Total after Credit Used'].sum()
        total_cost = df['Final Cost'].sum()
        net_revenue = df['Revenue Net Tax'].sum()
        profit = net_revenue - total_cost
        
        # Calculate dry cleaning items (exclude W&F pounds)
        order_ids = df['Order ID'].unique()
        all_items = self.items_df[self.items_df['Order ID'].isin(order_ids)]

        # Non-W&F items (piece count)
        non_wf_items = all_items[~all_items['Item'].str.contains('wash|fold', case=False, na=False)]
        dry_clean_items = non_wf_items['Quantity'].sum()

        # W&F items (pounds)
        wf_items = all_items[all_items['Item'].str.contains('wash|fold', case=False, na=False)]
        wf_lbs = wf_items['Quantity'].sum()

        kpis = {
            'orders': len(df),
            'revenue': total_revenue,
            'gross_sales': positive_revenue,
            'refund_amount': refund_amount,
            'refund_count': refund_count,
            'cost': total_cost,
            'net_revenue': net_revenue,
            'profit': profit,
            'margin_pct': (profit / net_revenue * 100) if net_revenue != 0 else 0,
            'items': df['Total Items'].sum(),  # Keep total for backwards compatibility
            'dry_clean_items': dry_clean_items,  # Piece count
            'wf_lbs': wf_lbs,  # Pounds
            'unique_customers': df['Customer'].nunique(),
            'new_customers': df[df['IsNewCustomer'] == True]['Customer'].nunique(),
            'returning_customers': df['Customer'].nunique() - df[df['IsNewCustomer'] == True]['Customer'].nunique(),
            'aov': total_revenue / len(df) if len(df) > 0 else 0,
            'express_rate': (df['Express'].sum() / len(df) * 100) if len(df) > 0 else 0,
            'new_customer_share_pct': (df[df['IsNewCustomer'] == True]['Customer'].nunique() / df['Customer'].nunique() * 100) if df['Customer'].nunique() > 0 else 0
        }
        
        return kpis
    
    def calculate_time_series(self, df: pd.DataFrame) -> Dict:
        """Calculate monthly time series data"""
        monthly_data = df.groupby('Month').agg({
            'Total after Credit Used': 'sum',
            'Final Cost': 'sum',
            'Revenue Net Tax': 'sum',
            'Order ID': 'count'
        }).reset_index()
        
        monthly_data['Profit'] = monthly_data['Revenue Net Tax'] - monthly_data['Final Cost']
        monthly_data['AOV'] = monthly_data['Total after Credit Used'] / monthly_data['Order ID']
        
        return {
            'months': monthly_data['Month'].tolist(),
            'revenue': monthly_data['Total after Credit Used'].tolist(),
            'cost': monthly_data['Final Cost'].tolist(),
            'profit': monthly_data['Profit'].tolist(),
            'orders': monthly_data['Order ID'].tolist(),
            'aov': monthly_data['AOV'].tolist()
        }
    
    def calculate_category_breakdown(self, df: pd.DataFrame) -> Dict:
        """Calculate revenue breakdown by order category"""
        # Map sections to categories based on items
        category_revenue = {}
        
        for _, order in df.iterrows():
            items_summary = str(order['Items Summary']).lower()
            revenue = order['Total after Credit Used']
            
            # Categorize based on item content
            if 'wash' in items_summary or 'fold' in items_summary:
                if 'delicate' in items_summary:
                    category = 'W&F Delicate'
                else:
                    category = 'Wash & Fold'
            elif 'suit' in items_summary or 'shirt' in items_summary or 'dry cleaning' in items_summary:
                category = 'Dry Cleaning'
            elif 'sneaker' in items_summary or 'shoe' in items_summary:
                category = 'Shoes'
            else:
                category = 'Other'
            
            category_revenue[category] = category_revenue.get(category, 0) + revenue
        
        return category_revenue
    
    def calculate_payment_breakdown(self, df: pd.DataFrame) -> Dict:
        """Calculate breakdown by payment type"""
        payment_counts = df['Payment Type'].value_counts().to_dict()
        return payment_counts
    
    def calculate_status_breakdown(self, df: pd.DataFrame) -> Dict:
        """Calculate breakdown by order status"""
        status_counts = df['Status'].value_counts().to_dict()
        return status_counts

    def calculate_revenue_quality(self, df: pd.DataFrame) -> Dict:
        """Calculate revenue quality metrics"""
        # Separate positive and negative revenue
        positive_revenue = df[df['Total after Credit Used'] >= 0]['Total after Credit Used'].sum()
        negative_revenue = df[df['Total after Credit Used'] < 0]['Total after Credit Used'].sum()
        refunds = abs(negative_revenue)
        refund_orders = len(df[df['Total after Credit Used'] < 0])

        # Net revenue (after tax)
        net_revenue = df['Revenue Net Tax'].sum()

        # Discounts and tax
        discounts = df['Discount'].sum()
        tax = df['Tax'].sum()

        # Calculate rates
        refund_rate_pct = (refunds / positive_revenue * 100) if positive_revenue > 0 else 0
        discount_rate_pct = (discounts / positive_revenue * 100) if positive_revenue > 0 else 0

        # Tips, service fee, delivery fee (set to 0 if not in data)
        tips = 0.0
        service_fee = 0.0
        delivery_fee = 0.0
        tip_rate_pct = 0.0

        return {
            'gross_sales': positive_revenue,
            'refunds': refunds,
            'net_revenue': net_revenue,
            'refund_rate_pct': round(refund_rate_pct, 2),
            'discounts': discounts,
            'discount_rate_pct': round(discount_rate_pct, 2),
            'tips': tips,
            'tip_rate_pct': tip_rate_pct,
            'tax': tax,
            'service_fee': service_fee,
            'delivery_fee': delivery_fee,
            'refund_orders': refund_orders
        }

    def calculate_aov_stats(self, df: pd.DataFrame) -> Dict:
        """Calculate AOV distribution statistics"""
        if len(df) == 0:
            return {
                'mean': 0,
                'median': 0,
                'p25': 0,
                'p75': 0,
                'gross_margin_pct': 0
            }

        # Calculate AOV for each order
        aov_values = df['Total after Credit Used'].values

        # Calculate statistics
        mean_aov = np.mean(aov_values)
        median_aov = np.percentile(aov_values, 50)
        p25_aov = np.percentile(aov_values, 25)
        p75_aov = np.percentile(aov_values, 75)

        # Gross margin (already calculated in KPIs)
        net_revenue = df['Revenue Net Tax'].sum()
        cost = df['Final Cost'].sum()
        gross_margin_pct = ((net_revenue - cost) / net_revenue * 100) if net_revenue > 0 else 0

        return {
            'mean': round(mean_aov, 2),
            'median': round(median_aov, 2),
            'p25': round(p25_aov, 2),
            'p75': round(p75_aov, 2),
            'gross_margin_pct': round(gross_margin_pct, 2)
        }

    def calculate_customer_advanced(self, df: pd.DataFrame) -> Dict:
        """Calculate advanced customer metrics"""
        unique_customers = df['Customer'].nunique()
        new_customers = df[df['IsNewCustomer'] == True]['Customer'].nunique()
        returning_customers = unique_customers - new_customers

        # Calculate shares
        new_share_pct = (new_customers / unique_customers * 100) if unique_customers > 0 else 0
        ret_share_pct = 100 - new_share_pct
        ret_new_ratio = (returning_customers / new_customers) if new_customers > 0 else 0

        # Calculate 30-day repeat rate for new customers
        new_customer_list = df[df['IsNewCustomer'] == True]['Customer'].unique()
        repeat_30d_count = 0

        for customer in new_customer_list:
            customer_orders = df[df['Customer'] == customer].sort_values('Date Placed')
            if len(customer_orders) >= 2:
                first_order_date = customer_orders.iloc[0]['Date Placed']
                second_order_date = customer_orders.iloc[1]['Date Placed']
                days_diff = (second_order_date - first_order_date).days
                if days_diff <= 30:
                    repeat_30d_count += 1

        repeat_30d_pct = (repeat_30d_count / len(new_customer_list) * 100) if len(new_customer_list) > 0 else 0
        repeat_30d = f"{repeat_30d_count}/{len(new_customer_list)}" if len(new_customer_list) > 0 else "—"

        # Calculate top 10 customers revenue share
        customer_revenue = df.groupby('Customer')['Total after Credit Used'].sum().sort_values(ascending=False)
        top10_revenue = customer_revenue.head(10).sum()
        total_revenue = df['Total after Credit Used'].sum()
        top10_share_pct = (top10_revenue / total_revenue * 100) if total_revenue > 0 else 0

        return {
            'unique_customers': unique_customers,
            'new_customers': new_customers,
            'returning_customers': returning_customers,
            'new_share_pct': round(new_share_pct, 2),
            'ret_share_pct': round(ret_share_pct, 2),
            'ret_new_ratio': round(ret_new_ratio, 2),
            'repeat_30d': repeat_30d,
            'repeat_30d_pct': round(repeat_30d_pct, 2),
            'top10_share_pct': round(top10_share_pct, 2)
        }

    def calculate_ar_metrics(self, df: pd.DataFrame) -> Dict:
        """Calculate accounts receivable metrics"""
        # Filter unpaid orders (Paid != 1)
        unpaid_df = df[df['Paid'] != 1]

        unpaid_orders = len(unpaid_df)
        unpaid_balance = unpaid_df['Total after Credit Used'].sum()
        unpaid_share_pct = (unpaid_orders / len(df) * 100) if len(df) > 0 else 0

        return {
            'unpaid_orders': unpaid_orders,
            'unpaid_balance': round(unpaid_balance, 2),
            'unpaid_share_pct': round(unpaid_share_pct, 2)
        }

    def calculate_service_mix(self, df: pd.DataFrame) -> List[Dict]:
        """Calculate service mix breakdown in array format"""
        category_revenue = self.calculate_category_breakdown(df)
        total_revenue = sum(category_revenue.values())

        # Convert to array format with share percentages
        service_mix = []
        for category, revenue in sorted(category_revenue.items(), key=lambda x: x[1], reverse=True):
            share_pct = (revenue / total_revenue * 100) if total_revenue > 0 else 0
            service_mix.append({
                'category': category,
                'revenue': round(revenue, 2),
                'share_pct': round(share_pct, 2)
            })

        return service_mix

    def calculate_unit_prices(self, df: pd.DataFrame) -> List[Dict]:
        """Calculate implied unit prices for top 10 items"""
        # Get all items with their order IDs
        order_items = []
        for _, order in df.iterrows():
            order_id = order['Order ID']
            order_revenue = order['Total after Credit Used']

            # Get items for this order
            items = self.items_df[self.items_df['Order ID'] == order_id]
            total_quantity = items['Quantity'].sum()

            for _, item in items.iterrows():
                if total_quantity > 0:
                    # Allocate revenue proportionally
                    item_revenue = order_revenue * (item['Quantity'] / total_quantity)
                    order_items.append({
                        'item': item['Item'],
                        'revenue': item_revenue,
                        'units': item['Quantity']
                    })

        # Aggregate by item
        item_agg = {}
        for entry in order_items:
            item_name = entry['item']
            if item_name not in item_agg:
                item_agg[item_name] = {'revenue': 0, 'units': 0}
            item_agg[item_name]['revenue'] += entry['revenue']
            item_agg[item_name]['units'] += entry['units']

        # Calculate prices and sort
        unit_prices = []
        for item_name, data in item_agg.items():
            if data['units'] > 0:
                price = data['revenue'] / data['units']
                unit_prices.append({
                    'item': item_name,
                    'revenue': round(data['revenue'], 2),
                    'units': round(data['units'], 1),
                    'unit_price': round(price, 1)
                })

        # Sort by revenue and return top 10
        unit_prices.sort(key=lambda x: x['revenue'], reverse=True)
        return unit_prices[:10]

    def calculate_wash_fold_lbs(self, df: pd.DataFrame) -> float:
        """Calculate total wash & fold pounds"""
        # Get all order IDs from the dataframe
        order_ids = df['Order ID'].unique()

        # Filter items for W&F orders
        wf_items = self.items_df[self.items_df['Order ID'].isin(order_ids)]
        wf_items = wf_items[
            wf_items['Item'].str.contains('wash|fold', case=False, na=False)
        ]

        # Sum quantities (pounds)
        total_lbs = wf_items['Quantity'].sum()
        return round(total_lbs, 1)

    def add_work_week_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add work week number and label columns (Sunday-to-Sunday work weeks)

        Work week is Sunday-to-Sunday for payroll. Each month has exactly 5 weeks:
        - Week 1: Days 1-7 (first 7 days of month)
        - Week 2: Days 8-14
        - Week 3: Days 15-21
        - Week 4: Days 22-28
        - Week 5: Days 29-31 (remaining days)

        This ensures consistent weekly payroll periods regardless of which day the month starts.
        """
        df = df.copy()

        # Ensure Date Placed is datetime
        if not pd.api.types.is_datetime64_any_dtype(df['Date Placed']):
            df['Date Placed'] = pd.to_datetime(df['Date Placed'])

        # Get the day of month (1-31)
        df['DayOfMonth'] = df['Date Placed'].dt.day

        # Calculate week number based on day of month (Sunday-to-Sunday)
        # Week 1: days 1-7, Week 2: days 8-14, Week 3: days 15-21, Week 4: days 22-28, Week 5: days 29-31
        df['WeekOfMonth'] = ((df['DayOfMonth'] - 1) // 7) + 1

        # Create year-month for grouping
        df['YearMonth'] = df['Date Placed'].dt.to_period('M')

        # Create week label like "2025-10-W1", "2025-10-W2", etc.
        df['WeekLabel'] = df['YearMonth'].astype(str) + '-W' + df['WeekOfMonth'].astype(str)

        return df

    def generate_dashboard_data(self, start_date: str = None, end_date: str = None) -> Dict:
        """Generate comprehensive dashboard data"""
        print("Generating dashboard data...")

        # Get filtered datasets
        all_orders = self.filter_by_date_range(start_date, end_date)
        paid_orders = all_orders[all_orders['Paid'] == 1]

        # Add work week columns
        all_orders = self.add_work_week_columns(all_orders)
        paid_orders = self.add_work_week_columns(paid_orders)
        
        # Generate date range label
        if start_date and end_date:
            start_month = pd.to_datetime(start_date).strftime('%b%Y').upper()
            end_month = pd.to_datetime(end_date).strftime('%b%Y').upper() 
            date_label = f"{start_month}_{end_month}"
        else:
            date_label = "ALL_DATA"
        
        dashboard_data = {
            f"{date_label}__ALL_ORDERS": {
                "all": {
                    "kpis": self.calculate_kpis(all_orders),
                    "series": self.calculate_time_series(all_orders),
                    "category": self.calculate_category_breakdown(all_orders),
                    "payment": self.calculate_payment_breakdown(all_orders),
                    "status": self.calculate_status_breakdown(all_orders),
                    "top_products": [],  # Placeholder for now
                    "advanced": {
                        "revenue_quality": self.calculate_revenue_quality(all_orders),
                        "aov_stats": self.calculate_aov_stats(all_orders),
                        "customer": self.calculate_customer_advanced(all_orders),
                        "ar": self.calculate_ar_metrics(all_orders),
                        "service_mix": self.calculate_service_mix(all_orders),
                        "unit_prices": self.calculate_unit_prices(all_orders),
                        "wash_fold_lbs": self.calculate_wash_fold_lbs(all_orders)
                    }
                },
                "by_month": {}
            },
            f"{date_label}__PAID_ONLY": {
                "all": {
                    "kpis": self.calculate_kpis(paid_orders),
                    "series": self.calculate_time_series(paid_orders),
                    "category": self.calculate_category_breakdown(paid_orders),
                    "payment": self.calculate_payment_breakdown(paid_orders),
                    "status": self.calculate_status_breakdown(paid_orders),
                    "top_products": [],  # Placeholder for now
                    "advanced": {
                        "revenue_quality": self.calculate_revenue_quality(paid_orders),
                        "aov_stats": self.calculate_aov_stats(paid_orders),
                        "customer": self.calculate_customer_advanced(paid_orders),
                        "ar": self.calculate_ar_metrics(paid_orders),
                        "service_mix": self.calculate_service_mix(paid_orders),
                        "unit_prices": self.calculate_unit_prices(paid_orders),
                        "wash_fold_lbs": self.calculate_wash_fold_lbs(paid_orders)
                    }
                },
                "by_month": {}
            }
        }
        
        # Add monthly breakdowns
        for month in all_orders['Month'].unique():
            if pd.notna(month):
                month_all = all_orders[all_orders['Month'] == month]
                month_paid = paid_orders[paid_orders['Month'] == month]

                # Get weekly breakdowns for this month
                by_week_all = {}
                by_week_paid = {}

                for week_label in sorted(month_all['WeekLabel'].unique()):
                    week_all = month_all[month_all['WeekLabel'] == week_label]
                    week_paid = month_paid[month_paid['WeekLabel'] == week_label]

                    by_week_all[week_label] = {
                        "kpis": self.calculate_kpis(week_all),
                        "series": self.calculate_time_series(week_all),
                        "category": self.calculate_category_breakdown(week_all),
                        "payment": self.calculate_payment_breakdown(week_all),
                        "status": self.calculate_status_breakdown(week_all),
                        "advanced": {
                            "revenue_quality": self.calculate_revenue_quality(week_all),
                            "aov_stats": self.calculate_aov_stats(week_all),
                            "customer": self.calculate_customer_advanced(week_all),
                            "ar": self.calculate_ar_metrics(week_all),
                            "service_mix": self.calculate_service_mix(week_all),
                            "unit_prices": self.calculate_unit_prices(week_all),
                            "wash_fold_lbs": self.calculate_wash_fold_lbs(week_all)
                        }
                    }

                    by_week_paid[week_label] = {
                        "kpis": self.calculate_kpis(week_paid),
                        "series": self.calculate_time_series(week_paid),
                        "category": self.calculate_category_breakdown(week_paid),
                        "payment": self.calculate_payment_breakdown(week_paid),
                        "status": self.calculate_status_breakdown(week_paid),
                        "advanced": {
                            "revenue_quality": self.calculate_revenue_quality(week_paid),
                            "aov_stats": self.calculate_aov_stats(week_paid),
                            "customer": self.calculate_customer_advanced(week_paid),
                            "ar": self.calculate_ar_metrics(week_paid),
                            "service_mix": self.calculate_service_mix(week_paid),
                            "unit_prices": self.calculate_unit_prices(week_paid),
                            "wash_fold_lbs": self.calculate_wash_fold_lbs(week_paid)
                        }
                    }

                dashboard_data[f"{date_label}__ALL_ORDERS"]["by_month"][month] = {
                    "kpis": self.calculate_kpis(month_all),
                    "months": [month],
                    "series": self.calculate_time_series(month_all),
                    "category": self.calculate_category_breakdown(month_all),
                    "payment": self.calculate_payment_breakdown(month_all),
                    "status": self.calculate_status_breakdown(month_all),
                    "top_products": [],  # Placeholder for now
                    "advanced": {
                        "revenue_quality": self.calculate_revenue_quality(month_all),
                        "aov_stats": self.calculate_aov_stats(month_all),
                        "customer": self.calculate_customer_advanced(month_all),
                        "ar": self.calculate_ar_metrics(month_all),
                        "service_mix": self.calculate_service_mix(month_all),
                        "unit_prices": self.calculate_unit_prices(month_all),
                        "wash_fold_lbs": self.calculate_wash_fold_lbs(month_all)
                    },
                    "by_week": by_week_all
                }

                dashboard_data[f"{date_label}__PAID_ONLY"]["by_month"][month] = {
                    "kpis": self.calculate_kpis(month_paid),
                    "months": [month],
                    "series": self.calculate_time_series(month_paid),
                    "category": self.calculate_category_breakdown(month_paid),
                    "payment": self.calculate_payment_breakdown(month_paid),
                    "status": self.calculate_status_breakdown(month_paid),
                    "top_products": [],  # Placeholder for now
                    "advanced": {
                        "revenue_quality": self.calculate_revenue_quality(month_paid),
                        "aov_stats": self.calculate_aov_stats(month_paid),
                        "customer": self.calculate_customer_advanced(month_paid),
                        "ar": self.calculate_ar_metrics(month_paid),
                        "service_mix": self.calculate_service_mix(month_paid),
                        "unit_prices": self.calculate_unit_prices(month_paid),
                        "wash_fold_lbs": self.calculate_wash_fold_lbs(month_paid)
                    },
                    "by_week": by_week_paid
                }
        
        return dashboard_data
    
    def save_dashboard_json(self, dashboard_data: Dict, filename: str = 'dashboard_data.json') -> None:
        """Save dashboard data to JSON"""
        print(f"Saving dashboard data to {filename}...")

        # Add metadata with last updated timestamp in EST
        from datetime import datetime, timezone, timedelta
        est = timezone(timedelta(hours=-5))  # EST is UTC-5
        now_est = datetime.now(est)

        dashboard_data['_metadata'] = {
            'last_updated': now_est.isoformat(),
            'last_updated_display': now_est.strftime('%B %d, %Y at %I:%M %p EST')
        }

        with open(filename, 'w') as f:
            json.dump(dashboard_data, f, indent=2, default=str)
        print(f"Dashboard data saved to {filename}")

    def save_summary_metrics(self, dashboard_data: Dict, filename: str = 'summary_metrics.csv') -> None:
        """Save summary metrics to CSV for Excel analysis"""
        print(f"Saving summary metrics to {filename}...")

        # Extract metrics from ALL_ORDERS dataset
        all_data_key = [k for k in dashboard_data.keys() if k.endswith('__ALL_ORDERS')][0]
        all_section = dashboard_data[all_data_key]['all']

        kpis = all_section['kpis']
        advanced = all_section['advanced']

        # Build metrics list
        metrics = []

        # Basic KPIs
        metrics.append(('Total Orders', kpis['orders']))
        metrics.append(('Gross Revenue', f"${kpis['gross_sales']:.2f}"))
        metrics.append(('Net Revenue (after tax)', f"${kpis['net_revenue']:.2f}"))
        metrics.append(('Total Cost', f"${kpis['cost']:.2f}"))
        metrics.append(('Profit', f"${kpis['profit']:.2f}"))
        metrics.append(('Profit Margin %', f"{kpis['margin_pct']:.2f}%"))
        metrics.append(('Total Items', kpis['items']))
        metrics.append(('Average Order Value', f"${kpis['aov']:.2f}"))
        metrics.append(('Express Order Rate %', f"{kpis['express_rate']:.2f}%"))

        # Revenue Quality
        rq = advanced['revenue_quality']
        metrics.append(('', ''))  # Blank row
        metrics.append(('REVENUE QUALITY', ''))
        metrics.append(('Refunds Total', f"${rq['refunds']:.2f}"))
        metrics.append(('Refund Rate %', f"{rq['refund_rate_pct']:.2f}%"))
        metrics.append(('Refund Order Count', rq['refund_orders']))
        metrics.append(('Discounts Total', f"${rq['discounts']:.2f}"))
        metrics.append(('Discount Rate %', f"{rq['discount_rate_pct']:.2f}%"))
        metrics.append(('Tax Total', f"${rq['tax']:.2f}"))

        # AOV Distribution
        aov = advanced['aov_stats']
        metrics.append(('', ''))  # Blank row
        metrics.append(('AOV DISTRIBUTION', ''))
        metrics.append(('AOV Mean', f"${aov['mean']:.2f}"))
        metrics.append(('AOV Median', f"${aov['median']:.2f}"))
        metrics.append(('AOV 25th Percentile', f"${aov['p25']:.2f}"))
        metrics.append(('AOV 75th Percentile', f"${aov['p75']:.2f}"))

        # Customer Metrics
        cust = advanced['customer']
        metrics.append(('', ''))  # Blank row
        metrics.append(('CUSTOMER METRICS', ''))
        metrics.append(('Unique Customers', cust['unique_customers']))
        metrics.append(('New Customers', cust['new_customers']))
        metrics.append(('Returning Customers', cust['returning_customers']))
        metrics.append(('New Customer Share %', f"{cust['new_share_pct']:.2f}%"))
        metrics.append(('Returning Share %', f"{cust['ret_share_pct']:.2f}%"))
        metrics.append(('Returning/New Ratio', f"{cust['ret_new_ratio']:.2f}"))
        metrics.append(('30-Day Repeat', cust['repeat_30d']))
        metrics.append(('30-Day Repeat Rate %', f"{cust['repeat_30d_pct']:.2f}%"))
        metrics.append(('Top 10 Revenue Share %', f"{cust['top10_share_pct']:.2f}%"))

        # Accounts Receivable
        ar = advanced['ar']
        metrics.append(('', ''))  # Blank row
        metrics.append(('ACCOUNTS RECEIVABLE', ''))
        metrics.append(('Unpaid Orders', ar['unpaid_orders']))
        metrics.append(('Unpaid Balance', f"${ar['unpaid_balance']:.2f}"))
        metrics.append(('Unpaid Share %', f"{ar['unpaid_share_pct']:.2f}%"))

        # Wash & Fold
        metrics.append(('', ''))  # Blank row
        metrics.append(('WASH & FOLD', ''))
        metrics.append(('Total Pounds', f"{advanced['wash_fold_lbs']:.1f} lbs"))

        # Save to CSV
        metrics_df = pd.DataFrame(metrics, columns=['Metric', 'Value'])
        metrics_df.to_csv(filename, index=False)
        print(f"Summary metrics saved to {filename}")

    def validate_calculations(self) -> None:
        """Validate that business rules were applied correctly"""
        print("\n🔍 Validating calculations...")
        
        # Check W&F minimums
        wf_orders = self.merged_df[self.merged_df['WF Regular Cost'] > 0]
        wf_under_minimum = wf_orders[wf_orders['WF Regular Cost'] < 19.95]
        print(f"W&F orders under $19.95 minimum: {len(wf_under_minimum)} (should be 0)")
        
        # Check W&F Delicate minimums  
        wf_delicate_orders = self.merged_df[self.merged_df['WF Delicate Cost'] > 0]
        wf_delicate_under_minimum = wf_delicate_orders[wf_delicate_orders['WF Delicate Cost'] < 24.95]
        print(f"W&F Delicate orders under $24.95 minimum: {len(wf_delicate_under_minimum)} (should be 0)")
        
        # Check express multiplier
        express_orders = self.merged_df[self.merged_df['Express'] == 1]
        if len(express_orders) > 0:
            sample_express = express_orders.iloc[0]
            expected_cost = sample_express['Base Cost'] * 1.5
            actual_cost = sample_express['Final Cost']
            print(f"Express order sample - Base: ${sample_express['Base Cost']:.2f}, Final: ${actual_cost:.2f}, Expected: ${expected_cost:.2f}")
        
        # Check special rules
        apt_450_orders = self.merged_df[
            self.merged_df['Address'].str.contains('450', case=False, na=False) |
            self.merged_df['Notes'].str.contains('450', case=False, na=False)
        ]
        apt_450_with_cost = apt_450_orders[apt_450_orders['Final Cost'] > 0]
        print(f"'450' orders with non-zero cost: {len(apt_450_with_cost)} (should be 0)")
        
        camille_orders = self.merged_df[
            self.merged_df['Customer'].str.contains('Camille Simon', case=False, na=False)
        ]
        camille_with_revenue = camille_orders[camille_orders['Total after Credit Used'] > 0]
        print(f"Camille Simon orders with revenue: {len(camille_with_revenue)} (should be 0)")
        
        print("✅ Validation completed")

def main():
    """Main execution function"""
    import os
    import sys

    # Look for CSV files in data directory first, then current directory
    if os.path.exists('data/orders.csv') and os.path.exists('data/items.csv'):
        orders_file = 'data/orders.csv'
        items_file = 'data/items.csv'
    elif os.path.exists('orders.csv') and os.path.exists('items.csv'):
        orders_file = 'orders.csv'
        items_file = 'items.csv'
    else:
        print("❌ Error: CSV files not found!")
        print("   Please ensure these files exist:")
        print("   - data/orders.csv (or orders.csv)")
        print("   - data/items.csv (or items.csv)")
        sys.exit(1)

    print(f"📂 Using orders file: {orders_file}")
    print(f"📂 Using items file: {items_file}")

    # Initialize processor
    processor = CSVMerger(orders_file, items_file)
    
    # Process data
    processor.load_and_clean_data()
    processor.merge_data()
    processor.add_customer_analytics()
    
    # Generate dashboard data
    dashboard_data = processor.generate_dashboard_data()
    
    # Save results
    processor.save_merged_csv()
    processor.save_monthly_csvs()
    processor.save_dashboard_json(dashboard_data)
    processor.save_summary_metrics(dashboard_data)

    # Validate calculations
    processor.validate_calculations()
    
    print("\n✅ Processing completed successfully!")
    print(f"Final dataset contains {len(processor.merged_df)} orders")
    
    # Show sample of special rules applied
    apt_450_orders = len(processor.merged_df[
        processor.merged_df['Address'].str.contains('450', case=False, na=False) |
        processor.merged_df['Notes'].str.contains('450', case=False, na=False)
    ])
    camille_orders = len(processor.merged_df[
        processor.merged_df['Customer'].str.contains('Camille Simon', case=False, na=False)
    ])
    express_orders = len(processor.merged_df[processor.merged_df['Express'] == 1])
    
    print(f"\nSpecial rules applied:")
    print(f"  - '450' special account orders: {apt_450_orders}")
    print(f"  - Camille Simon comp orders: {camille_orders}")
    print(f"  - Express orders (1.5x cost): {express_orders}")
    
    # Show summary stats
    total_revenue_net = processor.merged_df['Revenue Net Tax'].sum()
    total_cost = processor.merged_df['Final Cost'].sum()
    total_profit = processor.merged_df['Profit'].sum()
    
    print(f"\n📊 Summary Stats:")
    print(f"  - Total Revenue Net: ${total_revenue_net:,.2f}")
    print(f"  - Total Cost: ${total_cost:,.2f}")
    print(f"  - Total Profit: ${total_profit:,.2f}")
    print(f"  - Profit Margin: {(total_profit/total_revenue_net*100):,.1f}%")

if __name__ == "__main__":
    main()