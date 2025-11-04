# Data Directory

## Overview
This directory is for uploading your weekly CSV files exported from Clean Cloud POS.

## Required Files

Place your CSV exports in this directory with the following naming convention:

```
CC-Orders-DDMMYYYY-DDMMYYYY.csv
CC-Items-Sales_YYYY-MM-DD-YYYY-MM-DD.csv
```

## Manual Upload (Semi-Automated)

1. Download CSV files from Clean Cloud
2. Upload them to this `/data/` folder in GitHub
3. GitHub Actions will automatically detect the new files and process them

## Fully Automated (with Make.com)

If you've set up the Make.com automation:
- Clean Cloud emails CSV files weekly
- Make.com automatically uploads them here
- GitHub Actions processes them automatically

## Notes

- Old CSV files will be overwritten with each upload
- The automation script will use the most recent files in this directory
