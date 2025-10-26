# Supabase Edge Function: Update Copany Hot Score

This Edge Function is used to periodically update the hot score of copany.

## Features

- **Automatic Scheduling**: Executes daily automatically
- **Smart Update**: Only updates copany that haven't been updated for more than 8 hours
- **Automatic Calculation**: Triggers database triggers to automatically recalculate hot_score
- **Error Handling**: Failure of a single copany does not affect others
- **Detailed Logging**: Provides complete execution logs

## Deployment Steps

### 1. Deploy Edge Function

```bash
# Deploy Edge Function
supabase functions deploy update-copany-hot-score

# Set environment variables (if not already set)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Configure Scheduled Execution

The Edge Function is already configured with a daily cron expression: `0 0 * * *` (executes at midnight daily)

### 3. Manual Testing

You can manually trigger it in the following ways:

```bash
# Or via API
curl -X POST http://localhost:54321/functions/v1/update-copany-hot-score \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Update Logic

1. **Get Copany**: Query copany with `updated_at` older than 8 hours
2. **Trigger Update**: Update the `updated_at` field
3. **Automatic Calculation**: Database trigger automatically recalculates `hot_score`
4. **Batch Processing**: Process all qualifying copany

## Return Results

```json
{
  "success": true,
  "message": "Hot score update completed",
  "updated": 10,
  "total": 10,
  "timestamp": "2024-12-02T12:00:00.000Z"
}
```

## Monitoring and Logging

- View execution logs in the Supabase Dashboard Edge Functions page
- Each execution records detailed processing information
- Monitor update status through logs

## Notes

1. **Permissions**: Uses service role key with full database access permissions
2. **Time Range**: Only updates copany older than 8 hours to avoid frequent updates
3. **Automatic Calculation**: Depends on database triggers to automatically calculate hot_score
4. **Performance**: May take a long time to execute for a large number of copany

## Troubleshooting

### Common Issues

1. **Permission Error**: Ensure the correct `SUPABASE_SERVICE_ROLE_KEY` is set
2. **Database Connection Failure**: Check Supabase project status
3. **Scheduled Task Not Executing**: Check cron expression configuration
4. **Partial Copany Failure**: Check detailed logs to determine specific cause

### Debugging Methods

```bash
# View Edge Function logs
supabase functions logs update-copany-hot-score

# Local testing
supabase functions serve update-copany-hot-score
```
