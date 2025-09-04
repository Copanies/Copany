"use client";

import { useQuery } from "@tanstack/react-query";
import type { IssueWithAssignee } from "@/types/database.types";
import { useCurrentUser } from "./currentUser";
import { useCopany } from "./copany";

export function useIssuePermission(copanyId: string, issue: IssueWithAssignee | null) {
  const { data: currentUser } = useCurrentUser();
  const { data: copany } = useCopany(copanyId);

  return useQuery({
    queryKey: ["issuePermission", copanyId, issue?.id],
    queryFn: async (): Promise<boolean> => {
      if (!issue || !currentUser) return false;
      
      const uid = currentUser.id;
      const ownerId = copany?.created_by;
      
      if (!uid) return false;
      
      const isCreator = !!(issue.created_by && String(issue.created_by) === String(uid));
      const isAssignee = !!(issue.assignee && String(issue.assignee) === String(uid));
      const isOwner = !!(ownerId && String(ownerId) === String(uid));
      
      return isCreator || isAssignee || isOwner;
    },
    enabled: !!copanyId && !!issue && !!currentUser && !!copany,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
