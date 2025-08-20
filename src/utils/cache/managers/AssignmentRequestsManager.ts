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
  // 维护 issueId -> copanyId 的内存映射，便于在只存一份 copany 级数据时对单个 issue 做增删改
  private issueToCopany = new Map<string, string>();
  constructor(onDataUpdated?: (key: string, data: AssignmentRequest[]) => void) {
    this.manager = new AssignmentRequestsDataManager(onDataUpdated);
  }
  /**
   * 生成按 copany 维度的缓存 key
   */
  private copanyKey(copanyId: string): string {
    return `copany:${copanyId}`;
  }
  /**
   * 向订阅方广播（不写入缓存）某个 issueId 的 AssignmentRequests 更新
   */
  private dispatchIssueUpdate(issueId: string, items: AssignmentRequest[]): void {
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cache:updated", {
            detail: { manager: "AssignmentRequestsManager", key: String(issueId), data: items },
          })
        );
      }
    } catch (_) {}
  }
  /**
   * 将列表中的 issueId->copanyId 建立映射
   */
  private indexIssueToCopany(items: AssignmentRequest[]): void {
    for (const it of items) {
      if (it && it.issue_id && it.copany_id) {
        this.issueToCopany.set(String(it.issue_id), String(it.copany_id));
      }
    }
  }
  async getRequests(
    issueId: string,
    fetchFn: () => Promise<AssignmentRequest[]>,
    forceRefresh: boolean = false
  ): Promise<AssignmentRequest[]> {
    // 仅存一份：如果 copany 级数据已存在且包含该 issue，则直接切片返回
    const knownCopanyId = this.issueToCopany.get(String(issueId));
    if (knownCopanyId) {
      const cached = this.manager.getCachedData(this.copanyKey(knownCopanyId));
      if (cached) {
        return cached.filter((x) => String(x.issue_id) === String(issueId));
      }
    }
    // 否则调用提供的 fetchFn 获取该 issue 的列表，并合并进对应 copany 的整包缓存
    const list = await fetchFn();
    // 建立映射并合并至 copany 级缓存
    this.indexIssueToCopany(list);
    const cid = list[0]?.copany_id ? String(list[0].copany_id) : null;
    if (cid) {
      const key = this.copanyKey(cid);
      const current = this.manager.getCachedData(key) || [];
      const merged = [...current.filter((x) => String(x.issue_id) !== String(issueId)), ...list];
      this.manager.setData(key, merged);
    }
    // 同时广播 issue 级更新，便于已订阅 issue 的视图即时联动
    this.dispatchIssueUpdate(issueId, list);
    return list;
  }
  /**
   * 按 copany 维度获取 AssignmentRequests（一次返回整个 copany 的列表），
   * 并自动将结果按 issue_id 分发写入各自的 issue 级缓存，触发相应的 UI 更新事件。
   */
  async getRequestsByCopany(
    copanyId: string,
    fetchFn: () => Promise<AssignmentRequest[]>,
    forceRefresh: boolean = false
  ): Promise<AssignmentRequest[]> {
    const key = this.copanyKey(copanyId);
    const list = await this.manager.getData(key, fetchFn, forceRefresh);
    // 建立映射并广播到各个 issue（不再存多份缓存）
    this.indexIssueToCopany(list);
    try {
      const byIssue: Record<string, AssignmentRequest[]> = {};
      for (const it of list) {
        const k = String(it.issue_id);
        if (!byIssue[k]) byIssue[k] = [];
        byIssue[k].push(it);
      }
      for (const [issueId, items] of Object.entries(byIssue)) {
        this.dispatchIssueUpdate(issueId, items);
      }
    } catch (_) {}
    return list;
  }
  setRequests(issueId: string, items: AssignmentRequest[]): void {
    // 根据 items 推断 copanyId，并合并更新 copany 级缓存；仅广播 issue 级
    const cid = items[0]?.copany_id ? String(items[0].copany_id) : this.issueToCopany.get(String(issueId));
    if (cid) {
      const key = this.copanyKey(cid);
      const current = this.manager.getCachedData(key) || [];
      const merged = [...current.filter((x) => String(x.issue_id) !== String(issueId)), ...items];
      this.indexIssueToCopany(items);
      this.manager.setData(key, merged);
    }
    this.dispatchIssueUpdate(issueId, items);
  }
  /**
   * 直接设置 copany 级数据，并自动分发写入 issue 级缓存。
   */
  setRequestsByCopany(copanyId: string, items: AssignmentRequest[]): void {
    const key = this.copanyKey(copanyId);
    this.manager.setData(key, items);
    this.indexIssueToCopany(items);
    try {
      const byIssue: Record<string, AssignmentRequest[]> = {};
      for (const it of items) {
        const k = String(it.issue_id);
        if (!byIssue[k]) byIssue[k] = [];
        byIssue[k].push(it);
      }
      for (const [issueId, list] of Object.entries(byIssue)) {
        this.dispatchIssueUpdate(issueId, list);
      }
    } catch (_) {}
  }
  addRequest(issueId: string, item: AssignmentRequest): void {
    const cid = item?.copany_id ? String(item.copany_id) : this.issueToCopany.get(String(issueId));
    if (!cid) return;
    const key = this.copanyKey(cid);
    const current = this.manager.getCachedData(key) || [];
    const exists = current.some((x) => String(x.id) === String(item.id));
    const merged = exists ? current : [...current, item];
    this.indexIssueToCopany([item]);
    this.manager.setData(key, merged);
    this.dispatchIssueUpdate(issueId, merged.filter((x) => String(x.issue_id) === String(issueId)));
  }
  updateRequest(issueId: string, item: AssignmentRequest): void {
    const cid = item?.copany_id ? String(item.copany_id) : this.issueToCopany.get(String(issueId));
    if (!cid) return;
    const key = this.copanyKey(cid);
    const current = this.manager.getCachedData(key) || [];
    const idx = current.findIndex((x) => String(x.id) === String(item.id));
    const merged = idx === -1 ? [...current, item] : Object.assign([...current], { [idx]: item });
    this.indexIssueToCopany([item]);
    this.manager.setData(key, merged as AssignmentRequest[]);
    this.dispatchIssueUpdate(issueId, (merged as AssignmentRequest[]).filter((x) => String(x.issue_id) === String(issueId)));
  }
  removeRequest(issueId: string, id: string): void {
    const cid = this.issueToCopany.get(String(issueId));
    if (!cid) return;
    const key = this.copanyKey(cid);
    const current = this.manager.getCachedData(key) || [];
    const merged = current.filter((x) => String(x.id) !== String(id));
    this.manager.setData(key, merged);
    this.dispatchIssueUpdate(issueId, merged.filter((x) => String(x.issue_id) === String(issueId)));
  }
  /**
   * 强制重新验证指定 issueId 的申请列表（例如发起/接受/拒绝后）
   */
  async revalidate(
    issueId: string,
    fetchFn?: () => Promise<AssignmentRequest[]>
  ): Promise<AssignmentRequest[] | null> {
    if (!fetchFn) return null;
    const list = await fetchFn();
    this.setRequests(issueId, list);
    return list;
  }
  /**
   * 重新验证 copany 级数据，并自动分发写入 issue 级缓存。
   */
  async revalidateByCopany(
    copanyId: string,
    fetchFn?: () => Promise<AssignmentRequest[]>
  ): Promise<AssignmentRequest[] | null> {
    const key = this.copanyKey(copanyId);
    const data = (await this.manager.revalidate(key, { background: false, fetchFn })) as
      | AssignmentRequest[]
      | null;
    if (data) {
      this.indexIssueToCopany(data);
      try {
        const byIssue: Record<string, AssignmentRequest[]> = {};
        for (const it of data) {
          const k = String(it.issue_id);
          if (!byIssue[k]) byIssue[k] = [];
          byIssue[k].push(it);
        }
        for (const [issueId, list] of Object.entries(byIssue)) {
          this.dispatchIssueUpdate(issueId, list);
        }
      } catch (_) {}
    }
    return data;
  }
  clear(issueId?: string): void {
    if (issueId) {
      const cid = this.issueToCopany.get(String(issueId));
      if (!cid) return;
      // 清理该 issue 的数据：从 copany 级数据中移除该 issue 的记录
      const key = this.copanyKey(cid);
      const current = this.manager.getCachedData(key) || [];
      const merged = current.filter((x) => String(x.issue_id) !== String(issueId));
      this.manager.setData(key, merged);
      this.dispatchIssueUpdate(issueId, []);
      return;
    }
    // 清理所有 copany 级缓存和映射
    this.manager.clearCache();
    this.issueToCopany.clear();
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


