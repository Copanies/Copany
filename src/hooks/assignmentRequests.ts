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
    queryFn: async () => {
      try {
        const res = await fetch(`/api/assignment-requests?issueId=${encodeURIComponent(issueId)}&type=byIssue`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.items as AssignmentRequest[];
      } catch {
        return await listAssignmentRequestsAction(issueId);
      }
    },
    enabled: /^\d+$/.test(String(issueId)),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

export function useAssignmentRequestsByCopany(copanyId: string) {
  return useQuery<AssignmentRequest[]>({
    queryKey: byCopanyKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/assignment-requests?copanyId=${encodeURIComponent(copanyId)}&type=byCopany`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.items as AssignmentRequest[];
      } catch {
        return await listAssignmentRequestsByCopanyAction(copanyId);
      }
    },
    enabled: !!copanyId,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
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


