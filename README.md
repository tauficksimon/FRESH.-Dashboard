# FRESH Dry Cleaning Dashboard - Automated Analytics System

> Automated weekly dashboard for FRESH Dry Cleaning with advanced business intelligence metrics, powered by Clean Cloud POS data.

![Dashboard Preview](https://img.shields.io/badge/status-production-brightgreen) ![Python 3.11](https://img.shields.io/badge/python-3.11-blue) ![License MIT](https://img.shields.io/badge/license-MIT-blue)

---

## 📊 Overview

This system automatically transforms weekly CSV exports from Clean Cloud POS into a beautiful, interactive analytics dashboard with advanced business intelligence features.

**Key Features:**
- ✅ Automated weekly data processing via GitHub Actions
- ✅ Advanced customer analytics (CLV, cohorts, retention)
- ✅ Real-time KPI tracking (revenue, costs, profit margins)
- ✅ Beautiful dark-themed responsive dashboard
- ✅ Export-ready summary metrics in CSV format
- ✅ Email-to-dashboard automation (optional with Make.com)

---

## 🚀 Quick Start

### Option 1: Semi-Automated (Recommended to Start)

1. **Clone this repository**
   ```bash
   git clone <your-repo-url>
   cd fresh-dashboard
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Add your CSV data**
   - Place CSV files in `/data/` directory:
     - `CC-Orders-*.csv`
     - `CC-Items-*.csv`

4. **Run the processor**
   ```bash
   python csv_merge_dashboard.py
   ```

5. **Generate dashboard**
   ```bash
   python scripts/inject_json.py
   ```

6. **Deploy to Netlify** (see deployment section below)

### Option 2: Fully Automated (with Make.com)

See [MAKE_COM_SETUP.md](MAKE_COM_SETUP.md) for detailed setup instructions.

---

## 📁 Repository Structure

```
fresh-dashboard/
├── .github/
│   └── workflows/
│       └── process-dashboard.yml    # GitHub Actions automation
├── data/
│   ├── .gitkeep                     # CSV files go here
│   └── README.md
├── output/
│   └── .gitkeep                     # Generated files saved here
├── scripts/
│   └── inject_json.py               # Injects JSON into HTML
├── csv_merge_dashboard.py           # Main processing script
├── requirements.txt                 # Python dependencies
├── template.html                    # Dashboard HTML template
├── index.html                       # Generated dashboard (deployed)
├── summary_metrics.csv              # Excel-ready summary metrics
├── dashboard_data.json              # Full dashboard data
├── MAKE_COM_SETUP.md                # Email automation guide
└── README.md                        # This file
```

---

## 🔧 Business Rules & Calculations

### Cost Calculation Priority

The system applies these business rules in order:

1. **W&F Regular Minimum**: $19.95 per order
   - Applied when order contains "wash" or "fold" (not "delicate")
2. **W&F Delicate Minimum**: $24.95 per order
   - Applied when order contains both "wash"/"fold" AND "delicate"
3. **Express Multiplier**: 1.5x on entire order cost
   - Applied after minimums
4. **Special Account Overrides**:
   - **"450" accounts**: Cost = $0 (training/comp orders)
   - **Camille Simon**: Revenue = $0 (employee orders)

### Order Categorization

Based on Items Summary field (case-insensitive):
- **Dry Cleaning**: Contains "suit", "shirt", "dry cleaning"
- **Household Items**: Contains "comforter", "blanket", "curtains"
- **Shoes**: Contains "sneaker", "shoe"
- **W&F Regular**: Contains "wash" or "fold" (not "delicate")
- **W&F Delicate**: Contains both "delicate" AND "wash"/"fold"
- **Other**: Everything else

---

## 📊 Output Files

### 1. `orders_ALL.csv`
Complete merged dataset with calculated fields:
- All original order data from Clean Cloud
- `Final Cost` - Cost after all business rules applied
- `Revenue Net Tax` - Revenue minus tax
- `Profit` - Net revenue minus final cost
- `Profit Margin %` - Percentage profit margin
- `IsNewCustomer` - Boolean flag for first-time customers

### 2. `dashboard_data.json`
Comprehensive analytics in nested JSON structure:
```json
{
  "ALL_DATA__ALL_ORDERS": {
    "all": {
      "kpis": {...},
      "series": {...},
      "advanced": {
        "revenue_quality": {...},
        "aov_stats": {...},
        "customer": {...},
        "ar": {...},
        "service_mix": [...],
        "unit_prices": [...],
        "wash_fold_lbs": 2093.9
      }
    },
    "by_month": {...}
  },
  "ALL_DATA__PAID_ONLY": {...}
}
```

### 3. `summary_metrics.csv`
Excel-ready summary metrics for easy analysis:
- Total Orders, Revenue, Cost, Profit
- AOV distribution (mean, median, P25, P75)
- Customer metrics (new vs returning, repeat rate)
- Accounts receivable (unpaid orders, balances)
- W&F volume in pounds
- Revenue quality metrics (refunds, discounts, tax)

### 4. `index.html`
Self-contained interactive dashboard ready for deployment.

---

## 📈 Advanced Metrics Tracked

### Revenue Quality
- Gross Sales (before refunds)
- Refunds ($amount and % of gross)
- Net Revenue (after refunds & tax)
- Discounts ($amount and %)
- Tips, Service Fees, Delivery Fees
- Tax breakdown

### AOV Distribution
- Mean (average)
- Median (50th percentile)
- P25 (25th percentile)
- P75 (75th percentile)
- Gross Margin %

### Customer Analytics
- Unique Customers
- New vs Returning split
- New Customer Share %
- Returning/New Ratio
- **30-Day Repeat Rate**: % of new customers who return within 30 days
- **Top 10 Revenue Share**: Revenue concentration from top 10 customers

### Accounts Receivable
- Unpaid Orders (count)
- Unpaid Balance ($)
- Unpaid Share % of total orders

### Service Mix
- Revenue breakdown by category
- Share % for each category
- Sorted by revenue descending

### Unit Pricing
- Top 10 items by revenue
- Implied unit price (revenue / quantity)
- Total units sold per item

### Operational Metrics
- Total W&F pounds processed
- Express order rate %
- Items per order

---

## 🤖 Automation Setup

### GitHub Actions

The repository includes a GitHub Actions workflow that automatically:
1. Triggers when CSV files are uploaded to `/data/` directory
2. Runs the Python processing script
3. Generates dashboard data and metrics
4. Injects JSON into HTML template
5. Commits updated `index.html` to repository
6. Triggers Netlify deployment

**Manual Trigger**: You can also run the workflow manually from the "Actions" tab in GitHub.

### Email Automation (Optional)

Use Make.com to fully automate the weekly workflow:
1. Clean Cloud emails CSV files weekly
2. Make.com catches the email
3. Extracts CSV attachments
4. Uploads them to GitHub `/data/` directory
5. GitHub Actions automatically processes them
6. Dashboard updates within minutes

See [MAKE_COM_SETUP.md](MAKE_COM_SETUP.md) for complete setup guide.

---

## 🌐 Deployment to Netlify

### First-Time Setup

1. **Create Netlify account** at [netlify.com](https://www.netlify.com)

2. **Connect GitHub repository**:
   - Click "New site from Git"
   - Choose GitHub
   - Select this repository
   - Configure build settings:
     - **Build command**: (leave empty)
     - **Publish directory**: `/` (root)
     - **Branch**: `main`

3. **Deploy**:
   - Click "Deploy site"
   - Netlify will assign you a URL like `your-site-name.netlify.app`

4. **Custom Domain** (optional):
   - Go to Site settings → Domain management
   - Add custom domain
   - Follow DNS configuration instructions

### Auto-Deploy

Once connected, Netlify automatically deploys whenever `index.html` changes in your GitHub repository. No manual deployment needed!

---

## 🔄 Weekly Workflow

### Semi-Automated (Manual CSV Upload)

1. Download CSV files from Clean Cloud email
2. Upload to GitHub `/data/` directory
3. GitHub Actions processes automatically
4. Dashboard updates within 2-3 minutes

### Fully Automated (with Make.com)

1. Clean Cloud sends weekly email
2. Everything else happens automatically
3. Check your dashboard URL to see updates

---

## 🎯 Custom Usage

### Date Range Filtering

```python
from csv_merge_dashboard import CSVMerger

processor = CSVMerger('orders.csv', 'items.csv')
processor.load_and_clean_data()
processor.merge_data()
processor.add_customer_analytics()

# Filter for specific date range
filtered_data = processor.filter_by_date_range('2025-07-01', '2025-07-31')

# Generate dashboard for date range
dashboard_data = processor.generate_dashboard_data('2025-07-01', '2025-07-31')
```

### Monthly CSV Exports

The script automatically generates monthly CSV files:
```
orders_2025-07.csv
orders_2025-08.csv
orders_2025-09.csv
...
```

Each includes full order details with calculated metrics for that month.

---

## ✅ Data Validation

The script automatically validates:
- ✅ W&F minimums applied correctly (no orders under $19.95/$24.95)
- ✅ Express multipliers calculated properly (exactly 1.5x)
- ✅ Special account rules enforced ("450" = $0 cost, Camille = $0 revenue)
- ✅ Data integrity maintained (no missing/corrupt orders)

Validation results are printed during script execution.

---

## 🛠️ Troubleshooting

### Issue: Dashboard shows old data
**Solution**:
- Check that CSV files were uploaded to `/data/` directory
- Verify GitHub Actions ran successfully (check Actions tab)
- Clear browser cache and refresh

### Issue: GitHub Actions failing
**Solution**:
- Check Actions tab for error logs
- Ensure CSV files are valid and not corrupted
- Verify `requirements.txt` dependencies are correct

### Issue: Charts not rendering
**Solution**:
- Check browser console for JavaScript errors
- Ensure `dashboard_data.json` is valid JSON
- Try different browser

### Issue: Missing metrics in summary_metrics.csv
**Solution**:
- Ensure all CSV columns exist in source data
- Check for data type mismatches
- Review script validation output

---

## 📦 Dependencies

- **Python 3.11+**
- **pandas 2.1.0** - Data processing
- **numpy 1.24.3** - Numerical calculations

Install all dependencies:
```bash
pip install -r requirements.txt
```

---

## 🔒 Security & Privacy

- ❌ CSV files are **NOT** committed to Git (excluded in `.gitignore`)
- ✅ Only processed JSON and summary metrics are committed
- ✅ No sensitive customer data exposed in dashboard
- ✅ GitHub Actions secrets used for tokens (not committed)

---

## 📝 Important Notes

- Script uses **"Total after Credit Used"** for gross revenue (not "Total")
- Tax is subtracted from gross revenue to calculate **net revenue and profit**
- W&F minimums are applied to **entire order cost** based on Items Summary
- Express 1.5x multiplier applies to **entire order cost** after minimums
- "450" special account always has **$0 cost** (comp orders)
- Camille Simon orders have **$0 revenue** but actual costs (employee orders)
- Refunds (negative revenue) are **preserved** in calculations
- Monthly summaries display **net revenue** (after tax deduction)

---

## 🤝 Contributing

This is a private dashboard for FRESH Dry Cleaning. For questions or improvements, contact the repository owner.

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 📞 Support

For issues or questions:
1. Check this README and [MAKE_COM_SETUP.md](MAKE_COM_SETUP.md)
2. Review GitHub Actions logs
3. Open an issue in the repository

---

## 🎉 Quick Reference

### Local Testing
```bash
# Process CSVs
python csv_merge_dashboard.py

# Generate dashboard
python scripts/inject_json.py

# View dashboard locally
open index.html
```

### Key URLs
- **Dashboard**: `https://your-site.netlify.app`
- **GitHub Actions**: `https://github.com/your-username/your-repo/actions`
- **Make.com**: `https://www.make.com/en/scenarios`

---

**Built with ❤️ for FRESH Dry Cleaning**
