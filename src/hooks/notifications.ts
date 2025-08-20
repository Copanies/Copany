"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/database.types";
import { listNotificationsAction, markAllReadAction, markReadAction, unreadCountAction } from "@/actions/notification.actions";

function key(before?: string, limit = 20) { return ["notifications", before || "", String(limit)] as const; }
function unreadKey() { return ["notifications", "unreadCount"] as const; }

export function useNotifications(params?: { before?: string; limit?: number }) {
  const { before, limit = 20 } = params || {};
  return useQuery<{ items: Notification[]; unread: number }>({
    queryKey: key(before, limit),
    queryFn: async () => {
      try {
        const qs = new URLSearchParams();
        if (before) qs.set("before", before);
        if (limit) qs.set("limit", String(limit));
        const res = await fetch(`/api/notifications?${qs.toString()}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return { items: json.items as Notification[], unread: Number(json.unread || 0) };
      } catch {
        const items = await listNotificationsAction(limit, before);
        const unread = await unreadCountAction();
        return { items, unread };
      }
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 10_000,
  });
}

export function useMarkNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { ids?: string[]; all?: boolean }) => {
      try {
        const res = await fetch(`/api/notifications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vars) });
        if (!res.ok) throw new Error("request failed");
      } catch {
        if (vars.all) await markAllReadAction(); else if (vars.ids) await markReadAction(vars.ids);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key() });
      qc.invalidateQueries({ queryKey: unreadKey() });
    }
  });
}


