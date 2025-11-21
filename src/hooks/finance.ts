"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DistributeRow, TransactionRow, TransactionReviewStatus } from "@/types/database.types";
import { 
  getDistributesAction,
  createDistributeAction,
  updateDistributeAction,
  getTransactionsAction,
  createTransactionAction,
  reviewTransactionAction,
  deleteTransactionAction,
  regenerateDistributesForCurrentMonthAction,
} from "@/actions/finance.actions";
import type { FinanceReportData, FinanceChartData } from "@/services/appStoreFinanceData.service";

export function distributesKey(copanyId: string) { return ["distributes", copanyId] as const; }
export function transactionsKey(copanyId: string) { return ["transactions", copanyId] as const; }
export function appStoreFinanceKey(copanyId: string) { return ["appStoreFinance", copanyId] as const; }
export function appStoreConnectStatusKey(copanyId: string) { return ["appStoreConnectStatus", copanyId] as const; }

export function useDistributes(copanyId: string) {
  return useQuery<DistributeRow[]>({
    queryKey: distributesKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/finance?copanyId=${encodeURIComponent(copanyId)}&type=distributes`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.distributes as DistributeRow[];
      } catch {
        return await getDistributesAction(copanyId);
      }
    },
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: !!copanyId,
  });
}

export function useCreateDistribute(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<DistributeRow, "id" | "created_at" | "updated_at">) => createDistributeAction(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: distributesKey(copanyId) }); },
  });
}

export function useUpdateDistribute(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<Omit<DistributeRow, "id" | "created_at" | "updated_at">> }) => updateDistributeAction(id, changes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: distributesKey(copanyId) }); },
  });
}

export function useRegenerateDistributes(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateDistributesForCurrentMonthAction(copanyId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: distributesKey(copanyId) }); },
  });
}

export function useTransactions(copanyId: string) {
  return useQuery<TransactionRow[]>({
    queryKey: transactionsKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/finance?copanyId=${encodeURIComponent(copanyId)}&type=transactions`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.transactions as TransactionRow[];
      } catch {
        return await getTransactionsAction(copanyId);
      }
    },
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: !!copanyId,
  });
}

export function useCreateTransaction(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<TransactionRow, "id" | "created_at" | "updated_at">) => createTransactionAction(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: transactionsKey(copanyId) }); },
  });
}

export function useReviewTransaction(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TransactionReviewStatus }) => reviewTransactionAction(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: transactionsKey(copanyId) }); },
  });
}

export function useDeleteTransaction(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteTransactionAction(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: transactionsKey(copanyId) }); },
  });
}

/**
 * Hook to get App Store Connect finance data (reports and chart data)
 */
export function useAppStoreFinance(copanyId: string) {
  return useQuery<{
    reports: FinanceReportData[];
    chartData: FinanceChartData[];
  }>({
    queryKey: appStoreFinanceKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/app-store-finance?copanyId=${encodeURIComponent(copanyId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return {
          reports: json.reports || [],
          chartData: json.chartData || [],
        };
      } catch (error) {
        console.error("Error fetching App Store finance data:", error);
        return { reports: [], chartData: [] };
      }
    },
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: !!copanyId,
  });
}

/**
 * Hook to refresh App Store Connect finance data
 */
export function useRefreshAppStoreFinance(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/app-store-finance?copanyId=${encodeURIComponent(copanyId)}`);
      if (!res.ok) throw new Error("request failed");
      const json = await res.json();
      return {
        reports: json.reports || [],
        chartData: json.chartData || [],
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appStoreFinanceKey(copanyId) });
    },
  });
}

/**
 * Hook to check App Store Connect connection status
 */
export function useAppStoreConnectStatus(copanyId: string) {
  return useQuery<boolean>({
    queryKey: appStoreConnectStatusKey(copanyId),
    queryFn: async () => {
      try {
        const res = await fetch(`/api/app-store-connect?copanyId=${encodeURIComponent(copanyId)}`);
        if (!res.ok) throw new Error("request failed");
        const json = await res.json();
        return json.connected as boolean;
      } catch (error) {
        console.error("Error checking App Store Connect status:", error);
        return false;
      }
    },
    staleTime: 1 * 10 * 1000,
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    enabled: !!copanyId,
  });
}

/**
 * Hook to disconnect App Store Connect
 */
export function useDisconnectAppStoreConnect(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/app-store-connect?copanyId=${encodeURIComponent(copanyId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to disconnect");
      }
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate connection status and finance data queries
      qc.invalidateQueries({ queryKey: appStoreConnectStatusKey(copanyId) });
      qc.invalidateQueries({ queryKey: appStoreFinanceKey(copanyId) });
    },
  });
}


