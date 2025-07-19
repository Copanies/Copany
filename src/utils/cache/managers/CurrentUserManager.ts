import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { currentUserCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

/**
 * Internal current user data manager implementation
 */
class CurrentUserDataManager extends GenericDataManager<User> {
  constructor() {
    super({
      cacheManager: currentUserCache,
      managerName: "CurrentUserManager",
      enableStaleCache: false, // User data is sensitive, don't use stale cache
    });
  }

  protected getDataInfo(data: User): string {
    return `User ${data.email || data.id}`;
  }
}

// Create singleton instance
const currentUserDataManager = new CurrentUserDataManager();

/**
 * Get current user data fetching function
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
 * Simplified current user manager
 * Provides caching and unified user fetching interface
 */
export class CurrentUserManager {
  /**
   * Get current user, prioritize cache
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
   * Clear user cache (for logout)
   */
  clearUser(): void {
    currentUserDataManager.clearCache("current_user");
  }

  /**
   * Manually set user (for immediate caching after login)
   */
  setUser(user: User): void {
    currentUserDataManager.setData("current_user", user);
  }

  /**
   * Get cached user (won't trigger network request)
   */
  getCachedUser(): User | null {
    return currentUserDataManager.getCachedData("current_user");
  }
}

// Export singleton instance
export const currentUserManager = new CurrentUserManager();
