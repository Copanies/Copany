import { createClient } from "@/utils/supabase/client";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

export class UserService {
  static async getUserById(userId: string): Promise<UserInfo | null> {
    try {
      const supabase = createClient();
      
      // 使用 RPC 函数或直接查询用户表来获取用户信息
      // 注意：这里我们只能获取公开的用户信息，不能使用 admin API
      const { data: userData, error: userError } = await supabase
        .from('copany_contributor')
        .select('name, email, avatar_url')
        .eq('user_id', userId)
        .single();
      
      if (userError || !userData) {
        console.error(`Error fetching user info for ${userId}:`, userError);
        return null;
      }

      return {
        id: userId,
        name: userData.name || "Unknown User",
        email: userData.email || "",
        avatar_url: userData.avatar_url || "",
      };
    } catch (error) {
      console.error(`Error fetching user info for ${userId}:`, error);
      return null;
    }
  }

  static async getUsersByIds(userIds: string[]): Promise<Record<string, UserInfo>> {
    const users: Record<string, UserInfo> = {};
    
    if (userIds.length === 0) {
      return users;
    }

    try {
      const supabase = createClient();
      
      // 批量查询用户信息
      const { data: userDataList, error: userError } = await supabase
        .from('copany_contributor')
        .select('user_id, name, email, avatar_url')
        .in('user_id', userIds);
      
      if (userError) {
        console.error(`Error fetching users info:`, userError);
        return users;
      }

      // 将查询结果转换为 Record 格式
      userDataList?.forEach((userData) => {
        users[userData.user_id] = {
          id: userData.user_id,
          name: userData.name || "Unknown User",
          email: userData.email || "",
          avatar_url: userData.avatar_url || "",
        };
      });

      return users;
    } catch (error) {
      console.error(`Error fetching users info:`, error);
      return users;
    }
  }
} 