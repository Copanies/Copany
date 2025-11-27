# Monthly Distribute Calculator

This Edge Function automatically calculates distribute allocation for copanies based on their distribution settings.

It processes copanies whose `distribution_day_of_month` matches the current day, calculates net income (transactions + App Store Finance - expenses), contribution scores, and generates proportional distribution records.

## Testing

```bash
# Start local function server
npx supabase functions serve monthly-distribute-calculator

# Test the function
curl -X POST http://localhost:54321/functions/v1/monthly-distribute-calculator \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```
