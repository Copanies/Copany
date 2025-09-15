import { createSupabaseClient } from "@/utils/supabase/server";

export class StarService {
  static async getStarCount(copanyId: string): Promise<number> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("copany")
      .select("star_count")
      .eq("id", copanyId)
      .single();
    if (error) throw new Error(error.message);
    return (data?.star_count as number) || 0;
  }

  static async hasStarred(copanyId: string): Promise<boolean> {
    const supabase = await createSupabaseClient();
    const { count, error } = await supabase
      .from("stars")
      .select("id", { count: "exact", head: true })
      .eq("copany_id", copanyId);
    if (error) throw new Error(error.message);
    return (count || 0) > 0;
  }

  static async listStarredCopanyIds(): Promise<string[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("stars")
      .select("copany_id");
    if (error) throw new Error(error.message);
    return (data || []).map((r: { copany_id: string }) => String(r.copany_id));
  }

  static async star(copanyId: string) {
    const supabase = await createSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error(userError?.message || "Unauthorized");
    }
    const { error } = await supabase
      .from("stars")
      .insert({ copany_id: copanyId, user_id: user.id });
    if (error && !String(error.message).includes("duplicate key")) {
      throw new Error(error.message);
    }
  }

  static async unstar(copanyId: string) {
    const supabase = await createSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error(userError?.message || "Unauthorized");
    }
    const { error } = await supabase
      .from("stars")
      .delete()
      .eq("copany_id", copanyId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }
}


