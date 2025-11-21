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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date (UTC)
    const now = new Date()
    const currentDay = now.getUTCDate()
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth()

    console.log(`Running distribution calculator on ${now.toISOString()}`)
    console.log(`Current day: ${currentDay}`)

    // Get copanies that have distribution_day_of_month matching today's date
    const { data: copanies, error: copaniesError } = await supabase
      .from('copany')
      .select('id, name, created_by, distribution_delay_days, distribution_day_of_month')
      .eq('distribution_day_of_month', currentDay)

    if (copaniesError) {
      throw new Error(`Failed to fetch copanies: ${copaniesError.message}`)
    }

    console.log(`Found ${copanies?.length || 0} copanies with distribution_day_of_month = ${currentDay}`)

    if (!copanies || copanies.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No copanies to process today',
          timestamp: now.toISOString(),
          results: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const results: {
      copanyId: string;
      copanyName: string;
      success: boolean;
      message: string;
      netIncome: number;
      inserted: number;
    }[] = []

    for (const copany of copanies) {
      try {
        console.log(`Processing copany: ${copany.name} (ID: ${copany.id})`)

        // Get distribution settings (defaults: delay_days = 90, day_of_month = 10)
        const delayDays = copany.distribution_delay_days ?? 90
        const dayOfMonth = copany.distribution_day_of_month ?? 10

        // Warn if delay days is unusually large (more than 1 year)
        if (delayDays > 365) {
          console.warn(`⚠️ WARNING: distribution_delay_days is ${delayDays} days (${Math.round(delayDays / 30)} months), which seems unusually large. This will calculate distribution for a month from the past.`)
        }

        // Calculate the distribution month (the month that is delayDays ago)
        const distributionDate = new Date(now)
        distributionDate.setUTCDate(distributionDate.getUTCDate() - delayDays)
        const distributionYear = distributionDate.getUTCFullYear()
        const distributionMonth = distributionDate.getUTCMonth()
        
        // Check if distribution month is more than 1 year ago
        const monthsAgo = (now.getUTCFullYear() - distributionYear) * 12 + (now.getUTCMonth() - distributionMonth)
        if (monthsAgo > 12) {
          console.warn(`⚠️ WARNING: Distribution month ${distributionYear}-${String(distributionMonth + 1).padStart(2, '0')} is ${monthsAgo} months ago. This may not have any transaction data.`)
        }

        // Generate distribution month string (YYYY-MM format) - used throughout the function
        const distributionMonthStr = `${distributionYear}-${String(distributionMonth + 1).padStart(2, '0')}`

        // Calculate time ranges
        // Income time range: calculate income/expense for the distribution month only
        const incomeStartDate = new Date(Date.UTC(distributionYear, distributionMonth, 1, 0, 0, 0, 0))
        const incomeEndDate = new Date(Date.UTC(distributionYear, distributionMonth + 1, 0, 23, 59, 59, 999))
        
        // Contribution cutoff: end of distribution month (before the last day ends)
        const contributionCutoff = new Date(Date.UTC(distributionYear, distributionMonth + 1, 0, 23, 59, 59, 999))

        console.log(`Today: ${now.toISOString()}`)
        console.log(`Distribution date (${delayDays} days ago): ${distributionDate.toISOString()}`)
        console.log(`Distribution month: ${distributionYear}-${String(distributionMonth + 1).padStart(2, '0')}`)
        console.log(`Income time range: ${incomeStartDate.toISOString()} to ${incomeEndDate.toISOString()}`)
        console.log(`Contribution cutoff: ${contributionCutoff.toISOString()}`)

        // Ensure copany_id is converted to number if needed (database uses bigint)
        const copanyIdNum = typeof copany.id === 'string' ? parseInt(copany.id, 10) : copany.id
        console.log(`Querying transactions for copany_id: ${copanyIdNum} (original: ${copany.id})`)

        // Debug: Check total confirmed transactions for this copany (regardless of date)
        const { data: allTransactions, error: allTxError } = await supabase
          .from('transactions')
          .select('id, occurred_at, type, amount, status')/
          .eq('copany_id', copanyIdNum)
          .eq('status', 'confirmed')
          .order('occurred_at', { ascending: false })
          .limit(10)

        if (!allTxError && allTransactions) {
          console.log(`Total confirmed transactions found (sample of 10): ${allTransactions.length}`)
          if (allTransactions.length > 0) {
            console.log(`Sample transaction dates: ${allTransactions.map((t: any) => `${t.occurred_at} (${t.type}: ${t.amount})`).join(', ')}`)
          }
        }
        
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('copany_id', copanyIdNum)
          .eq('status', 'confirmed')
          .gte('occurred_at', incomeStartDate.toISOString())
          .lte('occurred_at', incomeEndDate.toISOString())

        if (txError) {
          console.error(`Failed to fetch transactions for copany ${copany.id}:`, txError.message)
          continue
        }

        console.log(`Found ${transactions?.length || 0} confirmed transactions for copany ${copany.id} in distribution month`)
        if (transactions && transactions.length > 0) {
          console.log(`Sample transaction dates: ${transactions.slice(0, 3).map((t: Transaction) => t.occurred_at).join(', ')}`)
        } else {
          console.warn(`⚠️ No transactions found for distribution month ${distributionYear}-${String(distributionMonth + 1).padStart(2, '0')}. Check if distribution_delay_days (${delayDays}) is set correctly.`)
          
          // Find the most recent month with transactions
          if (allTransactions && allTransactions.length > 0) {
            const transactionDates = allTransactions.map((t: any) => new Date(t.occurred_at))
            const latestDate = new Date(Math.max(...transactionDates.map((d: Date) => d.getTime())))
            const latestYear = latestDate.getUTCFullYear()
            const latestMonth = latestDate.getUTCMonth()
            const latestMonthStr = `${latestYear}-${String(latestMonth + 1).padStart(2, '0')}`
            
            // Count transactions by month
            const transactionsByMonth: Record<string, number> = {}
            allTransactions.forEach((t: any) => {
              const txDate = new Date(t.occurred_at)
              const txYear = txDate.getUTCFullYear()
              const txMonth = txDate.getUTCMonth()
              const txMonthStr = `${txYear}-${String(txMonth + 1).padStart(2, '0')}`
              transactionsByMonth[txMonthStr] = (transactionsByMonth[txMonthStr] || 0) + 1
            })
            
            const monthsWithData = Object.keys(transactionsByMonth).sort().reverse()
            console.log(`ℹ️ Available months with transaction data: ${monthsWithData.join(', ')}`)
            console.log(`ℹ️ Latest transaction month: ${latestMonthStr}`)
            console.log(`ℹ️ To calculate distribution for ${latestMonthStr}, set distribution_delay_days to approximately ${Math.round((now.getTime() - new Date(Date.UTC(latestYear, latestMonth, 15)).getTime()) / (1000 * 60 * 60 * 24))} days`)
          }
        }

        // Fetch App Store Finance chart data
        // Only get data for the distribution month
        console.log(`Fetching App Store Finance data for distribution month: ${distributionMonthStr}`)

        let appStoreIncome = 0
        const { data: appStoreFinanceData, error: appStoreError } = await supabase
          .from('app_store_finance_chart_data')
          .select('*')
          .eq('copany_id', copanyIdNum)
          .eq('date', distributionMonthStr)

        if (appStoreError) {
          console.error(`Failed to fetch App Store finance data for copany ${copany.id}:`, appStoreError.message)
          // Continue processing even if App Store data fetch fails
        } else {
          // Sum up all App Store income amounts for the current month
          appStoreIncome = (appStoreFinanceData || []).reduce((sum: number, item: AppStoreFinanceChartData) => {
            return sum + Number(item.amount_usd || 0)
          }, 0)
          console.log(`Found ${appStoreFinanceData?.length || 0} App Store finance records for ${distributionMonthStr}, total income: ${appStoreIncome}`)
        }

        // Calculate net income
        const incomes = (transactions || []).filter((t: Transaction) => t.type === 'income')
        const expenses = (transactions || []).filter((t: Transaction) => t.type === 'expense')
        
        const transactionIncome = incomes.reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
        const transactionExpense = expenses.reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
        const totalIncome = transactionIncome + appStoreIncome
        const totalExpense = transactionExpense
        const netIncome = totalIncome - totalExpense

        console.log(`Income breakdown for copany ${copany.id}:`)
        console.log(`  - Transaction income: ${transactionIncome} (${incomes.length} transactions)`)
        console.log(`  - App Store income: ${appStoreIncome}`)
        console.log(`  - Transaction expense: ${transactionExpense} (${expenses.length} transactions)`)
        console.log(`  - Total income: ${totalIncome}`)
        console.log(`  - Total expense: ${totalExpense}`)
        console.log(`  - Net income: ${netIncome}`)

        // Get contributors
        const { data: contributors, error: contributorsError } = await supabase
          .from('copany_contributor')
          .select('user_id, contribution')
          .eq('copany_id', copany.id)

        if (contributorsError) {
          console.error(`Failed to fetch contributors for copany ${copany.id}:`, contributorsError.message)
          continue
        }

        if (!contributors || contributors.length === 0) {
          console.log(`No contributors found for copany ${copany.id}`)
          results.push({
            copanyId: copany.id,
            copanyName: copany.name,
            success: true,
            message: 'No contributors found',
            netIncome,
            inserted: 0
          })
          continue
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
          continue
        }

        // Calculate contribution scores based on completed issues up to end of current month
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

        console.log(`Total contribution score (up to end of distribution month) for copany ${copany.id}: ${totalContributionScore}`)

        // Delete existing distribute records for this copany and distribution month to prevent duplicates
        const { error: deleteError } = await supabase
          .from('distribute')
          .delete()
          .eq('copany_id', copany.id)
          .eq('distribution_month', distributionMonthStr)

        if (deleteError) {
          console.warn(`Failed to delete existing distribute records for copany ${copany.id}:`, deleteError.message)
          // Continue anyway, as this might be the first run
        } else {
          console.log(`Deleted existing distribute records for copany ${copany.id} with distribution_month ${distributionMonthStr}`)
        }

        // Generate distribute rows
        let distributeRows: DistributeRow[] = []

        // Helper function to determine status: owner gets 'confirmed', others get 'in_progress'
        const getStatus = (userId: string): 'in_progress' | 'confirmed' => {
          return userId === copany.created_by ? 'confirmed' : 'in_progress'
        }

        // If no contribution score, allocate all to the copany owner
        if (totalContributionScore === 0) {
          console.log(`No contribution score found, allocating all to copany owner: ${copany.created_by}`)
          
          if (netIncome <= 0) {
            // No positive profit; generate zero-amount row for owner
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
            // Allocate all net income to owner
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
          // No positive profit; generate zero-amount rows for traceability
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
          // Generate distribute rows with positive amounts
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
          console.error(`Failed to insert distribute rows for copany ${copany.id}:`, insertError.message)
          continue
        }

        console.log(`Successfully processed copany ${copany.id}: inserted ${distributeRows.length} distribute rows`)

        results.push({
          copanyId: copany.id,
          copanyName: copany.name,
          success: true,
          message: 'Distribute calculation completed',
          netIncome,
          inserted: distributeRows.length
        })

      } catch (error) {
        console.error(`Error processing copany ${copany.id}:`, error)
        results.push({
          copanyId: copany.id,
          copanyName: copany.name,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          netIncome: 0,
          inserted: 0
        })
      }
    }

    console.log('Daily distribute calculation completed')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily distribute calculation completed',
        timestamp: now.toISOString(),
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in daily distribute calculation:', error)
    
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
