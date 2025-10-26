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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate the cutoff time (8 hours ago)
    const cutoffTime = new Date(Date.now() - 8 * 60 * 60 * 1000)
    
    console.log(`Updating hot_score for discussions older than ${cutoffTime.toISOString()}`)

    // Get discussions that haven't been updated in the last 8 hours
    // We check if updated_at is more than 8 hours ago
    const { data: discussions, error: fetchError } = await supabase
      .from('discussion')
      .select('id, vote_up_count, created_at, updated_at')
      .lt('updated_at', cutoffTime.toISOString())

    if (fetchError) {
      throw new Error(`Failed to fetch discussions: ${fetchError.message}`)
    }

    if (!discussions || discussions.length === 0) {
      console.log('No discussions need hot_score update')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No discussions need hot_score update',
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

    // Update each discussion
    // The trigger will automatically recalculate the hot_score
    let updatedCount = 0
    const errors: string[] = []

    for (const discussion of discussions) {
      try {
        const { error: updateError } = await supabase
          .from('discussion')
          .update({ updated_at: new Date().toISOString() })
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

