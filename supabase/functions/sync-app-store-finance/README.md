# Supabase Edge Function: Sync App Store Finance

This Edge Function automatically syncs App Store Connect finance data for all copanies that have connected their App Store Connect credentials.

## Features

- **Automatic Scheduling**: Executes daily at 2 AM automatically
- **Incremental Sync**: Only fetches data newer than the latest existing data
- **Smart Updates**: Uses upsert to avoid duplicate data
- **Error Handling**: Failure of a single copany does not affect others
- **Detailed Logging**: Provides complete execution logs

## How It Works

1. **Get All Copanies**: Queries all copanies with `app_store_connect_credentials`
2. **Check Latest Data**: For each copany, checks the latest date in `app_store_finance_chart_data`
3. **Fetch New Data**: Fetches only months newer than the latest date (or last 12 months if no data exists)
4. **Process Reports**: Parses TSV data, filters by App SKU, and extracts financial data
5. **Save Data**: 
   - Inserts new report data only if it doesn't exist
   - Upserts chart data (updates existing or inserts new)

## Deployment Steps

### 1. Deploy Edge Function

```bash
# Deploy Edge Function
supabase functions deploy sync-app-store-finance

# Set environment variables
supabase secrets set AES_KEY=your_aes_key_here
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Configure Scheduled Execution

The Edge Function is already configured with a daily cron expression: `0 2 * * *` (executes at 2 AM daily)

### 3. Manual Testing

You can manually trigger it:

```bash
# Via Supabase CLI
supabase functions invoke sync-app-store-finance

# Or via API
curl -X POST https://your-project.supabase.co/functions/v1/sync-app-store-finance \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Sync Logic

1. **Get Credentials**: Retrieves and decrypts credentials for each copany
2. **Check Latest Date**: Queries `app_store_finance_chart_data` for the latest date
3. **Generate JWT**: Creates JWT token for App Store Connect API
4. **Fetch Reports**: Calls App Store Connect API for new months
5. **Parse & Filter**: Parses TSV, filters by App SKU, extracts financial data
6. **Save Data**: Inserts new reports, upserts chart data

## Return Results

```json
{
  "success": true,
  "message": "Finance data sync completed",
  "processed": 5,
  "successful": 5,
  "failed": 0,
  "totalNewReports": 12,
  "totalNewChartData": 3,
  "timestamp": "2024-12-02T02:00:00.000Z"
}
```

## Monitoring and Logging

- View execution logs in the Supabase Dashboard Edge Functions page
- Each execution records detailed processing information
- Monitor sync status through logs

## Notes

1. **Permissions**: Uses service role key with full database access permissions
2. **Incremental Sync**: Only fetches data newer than existing data to minimize API calls
3. **Data Safety**: Uses upsert to avoid data loss, only inserts truly new data
4. **Error Handling**: Individual copany failures don't stop the entire sync process
5. **API Limits**: Respects App Store Connect API rate limits

## Troubleshooting

### Common Issues

1. **Decryption Error**: Ensure `AES_KEY` environment variable is set correctly
2. **JWT Generation Error**: Check that private key format is correct (PEM format)
3. **API Errors**: Check App Store Connect credentials are valid and not expired
4. **No Data Found**: Verify App SKU matches the actual Bundle ID in reports

### Debugging Methods

```bash
# View Edge Function logs
supabase functions logs sync-app-store-finance

# Local testing
supabase functions serve sync-app-store-finance
```


