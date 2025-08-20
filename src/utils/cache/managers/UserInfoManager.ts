import { UserInfo } from "@/actions/user.actions";
import { getUserByIdAction } from "@/actions/user.actions";
import { userInfoCache } from "../instances";
import { GenericDataManager } from "../GenericDataManager";

class UserInfoDataManager extends GenericDataManager<UserInfo> {
  constructor(onDataUpdated?: (key: string, data: UserInfo) => void) {
    super({
      cacheManager: userInfoCache,
      managerName: "UserInfoManager",
      enableStaleCache: false,
      onDataUpdated,
    });
  }
  protected getDataInfo(data: UserInfo): string {
    return `User ${data.name} (${data.id})`;
  }
}

const userInfoDataManager = new UserInfoDataManager((key, data) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cache:updated", {
          detail: { manager: "UserInfoManager", key, data },
        })
      );
    }
  } catch (_) {}
});

export class UserInfoManager {
  async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      return await userInfoDataManager.getData(userId, async () => {
        const userInfo = await getUserByIdAction(userId);
        if (!userInfo) {
          throw new Error(`User not found: ${userId}`);
        }
        return userInfo;
      });
    } catch (error) {
      console.error("Error fetching user info:", error);
      return null;
    }
  }

  async getMultipleUserInfo(userIds: string[]): Promise<Record<string, UserInfo>> {
    const userInfoMap: Record<string, UserInfo> = {};
    
    // 并发获取所有用户信息
    const promises = userIds.map(async (userId) => {
      try {
        const userInfo = await this.getUserInfo(userId);
        if (userInfo) {
          userInfoMap[userId] = userInfo;
        }
      } catch (error) {
        console.error(`Error fetching user info for ${userId}:`, error);
      }
    });

    await Promise.all(promises);
    return userInfoMap;
  }

  setUserInfo(userId: string, userInfo: UserInfo): void {
    userInfoDataManager.setData(userId, userInfo);
  }

  clearUserInfo(userId: string): void {
    userInfoDataManager.clearCache(userId);
  }

  clearAllUserInfo(): void {
    userInfoDataManager.clearCache();
  }
}

export const userInfoManager = new UserInfoManager(); 