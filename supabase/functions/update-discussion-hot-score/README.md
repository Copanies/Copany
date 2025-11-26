# Update Discussion Hot Score

This Edge Function updates the hot score of all discussions.

It calculates hot score based on vote count and time since creation using the formula: `(vote_up_count + 1) / pow((hours_since_creation + 2), 1.5)`

## Testing

```bash
# Start local function server
npx supabase functions serve update-discussion-hot-score

# Test the function
curl -X POST http://localhost:54321/functions/v1/update-discussion-hot-score \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```
