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

    // Get tokens from session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    const tokens: { github_token?: string; google_token?: string; figma_token?: string } = {};
    
    if (!sessionError && session?.provider_token) {
      // Check which providers user has linked
      const hasGitHub = providers.some(p => p.provider === 'github');
      const hasGoogle = providers.some(p => p.provider === 'google');
      const hasFigma = providers.some(p => p.provider === 'figma');
      
      // Count how many providers user has
      const providerCount = [hasGitHub, hasGoogle, hasFigma].filter(Boolean).length;
      
      if (providerCount === 1) {
        // If user only has one provider, always set that token
        if (hasGitHub) {
          tokens.github_token = session.provider_token;
        } else if (hasGoogle) {
          tokens.google_token = session.provider_token;
        } else if (hasFigma) {
          tokens.figma_token = session.provider_token;
        }
      } else if (providerCount > 1) {
        // If user has multiple providers, determine token based on most recent login
        const mostRecentProvider = providers.sort((a, b) => 
          new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime()
        )[0];
        
        if (mostRecentProvider?.provider === 'github') {
          tokens.github_token = session.provider_token;
        } else if (mostRecentProvider?.provider === 'google') {
          tokens.google_token = session.provider_token;
        } else if (mostRecentProvider?.provider === 'figma') {
          tokens.figma_token = session.provider_token;
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
