"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserInfo } from "@/actions/user.actions";
import { getUserByIdAction, getUsersByIdsAction } from "@/actions/user.actions";

export function useUserInfo(userId: string) {
  return useQuery<UserInfo | null>({
    queryKey: ["userInfo", userId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/user-info?id=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return (json.item as UserInfo) || null;
      } catch {
        return await getUserByIdAction(userId);
      }
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useUsersInfo(userIds: string[]) {
  return useQuery<Record<string, UserInfo>>({
    queryKey: ["userInfos", userIds.sort().join(",")],
    queryFn: async () => {
      try {
        const params = userIds.map((id) => `ids=${encodeURIComponent(id)}`).join("&");
        const res = await fetch(`/api/user-info?${params}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return (json.map as Record<string, UserInfo>) || {};
      } catch {
        return await getUsersByIdsAction(userIds);
      }
    },
    staleTime: 60 * 60 * 1000,
  });
}


