"use client";

import { useMemo } from "react";
import type { IssueWithAssignee } from "@/types/database.types";
import { useCurrentUser } from "./currentUser";
import { useCopany } from "./copany";

export function useIssuePermission(copanyId: string, issue: IssueWithAssignee | null) {
  const { data: currentUser } = useCurrentUser();
  const { data: copany } = useCopany(copanyId);

  return useMemo(() => {
    if (!issue || !currentUser || !copany) return false;
    
    const uid = currentUser.id;
    const ownerId = copany.created_by;
    
    if (!uid) return false;
    
    const isCreator = !!(issue.created_by && String(issue.created_by) === String(uid));
    const isAssignee = !!(issue.assignee && String(issue.assignee) === String(uid));
    const isOwner = !!(ownerId && String(ownerId) === String(uid));
    
    return isCreator || isAssignee || isOwner;
  }, [issue, currentUser, copany]);
}
