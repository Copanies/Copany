"use client";

// English comments per user rule
import { ReactNode, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

type Props = { children: ReactNode };

export default function ReactQueryProvider({ children }: Props) {
  const { client, persister } = useMemo(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          // Keep data fresh for a long time to leverage persistence
          staleTime: 30 * 24 * 60 * 60 * 1000,
          gcTime: 31 * 24 * 60 * 60 * 1000,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          retry: 2,
        },
      },
    });

    const persister =
      typeof window !== "undefined"
        ? createSyncStoragePersister({ storage: window.localStorage })
        : null;

    return { client, persister };
  }, []);

  // SSR fallback: without window/localStorage, just render without persistence
  if (!persister) {
    // No window/localStorage available (e.g., SSR). Render without persistence.
    return (
      <QueryClientProvider client={client}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    );
  }

  // Use PersistQueryClientProvider as the single provider. It wraps QueryClientProvider internally in v5
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: 30 * 24 * 60 * 60 * 1000 }}
    >
      <QueryClientProvider client={client}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </PersistQueryClientProvider>
  );
}
