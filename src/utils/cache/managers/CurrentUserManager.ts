import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { currentUserCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

class CurrentUserDataManager extends GenericDataManager<User> {
  constructor() {
    super({
      cacheManager: currentUserCache,
      managerName: "CurrentUserManager",
      enableStaleCache: false,
    });
  }
  protected getDataInfo(data: User): string {
    return `User ${data.email || data.id}`;
  }
}

const currentUserDataManager = new CurrentUserDataManager();

async function fetchCurrentUser(): Promise<User> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  
  if (error) {
    console.error("Error fetching user:", error);
    // 如果是认证会话缺失的错误，这是正常的（用户未登录）
    if (error.message?.includes("Auth session missing")) {
      console.log("ℹ️ User not logged in (session missing)");
      throw new Error("No user authenticated");
    }
    // 其他错误仍然抛出
    throw new Error("Failed to fetch current user");
  }
  
  if (!user) {
    console.log("ℹ️ No user authenticated");
    throw new Error("No user authenticated");
  }
  
  return user;
}

export class CurrentUserManager {
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await currentUserDataManager.getData(
        "current_user",
        fetchCurrentUser
      );
      return user;
    } catch (error) {
      console.error("Exception fetching user:", error);
      // 如果是 "No user authenticated" 错误，这是正常的，返回 null
      if (error instanceof Error && error.message === "No user authenticated") {
        return null;
      }
      // 其他错误也返回 null，避免应用崩溃
      return null;
    }
  }
  
  clearUser(): void {
    currentUserDataManager.clearCache("current_user");
  }
  
  setUser(user: User): void {
    currentUserDataManager.setData("current_user", user);
  }
}

export const currentUserManager = new CurrentUserManager();
