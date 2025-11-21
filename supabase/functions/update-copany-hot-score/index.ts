// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fallback exchange rates to USD (simplified for Edge Function)
const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  CNY: 0.14,
  JPY: 0.0067,
  GBP: 1.27,
  EUR: 1.08,
  AUD: 0.66,
  CAD: 0.73,
  KRW: 0.00075,
  INR: 0.012,
  BRL: 0.19,
  MXN: 0.059,
  TWD: 0.031,
  HKD: 0.128,
  SGD: 0.74,
  THB: 0.027,
  MYR: 0.21,
  PHP: 0.018,
  IDR: 0.000064,
  VND: 0.000041,
  NZD: 0.61,
  ZAR: 0.054,
  AED: 0.27,
  SAR: 0.27,
  ILS: 0.27,
  CHF: 1.11,
  SEK: 0.095,
  NOK: 0.093,
  DKK: 0.14,
  PLN: 0.25,
  TRY: 0.031,
  RUB: 0.011,
  CZK: 0.043,
  HUF: 0.0028,
  RON: 0.22,
  CLP: 0.0011,
  ARS: 0.0012,
  COP: 0.00025,
  PEN: 0.27,
  VES: 0.000028,
}

function convertToUSD(amount: number, currency: string): number {
  const upperCurrency = currency.toUpperCase()
  const rate = FALLBACK_EXCHANGE_RATES[upperCurrency] || 1.0
  return amount * rate
}

function getYearMonth(dateStr: string): string | null {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return null
    }
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  } catch {
    return null
  }
}

// Calculate average monthly revenue for a copany
async function calculateAvgMonthlyRevenue(
  supabase: ReturnType<typeof createClient>,
  copanyId: number
): Promise<number> {
  console.log(`[DEBUG] Calculating avgMonthlyRevenue for copany ${copanyId}`)
  
  // Fetch all confirmed transactions
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('type, amount, currency, occurred_at')
    .eq('copany_id', copanyId)
    .eq('status', 'confirmed')

  if (txError) {
    console.warn(`[DEBUG] Failed to fetch transactions for copany ${copanyId}:`, txError.message)
  } else {
    console.log(`[DEBUG] Fetched ${transactions?.length || 0} transactions for copany ${copanyId}`)
  }

  // Fetch App Store finance chart data (already in USD)
  const { data: appStoreData, error: appStoreError } = await supabase
    .from('app_store_finance_chart_data')
    .select('date, amount_usd')
    .eq('copany_id', copanyId)

  if (appStoreError) {
    console.warn(`[DEBUG] Failed to fetch App Store finance data for copany ${copanyId}:`, appStoreError.message)
  } else {
    console.log(`[DEBUG] Fetched ${appStoreData?.length || 0} App Store finance records for copany ${copanyId}`)
  }

  // Group transactions by month and calculate net income
  const monthlyData = new Map<string, { income: number; expense: number; appStoreIncome: number }>()

  // Process regular transactions
  if (transactions) {
    console.log(`[DEBUG] Processing ${transactions.length} transactions for copany ${copanyId}`)
    for (const tx of transactions) {
      const yearMonth = getYearMonth(tx.occurred_at)
      if (!yearMonth) {
        console.warn(`[DEBUG] Skipping transaction with invalid date: ${tx.occurred_at}`)
        continue
      }

      if (!monthlyData.has(yearMonth)) {
        monthlyData.set(yearMonth, { income: 0, expense: 0, appStoreIncome: 0 })
      }

      const monthData = monthlyData.get(yearMonth)!
      const amountUSD = convertToUSD(Number(tx.amount), tx.currency || 'USD')

      if (tx.type === 'income') {
        monthData.income += amountUSD
      } else if (tx.type === 'expense') {
        monthData.expense += amountUSD
      }
    }
    console.log(`[DEBUG] Processed transactions into ${monthlyData.size} months`)
  }

  // Process App Store finance data
  if (appStoreData) {
    console.log(`[DEBUG] Processing ${appStoreData.length} App Store finance records for copany ${copanyId}`)
    for (const item of appStoreData) {
      const yearMonth = item.date // Already in YYYY-MM format
      if (!monthlyData.has(yearMonth)) {
        monthlyData.set(yearMonth, { income: 0, expense: 0, appStoreIncome: 0 })
      }

      const monthData = monthlyData.get(yearMonth)!
      monthData.appStoreIncome += Number(item.amount_usd || 0)
    }
  }

  // Calculate net income for each month and average
  if (monthlyData.size === 0) {
    console.log(`[DEBUG] No monthly data found for copany ${copanyId}, returning 0`)
    return 0
  }

  const monthlyNetIncomes: number[] = []
  for (const [yearMonth, data] of monthlyData.entries()) {
    const netIncome = data.income + data.appStoreIncome - data.expense
    monthlyNetIncomes.push(netIncome)
    console.log(`[DEBUG] Month ${yearMonth}: income=$${data.income.toFixed(2)}, appStoreIncome=$${data.appStoreIncome.toFixed(2)}, expense=$${data.expense.toFixed(2)}, netIncome=$${netIncome.toFixed(2)}`)
  }

  // Calculate average monthly revenue
  const avgMonthlyRevenue = monthlyNetIncomes.reduce((sum, income) => sum + income, 0) / monthlyNetIncomes.length
  console.log(`[DEBUG] Calculated avgMonthlyRevenue for copany ${copanyId}: $${avgMonthlyRevenue.toFixed(2)} (from ${monthlyNetIncomes.length} months)`)

  return avgMonthlyRevenue
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('[DEBUG] Initializing Supabase client')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('[DEBUG] Supabase client initialized successfully')

    console.log('Starting hot_score update for all copanies')

    // Get all copanies that need hot_score update
    const { data: copanies, error: fetchError } = await supabase
      .from('copany')
      .select('id, star_count, created_at')
      .order('id')

    if (fetchError) {
      throw new Error(`Failed to fetch copanies: ${fetchError.message}`)
    }

    if (!copanies || copanies.length === 0) {
      console.log('No copanies found')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No copanies found',
          updated: 0,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`Found ${copanies.length} copanies to update`)

    // Calculate and update hot_score for each copany
    // Formula: avgMonthlyRevenue + star_count + (100 / hours_since_creation)
    // All factors are independent and additive
    let updatedCount = 0
    const errors: string[] = []
    const now = Date.now()

    for (const copany of copanies) {
      try {
        console.log(`[DEBUG] Processing copany ${copany.id}`)
        
        // Calculate hours since creation
        const createdAt = new Date(copany.created_at).getTime()
        const rawHoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)
        const hoursSinceCreation = Math.max(1, rawHoursSinceCreation)
        console.log(`[DEBUG] Copany ${copany.id}: created_at=${copany.created_at}, rawHours=${rawHoursSinceCreation.toFixed(2)}, clampedHours=${hoursSinceCreation.toFixed(2)}`)
        
        // Calculate star_count component
        const starCount = copany.star_count ?? 0
        console.log(`[DEBUG] Copany ${copany.id}: starCount=${starCount}`)

        // Calculate time component: 100 / hours_since_creation
        // hours_since_creation has minimum value of 1
        const timeComponent = 100 / hoursSinceCreation
        console.log(`[DEBUG] Copany ${copany.id}: timeComponent=${timeComponent.toFixed(2)}`)

        // Calculate avgMonthlyRevenue
        // Convert copany.id to number if needed
        const copanyId = typeof copany.id === 'string' ? parseInt(copany.id, 10) : copany.id
        if (typeof copanyId !== 'number' || isNaN(copanyId)) {
          console.warn(`[DEBUG] Invalid copany ID: ${copany.id}, skipping`)
          continue
        }
        const avgMonthlyRevenue = await calculateAvgMonthlyRevenue(supabase, copanyId)

        // Calculate final hot_score: sum of all components
        const hotScore = avgMonthlyRevenue + starCount + timeComponent

        console.log(`[DEBUG] Copany ${copany.id}: avgMonthlyRevenue=$${avgMonthlyRevenue.toFixed(2)}, starCount=${starCount}, timeComponent=${timeComponent.toFixed(2)}, final=${hotScore.toFixed(2)}`)

        console.log(`[DEBUG] Updating hot_score for copany ${copany.id} to ${hotScore.toFixed(2)}`)
        const { error: updateError } = await supabase
          .from('copany')
          .update({ hot_score: hotScore })
          .eq('id', copany.id)

        if (updateError) {
          console.error(`Failed to update copany ${copany.id}:`, updateError.message)
          errors.push(`Copany ${copany.id}: ${updateError.message}`)
        } else {
          updatedCount++
        }
      } catch (error) {
        console.error(`Error updating copany ${copany.id}:`, error)
        errors.push(`Copany ${copany.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`Successfully updated ${updatedCount} copanies`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Hot score update completed',
        updated: updatedCount,
        total: copanies.length,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in hot score update:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

