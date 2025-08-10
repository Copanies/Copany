import { createSupabaseClient } from "@/utils/supabase/server";
import type { Notification } from "@/types/database.types";

export class NotificationService {
  static async list(limit = 50, before?: string) {
    const supabase = await createSupabaseClient();
    let q = supabase
      .from("notification")
      .select("*, issue:issue_id(title)")
      .order("is_read", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) q = q.lt("created_at", before);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []) as Notification[];
  }

  static async unreadCount() {
    const supabase = await createSupabaseClient();
    const { count, error } = await supabase
      .from("notification")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return count || 0;
  }

  static async markRead(ids: string[]) {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("notification")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw new Error(error.message);
  }

  static async markAllRead() {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("notification")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (error) throw new Error(error.message);
  }
}

