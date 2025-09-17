"use client";

import { useQuery } from "@tanstack/react-query";
import type { IssueReviewer } from "@/types/database.types";
import { listIssueReviewersAction } from "@/actions/issueReviewer.actions";

export function useIssueReviewers(issueId: string) {
  return useQuery<IssueReviewer[]>({
    queryKey: ["issueReviewers", issueId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/issue-reviewers?issueId=${encodeURIComponent(issueId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.items as IssueReviewer[];
      } catch {
        return await listIssueReviewersAction(issueId);
      }
    },
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function useMultipleIssueReviewers(issueIds: string[]) {
  // Create a stable, order-insensitive, deduplicated key component
  const stableIds = Array.from(new Set(issueIds.map((id) => String(id)))).sort();
  return useQuery<Record<string, IssueReviewer[]>>({
    queryKey: ["multipleIssueReviewers", stableIds],
    queryFn: async () => {
      try {
        const results = await Promise.all(
          stableIds.map(async (id) => {
            try {
              const res = await fetch(`/api/issue-reviewers?issueId=${encodeURIComponent(id)}`);
              if (!res.ok) throw new Error("request failed");
              const json = await res.json();
              return [id, json.items as IssueReviewer[]] as const;
            } catch {
              const fallbackData = await listIssueReviewersAction(id);
              return [id, fallbackData] as const;
            }
          })
        );
        
        const result: Record<string, IssueReviewer[]> = {};
        for (const [id, reviewers] of results) {
          result[id] = reviewers;
        }
        return result;
      } catch (error) {
        console.error("Failed to fetch multiple issue reviewers:", error);
        return {};
      }
    },
    enabled: stableIds.length > 0,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}


