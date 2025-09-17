"use server";

import { createSupabaseClient, createAdminSupabaseClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

interface UserMetadataCache {
  userId: string;
  originalName: string;
  originalAvatarUrl: string;
  timestamp: number;
  providersCount: number; // Number of providers before linking
}

const CACHE_KEY_PREFIX = "user_metadata_protection_";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_EXPIRY_SECONDS = 300; // 5 minutes in seconds

/**
 * Save current user metadata to cache before linking new account
 */
export async function saveUserMetadataToCache(): Promise<boolean> {
  try {
    console.log("🛡️ Starting to save user metadata to cache...");
    
    const supabase = await createSupabaseClient();
    const adminSupabase = await createAdminSupabaseClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Failed to get current user:", userError);
      return false;
    }
    
    // Get detailed user info including identities
    const { data: userData, error: adminError } = await adminSupabase.auth.admin.getUserById(user.id);
    
    if (adminError || !userData.user) {
      console.error("❌ Failed to get user details:", adminError);
      return false;
    }
    
    const detailedUser = userData.user;
    const providersCount = detailedUser.identities?.length || 0;
    
    // Prepare metadata cache
    const metadataCache: UserMetadataCache = {
      userId: user.id,
      originalName: detailedUser.user_metadata?.user_name || 
      detailedUser.user_metadata?.name || 
      detailedUser.user_metadata?.full_name || 
      detailedUser.email || 
      'Unknown User',
      originalAvatarUrl: detailedUser.user_metadata?.avatar_url || 
                        detailedUser.user_metadata?.picture || '',
      timestamp: Date.now(),
      providersCount
    };
    
    // Save to cookies (since we're in server action)
    const cookieStore = await cookies();
    const cacheKey = `${CACHE_KEY_PREFIX}${user.id}`;
    
    cookieStore.set(cacheKey, JSON.stringify(metadataCache), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CACHE_EXPIRY_SECONDS,
    });
    
    console.log("✅ User metadata saved to cache:", {
      userId: user.id,
      originalName: metadataCache.originalName,
      hasAvatar: !!metadataCache.originalAvatarUrl,
      providersCount: metadataCache.providersCount
    });
    
    return true;
  } catch (error) {
    console.error("❌ Error saving user metadata to cache:", error);
    return false;
  }
}

/**
 * Restore user metadata from cache if needed
 */
export async function restoreUserMetadataFromCache(): Promise<boolean> {
  try {
    console.log("🔄 Starting to restore user metadata from cache...");
  console.log("🔍 Current timestamp:", Date.now());
    
    const supabase = await createSupabaseClient();
    const adminSupabase = await createAdminSupabaseClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Failed to get current user:", userError);
      return false;
    }
    
    // Get cached metadata
    const cookieStore = await cookies();
    const cacheKey = `${CACHE_KEY_PREFIX}${user.id}`;
    const cachedData = cookieStore.get(cacheKey)?.value;
    
    if (!cachedData) {
      console.log("ℹ️ No cached metadata found for user");
      console.log("🔍 Available cookies:", Object.keys(cookieStore.getAll()));
      return false;
    }
    
    console.log("✅ Found cached metadata for user");
    
    let metadataCache: UserMetadataCache;
    try {
      metadataCache = JSON.parse(cachedData);
    } catch (parseError) {
      console.error("❌ Failed to parse cached metadata:", parseError);
      return false;
    }
    
    // Check if cache is still valid
    const now = Date.now();
    if (now - metadataCache.timestamp > CACHE_EXPIRY) {
      console.log("⚠️ Cached metadata has expired");
      // Clean up expired cache
      cookieStore.delete(cacheKey);
      return false;
    }
    
    // Get current detailed user info
    const { data: userData, error: adminError } = await adminSupabase.auth.admin.getUserById(user.id);
    
    if (adminError || !userData.user) {
      console.error("❌ Failed to get current user details:", adminError);
      return false;
    }
    
    const currentUser = userData.user;
    const currentProvidersCount = currentUser.identities?.length || 0;
    
    // Check if user just linked a new provider
    const hasNewProvider = currentProvidersCount > metadataCache.providersCount;
    
    if (!hasNewProvider) {
      console.log("ℹ️ No new provider detected, no need to restore metadata");
      // Clean up cache
      cookieStore.delete(cacheKey);
      return false;
    }
    
    console.log("🔍 New provider detected, checking if restoration is needed...");
    console.log("Previous providers:", metadataCache.providersCount, "Current providers:", currentProvidersCount);
    console.log("📋 Cached metadata:", {
      originalName: metadataCache.originalName,
      originalAvatarUrl: metadataCache.originalAvatarUrl,
      timestamp: new Date(metadataCache.timestamp).toISOString()
    });
    
    // Check if name or avatar was changed by the new provider
    const currentName = currentUser.user_metadata?.full_name || 
                       currentUser.user_metadata?.name || 
                       currentUser.email || 
                       'Unknown User';
    const currentAvatarUrl = currentUser.user_metadata?.avatar_url || 
                            currentUser.user_metadata?.picture || '';
    
    console.log("📊 Current vs Original comparison:", {
      currentName,
      originalName: metadataCache.originalName,
      currentAvatarUrl,
      originalAvatarUrl: metadataCache.originalAvatarUrl
    });
    
    let needsRestore = false;
    const updateData: Record<string, string> = {};
    
    // Check if name changed and should be restored
    if (currentName !== metadataCache.originalName && metadataCache.originalName) {
      needsRestore = true;
      updateData.full_name = metadataCache.originalName;
      updateData.name = metadataCache.originalName;
      console.log("📝 Name will be restored:", metadataCache.originalName);
    }
    
    // Check if avatar changed and should be restored
    if (currentAvatarUrl !== metadataCache.originalAvatarUrl && metadataCache.originalAvatarUrl) {
      needsRestore = true;
      updateData.avatar_url = metadataCache.originalAvatarUrl;
      updateData.picture = metadataCache.originalAvatarUrl;
      console.log("🖼️ Avatar will be restored:", metadataCache.originalAvatarUrl);
    }
    
    if (!needsRestore) {
      console.log("✅ No restoration needed, metadata unchanged");
      // Clean up cache
      cookieStore.delete(cacheKey);
      return true;
    }
    
    // Restore the original metadata
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...currentUser.user_metadata,
          ...updateData
        }
      }
    );
    
    if (updateError) {
      console.error("❌ Failed to restore user metadata:", updateError);
      return false;
    }
    
    console.log("✅ User metadata successfully restored");
    
    // Clean up cache after successful restoration
    cookieStore.delete(cacheKey);
    
    return true;
  } catch (error) {
    console.error("❌ Error restoring user metadata from cache:", error);
    return false;
  }
}

/**
 * Clean up expired metadata cache entries
 */
export async function cleanupExpiredMetadataCache(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    for (const cookie of allCookies) {
      if (cookie.name.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cacheData = JSON.parse(cookie.value);
          const now = Date.now();
          
          if (now - cacheData.timestamp > CACHE_EXPIRY) {
            cookieStore.delete(cookie.name);
            console.log("🧹 Cleaned up expired cache:", cookie.name);
          }
        } catch (_error) {
          // If we can't parse the cache data, delete it
          cookieStore.delete(cookie.name);
          console.log("🧹 Cleaned up invalid cache:", cookie.name);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error cleaning up metadata cache:", error);
  }
}
