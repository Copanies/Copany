"use server";

import { createSupabaseClient, createAdminSupabaseClient } from "@/utils/supabase/server";

export interface UserAuthInfo {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  providers: AuthProvider[];
  tokens: {
    github_token?: string;
    google_token?: string;
    figma_token?: string;
  };
}

export interface AuthProvider {
  provider: string;
  id: string;
  created_at: string;
  last_sign_in_at: string;
  email?: string;
  user_name?: string;
  avatar_url?: string;
}

/**
 * Get detailed user authentication information including all linked providers and tokens
 * This function can only be called for the current authenticated user for security reasons
 */
export async function getUserAuthInfo(): Promise<UserAuthInfo | null> {
  try {
    const supabase = await createSupabaseClient();
    const adminSupabase = await createAdminSupabaseClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Error getting current user:", userError);
      return null;
    }

    // Get detailed user info including identities
    const { data: userData, error: adminError } = await adminSupabase.auth.admin.getUserById(user.id);
    
    if (adminError || !userData.user) {
      console.error("Error getting user details:", adminError);
      return null;
    }

    const detailedUser = userData.user;

    // Extract provider information
    const providers: AuthProvider[] = detailedUser.identities?.map(identity => ({
      provider: identity.provider || 'unknown',
      id: identity.id || '',
      created_at: identity.created_at || '',
      last_sign_in_at: identity.last_sign_in_at || '',
      email: identity.identity_data?.email || identity.identity_data?.login || '',
      user_name: identity.identity_data?.user_name || identity.identity_data?.name || identity.identity_data?.full_name || '',
      avatar_url: identity.identity_data?.avatar_url || ''
    })) || [];

    // Get tokens from our custom table (persistent storage)
    const tokens: { github_token?: string; google_token?: string; figma_token?: string } = {};
    
    try {
      // Get GitHub token
      console.log(`🔍 Attempting to get GitHub token for user: ${detailedUser.id}`);
      const { data: githubTokenData, error: githubError } = await supabase.rpc('fn_get_user_provider_token', {
        p_user_id: detailedUser.id,
        p_provider: 'github'
      });
      
      if (githubError) {
        console.error("❌ Error calling fn_get_user_provider_token for GitHub:", githubError);
      } else {
        console.log("📊 GitHub token query result:", githubTokenData);
      }
      
      if (githubTokenData) {
        tokens.github_token = githubTokenData;
        console.log("✅ GitHub token found and stored");
        console.log(`📊 GitHub token preview: ${githubTokenData.substring(0, 20)}...`);
      } else {
        console.log("ℹ️ No GitHub token found in database");
      }
      
      // Get Google token
      const { data: googleTokenData, error: googleError } = await supabase.rpc('fn_get_user_provider_token', {
        p_user_id: detailedUser.id,
        p_provider: 'google'
      });
      
      if (googleError) {
        console.error("❌ Error calling fn_get_user_provider_token for Google:", googleError);
      }
      
      if (googleTokenData) {
        tokens.google_token = googleTokenData;
        console.log("✅ Google token found and stored");
      }
      
      // Get Figma token
      const { data: figmaTokenData, error: figmaError } = await supabase.rpc('fn_get_user_provider_token', {
        p_user_id: detailedUser.id,
        p_provider: 'figma'
      });
      
      if (figmaError) {
        console.error("❌ Error calling fn_get_user_provider_token for Figma:", figmaError);
      }
      
      if (figmaTokenData) {
        tokens.figma_token = figmaTokenData;
        console.log("✅ Figma token found and stored");
      }
      
      console.log("Available tokens:", Object.keys(tokens).filter(key => tokens[key as keyof typeof tokens]));
    } catch (error) {
      console.error("Error fetching provider tokens from database:", error);
    }
    
    // Fallback: Get current session token (most recent provider only)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!sessionError && session?.provider_token) {
      // Determine which provider this token belongs to (most recent login)
      const mostRecentProvider = providers.sort((a, b) => 
        new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime()
      )[0];
      
      if (mostRecentProvider && !tokens[`${mostRecentProvider.provider}_token` as keyof typeof tokens]) {
        // Only set the token for the most recent provider if we don't already have it
        switch (mostRecentProvider.provider) {
          case 'github':
            tokens.github_token = session.provider_token;
            break;
          case 'google':
            tokens.google_token = session.provider_token;
            break;
          case 'figma':
            tokens.figma_token = session.provider_token;
            break;
        }
      }
    }

    return {
      id: detailedUser.id,
      email: detailedUser.email || '',
      name: detailedUser.user_metadata?.full_name || 
            detailedUser.user_metadata?.name || 
            detailedUser.email || 
            'Unknown User',
      avatar_url: detailedUser.user_metadata?.avatar_url || 
                  detailedUser.user_metadata?.picture || '',
      providers,
      tokens
    };

  } catch (error) {
    console.error("Error getting user auth info:", error);
    return null;
  }
}

/**
 * Check if user has a specific provider linked
 */
export async function hasProviderLinked(provider: string): Promise<boolean> {
  const userAuth = await getUserAuthInfo();
  return userAuth?.providers.some(p => p.provider === provider) || false;
}

/**
 * Get specific provider token
 */
export async function getProviderToken(provider: 'github' | 'google' | 'figma'): Promise<string | null> {
  console.log(`🔍 Getting ${provider} token from userAuth service...`);
  const userAuth = await getUserAuthInfo();
  
  if (!userAuth) {
    console.log(`❌ No userAuth info found`);
    return null;
  }
  
  const token = userAuth.tokens[`${provider}_token`];
  if (token) {
    console.log(`✅ Found ${provider} token in userAuth service`);
  } else {
    console.log(`❌ No ${provider} token found in userAuth service`);
    console.log(`Available tokens:`, Object.keys(userAuth.tokens));
    console.log(`Available providers:`, userAuth.providers.map(p => p.provider));
  }
  
  return token || null;
}
