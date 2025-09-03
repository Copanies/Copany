"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

function key() {
  return ["currentUser"] as const;
}

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: key(),
    queryFn: async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          if (error.message?.includes("Auth session missing")) return null;
          return null;
        }
        return data.user ?? null;
      } catch {
        return null;
      }
    },
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    refetchInterval: 60 * 60 * 1000, // 1 hour 
  });
}


