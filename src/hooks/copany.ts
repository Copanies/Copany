"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Copany } from "@/types/database.types";
import { getCopanyByIdAction, updateCopanyAction, createCopanyAction, getCopaniesAction } from "@/actions/copany.actions";
import { listMyStarredCopanyIdsAction } from "@/actions/star.actions";

function copanyKey(copanyId: string) { return ["copany", copanyId] as const; }
function copaniesKey() { return ["copanies"] as const; }
function myStarredCopanyIdsKey() { return ["myStarredCopanyIds"] as const; }

export function useCopany(
  copanyId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<Copany | null>({
    queryKey: copanyKey(copanyId),
    queryFn: () => getCopanyByIdAction(copanyId),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled ?? true,
  });
}

export function useCopanies() {
  return useQuery<Copany[]>({
    queryKey: copaniesKey(),
    queryFn: () => getCopaniesAction(),
    staleTime:  30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

export function useMyStarredCopanies() {
  return useQuery<{ ids: string[] }>({
    queryKey: myStarredCopanyIdsKey(),
    queryFn: async () => ({ ids: await listMyStarredCopanyIdsAction() }),
    staleTime:  30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateCopany(onSuccess?: (result: { success: boolean; copany?: Copany; error?: string }) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCopanyAction,
    onSuccess: (result) => {
      if (result.success && result.copany) {
        // 将新创建的 copany 添加到缓存中
        qc.setQueryData(copanyKey(result.copany.id), result.copany);
        
        // 刷新 copany 列表
        qc.invalidateQueries({ queryKey: copaniesKey() });
        
        // 调用成功回调
        onSuccess?.(result);
      }
    },
  });
}

export function useUpdateCopany(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Copany, "created_at" | "updated_at">) => updateCopanyAction(payload),
    onSuccess: (updated) => {
      qc.setQueryData<Copany | null>(copanyKey(copanyId), updated);
    },
  });
}


