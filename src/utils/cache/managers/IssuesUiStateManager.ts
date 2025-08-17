import { IssueState } from "@/types/database.types";
import { issuesUiStateCache } from "../instances";

export type CollapsedGroupsState = Record<number, boolean>;

const defaultCollapsedState: CollapsedGroupsState = {
  [IssueState.Done]: true,
  [IssueState.Canceled]: true,
  [IssueState.Duplicate]: true,
};

export class IssuesUiStateManager {
  getCollapsedGroups(copanyId: string): CollapsedGroupsState {
    const saved = issuesUiStateCache.get(copanyId);
    if (saved && typeof saved === "object") {
      return { ...defaultCollapsedState, ...saved };
    }

    // Legacy migration: fallback to old localStorage key if present
    if (typeof window !== "undefined") {
      try {
        const legacyKey = `issues_collapsed_groups_${copanyId}`;
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (parsed && typeof parsed === "object") {
            const mergedFromLegacy = {
              ...defaultCollapsedState,
              ...parsed,
            } as CollapsedGroupsState;
            issuesUiStateCache.set(copanyId, mergedFromLegacy);
            return mergedFromLegacy;
          }
        }
      } catch (_) {
        // ignore
      }
    }
    return { ...defaultCollapsedState };
  }

  setCollapsedGroups(copanyId: string, state: CollapsedGroupsState): void {
    // Persist merged with defaults to keep stable keys
    const merged: CollapsedGroupsState = { ...defaultCollapsedState, ...state };
    issuesUiStateCache.set(copanyId, merged);
  }

  clear(copanyId: string): void {
    issuesUiStateCache.clear(copanyId);
  }
}

export const issuesUiStateManager = new IssuesUiStateManager();


