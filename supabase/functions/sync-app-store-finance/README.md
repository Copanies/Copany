# Sync App Store Finance

This Edge Function automatically syncs App Store Connect finance data for all copanies that have connected their App Store Connect credentials.

It fetches only data newer than the latest existing data, parses TSV reports, filters by App SKU, and saves the financial data to the database.

## Testing

```bash
# Start local function server
npx supabase functions serve sync-app-store-finance

# Test the function
curl -X POST http://localhost:54321/functions/v1/sync-app-store-finance \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```
