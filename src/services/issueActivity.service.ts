import { createSupabaseClient } from "@/utils/supabase/server";
import type { IssueActivity } from "@/types/database.types";

export class IssueActivityService {
  static async listByIssue(issueId: string, limit = 100): Promise<IssueActivity[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_activity")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data || []) as IssueActivity[];
  }
}

