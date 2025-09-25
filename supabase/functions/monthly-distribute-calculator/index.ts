// These imports are Deno-specific and will work in the Supabase Edge Functions runtime
// @ts-ignore - Deno URL imports are not recognized by local TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore - Deno URL imports are not recognized by local TypeScript  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Type declarations for Deno environment
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DistributeRow {
  copany_id: string;
  to_user: string;
  bank_card_number: string;
  status: 'in_progress' | 'in_review' | 'confirmed';
  contribution_percent: number;
  amount: number;
  currency: string;
  evidence_url: string | null;
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

interface Issue {
  id: string;
  copany_id: string;
  assignee: string | null;
  level: number | null;
  state: number | null;
}

interface Contributor {
  user_id: string;
  name: string;
  contribution: number;
  contribution_score?: number;
}

// Contribution scores based on issue levels
const LEVEL_SCORES: Record<number, number> = {
  1: 5,   // level_C
  2: 20,  // level_B
  3: 60,  // level_A
  4: 200, // level_S
};

const ISSUE_LEVELS = [1, 2, 3, 4]; // level_C, level_B, level_A, level_S

// Issue state enum values
const ISSUE_STATE = {
  Backlog: 1,
  Todo: 2,
  InProgress: 3,
  Done: 4,
  Canceled: 5,
  Duplicate: 6,
  InReview: 7,
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting last month distribute calculation...')

    // Get last month time range (UTC)
    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
    
    console.log(`Time range (last month): ${start.toISOString()} to ${end.toISOString()}`)

    // Get all active copanies
    const { data: copanies, error: copaniesError } = await supabase
      .from('copany')
      .select('id, name, created_by')

    if (copaniesError) {
      throw new Error(`Failed to fetch copanies: ${copaniesError.message}`)
    }

    console.log(`Found ${copanies?.length || 0} active copanies`)

    const results: {
      copanyId: string;
      copanyName: string;
      success: boolean;
      message: string;
      netIncome: number;
      inserted: number;
    }[] = []

    for (const copany of copanies || []) {
      try {
        console.log(`Processing copany: ${copany.name} (ID: ${copany.id})`)

        // Fetch confirmed transactions for this month
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('copany_id', copany.id)
          .eq('status', 'confirmed')
          .gte('occurred_at', start.toISOString())
          .lt('occurred_at', end.toISOString())

        if (txError) {
          console.error(`Failed to fetch transactions for copany ${copany.id}:`, txError.message)
          continue
        }

        console.log(`Found ${transactions?.length || 0} confirmed transactions for copany ${copany.id}`)

        // Calculate net income
        const incomes = (transactions || []).filter((t: Transaction) => t.type === 'income')
        const expenses = (transactions || []).filter((t: Transaction) => t.type === 'expense')
        
        const totalIncome = incomes.reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
        const totalExpense = expenses.reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
        const netIncome = totalIncome - totalExpense

        console.log(`Net income for copany ${copany.id}: ${netIncome}`)

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

        // Get all completed issues for contribution calculation (historical data)
        const { data: issues, error: issuesError } = await supabase
          .from('issue')
          .select('id, assignee, level, state')
          .eq('copany_id', copany.id)
          .eq('state', ISSUE_STATE.Done)

        if (issuesError) {
          console.error(`Failed to fetch issues for copany ${copany.id}:`, issuesError.message)
          continue
        }

        // Calculate contribution scores based on all historical completed issues
        const userContributionScores: Record<string, number> = {}
        
        ;(issues || []).forEach((issue: Issue) => {
          const level = issue.level
          if (level && ISSUE_LEVELS.includes(level) && issue.assignee) {
            const score = LEVEL_SCORES[level] || 0
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

        console.log(`Total historical contribution score for copany ${copany.id}: ${totalContributionScore}`)

        // Delete existing distributes for this copany
        const { error: deleteError } = await supabase
          .from('distribute')
          .delete()
          .eq('copany_id', copany.id)

        if (deleteError) {
          console.error(`Failed to delete existing distributes for copany ${copany.id}:`, deleteError.message)
          continue
        }

        // Generate distribute rows
        let distributeRows: DistributeRow[] = []

        if (netIncome <= 0) {
          // No positive profit; generate zero-amount rows for traceability
          distributeRows = contributorsWithScores.map((c: Contributor) => ({
            copany_id: copany.id,
            to_user: c.user_id,
            bank_card_number: '0000 0000 0000 0000',
            status: 'in_progress' as const,
            contribution_percent: totalContributionScore > 0 ? ((c.contribution_score || 0) / totalContributionScore) * 100 : 0,
            amount: 0,
            currency,
            evidence_url: null,
          }))
        } else {
          // Generate distribute rows with positive amounts
          distributeRows = contributorsWithScores.map((c: Contributor) => {
            const ratio = totalContributionScore > 0 ? (c.contribution_score || 0) / totalContributionScore : 0
            const amount = Math.round(netIncome * ratio * 100) / 100
            
            return {
              copany_id: copany.id,
              to_user: c.user_id,
              bank_card_number: '0000 0000 0000 0000',
              status: 'in_progress' as const,
              contribution_percent: ratio * 100,
              amount,
              currency,
              evidence_url: null,
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

    console.log('Last month distribute calculation completed')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Last month distribute calculation completed',
        timestamp: new Date().toISOString(),
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in monthly distribute calculation:', error)
    
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
