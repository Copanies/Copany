"use server";

import { createAdminSupabaseClient } from "@/utils/supabase/server";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
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
      name: userData.user.user_metadata?.user_name || userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || userData.user.email || "Unknown User",
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
            name: userData.user.user_metadata?.user_name || userData.user.user_metadata?.name || userData.user.user_metadata?.full_name || userData.user.email || "Unknown User",
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