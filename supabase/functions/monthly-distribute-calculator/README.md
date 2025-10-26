# Supabase Edge Function: Monthly Distribute Calculator

This Edge Function automatically calculates distribute allocation for all active copany each month.

## Features

- **Automatic Scheduling**: Executes automatically on the 10th of each month
- **Batch Processing**: Processes all active copany
- **Complete Logic**: Includes transaction calculation, contribution score calculation, and proportional distribution
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

The Edge Function is already configured with a cron expression to execute on the 10th of each month: `0 0 0 10 * *`

### 3. Manual Testing

You can manually trigger it in the following ways:

```bash
# Or via API
curl -X POST http://localhost:54321/functions/v1/monthly-distribute-calculator \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Calculation Logic

1. **Get Copany**: Query all copany
2. **Time Range**: Current month (UTC time)
3. **Transaction Calculation**:
   - Get confirmed income and expense transactions before the 10th at 00:00 of the current month
   - Calculate net income = total income - total expenses
4. **Contribution Score Calculation**:
   - Get completed issues from the 1st at 00:00 of the current month
   - Calculate contribution scores based on issue levels
5. **Proportional Distribution**:
   - Distribute net income proportionally based on contribution scores
   - Generate distribute records

## Return Results

```json
{
  "success": true,
  "message": "Monthly distribute calculation completed",
  "timestamp": "2024-01-10T00:00:00.000Z",
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
3. **Error Handling**: Failure to process a single copany does not affect other copany
4. **Data Security**: Deletes existing distribute records and regenerates them
5. **Performance**: May take a long time to execute for a large number of copany

## Troubleshooting

### Common Issues

1. **Permission Error**: Ensure the correct `SUPABASE_SERVICE_ROLE_KEY` is set
2. **Database Connection Failure**: Check Supabase project status
3. **Scheduled Task Not Executing**: Check cron expression configuration
4. **Partial Copany Failure**: Check detailed logs to determine specific cause

### Debugging Methods

```bash
# View Edge Function logs
supabase functions logs monthly-distribute-calculator

# Local testing
supabase functions serve monthly-distribute-calculator
```
