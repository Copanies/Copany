import type { AssignmentRequest } from "@/types/database.types";
import { GenericDataManager, type DataItemOperations } from "../GenericDataManager";
import { assignmentRequestsCache } from "../instances";

function validate(items: AssignmentRequest[]): AssignmentRequest[] {
  return items.filter(
    (r) => !!r && !!r.id && !!r.issue_id && !!r.requester_id && !!r.recipient_id && !!r.status
  );
}

const itemOps: DataItemOperations<AssignmentRequest[], AssignmentRequest> = {
  findItem: (items, id) => items.find((x) => String(x.id) === String(id)) || null,
  updateItem: (items, id, updated) => {
    const idx = items.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) return items;
    const next = [...items];
    next[idx] = updated;
    return next;
  },
  addItem: (items, item) =>
    items.some((x) => String(x.id) === String(item.id)) ? items : [...items, item],
  removeItem: (items, id) => items.filter((x) => String(x.id) !== String(id)),
};

class AssignmentRequestsDataManager extends GenericDataManager<AssignmentRequest[], AssignmentRequest> {
  constructor(onDataUpdated?: (key: string, data: AssignmentRequest[]) => void) {
    super(
      {
        cacheManager: assignmentRequestsCache,
        managerName: "AssignmentRequestsManager",
        validator: validate,
        enableStaleCache: true,
        onDataUpdated,
      },
      itemOps
    );
  }
  protected getDataInfo(data: AssignmentRequest[]): string {
    return `${data.length} assignment requests`;
  }
}

export class AssignmentRequestsManager {
  private manager: AssignmentRequestsDataManager;
  constructor(onDataUpdated?: (key: string, data: AssignmentRequest[]) => void) {
    this.manager = new AssignmentRequestsDataManager(onDataUpdated);
  }
  async getRequests(
    issueId: string,
    fetchFn: () => Promise<AssignmentRequest[]>,
    forceRefresh: boolean = false
  ): Promise<AssignmentRequest[]> {
    return this.manager.getData(issueId, fetchFn, forceRefresh);
  }
  setRequests(issueId: string, items: AssignmentRequest[]): void {
    this.manager.setData(issueId, items);
  }
  addRequest(issueId: string, item: AssignmentRequest): void {
    this.manager.addItem(issueId, item);
  }
  updateRequest(issueId: string, item: AssignmentRequest): void {
    this.manager.updateItem(issueId, String(item.id), item);
  }
  removeRequest(issueId: string, id: string): void {
    this.manager.removeItem(issueId, id);
  }
  clear(issueId?: string): void {
    this.manager.clearCache(issueId);
  }
}

export const assignmentRequestsManager = new AssignmentRequestsManager((key, data) => {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cache:updated", {
          detail: { manager: "AssignmentRequestsManager", key, data },
        })
      );
    }
  } catch (_) {}
});


