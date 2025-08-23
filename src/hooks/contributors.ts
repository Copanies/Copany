"use client";

// English comments
import { useQuery } from "@tanstack/react-query";
import type { CopanyContributor } from "@/types/database.types";
import { getCopanyContributorsAction } from "@/actions/copanyContributor.actions";

function key(copanyId: string) {
  return ["contributors", copanyId] as const;
}

export function useContributors(copanyId: string) {
  return useQuery<CopanyContributor[]>({
    queryKey: key(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/contributors?copanyId=${encodeURIComponent(copanyId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.contributors as CopanyContributor[];
      } catch {
        return await getCopanyContributorsAction(copanyId);
      }
    },
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 1 * 60 * 1000, // 1 minute 
  });
}


