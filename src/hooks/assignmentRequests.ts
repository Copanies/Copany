"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssignmentRequest } from "@/types/database.types";
import {
  listAssignmentRequestsAction,
  listAssignmentRequestsByCopanyAction,
  acceptAssignmentRequestAction,
  refuseAssignmentRequestAction,
} from "@/actions/assignmentRequest.actions";

function byIssueKey(issueId: string) {
  return ["assignmentRequests", "issue", issueId] as const;
}
function byCopanyKey(copanyId: string) {
  return ["assignmentRequests", "copany", copanyId] as const;
}

export function useAssignmentRequests(issueId: string) {
  return useQuery<AssignmentRequest[]>({
    queryKey: byIssueKey(issueId),
    queryFn: () => listAssignmentRequestsAction(issueId),
    enabled: /^\d+$/.test(String(issueId)),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 1 * 60 * 1000, // 1 minute 
  });
}

export function useAssignmentRequestsByCopany(copanyId: string) {
  return useQuery<AssignmentRequest[]>({
    queryKey: byCopanyKey(copanyId),
    queryFn: () => listAssignmentRequestsByCopanyAction(copanyId),
    enabled: !!copanyId,
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 1 * 60 * 1000, // 1 minute 
  });
}

export function useAcceptAssignmentRequest(issueId: string, copanyId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requesterId: string) =>
      acceptAssignmentRequestAction(issueId, requesterId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: byIssueKey(issueId) }),
        copanyId ? qc.invalidateQueries({ queryKey: byCopanyKey(copanyId) }) : Promise.resolve(),
      ]);
    },
  });
}

export function useRefuseAssignmentRequest(issueId: string, copanyId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requesterId: string) =>
      refuseAssignmentRequestAction(issueId, requesterId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: byIssueKey(issueId) }),
        copanyId ? qc.invalidateQueries({ queryKey: byCopanyKey(copanyId) }) : Promise.resolve(),
      ]);
    },
  });
}


