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
  regenerateDistributesForCurrentMonthAction,
} from "@/actions/finance.actions";

export function distributesKey(copanyId: string) { return ["distributes", copanyId] as const; }
export function transactionsKey(copanyId: string) { return ["transactions", copanyId] as const; }

export function useDistributes(copanyId: string) {
  return useQuery<DistributeRow[]>({
    queryKey: distributesKey(copanyId),
    queryFn: () => getDistributesAction(copanyId),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
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
    queryFn: () => getTransactionsAction(copanyId),
    staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
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


