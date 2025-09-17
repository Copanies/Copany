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
    queryFn: () => getStarCountAction(copanyId),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: enableCountQuery,
    initialData: options?.countInitialData,
  });
  const flagQuery = useQuery<boolean>({
    queryKey: hasStarredKey(copanyId),
    queryFn: () => hasStarredAction(copanyId),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
  return { countQuery, flagQuery } as const;
}

export function useToggleStar(copanyId: string) {
  const qc = useQueryClient();
  const doStar = async () => {
    await starAction(copanyId);
  };
  const doUnstar = async () => {
    await unstarAction(copanyId);
  };

  return useMutation({
    mutationFn: async (target: { toStar: boolean }) => {
      if (target.toStar) return doStar();
      return doUnstar();
    },
    onMutate: async (vars) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: starCountKey(copanyId) }),
        qc.cancelQueries({ queryKey: hasStarredKey(copanyId) }),
        qc.cancelQueries({ queryKey: myStarredListKey() }),
      ]);
      const prevCount = qc.getQueryData<number>(starCountKey(copanyId)) ?? 0;
      const prevFlag = qc.getQueryData<boolean>(hasStarredKey(copanyId)) ?? false;
      const prevList = qc.getQueryData<string[]>(myStarredListKey()) ?? [];

      const nextCount = prevCount + (vars.toStar ? 1 : -1);
      const nextFlag = !!vars.toStar;
      const nextList = vars.toStar
        ? Array.from(new Set([...prevList, String(copanyId)]))
        : prevList.filter((id) => String(id) !== String(copanyId));

      qc.setQueryData(starCountKey(copanyId), Math.max(0, nextCount));
      qc.setQueryData(hasStarredKey(copanyId), nextFlag);
      qc.setQueryData(myStarredListKey(), nextList);

      return { prevCount, prevFlag, prevList } as const;
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      qc.setQueryData(starCountKey(copanyId), ctx.prevCount);
      qc.setQueryData(hasStarredKey(copanyId), ctx.prevFlag);
      qc.setQueryData(myStarredListKey(), ctx.prevList);
    },
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: starCountKey(copanyId) }),
        qc.invalidateQueries({ queryKey: hasStarredKey(copanyId) }),
        qc.invalidateQueries({ queryKey: myStarredListKey() }),
      ]);
    },
  });
}

export function useMyStarredCopanyIds() {
  return useQuery<string[]>({
    queryKey: myStarredListKey(),
    queryFn: () => listMyStarredCopanyIdsAction(),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}


