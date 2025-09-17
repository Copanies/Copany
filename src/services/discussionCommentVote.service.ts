import { createSupabaseClient } from "@/utils/supabase/server";

export class DiscussionCommentVoteService {
  static async hasVoted(commentId: string): Promise<boolean> {
    const supabase = await createSupabaseClient();
    const { count, error } = await supabase
      .from("discussion_comment_vote")
      .select("id", { count: "exact", head: true })
      .eq("comment_id", commentId);
    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }

  static async listMyVotedCommentIds(): Promise<string[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_comment_vote")
      .select("comment_id");
    if (error) throw new Error(error.message);
    return (data || []).map((r: { comment_id: string }) => String(r.comment_id));
  }

  static async vote(commentId: string) {
    const supabase = await createSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error(userError?.message || "Unauthorized");
    const { error } = await supabase
      .from("discussion_comment_vote")
      .insert({ comment_id: commentId, user_id: user.id });
    if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
  }

  static async unvote(commentId: string) {
    const supabase = await createSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error(userError?.message || "Unauthorized");
    const { error } = await supabase
      .from("discussion_comment_vote")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }

  static async getVoteCount(commentId: string): Promise<number> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion_comment")
      .select("vote_up_count")
      .eq("id", commentId)
      .single();
    if (error) throw new Error(error.message);
    return data?.vote_up_count || 0;
  }
}
