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
          // 数据在获取后1分钟内视为新鲜；
          // 超过1分钟标记为stale，下次访问会立即返回缓存并后台更新
          staleTime: 1 * 60 * 1000,
          // 缓存数据在无人使用后保留1天再被清除
          gcTime: 24 * 60 * 60 * 1000, // 1 day
          // 窗口重新获得焦点时，如数据是stale则后台重新获取
          refetchOnWindowFocus: true,
          // 网络从离线恢复在线时，如数据是stale则后台重新获取
          refetchOnReconnect: true,
          // 请求失败自动重试2次（共尝试3次）
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
      persistOptions={{
        persister,
        // localStorage cache expires after 24 hours
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
}
