"use server";

import { ReceivePaymentLinkService } from "@/services/receivePaymentLink.service";
import { ReceivePaymentLinkType } from "@/types/database.types";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get user's payment links
 */
export async function getUserPaymentLinksAction(userId: string): Promise<ActionResult> {
  try {
    const paymentLinks = await ReceivePaymentLinkService.getUserPaymentLinks(userId);
    return { success: true, data: paymentLinks };
  } catch (error) {
    console.error("Get user payment links action error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch payment links" 
    };
  }
}

/**
 * Get payment link by type
 */
export async function getPaymentLinkByTypeAction(
  userId: string, 
  type: ReceivePaymentLinkType
): Promise<ActionResult> {
  try {
    const paymentLink = await ReceivePaymentLinkService.getPaymentLinkByType(userId, type);
    return { success: true, data: paymentLink };
  } catch (error) {
    console.error("Get payment link by type action error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch payment link" 
    };
  }
}

/**
 * Create or update payment link
 */
export async function upsertPaymentLinkAction(
  userId: string,
  type: ReceivePaymentLinkType,
  paymentLink: string
): Promise<ActionResult> {
  try {
    // Validate input
    if (!paymentLink?.trim()) {
      return { success: false, error: "Payment link cannot be empty" };
    }

    if (!['Wise', 'Alipay'].includes(type)) {
      return { success: false, error: "Invalid payment link type" };
    }

    const result = await ReceivePaymentLinkService.upsertPaymentLink(userId, type, paymentLink.trim());
    return { success: true, data: result };
  } catch (error) {
    console.error("Upsert payment link action error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save payment link" 
    };
  }
}

/**
 * Delete payment link
 */
export async function deletePaymentLinkAction(
  userId: string,
  type: ReceivePaymentLinkType
): Promise<ActionResult> {
  try {
    if (!['Wise', 'Alipay'].includes(type)) {
      return { success: false, error: "Invalid payment link type" };
    }

    await ReceivePaymentLinkService.deletePaymentLink(userId, type);
    return { success: true, data: true };
  } catch (error) {
    console.error("Delete payment link action error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete payment link" 
    };
  }
}

/**
 * Get payment link status
 */
export async function getPaymentLinkStatusAction(userId: string): Promise<ActionResult> {
  try {
    const status = await ReceivePaymentLinkService.getPaymentLinkStatus(userId);
    return { success: true, data: status };
  } catch (error) {
    console.error("Get payment link status action error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch payment link status" 
    };
  }
}
