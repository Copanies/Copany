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
          // Match current long-lived local cache behavior
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

  if (!persister) {
    // SSR: render children without persistence; client will re-mount with persistence
    return (
      <QueryClientProvider client={client}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider client={client} persistOptions={{ persister }}>
      <QueryClientProvider client={client}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </PersistQueryClientProvider>
  );
}
