"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStarCountAction,
  hasStarredAction,
  listMyStarredCopanyIdsAction,
  starAction,
  unstarAction,
} from "@/actions/star.actions";

export function starCountKey(copanyId: string) {
  return ["starCount", copanyId] as const;
}
function hasStarredKey(copanyId: string) {
  return ["hasStarred", copanyId] as const;
}
function myStarredListKey() {
  return ["myStarredCopanyIds"] as const;
}

export function useStarState(
  copanyId: string,
  options?: { countInitialData?: number; enableCountQuery?: boolean }
) {
  const enableCountQuery = options?.enableCountQuery ?? true;
  const countQuery = useQuery<number>({
    queryKey: starCountKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stars?copanyId=${encodeURIComponent(copanyId)}&type=count`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.count as number;
      } catch {
        return await getStarCountAction(copanyId);
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: enableCountQuery,
    initialData: options?.countInitialData,
  });
  const flagQuery = useQuery<boolean>({
    queryKey: hasStarredKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stars?copanyId=${encodeURIComponent(copanyId)}&type=hasStarred`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.hasStarred as boolean;
      } catch {
        return await hasStarredAction(copanyId);
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
  return { countQuery, flagQuery } as const;
}

export function useToggleStar(copanyId: string) {
  const qc = useQueryClient();
  const doStar = async () => {
    console.log("[useToggleStar] Calling starAction for:", copanyId);
    const result = await starAction(copanyId);
    console.log("[useToggleStar] starAction result:", result);
    return result;
  };
  const doUnstar = async () => {
    console.log("[useToggleStar] Calling unstarAction for:", copanyId);
    const result = await unstarAction(copanyId);
    console.log("[useToggleStar] unstarAction result:", result);
    return result;
  };

  return useMutation({
    mutationFn: async (target: { toStar: boolean }) => {
      console.log("[useToggleStar] mutationFn called:", target);
      if (target.toStar) return doStar();
      return doUnstar();
    },
    onMutate: async (vars) => {
      console.log("[useToggleStar] onMutate called:", vars);
      
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await Promise.all([
        qc.cancelQueries({ queryKey: starCountKey(copanyId) }),
        qc.cancelQueries({ queryKey: hasStarredKey(copanyId) }),
        qc.cancelQueries({ queryKey: myStarredListKey() }),
      ]);
      
      // Snapshot the previous values
      const prevCount = qc.getQueryData<number>(starCountKey(copanyId)) ?? 0;
      const prevFlag = qc.getQueryData<boolean>(hasStarredKey(copanyId)) ?? false;
      const prevListRaw = qc.getQueryData<string[]>(myStarredListKey());
      
      // Ensure prevList is always an array
      const prevList = Array.isArray(prevListRaw) ? prevListRaw : [];

      console.log("[useToggleStar] Previous state:", { 
        prevCount, 
        prevFlag, 
        prevListLength: prevList.length,
        prevListType: typeof prevListRaw,
        isArray: Array.isArray(prevListRaw)
      });

      // Optimistically update to the new values
      const nextCount = prevCount + (vars.toStar ? 1 : -1);
      const nextFlag = !!vars.toStar;
      const nextList = vars.toStar
        ? Array.from(new Set([...prevList, String(copanyId)]))
        : prevList.filter((id) => String(id) !== String(copanyId));

      console.log("[useToggleStar] New state:", { nextCount, nextFlag, nextListLength: nextList.length });

      // Apply optimistic updates
      qc.setQueryData(starCountKey(copanyId), Math.max(0, nextCount));
      qc.setQueryData(hasStarredKey(copanyId), nextFlag);
      qc.setQueryData(myStarredListKey(), nextList);

      console.log("[useToggleStar] Optimistic update applied");

      return { prevCount, prevFlag, prevList } as const;
    },
    onError: (err, _vars, ctx) => {
      console.error("[useToggleStar] Error occurred:", err);
      if (!ctx) {
        console.log("[useToggleStar] No context to rollback");
        return;
      }
      
      // Roll back to previous state on error
      console.log("[useToggleStar] Rolling back to previous state:", {
        prevCount: ctx.prevCount,
        prevFlag: ctx.prevFlag,
        prevListLength: Array.isArray(ctx.prevList) ? ctx.prevList.length : 0
      });
      
      qc.setQueryData(starCountKey(copanyId), ctx.prevCount);
      qc.setQueryData(hasStarredKey(copanyId), ctx.prevFlag);
      qc.setQueryData(myStarredListKey(), Array.isArray(ctx.prevList) ? ctx.prevList : []);
    },
    onSettled: async () => {
      console.log("[useToggleStar] onSettled - Invalidating queries");
      
      // Always refetch after error or success to ensure we have the latest data
      await Promise.all([
        qc.invalidateQueries({ queryKey: starCountKey(copanyId) }),
        qc.invalidateQueries({ queryKey: hasStarredKey(copanyId) }),
        qc.invalidateQueries({ queryKey: myStarredListKey() }),
      ]);
      
      console.log("[useToggleStar] Queries invalidated");
    },
  });
}

export function useMyStarredCopanyIds() {
  return useQuery<string[]>({
    queryKey: myStarredListKey(),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/stars?type=myStarredList`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return Array.isArray(json.ids) ? json.ids : [];
      } catch {
        const result = await listMyStarredCopanyIdsAction();
        return Array.isArray(result) ? result : [];
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    initialData: [], // Ensure initial data is always an empty array
  });
}


