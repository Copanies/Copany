import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceivePaymentLink, ReceivePaymentLinkType } from "@/types/database.types";
import { getPaymentLinkStatusAction } from "@/actions/receivePaymentLink.actions";

type PaymentLinkWithDecrypted = ReceivePaymentLink & { decrypted_link: string };

/**
 * Hook to get user's payment links
 */
export function usePaymentLinks(userId: string) {
  return useQuery<PaymentLinkWithDecrypted[]>({
    queryKey: ["paymentLinks", userId],
    queryFn: async () => {
      const response = await fetch(`/api/receive-payment-links?userId=${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get a specific payment link by type
 */
export function usePaymentLinkByType(userId: string, type: ReceivePaymentLinkType) {
  return useQuery<PaymentLinkWithDecrypted | null>({
    queryKey: ["paymentLink", userId, type],
    queryFn: async () => {
      const response = await fetch(`/api/receive-payment-links?userId=${userId}&type=${type}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!userId && !!type,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to create or update payment link
 */
export function useUpsertPaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      type,
      paymentLink,
    }: {
      userId: string;
      type: ReceivePaymentLinkType;
      paymentLink: string;
    }) => {
      const response = await fetch("/api/receive-payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type, paymentLink }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (_, { userId, type }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["paymentLinks", userId] });
      queryClient.invalidateQueries({ queryKey: ["paymentLink", userId, type] });
    },
  });
}

/**
 * Hook to delete payment link
 */
export function useDeletePaymentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      type,
    }: {
      userId: string;
      type: ReceivePaymentLinkType;
    }) => {
      const response = await fetch(`/api/receive-payment-links?userId=${userId}&type=${type}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      return true;
    },
    onSuccess: (_, { userId, type }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["paymentLinks", userId] });
      queryClient.invalidateQueries({ queryKey: ["paymentLink", userId, type] });
    },
  });
}

/**
 * Hook to get payment link status
 */
export function usePaymentLinkStatus(userId: string) {
  return useQuery({
    queryKey: ["paymentLinkStatus", userId],
    queryFn: async () => {
      const actionResult = await getPaymentLinkStatusAction(userId);
      if (actionResult.success) {
        return actionResult.data;
      }
      throw new Error(actionResult.error || "Failed to fetch payment link status");
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}