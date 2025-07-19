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
    throw new Error("Failed to fetch current user");
  }
  if (!user) {
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
