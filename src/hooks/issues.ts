// English comments per user rule
"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";
import { getIssuesAction, updateIssuePriorityAction, updateIssueLevelAction, updateIssueAssigneeAction, updateIssueStateAction } from "@/actions/issue.actions";
import type { IssueWithAssignee, IssuePriority, IssueLevel, IssueState } from "@/types/database.types";

function issuesKey(copanyId: string): QueryKey { return ["issues", copanyId]; }

export function useIssues(copanyId: string) {
  return useQuery<IssueWithAssignee[]>({
    queryKey: issuesKey(copanyId),
    queryFn: () => getIssuesAction(copanyId),
    staleTime: 30 * 24 * 60 * 60 * 1000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}

export function useIssue(copanyId: string, issueId: string) {
  const q = useIssues(copanyId);
  const issue = useMemo(() => {
    const list = q.data || [];
    return list.find((i) => String(i.id) === String(issueId)) || null;
  }, [q.data, issueId]);
  return { ...q, data: issue } as const;
}

export function useUpdateIssuePriority(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { issueId: string; priority: IssuePriority }) =>
      updateIssuePriorityAction(vars.issueId, vars.priority),
    onMutate: async ({ issueId, priority }) => {
      await qc.cancelQueries({ queryKey: issuesKey(copanyId) });
      const prev = qc.getQueryData<IssueWithAssignee[]>(issuesKey(copanyId));
      if (prev) {
        qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), prev.map((i) => i.id === issueId ? { ...i, priority } : i));
      }
      return { prev } as { prev?: IssueWithAssignee[] };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(issuesKey(copanyId), ctx.prev);
    },
    onSuccess: (serverIssue) => {
      qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), (prev) => {
        const base = prev || [];
        return base.map((i) => (i.id === serverIssue.id ? serverIssue : i));
      });
    },
  });
}

export function useUpdateIssueLevel(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { issueId: string; level: IssueLevel }) =>
      updateIssueLevelAction(vars.issueId, vars.level),
    onMutate: async ({ issueId, level }) => {
      await qc.cancelQueries({ queryKey: issuesKey(copanyId) });
      const prev = qc.getQueryData<IssueWithAssignee[]>(issuesKey(copanyId));
      if (prev) {
        qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), prev.map((i) => i.id === issueId ? { ...i, level } : i));
      }
      return { prev } as { prev?: IssueWithAssignee[] };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(issuesKey(copanyId), ctx.prev);
    },
    onSuccess: (serverIssue) => {
      qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), (prev) => {
        const base = prev || [];
        return base.map((i) => (i.id === serverIssue.id ? serverIssue : i));
      });
    },
  });
}

export function useUpdateIssueAssignee(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { issueId: string; assignee: string | null }) =>
      updateIssueAssigneeAction(vars.issueId, vars.assignee),
    onMutate: async ({ issueId, assignee }) => {
      await qc.cancelQueries({ queryKey: issuesKey(copanyId) });
      const prev = qc.getQueryData<IssueWithAssignee[]>(issuesKey(copanyId));
      if (prev) {
        qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), prev.map((i) => i.id === issueId ? { ...i, assignee } : i));
      }
      return { prev } as { prev?: IssueWithAssignee[] };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(issuesKey(copanyId), ctx.prev);
    },
    onSuccess: (serverIssue) => {
      qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), (prev) => {
        const base = prev || [];
        return base.map((i) => (i.id === serverIssue.id ? serverIssue : i));
      });
    },
  });
}

export function useUpdateIssueState(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { issueId: string; state: IssueState }) =>
      updateIssueStateAction(vars.issueId, vars.state),
    onMutate: async ({ issueId, state }) => {
      await qc.cancelQueries({ queryKey: issuesKey(copanyId) });
      const prev = qc.getQueryData<IssueWithAssignee[]>(issuesKey(copanyId));
      if (prev) {
        qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), prev.map((i) => i.id === issueId ? { ...i, state } : i));
      }
      return { prev } as { prev?: IssueWithAssignee[] };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(issuesKey(copanyId), ctx.prev);
    },
    onSuccess: (serverIssue) => {
      qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), (prev) => {
        const base = prev || [];
        return base.map((i) => (i.id === serverIssue.id ? serverIssue : i));
      });
    },
  });
}


