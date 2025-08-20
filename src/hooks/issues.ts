// English comments per user rule
"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient, QueryKey } from "@tanstack/react-query";
import { getIssuesAction, updateIssuePriorityAction, updateIssueLevelAction, updateIssueAssigneeAction, updateIssueStateAction, deleteIssueAction, createIssueAction } from "@/actions/issue.actions";
import type { IssueWithAssignee, IssuePriority, IssueLevel, IssueState, Issue } from "@/types/database.types";

function issuesKey(copanyId: string): QueryKey { return ["issues", copanyId]; }

export function useIssues(copanyId: string) {
  return useQuery<IssueWithAssignee[]>({
    queryKey: issuesKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/issues?copanyId=${encodeURIComponent(copanyId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.issues as IssueWithAssignee[];
      } catch {
        return await getIssuesAction(copanyId);
      }
    },
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
    mutationFn: async (vars: { issueId: string; priority: IssuePriority }) => {
      try {
        const res = await fetch("/api/issue/priority", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vars),
        });
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.issue as IssueWithAssignee;
      } catch {
        return await updateIssuePriorityAction(vars.issueId, vars.priority);
      }
    },
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
    mutationFn: async (vars: { issueId: string; level: IssueLevel }) => {
      try {
        const res = await fetch("/api/issue/level", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vars),
        });
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.issue as IssueWithAssignee;
      } catch {
        return await updateIssueLevelAction(vars.issueId, vars.level);
      }
    },
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
    mutationFn: async (vars: { issueId: string; assignee: string | null }) => {
      try {
        const res = await fetch("/api/issue/assignee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vars),
        });
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.issue as IssueWithAssignee;
      } catch {
        return await updateIssueAssigneeAction(vars.issueId, vars.assignee);
      }
    },
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
    mutationFn: async (vars: { issueId: string; state: IssueState }) => {
      try {
        const res = await fetch("/api/issue/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vars),
        });
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.issue as IssueWithAssignee;
      } catch {
        return await updateIssueStateAction(vars.issueId, vars.state);
      }
    },
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

export function useDeleteIssue(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { issueId: string }) => deleteIssueAction(vars.issueId),
    onMutate: async ({ issueId }) => {
      await qc.cancelQueries({ queryKey: issuesKey(copanyId) });
      const prev = qc.getQueryData<IssueWithAssignee[]>(issuesKey(copanyId));
      if (prev) {
        qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), prev.filter((i) => String(i.id) !== String(issueId)));
      }
      return { prev } as { prev?: IssueWithAssignee[] };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(issuesKey(copanyId), ctx.prev);
    },
    onSettled: async () => {
      try { await qc.invalidateQueries({ queryKey: issuesKey(copanyId) }); } catch (_) {}
    },
  });
}

export function useCreateIssue(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Issue, "id" | "created_at" | "updated_at" | "closed_at" | "created_by">) => {
      try {
        const res = await fetch("/api/issue/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.issue as IssueWithAssignee;
      } catch {
        return await createIssueAction(payload);
      }
    },
    onSuccess: (created) => {
      qc.setQueryData<IssueWithAssignee[]>(issuesKey(copanyId), (prev) => {
        const base = prev || [];
        const exists = base.some((i) => String(i.id) === String(created.id));
        return exists ? base.map((i) => (String(i.id) === String(created.id) ? created : i)) : [created, ...base];
      });
    },
  });
}


