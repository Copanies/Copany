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
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}


