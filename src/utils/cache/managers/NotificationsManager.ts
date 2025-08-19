import { Notification } from "@/types/database.types";
import { notificationsCache } from "../instances";
import { GenericDataManager, DataItemOperations } from "../GenericDataManager";

function validateNotifications(list: Notification[]): Notification[] {
  return list.filter((n) => {
    if (!n || !n.id || !n.created_at) {
      console.warn(`[NotificationsManager] ⚠️ Invalid notification record:`, n);
      return false;
    }
    return true;
  });
}

const notificationItemOps: DataItemOperations<Notification[], Notification> = {
  findItem: (arr: Notification[], id: string) => {
    return arr.find((n) => String(n.id) === String(id)) || null;
  },
  updateItem: (arr: Notification[], _id: string, updated: Notification) => {
    const idx = arr.findIndex((n) => String(n.id) === String(updated.id));
    if (idx === -1) return arr;
    const next = [...arr];
    next[idx] = updated;
    return next;
  },
  addItem: (arr: Notification[], item: Notification) => {
    if (arr.some((n) => String(n.id) === String(item.id))) return arr;
    return [item, ...arr];
  },
  removeItem: (arr: Notification[], id: string) => {
    return arr.filter((n) => String(n.id) !== String(id));
  },
};

class NotificationsDataManager extends GenericDataManager<Notification[], Notification> {
  constructor(onDataUpdated?: (key: string, data: Notification[]) => void) {
    super(
      {
        cacheManager: notificationsCache,
        managerName: "NotificationsManager",
        validator: validateNotifications,
        enableStaleCache: true,
        onDataUpdated,
      },
      notificationItemOps
    );
  }

  protected getDataInfo(data: Notification[]): string {
    const unread = data.filter((n) => !n.is_read && !n.read_at).length;
    return `${data.length} notifications (${unread} unread)`;
  }
}

export class NotificationsManager {
  private dataManager: NotificationsDataManager;

  constructor(onDataUpdated?: (key: string, data: Notification[]) => void) {
    this.dataManager = new NotificationsDataManager(onDataUpdated);
  }

  async getNotifications(
    key: string,
    fetchFn: () => Promise<Notification[]>
  ): Promise<Notification[]> {
    return this.dataManager.getData(key, fetchFn);
  }

  setNotifications(key: string, list: Notification[]): void {
    this.dataManager.setData(key, list);
  }

  updateNotification(key: string, notification: Notification): void {
    this.dataManager.updateItem(key, String(notification.id), notification);
  }

  addNotification(key: string, notification: Notification): void {
    this.dataManager.addItem(key, notification);
  }

  removeNotification(key: string, id: string): void {
    this.dataManager.removeItem(key, id);
  }

  clear(key?: string): void {
    this.dataManager.clearCache(key);
  }
}

export const notificationsManager = new NotificationsManager((key, data) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cache:updated", {
          detail: { manager: "NotificationsManager", key, data },
        })
      );
    }
  } catch (_) {}
});

