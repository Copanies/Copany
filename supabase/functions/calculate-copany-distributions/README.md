# Calculate Copany Distributions

This Edge Function calculates distribution records for all historical months for a specific Copany.

When App Store Connect is connected and historical finance data is imported, this function generates distribution records for all months that have transaction or App Store Finance data.

## Testing

```bash
# Start local function server
npx supabase functions serve calculate-copany-distributions

# Test the function
curl -X POST http://localhost:54321/functions/v1/calculate-copany-distributions \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"copanyId": "1"}'
```
