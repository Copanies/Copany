# Update Copany Hot Score

This Edge Function updates the hot score of all copanies.

It calculates hot score based on average monthly revenue, vote count, and time since creation.

## Testing

```bash
# Start local function server
npx supabase functions serve update-copany-hot-score

# Test the function
curl -X POST http://localhost:54321/functions/v1/update-copany-hot-score \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```
