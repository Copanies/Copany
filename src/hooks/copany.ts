"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Copany } from "@/types/database.types";
import { getCopanyByIdAction, updateCopanyAction, createCopanyAction, getCopaniesAction,  getCopaniesWhereUserIsContributorAction, getCopaniesByIdsAction } from "@/actions/copany.actions";
import { listMyStarredCopanyIdsAction } from "@/actions/star.actions";

function copanyKey(copanyId: string) { return ["copany", copanyId] as const; }
function copaniesKey() { return ["copanies"] as const; }
function copaniesWhereUserIsContributorKey(userId: string) { return ["copanies", userId] as const; }
function myStarredCopanyIdsKey() { return ["myStarredCopanyIds"] as const; }

export function useCopany(
  copanyId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<Copany | null>({
    queryKey: copanyKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/copany?id=${encodeURIComponent(copanyId)}&type=single`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.copany as Copany | null;
      } catch {
        return await getCopanyByIdAction(copanyId);
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled ?? true,
  });
}

export function useCopanies() {
  return useQuery<Copany[]>({
    queryKey: copaniesKey(),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/copany?type=list`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.copanies as Copany[];
      } catch {
        return await getCopaniesAction();
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCopaniesWhereUserIsContributor(userId: string) {
  return useQuery<Copany[]>({
    queryKey: copaniesWhereUserIsContributorKey(userId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/copany?userId=${encodeURIComponent(userId)}&type=userContributor`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.copanies as Copany[];
      } catch {
        return await getCopaniesWhereUserIsContributorAction(userId);
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

export function useMyStarredCopanies() {
  return useQuery<{ ids: string[] }>({
    queryKey: myStarredCopanyIdsKey(),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/copany?type=starred`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return { ids: json.ids as string[] };
      } catch {
        return { ids: await listMyStarredCopanyIdsAction() };
      }
    },
    staleTime: 1 * 60 * 1000,
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

export function useCopaniesByIds(ids: string[]) {
  return useQuery<Record<string, Copany>>({
    queryKey: ["copaniesByIds", ids.sort().join(",")],
    queryFn: async () => {
      try {
        const params = ids.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
        const res = await fetch(`/api/copany?${params}&type=byIds`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return (json.map as Record<string, Copany>) || {};
      } catch {
        return await getCopaniesByIdsAction(ids);
      }
    },
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}


