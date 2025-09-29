import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceivePaymentLink, ReceivePaymentLinkType } from "@/types/database.types";
import {
  getUserPaymentLinksAction,
  getPaymentLinkByTypeAction,
  upsertPaymentLinkAction,
  deletePaymentLinkAction,
  getPaymentLinkStatusAction
} from "@/actions/receivePaymentLink.actions";

type PaymentLinkWithDecrypted = ReceivePaymentLink & { decrypted_link: string };

/**
 * Hook to get user's payment links
 */
export function usePaymentLinks(userId: string) {
  return useQuery<PaymentLinkWithDecrypted[]>({
    queryKey: ["paymentLinks", userId],
    queryFn: async () => {
      // Only use server actions for security (encryption/decryption in server)
      try {
        const response = await fetch(`/api/receive-payment-links?userId=${userId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        return result.data || [];
      } catch (error) {
        console.error("Error fetching payment links:", error);
        // Fallback to server action
        const actionResult = await getUserPaymentLinksAction(userId);
        if (actionResult.success) {
          return actionResult.data || [];
        }
        
        throw new Error(actionResult.error || "Failed to fetch payment links");
      }
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
      // Only use server actions for security (encryption/decryption in server)
      try {
        const response = await fetch(`/api/receive-payment-links?userId=${userId}&type=${type}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        console.error("Error fetching payment link by type:", error);
        // Fallback to server action
        const actionResult = await getPaymentLinkByTypeAction(userId, type);
        if (actionResult.success) {
          return actionResult.data;
        }
        
        throw new Error(actionResult.error || "Failed to fetch payment link");
      }
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
      // Only use server actions for security (encryption/decryption in server)
      try {
        const response = await fetch("/api/receive-payment-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, type, paymentLink }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        return result.data;
      } catch (error) {
        console.error("Error upserting payment link:", error);
        // Fallback to server action
        const actionResult = await upsertPaymentLinkAction(userId, type, paymentLink);
        if (actionResult.success) {
          return actionResult.data;
        }
        
        throw new Error(actionResult.error || "Failed to save payment link");
      }
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
      // Only use server actions for security (encryption/decryption in server)
      try {
        const response = await fetch(`/api/receive-payment-links?userId=${userId}&type=${type}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        return true;
      } catch (error) {
        console.error("Error deleting payment link:", error);
        // Fallback to server action
        const actionResult = await deletePaymentLinkAction(userId, type);
        if (actionResult.success) {
          return actionResult.data;
        }
        
        throw new Error(actionResult.error || "Failed to delete payment link");
      }
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