import type { IssueActivity } from "@/types/database.types";
import { GenericDataManager, DataItemOperations } from "../GenericDataManager";
import { issueActivityCache } from "../instances";

function validateActivities(items: IssueActivity[]): IssueActivity[] {
  return items.filter((a) => !!a && !!a.id && !!a.issue_id && !!a.type);
}

const activityItemOps: DataItemOperations<IssueActivity[], IssueActivity> = {
  findItem: (items, id) => items.find((x) => String(x.id) === String(id)) || null,
  updateItem: (items, id, updated) => {
    const idx = items.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) return items;
    const next = [...items];
    next[idx] = updated;
    return next;
  },
  addItem: (items, item) => (items.some((x) => String(x.id) === String(item.id)) ? items : [...items, item]),
  removeItem: (items, id) => items.filter((x) => String(x.id) !== String(id)),
};

class IssueActivityDataManager extends GenericDataManager<IssueActivity[], IssueActivity> {
  constructor(onDataUpdated?: (key: string, data: IssueActivity[]) => void) {
    super(
      {
        cacheManager: issueActivityCache,
        managerName: "IssueActivityManager",
        validator: validateActivities,
        enableStaleCache: true,
        onDataUpdated,
      },
      activityItemOps
    );
  }
  protected getDataInfo(data: IssueActivity[]): string {
    return `${data.length} activities`;
  }
}

export class IssueActivityManager {
  private manager: IssueActivityDataManager;
  constructor(onDataUpdated?: (key: string, data: IssueActivity[]) => void) {
    this.manager = new IssueActivityDataManager(onDataUpdated);
  }
  async getActivities(issueId: string, fetchFn: () => Promise<IssueActivity[]>): Promise<IssueActivity[]> {
    return this.manager.getData(issueId, fetchFn);
  }
  setActivities(issueId: string, items: IssueActivity[]): void {
    this.manager.setData(issueId, items);
  }
  addActivity(issueId: string, item: IssueActivity): void {
    this.manager.addItem(issueId, item);
  }
  clear(issueId: string): void {
    this.manager.clearCache(issueId);
  }
}

export const issueActivityManager = new IssueActivityManager((key, data) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cache:updated", {
          detail: { manager: "IssueActivityManager", key, data },
        })
      );
    }
  } catch (_) {}
});

