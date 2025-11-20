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

interface DistributeRow {
  copany_id: string;
  to_user: string;
  status: 'in_progress' | 'in_review' | 'confirmed';
  contribution_percent: number;
  amount: number;
  currency: string;
  evidence_url: string | null;
  distribution_month: string; // YYYY-MM format
}

interface Transaction {
  id: string;
  copany_id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  status: 'in_review' | 'confirmed';
  occurred_at: string;
}

interface AppStoreFinanceChartData {
  id: string;
  copany_id: string;
  date: string; // YYYY-MM format
  amount_usd: number;
  transaction_count: number;
  transactions: unknown;
}

interface Issue {
  id: string;
  copany_id: string;
  assignee: string | null;
  level: number | null;
  state: number | null;
  closed_at: string | null;
}

interface Contributor {
  user_id: string;
  name: string;
  contribution: number;
  contribution_score?: number;
}

interface Copany {
  id: string;
  name: string;
  created_by: string;
  distribution_delay_days: number | null;
  distribution_day_of_month: number | null;
}

enum IssueLevel {
  level_None = 0,
  level_C = 1,
  level_B = 2,
  level_A = 3,
  level_S = 4,
}

const LEVEL_SCORES: Record<IssueLevel, number> = {
  [IssueLevel.level_C]: 5,
  [IssueLevel.level_B]: 20,
  [IssueLevel.level_A]: 60,
  [IssueLevel.level_S]: 200,
  [IssueLevel.level_None]: 0,
};

enum IssueState {
  Backlog = 1,
  Todo = 2,
  InProgress = 3,
  InReview = 7,
  Done = 4,
  Canceled = 5,
  Duplicate = 6,
}

/**
 * Calculate distribution for a specific month
 */
async function calculateDistributionForMonth(
  supabase: ReturnType<typeof createClient>,
  copany: Copany,
  distributionMonthStr: string,
  distributionYear: number,
  distributionMonth: number
): Promise<{ success: boolean; inserted: number; netIncome: number; skipped?: boolean; error?: string }> {
  try {
    console.log(`Calculating distribution for copany ${copany.id}, month: ${distributionMonthStr}`)

    // Calculate time ranges
    const incomeStartDate = new Date(Date.UTC(distributionYear, distributionMonth, 1, 0, 0, 0, 0))
    const incomeEndDate = new Date(Date.UTC(distributionYear, distributionMonth + 1, 0, 23, 59, 59, 999))
    const contributionCutoff = new Date(Date.UTC(distributionYear, distributionMonth + 1, 0, 23, 59, 59, 999))

    // Ensure copany_id is converted to number if needed
    const copanyIdNum = typeof copany.id === 'string' ? parseInt(copany.id, 10) : copany.id

    // Fetch transactions for this month
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('copany_id', copanyIdNum)
      .eq('status', 'confirmed')
      .gte('occurred_at', incomeStartDate.toISOString())
      .lte('occurred_at', incomeEndDate.toISOString())

    if (txError) {
      console.error(`Failed to fetch transactions for copany ${copany.id}, month ${distributionMonthStr}:`, txError.message)
      return { success: false, inserted: 0, netIncome: 0, error: txError.message }
    }

    // Fetch App Store Finance data for this month
    let appStoreIncome = 0
    const { data: appStoreFinanceData, error: appStoreError } = await supabase
      .from('app_store_finance_chart_data')
      .select('*')
      .eq('copany_id', copanyIdNum)
      .eq('date', distributionMonthStr)

    if (appStoreError) {
      console.error(`Failed to fetch App Store finance data for copany ${copany.id}, month ${distributionMonthStr}:`, appStoreError.message)
      // Continue processing even if App Store data fetch fails
    } else {
      appStoreIncome = (appStoreFinanceData || []).reduce((sum: number, item: AppStoreFinanceChartData) => {
        return sum + Number(item.amount_usd || 0)
      }, 0)
    }

    // Calculate net income
    const incomes = (transactions || []).filter((t: Transaction) => t.type === 'income')
    const expenses = (transactions || []).filter((t: Transaction) => t.type === 'expense')
    
    const transactionIncome = incomes.reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    const transactionExpense = expenses.reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    const totalIncome = transactionIncome + appStoreIncome
    const totalExpense = transactionExpense
    const netIncome = totalIncome - totalExpense

    // Skip if no income or expense data for this month
    if (totalIncome === 0 && totalExpense === 0) {
      console.log(`No income/expense data for copany ${copany.id}, month ${distributionMonthStr}, skipping`)
      return { success: true, inserted: 0, netIncome: 0 }
    }

    // Get contributors
    const { data: contributors, error: contributorsError } = await supabase
      .from('copany_contributor')
      .select('user_id, contribution')
      .eq('copany_id', copany.id)

    if (contributorsError) {
      console.error(`Failed to fetch contributors for copany ${copany.id}:`, contributorsError.message)
      return { success: false, inserted: 0, netIncome, error: contributorsError.message }
    }

    if (!contributors || contributors.length === 0) {
      console.log(`No contributors found for copany ${copany.id}, month ${distributionMonthStr}`)
      return { success: true, inserted: 0, netIncome }
    }

    // Get all completed issues for contribution calculation (up to end of distribution month)
    const { data: issues, error: issuesError } = await supabase
      .from('issue')
      .select('id, assignee, level, state, closed_at')
      .eq('copany_id', copany.id)
      .eq('state', IssueState.Done)
      .not('closed_at', 'is', null)
      .lte('closed_at', contributionCutoff.toISOString())

    if (issuesError) {
      console.error(`Failed to fetch issues for copany ${copany.id}:`, issuesError.message)
      return { success: false, inserted: 0, netIncome, error: issuesError.message }
    }

    // Calculate contribution scores
    const userContributionScores: Record<string, number> = {}
    
    ;(issues || []).forEach((issue: Issue) => {
      const level = issue.level
      if (level && [IssueLevel.level_C, IssueLevel.level_B, IssueLevel.level_A, IssueLevel.level_S].includes(level) && issue.assignee) {
        const score = LEVEL_SCORES[level as IssueLevel] || 0
        userContributionScores[issue.assignee] = (userContributionScores[issue.assignee] || 0) + score
      }
    })

    // Map contributors to their calculated contribution scores
    const contributorsWithScores = (contributors || []).map((c: Contributor) => ({
      ...c,
      contribution_score: userContributionScores[c.user_id] || 0
    }))

    const totalContributionScore = Object.values(userContributionScores).reduce((sum, score) => sum + score, 0)
    const currency = (incomes[0]?.currency as string) || (transactions && transactions[0]?.currency) || 'USD'

    // Check existing distribute records for this copany and distribution month
    const { data: existingDistributes, error: existingError } = await supabase
      .from('distribute')
      .select('amount')
      .eq('copany_id', copany.id)
      .eq('distribution_month', distributionMonthStr)

    if (existingError) {
      console.warn(`Failed to fetch existing distribute records for copany ${copany.id}, month ${distributionMonthStr}:`, existingError.message)
    }

    // If there are existing records with non-zero amounts, skip recalculation
    if (existingDistributes && existingDistributes.length > 0) {
      const hasNonZeroAmount = existingDistributes.some((d: { amount: number }) => Math.abs(d.amount) > 0.01)
      if (hasNonZeroAmount) {
        console.log(`Skipping copany ${copany.id}, month ${distributionMonthStr}: existing records with non-zero amounts found`)
        return { success: true, inserted: 0, netIncome, skipped: true }
      }
    }

    // Delete existing distribute records only if all amounts are zero (or no records exist)
    if (existingDistributes && existingDistributes.length > 0) {
      const { error: deleteError } = await supabase
        .from('distribute')
        .delete()
        .eq('copany_id', copany.id)
        .eq('distribution_month', distributionMonthStr)

      if (deleteError) {
        console.warn(`Failed to delete existing distribute records for copany ${copany.id}, month ${distributionMonthStr}:`, deleteError.message)
      } else {
        console.log(`Deleted existing zero-amount distribute records for copany ${copany.id}, month ${distributionMonthStr}`)
      }
    }

    // Generate distribute rows
    let distributeRows: DistributeRow[] = []

    // Helper function to determine status: owner gets 'confirmed', others get 'in_progress'
    const getStatus = (userId: string): 'in_progress' | 'confirmed' => {
      return userId === copany.created_by ? 'confirmed' : 'in_progress'
    }

    // If no contribution score, allocate all to the copany owner
    if (totalContributionScore === 0) {
      if (netIncome <= 0) {
        distributeRows = [{
          copany_id: copany.id,
          to_user: copany.created_by,
          status: getStatus(copany.created_by),
          contribution_percent: 100,
          amount: 0,
          currency,
          evidence_url: null,
          distribution_month: distributionMonthStr,
        }]
      } else {
        distributeRows = [{
          copany_id: copany.id,
          to_user: copany.created_by,
          status: getStatus(copany.created_by),
          contribution_percent: 100,
          amount: Math.round(netIncome * 100) / 100,
          currency,
          evidence_url: null,
          distribution_month: distributionMonthStr,
        }]
      }
    } else if (netIncome <= 0) {
      distributeRows = contributorsWithScores.map((c: Contributor) => ({
        copany_id: copany.id,
        to_user: c.user_id,
        status: getStatus(c.user_id),
        contribution_percent: ((c.contribution_score || 0) / totalContributionScore) * 100,
        amount: 0,
        currency,
        evidence_url: null,
        distribution_month: distributionMonthStr,
      }))
    } else {
      distributeRows = contributorsWithScores.map((c: Contributor) => {
        const ratio = (c.contribution_score || 0) / totalContributionScore
        const amount = Math.round(netIncome * ratio * 100) / 100
        
        return {
          copany_id: copany.id,
          to_user: c.user_id,
          status: getStatus(c.user_id),
          contribution_percent: ratio * 100,
          amount,
          currency,
          evidence_url: null,
          distribution_month: distributionMonthStr,
        }
      })
    }

    // Insert distribute rows
    const { error: insertError } = await supabase
      .from('distribute')
      .insert(distributeRows)

    if (insertError) {
      console.error(`Failed to insert distribute rows for copany ${copany.id}, month ${distributionMonthStr}:`, insertError.message)
      return { success: false, inserted: 0, netIncome, error: insertError.message }
    }

    console.log(`Successfully processed copany ${copany.id}, month ${distributionMonthStr}: inserted ${distributeRows.length} distribute rows`)

    return { success: true, inserted: distributeRows.length, netIncome }
  } catch (error) {
    console.error(`Error calculating distribution for copany ${copany.id}, month ${distributionMonthStr}:`, error)
    return { 
      success: false, 
      inserted: 0, 
      netIncome: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { copanyId } = await req.json()

    if (!copanyId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'copanyId is required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch copany
    const { data: copany, error: copanyError } = await supabase
      .from('copany')
      .select('id, name, created_by, distribution_delay_days, distribution_day_of_month')
      .eq('id', copanyId)
      .single()

    if (copanyError || !copany) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Copany not found: ${copanyError?.message || 'Unknown error'}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log(`Calculating distributions for copany: ${copany.name} (ID: ${copany.id})`)

    // Get all unique months from transactions
    const copanyIdNum = typeof copany.id === 'string' ? parseInt(copany.id, 10) : copany.id
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('occurred_at')
      .eq('copany_id', copanyIdNum)
      .eq('status', 'confirmed')

    if (txError) {
      console.error(`Failed to fetch transactions:`, txError.message)
    }

    // Get all unique months from App Store Finance data
    const { data: appStoreData, error: appStoreError } = await supabase
      .from('app_store_finance_chart_data')
      .select('date')
      .eq('copany_id', copanyIdNum)

    if (appStoreError) {
      console.error(`Failed to fetch App Store finance data:`, appStoreError.message)
    }

    // Collect all unique months
    const monthsSet = new Set<string>()

    // Add months from transactions
    if (transactions) {
      transactions.forEach((tx: { occurred_at: string }) => {
        const date = new Date(tx.occurred_at)
        const year = date.getUTCFullYear()
        const month = date.getUTCMonth()
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
        monthsSet.add(monthStr)
      })
    }

    // Add months from App Store Finance data
    if (appStoreData) {
      appStoreData.forEach((item: { date: string }) => {
        monthsSet.add(item.date)
      })
    }

    const months = Array.from(monthsSet).sort()

    console.log(`Found ${months.length} unique months with data: ${months.join(', ')}`)

    // Calculate distribution for each month
    const results: Array<{
      month: string;
      success: boolean;
      inserted: number;
      netIncome: number;
      skipped?: boolean;
      error?: string;
    }> = []

    for (const monthStr of months) {
      const [yearStr, monthStrPart] = monthStr.split('-')
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStrPart, 10) - 1

      const result = await calculateDistributionForMonth(
        supabase,
        copany,
        monthStr,
        year,
        month
      )

      results.push({
        month: monthStr,
        ...result
      })
    }

    const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0)
    const successfulMonths = results.filter(r => r.success).length

    console.log(`Completed calculation for copany ${copany.id}: ${successfulMonths}/${months.length} months successful, ${totalInserted} total records inserted`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Calculated distributions for ${successfulMonths}/${months.length} months`,
        copanyId: copany.id,
        copanyName: copany.name,
        totalMonths: months.length,
        successfulMonths,
        totalInserted,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in calculate copany distributions:', error)
    
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

