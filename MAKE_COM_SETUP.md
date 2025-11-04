# Make.com Email Automation Setup Guide

This guide walks you through setting up Make.com (formerly Integromat) to automatically upload CSV files from Clean Cloud email exports to your GitHub repository.

## Prerequisites

- [ ] Make.com account (free tier: 1,000 operations/month)
- [ ] GitHub Personal Access Token with `repo` scope
- [ ] Clean Cloud scheduled email export configured

---

## Step 1: Create Make.com Account

1. Go to [make.com](https://www.make.com)
2. Sign up for a free account
3. Verify your email address

---

## Step 2: Generate GitHub Personal Access Token

1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name it: `Fresh Dashboard Automation`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **IMPORTANT**: Copy the token immediately (you won't see it again!)

---

## Step 3: Create New Scenario in Make.com

### 3.1 Create Scenario

1. In Make.com dashboard, click "+ Create a new scenario"
2. Name it: "Clean Cloud CSV to GitHub"

### 3.2 Module 1: Gmail - Watch Emails

1. Click the `+` button to add a module
2. Search for "Gmail" and select **"Gmail" → "Watch Emails"**
3. Click "Create a connection" and authorize your Gmail account
4. Configure the module:
   - **Folder**: `INBOX`
   - **Criteria**: Choose "By sender or recipient"
   - **Sender email address**: Enter your Clean Cloud sender email
   - **Subject filter**: (Optional) Add keywords like "Weekly Export" or "Orders"
   - **Max number of results**: `1`
   - **Mark message(s) as read**: `Yes` (optional)

### 3.3 Module 2: Iterator (for Attachments)

1. Add a new module (click `+` after Gmail module)
2. Search for "Iterator" and select **"Iterator"**
3. Configure:
   - **Array**: Select `Attachments[]` from the Gmail module output

### 3.4 Module 3: Router (Split Logic)

1. Add **"Flow Control" → "Router"**
2. This will split the flow into two paths (for Orders and Items CSV files)

### 3.5 Module 4a: Filter - Orders CSV

1. Click on the first router path
2. Click the wrench icon to add a filter
3. Name it: "Filter Orders CSV"
4. Condition:
   - **Label**: `FileName` (from Iterator)
   - **Operator**: Contains
   - **Value**: `Orders`

### 3.6 Module 5a: GitHub - Create/Update File (Orders)

1. After the filter, add **"GitHub" → "Create or Update a File"**
2. Click "Create a connection":
   - **Connection type**: OAuth 2.0 (recommended) or Personal Access Token
   - If using PAT: Paste your GitHub token
3. Configure:
   - **Repository**: Select your repository
   - **File Path**: `data/CC-Orders-latest.csv`
   - **File Content**: Map `Data` from Iterator module
   - **Commit message**: `Update orders data - {{formatDate(now; "YYYY-MM-DD HH:mm")}}`
   - **Branch**: `main`

### 3.7 Module 4b: Filter - Items CSV

1. Go back to the Router and click the second path
2. Add a filter named "Filter Items CSV"
3. Condition:
   - **Label**: `FileName` (from Iterator)
   - **Operator**: Contains
   - **Value**: `Items`

### 3.8 Module 5b: GitHub - Create/Update File (Items)

1. After the filter, add **"GitHub" → "Create or Update a File"**
2. Use the same GitHub connection
3. Configure:
   - **Repository**: Select your repository
   - **File Path**: `data/CC-Items-latest.csv`
   - **File Content**: Map `Data` from Iterator module
   - **Commit message**: `Update items data - {{formatDate(now; "YYYY-MM-DD HH:mm")}}`
   - **Branch**: `main`

### 3.9 (Optional) Module 6: Slack/Email Notification

1. After both GitHub modules, you can add a notification module
2. Search for "Slack" or "Email" and configure a success notification

---

## Step 4: Test the Scenario

### 4.1 Send Test Email

1. Manually export CSV files from Clean Cloud
2. Email them to yourself (the Gmail account connected to Make.com)
3. Subject should match your filter criteria

### 4.2 Run Test

1. In Make.com, click **"Run once"** button
2. Watch the execution flow
3. Check each module for successful execution (green checkmarks)
4. Verify files uploaded to GitHub:
   - Go to your GitHub repository
   - Check `/data/` directory for the CSV files

### 4.3 Verify GitHub Actions

1. In GitHub, go to **Actions** tab
2. You should see a new workflow run triggered by the file upload
3. Wait for it to complete
4. Check that `index.html` was updated

---

## Step 5: Activate Scenario

1. In Make.com, toggle the scenario to **"Active"** (ON)
2. Set scheduling:
   - Click on the Gmail module
   - Set **"Interval"**: 15 minutes (or your preference)
   - This determines how often Make.com checks for new emails

---

## Step 6: Configure Clean Cloud Email Schedule

1. Log in to Clean Cloud POS
2. Go to **Reports** → **Scheduled Exports** (or equivalent)
3. Configure weekly email export:
   - **Reports**: Orders & Items
   - **Frequency**: Weekly (e.g., Every Monday at 9 AM)
   - **Email to**: Your Gmail address connected to Make.com
   - **Format**: CSV

---

## Troubleshooting

### Issue: No emails detected
**Solution**:
- Check Gmail filters/spam folder
- Verify sender email address matches exactly
- Test with manual email first

### Issue: CSV files not uploading to GitHub
**Solution**:
- Check GitHub token permissions
- Verify repository name is correct
- Check branch name (main vs master)

### Issue: Duplicate files being uploaded
**Solution**:
- Add a filter to check email date/time
- Use "Mark as read" option in Gmail module
- Add a delay between runs

### Issue: GitHub Actions not triggering
**Solution**:
- Ensure workflow file is in `.github/workflows/` directory
- Check that the `paths` in workflow matches `/data/*.csv`
- Manually trigger workflow to test

---

## Usage Costs

### Make.com Free Tier
- **Operations**: 1,000/month
- **Execution time**: 5 minutes
- **Scenario interval**: Minimum 15 minutes

### Estimated Usage
For weekly Clean Cloud exports:
- Email watch: ~100 operations/month
- Attachment iteration: ~8 operations/month (2 attachments × 4 weeks)
- GitHub uploads: ~8 operations/month

**Total**: ~116 operations/month (well within free tier!)

---

## Alternative: Manual Upload (Fallback)

If Make.com hits limits or you prefer manual control:

1. Download CSV files from Clean Cloud email
2. Go to your GitHub repository
3. Navigate to `/data/` directory
4. Click "Add file" → "Upload files"
5. Drag and drop both CSV files
6. Commit changes
7. GitHub Actions will automatically process them

---

## Next Steps

After setup is complete:
1. ✅ Test full automation end-to-end
2. ✅ Monitor first few runs
3. ✅ Set up Netlify deployment (see main README)
4. ✅ Bookmark your dashboard URL

---

## Support Resources

- [Make.com Documentation](https://www.make.com/en/help)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Questions?** Open an issue in the repository!
