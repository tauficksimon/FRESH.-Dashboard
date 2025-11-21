#!/usr/bin/env python3
"""
Generate HAAP Cost Verification Report for any date range
Usage: python scripts/generate_haap_report.py [start_date] [end_date]
Example: python scripts/generate_haap_report.py 2025-10-01 2025-10-31
"""

import sys
import os
import pandas as pd
from datetime import datetime
import html
import base64

def load_logo():
    """Load and encode the FRESH logo"""
    logo_path = '/Users/tauficksimon/Library/Mobile Documents/com~apple~CloudDocs/INDICA/FRESH/fresh logo/logo copy.png'

    if not os.path.exists(logo_path):
        # Fallback: try to find logo in project
        alt_paths = [
            'assets/logo.png',
            'dashboard-shadcn/public/logo.png'
        ]
        for path in alt_paths:
            if os.path.exists(path):
                logo_path = path
                break

    try:
        with open(logo_path, 'rb') as f:
            logo_data = base64.b64encode(f.read()).decode()
            return f"data:image/png;base64,{logo_data}"
    except Exception as e:
        print(f"Warning: Could not load logo: {e}")
        return ""

def load_orders_data():
    """Load orders from CSV files"""
    # Try different locations for orders_ALL.csv
    possible_paths = [
        'orders_ALL.csv',  # Current directory
        '../orders_ALL.csv',  # Parent directory (for Vercel)
        'data/orders_ALL.csv',  # Data subdirectory
    ]

    for csv_path in possible_paths:
        if os.path.exists(csv_path):
            print(f"Loading orders from: {csv_path}")
            orders_df = pd.read_csv(csv_path)
            return orders_df

    print("Error: orders_ALL.csv not found in any expected location")
    print("Searched paths:", possible_paths)
    sys.exit(1)

def filter_by_date_range(df, start_date=None, end_date=None):
    """Filter orders by date range"""
    df = df.copy()

    # Ensure Date Placed column exists
    if 'Date Placed' not in df.columns and 'Placed' in df.columns:
        df['Date Placed'] = pd.to_datetime(df['Placed'])
    elif 'Date Placed' in df.columns:
        df['Date Placed'] = pd.to_datetime(df['Date Placed'])
    else:
        print("Error: No date column found")
        sys.exit(1)

    # Filter by date range
    if start_date:
        df = df[df['Date Placed'] >= start_date]
    if end_date:
        df = df[df['Date Placed'] <= end_date]

    return df

def generate_report(df, title, output_file):
    """Generate HTML report from dataframe"""

    # Load template
    template_path = 'templates/haap_verification_template.html'
    with open(template_path, 'r') as f:
        template = f.read()

    # Calculate summary stats
    total_orders = len(df)
    total_revenue = df['Revenue Net Tax'].sum() if 'Revenue Net Tax' in df.columns else df['Total after Credit Used'].sum()
    total_cost = df['Final Cost'].sum()
    total_profit = df['Profit'].sum()
    margin_pct = (total_profit / total_revenue * 100) if total_revenue > 0 else 0

    # Format currency
    def fmt_currency(val):
        return f"{val:,.0f}"

    # Load logo
    logo_data = load_logo()

    # Generate table rows
    table_rows = []
    for _, row in df.iterrows():
        is_special = '450' in str(row.get('Notes', '')) or 'Camille Simon' in str(row.get('Customer', ''))
        row_class = ' class="special"' if is_special else ''

        # Format express
        express_val = row.get('Express', 0)
        if express_val == 1 or express_val == 1.0:
            express_badge = '<span class="express-badge express-yes">YES</span>'
        else:
            express_badge = '<span class="express-badge express-no">NO</span>'

        # Format items
        items_raw = str(row.get('Summary', '') or row.get('Items Summary', ''))
        items_lines = [line.strip() for line in items_raw.split('\n') if line.strip()]
        items_html = '<br>'.join(items_lines)

        # Format currency values
        total_charged = f"${row.get('Total', 0):,.2f}" if pd.notnull(row.get('Total')) else "$0.00"
        haap_cost = f"${row.get('Final Cost', 0):,.2f}" if pd.notnull(row.get('Final Cost')) else "$0.00"
        profit = f"${row.get('Profit', 0):,.2f}" if pd.notnull(row.get('Profit')) else "$0.00"

        # Calculate margin percentage for this order
        revenue_val = row.get('Total', 0) if pd.notnull(row.get('Total')) else 0
        profit_val = row.get('Profit', 0) if pd.notnull(row.get('Profit')) else 0
        margin = (profit_val / revenue_val * 100) if revenue_val > 0 else 0
        margin_pct_str = f"{margin:.1f}%"

        # Escape HTML
        customer = html.escape(str(row.get('Customer', '')))
        notes = html.escape(str(row.get('Notes', '')))

        # Format date
        date_val = row.get('Placed', '') or row.get('Date Placed', '')

        table_row = f"""
            <tr{row_class}>
                <td class="order-id">{row.get('Order ID', '')}</td>
                <td class="date">{date_val}</td>
                <td class="customer">{customer}</td>
                <td class="amount">{total_charged}</td>
                <td class="amount">{haap_cost}</td>
                <td class="amount">{profit}</td>
                <td class="amount">{margin_pct_str}</td>
                <td>{express_badge}</td>
                <td class="items">{items_html}</td>
                <td class="notes">{notes}</td>
            </tr>
        """
        table_rows.append(table_row)

    # Replace template variables
    html_content = template.replace('{{TITLE}}', title)
    html_content = html_content.replace('{{LOGO_DATA}}', logo_data)
    html_content = html_content.replace('{{GENERATED_DATE}}', datetime.now().strftime('%B %d, %Y at %I:%M %p'))
    html_content = html_content.replace('{{TOTAL_ORDERS}}', str(total_orders))
    html_content = html_content.replace('{{TOTAL_REVENUE}}', fmt_currency(total_revenue))
    html_content = html_content.replace('{{TOTAL_COST}}', fmt_currency(total_cost))
    html_content = html_content.replace('{{TOTAL_PROFIT}}', fmt_currency(total_profit))
    html_content = html_content.replace('{{MARGIN_PCT}}', f"{margin_pct:.1f}")
    html_content = html_content.replace('{{TABLE_ROWS}}', '\n'.join(table_rows))

    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✅ Report generated: {output_file}")
    print(f"   - {total_orders} orders")
    print(f"   - Revenue: ${total_revenue:,.2f}")
    print(f"   - HAAP Cost: ${total_cost:,.2f}")
    print(f"   - Profit: ${total_profit:,.2f} ({margin_pct:.1f}%)")

def main():
    """Main function"""
    # Parse command line arguments
    if len(sys.argv) >= 3:
        start_date = sys.argv[1]
        end_date = sys.argv[2]
        title = f"{start_date} to {end_date}"
        output_file = f"haap_report_{start_date}_to_{end_date}.html"
    elif len(sys.argv) == 2:
        # Single month in format YYYY-MM
        month_str = sys.argv[1]
        try:
            year, month = map(int, month_str.split('-'))
            start_date = f"{year:04d}-{month:02d}-01"
            # Get last day of month
            if month == 12:
                end_date = f"{year:04d}-{month:02d}-31"
            else:
                next_month = pd.Timestamp(year=year, month=month, day=1) + pd.DateOffset(months=1)
                last_day = (next_month - pd.DateOffset(days=1)).day
                end_date = f"{year:04d}-{month:02d}-{last_day:02d}"

            title = pd.Timestamp(start_date).strftime('%B %Y')
            output_file = f"haap_report_{year:04d}_{month:02d}.html"
        except:
            print("Usage: python scripts/generate_haap_report.py YYYY-MM")
            print("   or: python scripts/generate_haap_report.py START_DATE END_DATE")
            sys.exit(1)
    else:
        # Use current month
        now = datetime.now()
        start_date = f"{now.year}-{now.month:02d}-01"
        if now.month == 12:
            end_date = f"{now.year}-{now.month:02d}-31"
        else:
            next_month = pd.Timestamp(year=now.year, month=now.month, day=1) + pd.DateOffset(months=1)
            last_day = (next_month - pd.DateOffset(days=1)).day
            end_date = f"{now.year}-{now.month:02d}-{last_day:02d}"

        title = now.strftime('%B %Y')
        output_file = f"haap_report_{now.year:04d}_{now.month:02d}.html"

    print(f"📊 Generating HAAP Cost Verification Report")
    print(f"   Date range: {start_date} to {end_date}")

    # Load data
    print("Loading orders data...")
    df = load_orders_data()

    # Filter by date range
    print(f"Filtering orders...")
    df_filtered = filter_by_date_range(df, start_date, end_date)

    if len(df_filtered) == 0:
        print(f"❌ No orders found for date range {start_date} to {end_date}")
        sys.exit(1)

    # Generate report
    generate_report(df_filtered, title, output_file)

if __name__ == "__main__":
    main()
