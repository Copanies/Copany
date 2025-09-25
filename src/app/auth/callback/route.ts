import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/utils/supabase/server";
import { initializeUserAvatarIfNeeded } from "@/services/avatar.service";
import { restoreUserMetadataFromCache } from "@/services/userMetadataProtection.service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const provider = searchParams.get("provider"); // Our custom provider parameter
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";

  console.log("🔄 OAuth callback handling - code:", !!code, "next:", next, "provider:", provider);

  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
    console.log("⚠️ next parameter is not a relative path, resetting to /");
  }

  if (code) {
    try {
      const supabase = await createSupabaseClient();
      console.log("🔑 Exchanging authorization code...");

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        console.log("✅ Authorization code exchange successful");

        // Verify user identity and get provider token
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        let providerToken: string | null = null;

        if (userError || !user) {
          console.warn("⚠️ User verification failed, cannot store token");
        } else {
          // Initialize avatar for email users if needed
          if (user.email_confirmed_at) {
            console.log("🎨 Initializing avatar for verified user:", user.id);
            await initializeUserAvatarIfNeeded(user.id);
          }
          
          // Get provider token from session
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (!sessionError && session?.provider_token) {
            providerToken = session.provider_token;
            
            // Store provider token in our custom table for persistence
            try {
              // Get provider from URL parameter (most reliable), then from session as fallback
              let detectedProvider = provider;
              
              // If no provider in URL, try to get it from the session
              if (!detectedProvider && session?.provider_token) {
                // Try to detect provider from user's app_metadata or user_metadata
                if (user.app_metadata?.provider) {
                  detectedProvider = user.app_metadata.provider;
                } else if (user.user_metadata?.provider) {
                  detectedProvider = user.user_metadata.provider;
                }
              }
              
              // Final fallback - if still no provider detected, skip token storage
              if (!detectedProvider) {
                console.warn("⚠️ Could not determine provider for token storage, skipping");
              } else {
                console.log(`🔍 Detected provider: ${detectedProvider}`);
                
                // Upsert: update if exists, insert if not exists
                const { error: tokenError } = await supabase.rpc('fn_upsert_user_provider_token', {
                  p_user_id: user.id,
                  p_provider: detectedProvider,
                  p_access_token: providerToken,
                  p_token_type: 'bearer'
                });
                
                if (tokenError) {
                  console.error("❌ Failed to store provider token:", tokenError);
                  console.error("❌ Token error details:", JSON.stringify(tokenError, null, 2));
                } else {
                  console.log(`✅ Successfully stored ${detectedProvider} token in database`);
                }
              }
            } catch (error) {
              console.error("❌ Exception storing provider token:", error);
              console.error("❌ Exception details:", JSON.stringify(error, null, 2));
            }
          } else {
            console.warn("⚠️ provider_token not found, cannot store token");
          }
        }

        // Redirect user to target page
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        let redirectUrl: string;
        if (isLocalEnv) {
          redirectUrl = `${origin}${next}`;
        } else if (forwardedHost) {
          redirectUrl = `https://${forwardedHost}${next}`;
        } else {
          redirectUrl = `${origin}${next}`;
        }

        // Add metadata protection trigger to the redirect URL
        const urlObj = new URL(redirectUrl);
        urlObj.searchParams.set('trigger_metadata_protection', 'true');
        const finalRedirectUrl = urlObj.toString();
        
        console.log("↗️ Redirecting to:", finalRedirectUrl);
        const response = NextResponse.redirect(finalRedirectUrl);

        // Schedule metadata protection with a 2-second delay
        setTimeout(async () => {
          try {
            console.log("🛡️ Callback: Triggering delayed metadata protection...");
            await restoreUserMetadataFromCache();
            console.log("✅ Callback: Delayed metadata protection completed");
          } catch (error) {
            console.error("❌ Callback: Error in delayed metadata protection:", error);
          }
        }, 2000);

        return response;
      } else {
        console.error("❌ Authorization code exchange failed:", error.message);
      }
    } catch (error) {
      console.error("❌ OAuth callback handling exception:", error);
    }
  } else {
    console.log("⚠️ No authorization code received");
  }

  // return the user to an error page with instructions
  const errorUrl = `${origin}/auth/auth-code-error`;
  console.log("❌ Redirecting to error page:", errorUrl);
  return NextResponse.redirect(errorUrl);
}
