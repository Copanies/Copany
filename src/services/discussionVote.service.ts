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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error(userError?.message || "Unauthorized");
    const { error } = await supabase
      .from("discussion_vote")
      .delete()
      .eq("discussion_id", discussionId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }

  static async getVoteCount(discussionId: string): Promise<number> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion")
      .select("vote_up_count")
      .eq("id", discussionId)
      .single();

    if (error) throw new Error(error.message);
    return data?.vote_up_count || 0;
  }

  static async getVoteCounts(discussionIds: string[]): Promise<Record<string, number>> {
    if (discussionIds.length === 0) return {};
    
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion")
      .select("id, vote_up_count")
      .in("id", discussionIds);
    if (error) throw new Error(error.message);
    
    const result: Record<string, number> = {};
    for (const item of data || []) {
      result[String(item.id)] = item.vote_up_count || 0;
    }
    return result;
  }
}


