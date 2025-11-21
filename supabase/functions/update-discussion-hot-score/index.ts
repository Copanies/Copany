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

    console.log('Starting hot_score update for all discussions')

    // Get all discussions that need hot_score update
    const { data: discussions, error: fetchError } = await supabase
      .from('discussion')
      .select('id, vote_up_count, created_at')

    if (fetchError) {
      throw new Error(`Failed to fetch discussions: ${fetchError.message}`)
    }

    if (!discussions || discussions.length === 0) {
      console.log('No discussions found')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No discussions found',
          updated: 0,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`Found ${discussions.length} discussions to update`)

    // Calculate and update hot_score for each discussion
    // Formula: (vote_up_count + 1) / pow((hours_since_creation + 2), 1.5)
    let updatedCount = 0
    const errors: string[] = []
    const now = Date.now()

    for (const discussion of discussions) {
      try {
        console.log(`[DEBUG] Processing discussion ${discussion.id}`)
        
        // Calculate hours since creation
        const createdAt = new Date(discussion.created_at).getTime()
        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)
        console.log(`[DEBUG] Discussion ${discussion.id}: created_at=${discussion.created_at}, hoursSinceCreation=${hoursSinceCreation.toFixed(2)}`)
        
        // Calculate hot_score
        const voteUpCount = discussion.vote_up_count
        const numerator = voteUpCount + 1
        const denominator = Math.pow(hoursSinceCreation + 2, 1.5)
        const hotScore = numerator / denominator
        
        console.log(`[DEBUG] Discussion ${discussion.id}: vote_up_count=${voteUpCount}, numerator=${numerator}, denominator=${denominator.toFixed(2)}, hotScore=${hotScore.toFixed(6)}`)

        console.log(`[DEBUG] Updating hot_score for discussion ${discussion.id} to ${hotScore.toFixed(6)}`)
        const { error: updateError } = await supabase
          .from('discussion')
          .update({ hot_score: hotScore })
          .eq('id', discussion.id)

        if (updateError) {
          console.error(`Failed to update discussion ${discussion.id}:`, updateError.message)
          errors.push(`Discussion ${discussion.id}: ${updateError.message}`)
        } else {
          updatedCount++
        }
      } catch (error) {
        console.error(`Error updating discussion ${discussion.id}:`, error)
        errors.push(`Discussion ${discussion.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`Successfully updated ${updatedCount} discussions`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Hot score update completed',
        updated: updatedCount,
        total: discussions.length,
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

