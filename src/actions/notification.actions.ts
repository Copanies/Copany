"use server";
import { createSupabaseClient } from "@/utils/supabase/server";
import type { Notification } from "@/types/database.types";

export async function listNotificationsAction(limit = 20, before?: string) {
  const supabase = await createSupabaseClient();
  let q = supabase
    .from("notification")
    .select("*")
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as Notification[];
}

export async function unreadCountAction() {
  const supabase = await createSupabaseClient();
  const { count, error } = await supabase
    .from("notification")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function markReadAction(ids: (string | number)[]) {
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids as any);
  if (error) throw new Error(error.message);
}

export async function markAllReadAction() {
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

