"use server";

import { UserService } from "@/services/user.service";
import { createAdminSupabaseClient } from "@/utils/supabase/server";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface UserProviderInfo {
  provider: string;
  id: string;
  created_at: string;
  last_sign_in_at: string;
  email?: string;
  user_name?: string;
  avatar_url?: string;
}

export async function getUserByIdAction(userId: string): Promise<UserInfo | null> {
  try {
    const adminSupabase = await createAdminSupabaseClient();
    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error(`Error fetching user info for ${userId}:`, userError);
      return null;
    }

    return {
      id: userData.user.id,
      name: userData.user.user_metadata?.user_name || userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || userData.user.email || "",
      email: userData.user.email || "",
      avatar_url: userData.user.user_metadata?.avatar_url || "",
    };
  } catch (error) {
    console.error(`Error fetching user info for ${userId}:`, error);
    return null;
  }
}

export async function getUsersByIdsAction(userIds: string[]): Promise<Record<string, UserInfo>> {
  const users: Record<string, UserInfo> = {};
  
  if (userIds.length === 0) {
    return users;
  }

  try {
    const adminSupabase = await createAdminSupabaseClient();
    
    // 批量获取用户信息
    for (const userId of userIds) {
      try {
        const { data: userData, error: userError } =
          await adminSupabase.auth.admin.getUserById(userId);
        
        if (!userError && userData.user) {
          users[userId] = {
            id: userData.user.id,
            name: userData.user.user_metadata?.user_name || userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || userData.user.email || "",
            email: userData.user.email || "",
            avatar_url: userData.user.user_metadata?.avatar_url || "",
          };
        }
      } catch (error) {
        console.error(`Error fetching user info for ${userId}:`, error);
      }
    }

    return users;
  } catch (error) {
    console.error(`Error fetching users info:`, error);
    return users;
  }
}

export async function getUsersByIdsWithCacheAction(userIds: string[]): Promise<Record<string, UserInfo>> {
  // 这个函数将在客户端使用缓存管理器，所以这里保持原有的实现
  // 客户端会直接调用 userInfoManager.getMultipleUserInfo()
  return getUsersByIdsAction(userIds);
}

export async function updateUserNameAction(userId: string, newName: string) {
  return await UserService.updateUserName(userId, newName);
}

/**
 * Get user provider information (GitHub, Discord, etc.)
 * Returns publicly available provider info without sensitive tokens
 */
export async function getUserProvidersAction(userId: string): Promise<UserProviderInfo[]> {
  try {
    const adminSupabase = await createAdminSupabaseClient();
    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.getUserById(userId);
    
    if (userError || !userData.user) {
      console.error(`Error fetching user providers for ${userId}:`, userError);
      return [];
    }

    // Extract provider information from identities
    const providers: UserProviderInfo[] = userData.user.identities?.map(identity => ({
      provider: identity.provider || 'unknown',
      id: identity.id || '',
      created_at: identity.created_at || '',
      last_sign_in_at: identity.last_sign_in_at || '',
      email: identity.identity_data?.email || identity.identity_data?.login || '',
      user_name: identity.identity_data?.user_name || identity.identity_data?.name || identity.identity_data?.full_name || '',
      avatar_url: identity.identity_data?.avatar_url || ''
    })) || [];

    return providers;
  } catch (error) {
    console.error(`Error fetching user providers for ${userId}:`, error);
    return [];
  }
} 