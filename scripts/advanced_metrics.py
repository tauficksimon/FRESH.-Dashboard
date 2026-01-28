#!/usr/bin/env python3
"""
Advanced Metrics Analysis for FRESH Dashboard
Generates: LTV, Cohorts, Churn Prediction, Unit Economics
"""

import csv
import json
from datetime import datetime, timedelta
from collections import defaultdict
import statistics

def parse_date(date_str):
    """Parse date from various formats"""
    if not date_str or date_str == '0.0':
        return None
    try:
        # Handle "22 Nov 2025 19:52" format
        return datetime.strptime(date_str.split(':')[0].strip(), '%d %b %Y %H')
    except:
        try:
            # Handle ISO format
            return datetime.strptime(date_str.split()[0], '%Y-%m-%d')
        except:
            return None

def load_order_costs(items_file):
    """Load actual cost per order from Items.csv"""
    order_costs = defaultdict(float)

    with open(items_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            order_id = row.get('Order ID', '').strip()
            if not order_id:
                continue

            # Sum up item costs
            item_cost = float(row.get('Cost Price', 0) or 0)
            order_costs[order_id] += item_cost

    return order_costs

def calculate_ltv_segments(orders_file, items_file='data/Items.csv'):
    """Calculate Customer Lifetime Value and Segmentation (based on actual gross profit)"""

    # Load actual costs per order from Items.csv
    order_costs = load_order_costs(items_file)

    customer_data = defaultdict(lambda: {
        'orders': [],
        'total_revenue': 0,
        'total_profit': 0,
        'first_order': None,
        'last_order': None,
        'order_count': 0,
        'avg_order_value': 0,
        'days_active': 0,
        'email': '',
        'name': ''
    })

    with open(orders_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            customer_id = row.get('Customer ID', '').strip()
            if not customer_id:
                continue

            placed_date = parse_date(row.get('Placed', ''))
            if not placed_date:
                continue

            order_id = row.get('Order ID', '').strip()

            # Revenue from Orders.csv (what customer paid)
            revenue = float(row.get('Total after Credit Used', 0) or row.get('Total', 0) or 0)

            # Cost from Items.csv, profit = revenue - cost
            cost = order_costs.get(order_id, revenue * 0.50)  # Fallback to 50% cost estimate
            profit = revenue - cost

            customer_data[customer_id]['orders'].append({
                'date': placed_date,
                'revenue': revenue,
                'profit': profit,
                'order_id': order_id
            })
            customer_data[customer_id]['total_revenue'] += revenue
            customer_data[customer_id]['total_profit'] += profit
            customer_data[customer_id]['order_count'] += 1
            customer_data[customer_id]['email'] = row.get('Email', '')
            customer_data[customer_id]['name'] = row.get('Customer', '')

            if customer_data[customer_id]['first_order'] is None:
                customer_data[customer_id]['first_order'] = placed_date
            else:
                customer_data[customer_id]['first_order'] = min(
                    customer_data[customer_id]['first_order'], placed_date
                )

            if customer_data[customer_id]['last_order'] is None:
                customer_data[customer_id]['last_order'] = placed_date
            else:
                customer_data[customer_id]['last_order'] = max(
                    customer_data[customer_id]['last_order'], placed_date
                )

    # Calculate derived metrics
    customer_segments = []
    for customer_id, data in customer_data.items():
        data['avg_order_value'] = data['total_revenue'] / data['order_count'] if data['order_count'] > 0 else 0
        data['days_active'] = (data['last_order'] - data['first_order']).days if data['first_order'] and data['last_order'] else 0

        # Calculate days since last order
        days_since_last = (datetime.now() - data['last_order']).days if data['last_order'] else 999

        # Segment customers
        if data['total_revenue'] >= 500 and data['order_count'] >= 5:
            segment = 'VIP'
        elif data['total_revenue'] >= 200 and data['order_count'] >= 3:
            segment = 'Loyal'
        elif data['order_count'] == 1:
            segment = 'One-Time'
        elif days_since_last > 60:
            segment = 'At-Risk'
        elif days_since_last > 90:
            segment = 'Churned'
        else:
            segment = 'Active'

        customer_segments.append({
            'customer_id': customer_id,
            'name': data['name'],
            'email': data['email'],
            'ltv': round(data['total_profit'], 2),  # LTV based on gross profit
            'total_revenue': round(data['total_revenue'], 2),
            'orders': data['order_count'],
            'aov': round(data['avg_order_value'], 2),
            'first_order': data['first_order'].strftime('%Y-%m-%d') if data['first_order'] else None,
            'last_order': data['last_order'].strftime('%Y-%m-%d') if data['last_order'] else None,
            'days_since_last': days_since_last,
            'segment': segment
        })

    # Sort by LTV
    customer_segments.sort(key=lambda x: x['ltv'], reverse=True)

    # Calculate segment stats
    segment_stats = defaultdict(lambda: {'count': 0, 'revenue': 0})
    for customer in customer_segments:
        segment_stats[customer['segment']]['count'] += 1
        segment_stats[customer['segment']]['revenue'] += customer['ltv']

    # Calculate LTV averages for key groups
    all_ltvs = [c['ltv'] for c in customer_segments]
    vip_customers = [c for c in customer_segments if c['segment'] == 'VIP']
    repeat_customers = [c for c in customer_segments if c['orders'] >= 2]
    first_time_customers = [c for c in customer_segments if c['orders'] == 1]

    avg_ltv = sum(all_ltvs) / len(all_ltvs) if all_ltvs else 0
    avg_vip_ltv = sum(c['ltv'] for c in vip_customers) / len(vip_customers) if vip_customers else 0
    avg_repeat_ltv = sum(c['ltv'] for c in repeat_customers) / len(repeat_customers) if repeat_customers else 0
    avg_first_time_ltv = sum(c['ltv'] for c in first_time_customers) / len(first_time_customers) if first_time_customers else 0

    return {
        'customers': customer_segments,
        'segment_stats': dict(segment_stats),
        'top_10': customer_segments[:10],
        'at_risk': [c for c in customer_segments if c['segment'] == 'At-Risk'],
        'churned': [c for c in customer_segments if c['segment'] == 'Churned'],
        'avg_ltv': round(avg_ltv, 2),
        'avg_vip_ltv': round(avg_vip_ltv, 2),
        'avg_repeat_ltv': round(avg_repeat_ltv, 2),
        'avg_first_time_ltv': round(avg_first_time_ltv, 2),
        'vip_count': len(vip_customers),
        'repeat_count': len(repeat_customers),
        'first_time_count': len(first_time_customers)
    }

def calculate_cohort_retention(orders_file):
    """Calculate cohort retention analysis"""

    # Track customers by their first order month (cohort)
    customer_cohorts = {}  # customer_id -> cohort_month
    cohort_activity = defaultdict(lambda: defaultdict(set))  # cohort -> month -> set of customers

    with open(orders_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            customer_id = row.get('Customer ID', '').strip()
            if not customer_id:
                continue

            placed_date = parse_date(row.get('Placed', ''))
            if not placed_date:
                continue

            order_month = placed_date.strftime('%Y-%m')

            # Determine customer's cohort (first order month)
            if customer_id not in customer_cohorts:
                customer_cohorts[customer_id] = order_month

            cohort_month = customer_cohorts[customer_id]
            cohort_activity[cohort_month][order_month].add(customer_id)

    # Calculate retention rates
    retention_data = []
    cohort_months = sorted(cohort_activity.keys())

    for cohort in cohort_months:
        cohort_size = len(cohort_activity[cohort][cohort])
        cohort_row = {
            'cohort': cohort,
            'size': cohort_size,
            'months': {}
        }

        # Calculate retention for each subsequent month
        cohort_date = datetime.strptime(cohort, '%Y-%m')
        for month in sorted(cohort_activity[cohort].keys()):
            month_date = datetime.strptime(month, '%Y-%m')
            months_diff = (month_date.year - cohort_date.year) * 12 + (month_date.month - cohort_date.month)

            retained = len(cohort_activity[cohort][month])
            retention_rate = (retained / cohort_size * 100) if cohort_size > 0 else 0

            cohort_row['months'][f'M{months_diff}'] = {
                'count': retained,
                'rate': round(retention_rate, 1)
            }

        retention_data.append(cohort_row)

    return retention_data

def predict_churn(orders_file):
    """Simple churn prediction based on behavioral patterns"""

    customer_activity = defaultdict(lambda: {
        'orders': [],
        'avg_days_between_orders': 0,
        'last_order': None,
        'expected_next_order': None,
        'churn_risk': 0,
        'name': '',
        'email': ''
    })

    with open(orders_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            customer_id = row.get('Customer ID', '').strip()
            if not customer_id:
                continue

            placed_date = parse_date(row.get('Placed', ''))
            if not placed_date:
                continue

            customer_activity[customer_id]['orders'].append(placed_date)
            customer_activity[customer_id]['name'] = row.get('Customer', '')
            customer_activity[customer_id]['email'] = row.get('Email', '')

    churn_predictions = []
    now = datetime.now()

    for customer_id, data in customer_activity.items():
        if len(data['orders']) < 2:
            continue  # Need at least 2 orders to predict

        # Sort orders
        data['orders'].sort()
        data['last_order'] = data['orders'][-1]

        # Calculate average days between orders
        intervals = []
        for i in range(1, len(data['orders'])):
            days_diff = (data['orders'][i] - data['orders'][i-1]).days
            intervals.append(days_diff)

        data['avg_days_between_orders'] = statistics.mean(intervals) if intervals else 30

        # Predict next order date
        data['expected_next_order'] = data['last_order'] + timedelta(days=data['avg_days_between_orders'])

        # Calculate days overdue
        days_overdue = (now - data['expected_next_order']).days

        # Calculate churn risk (0-100)
        if days_overdue <= 0:
            churn_risk = 0
        elif days_overdue <= 7:
            churn_risk = 20
        elif days_overdue <= 14:
            churn_risk = 40
        elif days_overdue <= 30:
            churn_risk = 60
        elif days_overdue <= 60:
            churn_risk = 80
        else:
            churn_risk = 95

        data['churn_risk'] = churn_risk

        if churn_risk >= 40:  # Only include at-risk customers
            churn_predictions.append({
                'customer_id': customer_id,
                'name': data['name'],
                'email': data['email'],
                'last_order': data['last_order'].strftime('%Y-%m-%d'),
                'expected_next': data['expected_next_order'].strftime('%Y-%m-%d'),
                'days_overdue': days_overdue,
                'churn_risk': churn_risk,
                'avg_order_interval': round(data['avg_days_between_orders'], 1)
            })

    # Sort by churn risk (highest first)
    churn_predictions.sort(key=lambda x: x['churn_risk'], reverse=True)

    return churn_predictions

def calculate_unit_economics(orders_file):
    """Calculate true unit economics per order"""

    # Fixed costs (monthly) - you'll need to update these
    FIXED_COSTS = {
        'rent': 2000,  # Estimated monthly rent
        'labor': 3000,  # Estimated monthly labor costs
        'utilities': 300,  # Estimated utilities
        'software': 200,  # POS, software subscriptions
        'insurance': 150,  # Business insurance
        'marketing': 500,  # Monthly marketing spend
    }

    monthly_metrics = defaultdict(lambda: {
        'orders': 0,
        'revenue': 0,
        'haap_cost': 0,
        'gross_profit': 0
    })

    with open(orders_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            placed_date = parse_date(row.get('Placed', ''))
            if not placed_date:
                continue

            month = placed_date.strftime('%Y-%m')
            revenue = float(row.get('Total after Credit Used', 0) or row.get('Total', 0) or 0)

            monthly_metrics[month]['orders'] += 1
            monthly_metrics[month]['revenue'] += revenue

    # Calculate unit economics
    unit_economics = []
    total_fixed_monthly = sum(FIXED_COSTS.values())

    for month, data in sorted(monthly_metrics.items()):
        if data['orders'] == 0:
            continue

        # Per-order metrics
        revenue_per_order = data['revenue'] / data['orders']
        fixed_cost_per_order = total_fixed_monthly / data['orders']

        # Note: We don't have variable costs (HAAP) in this simplified version
        # You'd need to add Final Cost from the CSV

        contribution_margin = revenue_per_order - fixed_cost_per_order

        unit_economics.append({
            'month': month,
            'orders': data['orders'],
            'revenue_per_order': round(revenue_per_order, 2),
            'fixed_cost_per_order': round(fixed_cost_per_order, 2),
            'contribution_margin': round(contribution_margin, 2),
            'total_fixed_costs': total_fixed_monthly,
            'break_even_orders': round(total_fixed_monthly / revenue_per_order) if revenue_per_order > 0 else 0
        })

    return {
        'monthly': unit_economics,
        'fixed_costs': FIXED_COSTS
    }

def calculate_predictive_ltv(orders_file, items_file='data/Items.csv'):
    """Predict LTV for customers with 1-2 orders based on early signals (using actual gross profit)"""

    # Load actual costs per order from Items.csv
    order_costs = load_order_costs(items_file)

    customer_data = defaultdict(lambda: {
        'orders': [],
        'total_revenue': 0,
        'total_profit': 0,
        'order_count': 0,
        'name': '',
        'email': '',
        'customer_id': ''
    })

    with open(orders_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            customer_id = row.get('Customer ID', '').strip()
            if not customer_id:
                continue

            placed_date = parse_date(row.get('Placed', ''))
            if not placed_date:
                continue

            order_id = row.get('Order ID', '').strip()

            # Revenue from Orders.csv
            revenue = float(row.get('Total after Credit Used', 0) or row.get('Total', 0) or 0)

            # Cost from Items.csv, profit = revenue - cost
            cost = order_costs.get(order_id, revenue * 0.50)
            profit = revenue - cost

            customer_data[customer_id]['orders'].append({
                'date': placed_date,
                'revenue': revenue,
                'profit': profit
            })
            customer_data[customer_id]['total_revenue'] += revenue
            customer_data[customer_id]['total_profit'] += profit
            customer_data[customer_id]['order_count'] += 1
            customer_data[customer_id]['name'] = row.get('Customer', '')
            customer_data[customer_id]['email'] = row.get('Email', '')
            customer_data[customer_id]['customer_id'] = customer_id

    # Calculate average LTV (actual gross profit) for customers with 3+ orders (our benchmark)
    benchmark_ltvs = []
    for data in customer_data.values():
        if data['order_count'] >= 3:
            benchmark_ltvs.append(data['total_profit'])

    avg_loyal_ltv = statistics.mean(benchmark_ltvs) if benchmark_ltvs else 0

    # Predict LTV for early-stage customers (1-2 orders)
    predictions = []

    for customer_id, data in customer_data.items():
        if data['order_count'] >= 3:
            continue  # Skip already loyal customers

        data['orders'].sort(key=lambda x: x['date'])

        # Signals for prediction
        first_order_value = data['orders'][0]['revenue']

        # Calculate days to second order (if exists)
        days_to_second = None
        if data['order_count'] >= 2:
            days_to_second = (data['orders'][1]['date'] - data['orders'][0]['date']).days

        # Predictive scoring (0-100)
        score = 0
        predicted_ltv = 0
        potential = 'Unknown'

        if data['order_count'] == 1:
            # Only have first order to work with
            # High first order value = higher potential
            if first_order_value >= 100:
                score = 65
                predicted_ltv = avg_loyal_ltv * 0.7
                potential = 'High'
            elif first_order_value >= 60:
                score = 45
                predicted_ltv = avg_loyal_ltv * 0.4
                potential = 'Medium'
            else:
                score = 25
                predicted_ltv = avg_loyal_ltv * 0.2
                potential = 'Low'

        elif data['order_count'] == 2:
            # Have two orders - much better signal
            second_order_value = data['orders'][1]['revenue']

            # Fast return + high value = excellent signal
            if days_to_second <= 14 and first_order_value >= 50:
                score = 85
                predicted_ltv = avg_loyal_ltv * 0.9
                potential = 'Very High'
            elif days_to_second <= 30:
                score = 70
                predicted_ltv = avg_loyal_ltv * 0.75
                potential = 'High'
            elif days_to_second <= 60:
                score = 50
                predicted_ltv = avg_loyal_ltv * 0.5
                potential = 'Medium'
            else:
                score = 30
                predicted_ltv = avg_loyal_ltv * 0.3
                potential = 'Low'

        predictions.append({
            'customer_id': customer_id,
            'name': data['name'],
            'email': data['email'],
            'order_count': data['order_count'],
            'current_ltv': round(data['total_profit'], 2),  # LTV based on gross profit
            'predicted_ltv': round(predicted_ltv, 2),
            'potential_score': score,
            'potential_category': potential,
            'first_order_value': round(first_order_value, 2),
            'days_to_second_order': days_to_second
        })

    # Sort by predicted LTV (highest first)
    predictions.sort(key=lambda x: x['predicted_ltv'], reverse=True)

    return {
        'predictions': predictions,
        'avg_loyal_ltv': round(avg_loyal_ltv, 2),
        'high_potential': [p for p in predictions if p['potential_category'] in ['High', 'Very High']],
        'total_predicted': len(predictions)
    }

def calculate_seasonal_patterns(orders_file):
    """Analyze seasonal and time-based ordering patterns with sophisticated forecasting"""

    # Track patterns
    by_month = defaultdict(lambda: {'orders': 0, 'revenue': 0})
    by_day_of_week = defaultdict(lambda: {'orders': 0, 'revenue': 0})
    by_hour = defaultdict(lambda: {'orders': 0, 'revenue': 0})
    by_week_of_month = defaultdict(lambda: {'orders': 0, 'revenue': 0})

    # Track ALL orders chronologically for sophisticated forecasting
    all_orders = []
    daily_order_counts = defaultdict(int)
    weekly_order_counts = defaultdict(int)

    # Track current month for projections
    current_month_orders = []
    today = datetime.now().date()
    current_month_name = today.strftime('%B')
    current_month_year = today.strftime('%Y-%m')

    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    with open(orders_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            placed_date = parse_date(row.get('Placed', ''))
            if not placed_date:
                continue

            revenue = float(row.get('Total after Credit Used', 0) or row.get('Total', 0) or 0)

            # Store all orders for trend analysis
            all_orders.append({
                'date': placed_date,
                'revenue': revenue
            })

            # Count orders by day for precise forecasting
            date_key = placed_date.strftime('%Y-%m-%d')
            daily_order_counts[date_key] += 1

            # Count by week for trend detection (use ISO week to handle year boundaries correctly)
            iso_year, iso_week, _ = placed_date.isocalendar()
            week_key = f'{iso_year}-W{iso_week:02d}'
            weekly_order_counts[week_key] += 1

            # Track current month orders for projection
            if placed_date.strftime('%Y-%m') == current_month_year:
                current_month_orders.append({
                    'date': placed_date,
                    'revenue': revenue
                })

            # Month analysis
            month_key = placed_date.strftime('%B')
            by_month[month_key]['orders'] += 1
            by_month[month_key]['revenue'] += revenue

            # Day of week
            day_key = day_names[placed_date.weekday()]
            by_day_of_week[day_key]['orders'] += 1
            by_day_of_week[day_key]['revenue'] += revenue

            # Hour of day
            hour_key = placed_date.hour
            by_hour[hour_key]['orders'] += 1
            by_hour[hour_key]['revenue'] += revenue

            # Week of month (1-4)
            week_of_month = (placed_date.day - 1) // 7 + 1
            by_week_of_month[f'Week {week_of_month}']['orders'] += 1
            by_week_of_month[f'Week {week_of_month}']['revenue'] += revenue

    # Convert to sorted lists
    month_order = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December']

    monthly_data = []
    for month in month_order:
        if month in by_month:
            monthly_data.append({
                'month': month,
                'orders': by_month[month]['orders'],
                'revenue': round(by_month[month]['revenue'], 2),
                'avg_order_value': round(by_month[month]['revenue'] / by_month[month]['orders'], 2) if by_month[month]['orders'] > 0 else 0
            })

    daily_data = []
    for day in day_names:
        if day in by_day_of_week:
            daily_data.append({
                'day': day,
                'orders': by_day_of_week[day]['orders'],
                'revenue': round(by_day_of_week[day]['revenue'], 2),
                'avg_order_value': round(by_day_of_week[day]['revenue'] / by_day_of_week[day]['orders'], 2) if by_day_of_week[day]['orders'] > 0 else 0
            })

    hourly_data = []
    for hour in sorted(by_hour.keys()):
        hourly_data.append({
            'hour': hour,
            'orders': by_hour[hour]['orders'],
            'revenue': round(by_hour[hour]['revenue'], 2)
        })

    # Find peak times
    if daily_data:
        busiest_day = max(daily_data, key=lambda x: x['orders'])
        slowest_day = min(daily_data, key=lambda x: x['orders'])
    else:
        busiest_day = {'day': 'N/A', 'orders': 0}
        slowest_day = {'day': 'N/A', 'orders': 0}

    if monthly_data:
        busiest_month = max(monthly_data, key=lambda x: x['orders'])
        slowest_month = min(monthly_data, key=lambda x: x['orders'])
    else:
        busiest_month = {'month': 'N/A', 'orders': 0}
        slowest_month = {'month': 'N/A', 'orders': 0}

    if hourly_data:
        peak_hours = sorted(hourly_data, key=lambda x: x['orders'], reverse=True)[:3]
    else:
        peak_hours = []

    # =====================================================================
    # SOPHISTICATED 7-DAY FORECASTING with Multiple Algorithms
    # =====================================================================

    # Sort all orders chronologically
    all_orders.sort(key=lambda x: x['date'])

    # Calculate growth trend using recent vs older data
    if len(weekly_order_counts) >= 8:
        sorted_weeks = sorted(weekly_order_counts.items())
        recent_4_weeks = sorted_weeks[-4:]
        older_4_weeks = sorted_weeks[-8:-4]

        recent_avg = statistics.mean([count for _, count in recent_4_weeks])
        older_avg = statistics.mean([count for _, count in older_4_weeks])

        # Growth multiplier (1.0 = no growth, >1.0 = growing, <1.0 = declining)
        growth_multiplier = recent_avg / older_avg if older_avg > 0 else 1.0
    else:
        growth_multiplier = 1.0

    # Calculate sophisticated day-of-week averages with recency weighting
    day_of_week_patterns = defaultdict(list)

    # Look at last 60 days of data for each day of week
    lookback_start = today - timedelta(days=60)

    for date_str, count in daily_order_counts.items():
        order_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        if order_date >= lookback_start and order_date < today:
            day_name = day_names[order_date.weekday()]

            # Weight more recent data higher (exponential decay)
            days_ago = (today - order_date).days
            weight = 0.98 ** days_ago  # Recent days have weight ~1.0, older days decay

            day_of_week_patterns[day_name].append({
                'count': count,
                'weight': weight,
                'date': order_date
            })

    # Calculate weighted average for each day of week
    day_of_week_forecast = {}
    for day_name in day_names:
        if day_name in day_of_week_patterns:
            patterns = day_of_week_patterns[day_name]

            # Weighted average
            total_weighted_orders = sum(p['count'] * p['weight'] for p in patterns)
            total_weight = sum(p['weight'] for p in patterns)

            base_forecast = total_weighted_orders / total_weight if total_weight > 0 else 0

            # Apply growth trend
            adjusted_forecast = base_forecast * growth_multiplier

            day_of_week_forecast[day_name] = adjusted_forecast
        else:
            # Fallback to overall average if no data for this day
            day_of_week_forecast[day_name] = by_day_of_week.get(day_name, {}).get('orders', 0) / 4

    # Generate 7-day forecast with confidence intervals
    forecast_7_days = []

    for i in range(7):
        forecast_date = today + timedelta(days=i+1)
        day_name = day_names[forecast_date.weekday()]

        # Base prediction
        predicted_orders = day_of_week_forecast.get(day_name, 0)

        # Calculate confidence interval based on historical variance
        if day_name in day_of_week_patterns:
            historical_counts = [p['count'] for p in day_of_week_patterns[day_name]]
            if len(historical_counts) > 1:
                std_dev = statistics.stdev(historical_counts)
                confidence_low = max(0, predicted_orders - std_dev)
                confidence_high = predicted_orders + std_dev
            else:
                confidence_low = predicted_orders * 0.7
                confidence_high = predicted_orders * 1.3
        else:
            confidence_low = predicted_orders * 0.7
            confidence_high = predicted_orders * 1.3

        forecast_7_days.append({
            'date': forecast_date.strftime('%Y-%m-%d'),
            'day': day_name,
            'predicted_orders': round(predicted_orders),
            'confidence_low': round(confidence_low),
            'confidence_high': round(confidence_high)
        })

    # Calculate more accurate current month projection using trend
    if current_month_orders:
        import calendar
        current_day = today.day
        total_days_in_month = calendar.monthrange(today.year, today.month)[1]

        current_month_total_orders = len(current_month_orders)
        current_month_total_revenue = sum(order['revenue'] for order in current_month_orders)

        # Group current month orders by day to see the trend
        current_month_daily = defaultdict(int)
        for order in current_month_orders:
            day_key = order['date'].strftime('%Y-%m-%d')
            current_month_daily[day_key] += 1

        # Calculate weighted daily average (recent days weighted higher)
        weighted_daily_orders = []
        for day_offset in range(current_day):
            check_date = today - timedelta(days=day_offset)
            day_key = check_date.strftime('%Y-%m-%d')
            orders_that_day = current_month_daily.get(day_key, 0)

            # Weight: most recent day = 1.0, decay by 1% per day back
            weight = 0.99 ** day_offset
            weighted_daily_orders.append(orders_that_day * weight)

        # Weighted average daily rate (emphasizes recent performance)
        if weighted_daily_orders:
            weighted_avg_daily = sum(weighted_daily_orders) / sum(0.99 ** i for i in range(len(weighted_daily_orders)))
        else:
            weighted_avg_daily = current_month_total_orders / current_day if current_day > 0 else 0

        # Apply growth multiplier to projection
        adjusted_daily_rate = weighted_avg_daily * growth_multiplier

        # Project remaining days using day-of-week patterns
        projected_remaining_orders = 0
        for day_offset in range(current_day + 1, total_days_in_month + 1):
            future_date = datetime(today.year, today.month, day_offset).date()
            future_day_name = day_names[future_date.weekday()]
            projected_remaining_orders += day_of_week_forecast.get(future_day_name, adjusted_daily_rate)

        projected_total_orders = round(current_month_total_orders + projected_remaining_orders)

        # Revenue projection - exclude $0 orders from AOV calculation (subscription prepaid orders)
        # Also include monthly subscription revenue for accurate projection
        paid_orders = [o for o in current_month_orders if o['revenue'] > 0]
        paid_revenue = sum(o['revenue'] for o in paid_orders)
        
        # Add estimated subscription revenue (roughly $183/month based on current subscriptions)
        # This ensures AOV aligns with dashboard which includes subscriptions
        estimated_monthly_subscription_revenue = 183.57
        total_revenue_with_subs = paid_revenue + estimated_monthly_subscription_revenue
        avg_revenue_per_order = total_revenue_with_subs / len(paid_orders) if paid_orders else 0
        projected_total_revenue = round(projected_total_orders * avg_revenue_per_order, 2)

        current_month_projection = {
            'month': current_month_name,
            'current_orders': current_month_total_orders,
            'current_revenue': round(current_month_total_revenue, 2),
            'projected_orders': projected_total_orders,
            'projected_revenue': projected_total_revenue,
            'days_elapsed': current_day,
            'days_remaining': total_days_in_month - current_day,
            'daily_run_rate': round(weighted_avg_daily, 1),
            'growth_rate': round((growth_multiplier - 1) * 100, 1)  # % growth
        }
    else:
        current_month_projection = None

    return {
        'monthly': monthly_data,
        'daily': daily_data,
        'hourly': hourly_data,
        'current_month_projection': current_month_projection,
        'forecast_7_days': forecast_7_days,
        'insights': {
            'busiest_day': busiest_day['day'],
            'busiest_day_orders': busiest_day['orders'],
            'slowest_day': slowest_day['day'],
            'slowest_day_orders': slowest_day['orders'],
            'busiest_month': busiest_month['month'],
            'busiest_month_orders': busiest_month['orders'],
            'slowest_month': slowest_month['month'],
            'slowest_month_orders': slowest_month['orders'],
            'peak_hours': [{'hour': h['hour'], 'orders': h['orders']} for h in peak_hours]
        }
    }

def calculate_avg_order_interval(orders_file):
    """Calculate average days between orders for repeat customers"""
    customer_orders = defaultdict(list)

    with open(orders_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            customer_id = row.get('Customer ID', '').strip()
            if not customer_id:
                continue

            placed_date = parse_date(row.get('Placed', ''))
            if not placed_date:
                continue

            customer_orders[customer_id].append(placed_date)

    # Calculate intervals for customers with 2+ orders
    all_intervals = []
    for customer_id, orders in customer_orders.items():
        if len(orders) >= 2:
            orders.sort()
            for i in range(1, len(orders)):
                days_diff = (orders[i] - orders[i-1]).days
                all_intervals.append(days_diff)

    if not all_intervals:
        return {
            'avg_days': 0,
            'median_days': 0,
            'min_days': 0,
            'max_days': 0,
            'total_repeat_customers': 0
        }

    return {
        'avg_days': round(statistics.mean(all_intervals), 1),
        'median_days': round(statistics.median(all_intervals), 1),
        'min_days': min(all_intervals),
        'max_days': max(all_intervals),
        'total_repeat_customers': len([c for c in customer_orders.values() if len(c) >= 2])
    }

def load_ad_spend(ad_spend_file='data/ad_spend.csv', default_spend=250):
    """Load monthly ad spend from CSV file"""
    ad_spend = {}
    try:
        with open(ad_spend_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                month = row.get('month', '').strip()
                spend = float(row.get('spend', default_spend) or default_spend)
                if month:
                    ad_spend[month] = spend
    except FileNotFoundError:
        pass
    return ad_spend, default_spend

def calculate_cac(orders_file, ad_spend_file='data/ad_spend.csv', default_monthly_spend=250):
    """Calculate Customer Acquisition Cost based on new customers per month and actual ad spend"""

    # Load ad spend data
    ad_spend_by_month, default_spend = load_ad_spend(ad_spend_file, default_monthly_spend)

    # Track first order date for each customer
    customer_first_order = {}

    with open(orders_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            customer_id = row.get('Customer ID', '').strip()
            if not customer_id:
                continue

            placed_date = parse_date(row.get('Placed', ''))
            if not placed_date:
                continue

            if customer_id not in customer_first_order:
                customer_first_order[customer_id] = placed_date
            else:
                customer_first_order[customer_id] = min(customer_first_order[customer_id], placed_date)

    # Count new customers per month
    new_customers_by_month = defaultdict(int)
    for customer_id, first_date in customer_first_order.items():
        month_key = first_date.strftime('%Y-%m')
        new_customers_by_month[month_key] += 1

    # Calculate CAC per month using actual spend data
    monthly_cac = []
    total_spend = 0
    total_customers = 0

    for month in sorted(new_customers_by_month.keys()):
        count = new_customers_by_month[month]
        spend = ad_spend_by_month.get(month, default_spend)  # Use actual spend or default $250
        cac = spend / count if count > 0 else 0
        monthly_cac.append({
            'month': month,
            'new_customers': count,
            'ad_spend': spend,
            'cac': round(cac, 2)
        })
        total_spend += spend
        total_customers += count

    # Calculate averages
    avg_cac = total_spend / total_customers if total_customers > 0 else 0
    avg_new_customers = total_customers / len(monthly_cac) if monthly_cac else 0

    return {
        'monthly': monthly_cac,
        'total_ad_spend': total_spend,
        'avg_new_customers_per_month': round(avg_new_customers, 1),
        'avg_cac': round(avg_cac, 2),
        'total_new_customers': total_customers,
        'default_monthly_spend': default_spend
    }

def main():
    orders_file = 'data/orders.csv'

    print("🔍 Generating Advanced Metrics...")

    print("\n1️⃣ Calculating Customer LTV & Segmentation...")
    ltv_data = calculate_ltv_segments(orders_file)

    print("\n2️⃣ Building Cohort Retention Analysis...")
    cohort_data = calculate_cohort_retention(orders_file)

    print("\n3️⃣ Predicting Customer Churn...")
    churn_data = predict_churn(orders_file)

    print("\n4️⃣ Calculating Unit Economics...")
    unit_econ = calculate_unit_economics(orders_file)

    print("\n5️⃣ Calculating Average Order Interval...")
    order_interval = calculate_avg_order_interval(orders_file)

    print("\n6️⃣ Predicting Customer LTV...")
    predictive_ltv = calculate_predictive_ltv(orders_file)

    print("\n7️⃣ Analyzing Seasonal & Time Patterns...")
    seasonal = calculate_seasonal_patterns(orders_file)

    print("\n8️⃣ Calculating Customer Acquisition Cost...")
    cac_data = calculate_cac(orders_file, ad_spend_file='data/ad_spend.csv', default_monthly_spend=250)

    # Combine all data
    output = {
        'ltv': ltv_data,
        'cohorts': cohort_data,
        'churn': churn_data,
        'unit_economics': unit_econ,
        'order_interval': order_interval,
        'predictive_ltv': predictive_ltv,
        'seasonal_patterns': seasonal,
        'cac': cac_data,
        'generated_at': datetime.now().isoformat()
    }

    # Save to JSON (in dashboard public folder)
    with open('dashboard-shadcn/public/advanced_metrics.json', 'w') as f:
        json.dump(output, f, indent=2)

    print("\n✅ Advanced metrics generated: advanced_metrics.json")
    print(f"\n📊 Summary:")
    print(f"   - Total customers: {len(ltv_data['customers'])}")
    print(f"   - VIP customers: {ltv_data['segment_stats'].get('VIP', {}).get('count', 0)}")
    print(f"   - At-risk customers: {len(ltv_data['at_risk'])}")
    print(f"   - High churn risk: {len([c for c in churn_data if c['churn_risk'] >= 60])}")
    print(f"   - Cohorts tracked: {len(cohort_data)}")

if __name__ == '__main__':
    main()
