"use client";

import { useQuery } from "@tanstack/react-query";
import type { IssueActivity, Contribution } from "@/types/database.types";
import { listIssueActivityAction } from "@/actions/issueActivity.actions";
import { generateContributionsFromIssuesAction } from "@/actions/contribution.actions";

export function useIssueActivity(issueId: string, limit = 200) {
  return useQuery<IssueActivity[]>({
    queryKey: ["issueActivity", issueId, limit],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/issue-activity?issueId=${encodeURIComponent(issueId)}&limit=${limit}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.items as IssueActivity[];
      } catch {
        return await listIssueActivityAction(issueId, limit);
      }
    },
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function useContributions(copanyId: string) {
  return useQuery<Contribution[]>({
    queryKey: ["contributions", copanyId],
    queryFn: () => generateContributionsFromIssuesAction(copanyId),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}


