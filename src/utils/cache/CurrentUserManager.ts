import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { currentUserCache } from "./instances";

/**
 * 简化的当前用户管理器
 * 提供缓存和统一的用户获取接口
 */
export class CurrentUserManager {
  /**
   * 获取当前用户，优先从缓存获取
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // 首先尝试从缓存获取
      const cachedUser = currentUserCache.get("current_user");
      if (cachedUser) {
        return cachedUser;
      }

      // 缓存未命中，从 Supabase 获取
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error fetching user:", error);
        return null;
      }

      if (user) {
        // 缓存用户信息
        currentUserCache.set("current_user", user);
      }

      return user;
    } catch (error) {
      console.error("Exception fetching user:", error);
      return null;
    }
  }

  /**
   * 清除用户缓存（用于登出）
   */
  clearUser(): void {
    currentUserCache.clear("current_user");
  }

  /**
   * 手动设置用户（用于登录后立即缓存）
   */
  setUser(user: User): void {
    currentUserCache.set("current_user", user);
  }

  /**
   * 获取缓存的用户（不会触发网络请求）
   */
  getCachedUser(): User | null {
    return currentUserCache.get("current_user") || null;
  }
}

// 导出单例实例
export const currentUserManager = new CurrentUserManager();
