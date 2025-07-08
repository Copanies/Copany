import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { currentUserCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * 内部当前用户数据管理器实现
 */
class CurrentUserDataManager extends GenericDataManager<User> {
  constructor() {
    super({
      cacheManager: currentUserCache,
      managerName: "CurrentUserManager",
      enableStaleCache: false, // 用户数据敏感，不使用过期缓存
    });
  }

  protected getDataInfo(data: User): string {
    return `用户 ${data.email || data.id}`;
  }
}

// 创建单例实例
const currentUserDataManager = new CurrentUserDataManager();

/**
 * 获取当前用户的数据获取函数
 */
async function fetchCurrentUser(): Promise<User> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error fetching user:", error);
    throw new Error("Failed to fetch current user");
  }

  if (!user) {
    throw new Error("No user authenticated");
  }

  return user;
}

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
      const user = await currentUserDataManager.getData(
        "current_user",
        fetchCurrentUser
      );
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
    currentUserDataManager.clearCache("current_user");
  }

  /**
   * 手动设置用户（用于登录后立即缓存）
   */
  setUser(user: User): void {
    currentUserDataManager.setData("current_user", user);
  }

  /**
   * 获取缓存的用户（不会触发网络请求）
   */
  getCachedUser(): User | null {
    return currentUserDataManager.getCachedData("current_user");
  }
}

// 导出单例实例
export const currentUserManager = new CurrentUserManager();

// 导出推荐使用的数据管理器实例
export { currentUserDataManager };
