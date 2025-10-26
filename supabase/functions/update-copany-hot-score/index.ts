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
    
    console.log(`Updating hot_score for copanies older than ${cutoffTime.toISOString()}`)

    // Get copanies that haven't been updated in the last 8 hours
    // We check if updated_at is more than 8 hours ago
    const { data: copanies, error: fetchError } = await supabase
      .from('copany')
      .select('id, star_count, created_at, updated_at')
      .lt('updated_at', cutoffTime.toISOString())

    if (fetchError) {
      throw new Error(`Failed to fetch copanies: ${fetchError.message}`)
    }

    if (!copanies || copanies.length === 0) {
      console.log('No copanies need hot_score update')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No copanies need hot_score update',
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

    // Update each copany
    // The trigger will automatically recalculate the hot_score
    let updatedCount = 0
    const errors: string[] = []

    for (const copany of copanies) {
      try {
        const { error: updateError } = await supabase
          .from('copany')
          .update({ updated_at: new Date().toISOString() })
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

