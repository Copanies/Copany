"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserAuthInfo, UserAuthInfo } from "@/services/userAuth.service";

function key() {
  return ["userAuth"] as const;
}

export function useUserAuth() {
  return useQuery<UserAuthInfo | null>({
    queryKey: key(),
    queryFn: async () => {
      try {
        return await getUserAuthInfo();
      } catch (error) {
        console.error("Error fetching user auth info:", error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to check if user has specific providers linked
 */
export function useHasProviders() {
  const { data: userAuth, isLoading } = useUserAuth();
  
  const providers = userAuth?.providers.map(p => p.provider) || [];
  
  return {
    data: {
      hasGitHub: providers.includes('github'),
      hasGoogle: providers.includes('google'),
      hasFigma: providers.includes('figma'),
      hasEmail: providers.includes('email'),
      allProviders: providers,
      providersData: userAuth?.providers || []
    },
    isLoading
  };
}
