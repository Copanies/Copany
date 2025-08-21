"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Copany } from "@/types/database.types";
import { getCopanyByIdAction, updateCopanyAction } from "@/actions/copany.actions";

function copanyKey(copanyId: string) { return ["copany", copanyId] as const; }

export function useCopany(copanyId: string) {
  return useQuery<Copany | null>({
    queryKey: copanyKey(copanyId),
    queryFn: () => getCopanyByIdAction(copanyId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCopany(copanyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Copany, "created_at" | "updated_at">) => updateCopanyAction(payload),
    onSuccess: (updated) => {
      qc.setQueryData<Copany | null>(copanyKey(copanyId), updated);
    },
  });
}


