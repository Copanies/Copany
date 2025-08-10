"use server";
import type { Notification } from "@/types/database.types";
import { NotificationService } from "@/services/notification.service";

export async function listNotificationsAction(
  limit = 20,
  before?: string
): Promise<Notification[]> {
  return NotificationService.list(limit, before);
}

export async function unreadCountAction(): Promise<number> {
  return NotificationService.unreadCount();
}

export async function markReadAction(ids: string[]): Promise<void> {
  return NotificationService.markRead(ids);
}

export async function markAllReadAction(): Promise<void> {
  return NotificationService.markAllRead();
}

