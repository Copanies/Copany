"use client";

import { useQuery } from "@tanstack/react-query";
import type { Contribution } from "@/types/database.types";
import { generateContributionsFromIssuesAction } from "@/actions/contribution.actions";

export function useContributions(copanyId: string) {
  return useQuery<Contribution[]>({
    queryKey: ["contributions", copanyId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/contributions?copanyId=${encodeURIComponent(copanyId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.contributions as Contribution[];
      } catch {
        return await generateContributionsFromIssuesAction(copanyId);
      }
    },
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}