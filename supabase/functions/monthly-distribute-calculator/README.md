# Supabase Edge Function: Monthly Distribute Calculator

This Edge Function automatically calculates distribute allocation for copanies based on their distribution settings.

## Features

- **Daily Execution**: Executes automatically every day at 00:00 UTC
- **Selective Processing**: Only processes copanies whose `distribution_day_of_month` matches the current day
- **Complete Logic**: Includes transaction calculation, App Store Finance calculation, contribution score calculation, and proportional distribution
- **Customizable Settings**: Uses each copany's `distribution_delay_days` and `distribution_day_of_month` settings
- **Error Handling**: Failure of a single copany does not affect others
- **Detailed Logging**: Provides complete execution logs

## Deployment Steps

### 1. Deploy Edge Function

```bash
# Deploy Edge Function
supabase functions deploy monthly-distribute-calculator

# Set environment variables (if not already set)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Configure Scheduled Execution

The Edge Function is already configured with a cron expression to execute daily at 00:00 UTC: `0 0 * * *`

### 3. Manual Testing

You can manually trigger it in the following ways:

```bash
# Or via API
curl -X POST http://localhost:54321/functions/v1/monthly-distribute-calculator \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Calculation Logic

### 1. Copany Selection

- Query all copanies where `distribution_day_of_month` equals the current day
- Each copany is processed independently

### 2. Time Range Calculation

For each copany (assuming today is X month Y day, where Y = `distribution_day_of_month`):

- **Distribution Month**: The month that is `distribution_delay_days` ago from today
  - Calculate: Today - `distribution_delay_days` = Distribution Date
  - Distribution Month = The month containing the Distribution Date
- **Income Time Range**: Only calculate income/expense for the distribution month
  - Start: First day of distribution month 00:00:00 UTC
  - End: Last day of distribution month 23:59:59 UTC
- **Contribution Time Range**: Up to the end of the distribution month (23:59:59 UTC)

**Example:**

- Today: 2024-03-15 (March 15th)
- `distribution_day_of_month`: 15
- `distribution_delay_days`: 90
- Distribution Date: 2024-03-15 - 90 days = 2023-12-16
- Distribution Month: December 2023
- Income start: 2023-12-01 00:00:00 UTC
- Income end: 2023-12-31 23:59:59 UTC
- Contribution end: 2023-12-31 23:59:59 UTC

### 3. Income Calculation

- **Transactions Table**: Query confirmed income and expense transactions within the distribution month only
- **App Store Finance**: Query `app_store_finance_chart_data` table for the distribution month only
  - The `date` field is in `YYYY-MM` format
  - Only query the distribution month's data (e.g., "2024-01" in the example above)
  - Sum up the `amount_usd` value for the distribution month
- **Net Income**: Total Income (transactions + App Store Finance) - Total Expenses (transactions)

### 4. Contribution Score Calculation

- Query `issue` table for completed issues (`state = Done`) with `closed_at` up to the end of the distribution month
- Calculate contribution scores based on issue levels:
  - Level C: 5 points
  - Level B: 20 points
  - Level A: 60 points
  - Level S: 200 points

### 5. Proportional Distribution

- **If total contribution score > 0**: Distribute net income proportionally based on contribution scores
- **If total contribution score = 0**: Allocate all net income to the copany owner (`created_by`)
- Generate distribute records with `status = 'in_progress'`
- If net income <= 0, generate zero-amount rows for traceability (or for owner if no contribution score)

### 6. Duplicate Prevention

- Before inserting new records, delete existing distribute records for the same copany created today
- This prevents duplicate records if the function runs multiple times in the same day

## Return Results

```json
{
  "success": true,
  "message": "Daily distribute calculation completed",
  "timestamp": "2024-03-15T00:00:00.000Z",
  "results": [
    {
      "copanyId": "123",
      "copanyName": "Example Copany",
      "success": true,
      "message": "Distribute calculation completed",
      "netIncome": 1000.0,
      "inserted": 5
    }
  ]
}
```

## Monitoring and Logging

- View execution logs in the Supabase Dashboard Edge Functions page
- Each execution records detailed processing information
- Monitor the processing status of each copany through logs

## Notes

1. **Permissions**: Uses service role key with full database access permissions
2. **Time Zone**: All time calculations use UTC time zone
3. **Error Handling**: Failure to process a single copany does not affect other copanies
4. **Duplicate Prevention**: Deletes existing distribute records created today before inserting new ones
5. **Performance**: May take a long time to execute for copanies with many transactions or contributors
6. **Month Boundaries**: Handles month boundaries correctly (e.g., February has 28/29 days)
7. **App Store Finance**: App Store Finance data is stored monthly, so the function matches months that fall within the income time range

## Troubleshooting

### Common Issues

1. **Permission Error**: Ensure the correct `SUPABASE_SERVICE_ROLE_KEY` is set
2. **Database Connection Failure**: Check Supabase project status
3. **Scheduled Task Not Executing**: Check cron expression configuration
4. **Partial Copany Failure**: Check detailed logs to determine specific cause
5. **No Copanies Processed**: Verify that copanies have `distribution_day_of_month` set and that it matches the current day

### Debugging Methods

```bash
# View Edge Function logs
supabase functions logs monthly-distribute-calculator

# Local testing
supabase functions serve monthly-distribute-calculator
```

## Configuration

Each copany can configure:

- **distribution_delay_days**: Number of days to look back for income calculation (default: 90)
- **distribution_day_of_month**: Day of the month when distribution should be calculated (default: 10, range: 1-31)

These settings can be configured in the Copany Settings page.
