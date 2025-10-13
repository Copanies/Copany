"use client";

// English comments per user rule
import { ReactNode, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

type Props = { children: ReactNode };

export default function ReactQueryProvider({ children }: Props) {
  const { client, persister } = useMemo(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          // Keep data fresh for a long time to leverage persistence
          // Use Infinity to avoid setTimeout overflow (max: 2^31-1 ms ≈ 24.8 days)
          staleTime: Infinity,
          gcTime: Infinity,
          refetchOnWindowFocus: true,
          refetchOnReconnect: true,
          retry: 2,
        },
      },
    });

    const persister =
      typeof window !== "undefined"
        ? createAsyncStoragePersister({
            storage: {
              getItem: async (key) => localStorage.getItem(key),
              setItem: async (key, value) => localStorage.setItem(key, value),
              removeItem: async (key) => localStorage.removeItem(key),
            },
          })
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
      persistOptions={{ persister, maxAge: Infinity }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
