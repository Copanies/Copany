import { createSupabaseClient } from "@/utils/supabase/server";

export class DiscussionVoteService {
  static async hasVoted(discussionId: string): Promise<boolean> {
    const supabase = await createSupabaseClient();
    const { count, error } = await supabase
      .from("discussion_vote")
      .select("id", { count: "exact", head: true })
      .eq("discussion_id", discussionId);
    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }

  static async listMyVotedDiscussionIds(): Promise<string[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_vote")
      .select("discussion_id");
    if (error) throw new Error(error.message);
    return (data || []).map((r: { discussion_id: string }) => String(r.discussion_id));
  }

  static async vote(discussionId: string) {
    const supabase = await createSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error(userError?.message || "Unauthorized");
    const { error } = await supabase
      .from("discussion_vote")
      .insert({ discussion_id: discussionId, user_id: user.id });
    if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
  }

  static async unvote(discussionId: string) {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("discussion_vote")
      .delete()
      .eq("discussion_id", discussionId);
    if (error) throw new Error(error.message);
  }
}


