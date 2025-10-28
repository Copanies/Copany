"use client";

import { useQuery } from "@tanstack/react-query";
import type { UserProviderInfo } from "@/actions/user.actions";
import { getUserProvidersAction } from "@/actions/user.actions";

/**
 * Hook to get user provider information
 * Returns publicly available provider info (GitHub, Discord, etc.) for any user
 */
export function useUserProviders(userId: string) {
  return useQuery<UserProviderInfo[]>({
    queryKey: ["userProviders", userId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/user-providers?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return (json.providers as UserProviderInfo[]) || [];
      } catch {
        return await getUserProvidersAction(userId);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

