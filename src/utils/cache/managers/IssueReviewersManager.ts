import type { IssueReviewer } from "@/types/database.types";
import { GenericDataManager, type DataItemOperations } from "../GenericDataManager";
import { issueReviewersCache } from "../instances";

function validateReviewers(items: IssueReviewer[]): IssueReviewer[] {
  return items.filter(
    (r) => !!r && !!r.id && !!r.issue_id && !!r.reviewer_id && !!r.status
  );
}

const reviewerItemOps: DataItemOperations<IssueReviewer[], IssueReviewer> = {
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

class IssueReviewersDataManager extends GenericDataManager<
  IssueReviewer[],
  IssueReviewer
> {
  constructor(onDataUpdated?: (key: string, data: IssueReviewer[]) => void) {
    super(
      {
        cacheManager: issueReviewersCache,
        managerName: "IssueReviewersManager",
        validator: validateReviewers,
        enableStaleCache: true,
        onDataUpdated,
      },
      reviewerItemOps
    );
  }
  protected getDataInfo(data: IssueReviewer[]): string {
    return `${data.length} reviewers`;
  }
}

export class IssueReviewersManager {
  private manager: IssueReviewersDataManager;
  constructor(onDataUpdated?: (key: string, data: IssueReviewer[]) => void) {
    this.manager = new IssueReviewersDataManager(onDataUpdated);
  }
  async getReviewers(
    issueId: string,
    fetchFn: () => Promise<IssueReviewer[]>,
    forceRefresh: boolean = false
  ): Promise<IssueReviewer[]> {
    return this.manager.getData(issueId, fetchFn, forceRefresh);
  }
  setReviewers(issueId: string, items: IssueReviewer[]): void {
    this.manager.setData(issueId, items);
  }
  addReviewer(issueId: string, item: IssueReviewer): void {
    this.manager.addItem(issueId, item);
  }
  updateReviewer(issueId: string, item: IssueReviewer): void {
    this.manager.updateItem(issueId, String(item.id), item);
  }
  removeReviewer(issueId: string, reviewerId: string): void {
    this.manager.removeItem(issueId, reviewerId);
  }
  clear(issueId?: string): void {
    this.manager.clearCache(issueId);
  }
}

export const issueReviewersManager = new IssueReviewersManager();


