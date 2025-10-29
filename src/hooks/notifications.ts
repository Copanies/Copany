"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types/database.types";
import { listNotificationsAction, markAllReadAction, markReadAction, unreadCountAction } from "@/actions/notification.actions";
import { useCurrentUser } from "./currentUser";

function key(userId: string, before?: string, limit = 20) { return ["notifications", userId, before || "", String(limit)] as const; }
function unreadKey(userId: string) { return ["notifications", "unreadCount", userId] as const; }

export function useNotifications(params?: { before?: string; limit?: number }) {
  const { before, limit = 20 } = params || {};
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "anonymous";
  
  return useQuery<{ items: Notification[]; unread: number }>({
    queryKey: key(userId, before, limit),
    enabled: !!currentUser,
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
    refetchInterval: 1 * 60 * 1000, // 1 minutes
    staleTime: 30 * 1000
  });
}

export function useMarkNotifications() {
  const qc = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id || "anonymous";
  
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
      qc.invalidateQueries({ queryKey: ["notifications", userId], exact: false });
      qc.invalidateQueries({ queryKey: unreadKey(userId) });
    }
  });
}


