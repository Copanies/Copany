# Calculate Copany Distributions

This Edge Function calculates distribution records for all historical months for a specific Copany.

## Purpose

When App Store Connect is connected and historical finance data is imported, this function automatically generates distribution records for all months that have transaction or App Store Finance data.

## How It Works

1. **Receives a `copanyId`** as input
2. **Finds all unique months** with data from:
   - `transactions` table (confirmed transactions)
   - `app_store_finance_chart_data` table
3. **For each month**, calculates distribution using the same logic as `monthly-distribute-calculator`:
   - Calculates net income (transaction income + App Store income - expenses) for that month
   - Calculates contribution scores up to the end of that month
   - Generates distribution records based on contribution ratios
   - If no contribution score exists, allocates all to the copany owner
4. **Prevents duplicates**: Only deletes and recalculates if existing records have zero amounts. If non-zero amounts exist, skips recalculation to preserve existing distribution records.
5. **Returns a summary** of processed months and inserted records

## Usage

### API Endpoint

```
POST /api/calculate-copany-distributions
```

### Request Body

```json
{
  "copanyId": "1"
}
```

### Response

```json
{
  "success": true,
  "message": "Calculated distributions for 12/12 months",
  "copanyId": "1",
  "copanyName": "Example Copany",
  "totalMonths": 12,
  "successfulMonths": 12,
  "totalInserted": 48,
  "results": [
    {
      "month": "2024-01",
      "success": true,
      "inserted": 4,
      "netIncome": 1000.00
    },
    ...
  ]
}
```

## Integration

This function is automatically called when:
- App Store Connect is connected via `ConnectToAppStoreConnect` component
- App Store Connect is connected via `AppStoreConnectView` component

After successfully fetching App Store Finance data, the function is triggered to calculate distributions for all historical months.

## Distribution Logic

The distribution calculation follows the same logic as `monthly-distribute-calculator`:

1. **Income Calculation**: Sum of transaction income and App Store Finance income for the month
2. **Expense Calculation**: Sum of transaction expenses for the month
3. **Net Income**: Income - Expenses
4. **Contribution Calculation**: Based on completed issues up to the end of the month
5. **Distribution**: Proportional allocation based on contribution scores, or 100% to owner if no contributions

## Duplicate Prevention

The function uses smart duplicate prevention:
- **If existing records have non-zero amounts**: The month is skipped (not recalculated) to preserve existing distribution records
- **If existing records have only zero amounts**: Existing records are deleted and new ones are calculated
- **If no records exist**: New records are calculated normally

This ensures that:
- Already calculated distributions with actual amounts are preserved
- Zero-amount placeholder records can be recalculated when new data becomes available

## Error Handling

- If a month has no income/expense data, it is skipped (not an error)
- If calculation fails for a specific month, it's logged but doesn't stop processing of other months
- The function returns a summary of successful, skipped, and failed months

