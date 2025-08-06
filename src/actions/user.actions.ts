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
      name: userData.user.user_metadata?.name || userData.user.email || "Unknown User",
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
            name: userData.user.user_metadata?.name || userData.user.email || "Unknown User",
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