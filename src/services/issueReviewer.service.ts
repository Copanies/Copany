import { createSupabaseClient } from "@/utils/supabase/server";
import type { IssueReviewer, ReviewerStatus } from "@/types/database.types";

export class IssueReviewerService {
  static async list(issueId: string): Promise<IssueReviewer[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_reviewer")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as IssueReviewer[];
  }

  static async add(issueId: string, reviewerId: string): Promise<IssueReviewer> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_reviewer")
      .insert({ issue_id: issueId, reviewer_id: reviewerId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as IssueReviewer;
  }

  static async setStatus(
    issueId: string,
    reviewerId: string,
    status: ReviewerStatus
  ): Promise<IssueReviewer> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("issue_reviewer")
      .update({ status })
      .eq("issue_id", issueId)
      .eq("reviewer_id", reviewerId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as IssueReviewer;
  }
}


