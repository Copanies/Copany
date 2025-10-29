"use client";

import { useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { Copany } from "@/types/database.types";
import type { PaginatedCopanies } from "@/services/copany.service";
import {
  hasStarredAction,
  listMyStarredCopanyIdsAction,
  starAction,
  unstarAction,
} from "@/actions/star.actions";
import { useCurrentUser } from "@/hooks/currentUser";

function copanyKey(copanyId: string) { return ["copany", copanyId] as const; }
function copaniesKey() { return ["copanies", "v2"] as const; }
function hasStarredKey(copanyId: string, userId: string) {
  return ["hasStarred", copanyId, userId] as const;
}
function myStarredListKey(userId: string) {
  return ["myStarredCopanyIds", userId] as const;
}

// Simplified hook: only check if current user has starred
export function useHasStarred(copanyId: string) {
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "anonymous";
  
  return useQuery<boolean>({
    queryKey: hasStarredKey(copanyId, userId),
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
    enabled: !!currentUser, // Only query when user is logged in
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

export function useToggleStar(copanyId: string) {
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "anonymous";
  
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
      
      // Cancel any outgoing refetches
      await Promise.all([
        qc.cancelQueries({ queryKey: hasStarredKey(copanyId, userId) }),
        qc.cancelQueries({ queryKey: myStarredListKey(userId) }),
        qc.cancelQueries({ queryKey: copanyKey(copanyId) }),
        qc.cancelQueries({ queryKey: copaniesKey() }),
      ]);
      
      // Snapshot the previous values
      const prevFlag = qc.getQueryData<boolean>(hasStarredKey(copanyId, userId)) ?? false;
      const prevListRaw = qc.getQueryData<string[]>(myStarredListKey(userId));
      const prevList = Array.isArray(prevListRaw) ? prevListRaw : [];

      // Snapshot copany data
      const prevCopany = qc.getQueryData<Copany | null>(copanyKey(copanyId));
      const prevCopanies = qc.getQueryData<InfiniteData<PaginatedCopanies>>(copaniesKey());

      console.log("[useToggleStar] Previous state:", { 
        prevFlag, 
        prevListLength: prevList.length,
        hasCopany: !!prevCopany,
        hasCopanies: !!prevCopanies,
      });

      // Optimistically update to the new values
      const nextFlag = !!vars.toStar;
      const nextList = vars.toStar
        ? Array.from(new Set([...prevList, String(copanyId)]))
        : prevList.filter((id) => String(id) !== String(copanyId));

      // Apply optimistic updates for hasStarred and myStarredList
      qc.setQueryData(hasStarredKey(copanyId, userId), nextFlag);
      qc.setQueryData(myStarredListKey(userId), nextList);

      // Update copany cache - single copany
      if (prevCopany) {
        qc.setQueryData<Copany | null>(copanyKey(copanyId), {
          ...prevCopany,
          star_count: Math.max(0, (prevCopany.star_count || 0) + (vars.toStar ? 1 : -1)),
        });
      }

      // Update copanies list cache
      if (prevCopanies) {
        const updatedPages = prevCopanies.pages.map((page) => ({
          ...page,
          copanies: page.copanies.map((copany) =>
            String(copany.id) === String(copanyId)
              ? {
                  ...copany,
                  star_count: Math.max(0, (copany.star_count || 0) + (vars.toStar ? 1 : -1)),
                }
              : copany
          ),
        }));
        qc.setQueryData<InfiniteData<PaginatedCopanies>>(copaniesKey(), {
          ...prevCopanies,
          pages: updatedPages,
        });
      }

      console.log("[useToggleStar] Optimistic update applied");

      return { prevFlag, prevList, prevCopany, prevCopanies } as const;
    },
    onError: (err, _vars, ctx) => {
      console.error("[useToggleStar] Error occurred:", err);
      if (!ctx) {
        console.log("[useToggleStar] No context to rollback");
        return;
      }
      
      // Roll back to previous state on error
      console.log("[useToggleStar] Rolling back to previous state:", {
        prevFlag: ctx.prevFlag,
        prevListLength: Array.isArray(ctx.prevList) ? ctx.prevList.length : 0,
        hasCopany: !!ctx.prevCopany,
        hasCopanies: !!ctx.prevCopanies,
      });
      
      qc.setQueryData(hasStarredKey(copanyId, userId), ctx.prevFlag);
      qc.setQueryData(myStarredListKey(userId), Array.isArray(ctx.prevList) ? ctx.prevList : []);
      
      // Rollback copany cache
      if (ctx.prevCopany !== undefined) {
        qc.setQueryData(copanyKey(copanyId), ctx.prevCopany);
      }
      if (ctx.prevCopanies !== undefined) {
        qc.setQueryData(copaniesKey(), ctx.prevCopanies);
      }
    },
    onSettled: async () => {
      console.log("[useToggleStar] onSettled - Invalidating queries");
      
      // Refetch to ensure we have the latest data
      await Promise.all([
        qc.invalidateQueries({ queryKey: hasStarredKey(copanyId, userId) }),
        qc.invalidateQueries({ queryKey: myStarredListKey(userId) }),
        qc.invalidateQueries({ queryKey: copanyKey(copanyId) }),
        qc.invalidateQueries({ queryKey: copaniesKey() }),
      ]);
      
      console.log("[useToggleStar] Queries invalidated");
    },
  });
}

export function useMyStarredCopanyIds() {
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "anonymous";
  
  return useQuery<string[]>({
    queryKey: myStarredListKey(userId),
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
    enabled: !!currentUser, // Only query when user is logged in
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    initialData: [], // Ensure initial data is always an empty array
  });
}


