import {
  createAdminSupabaseClient,
  createSupabaseClient,
} from "@/utils/supabase/server";
import { CopanyContributor } from "@/types/database.types";

export class CopanyContributorService {
  static async getCopanyContributorsByCopanyId(
    copanyId: string
  ): Promise<CopanyContributor[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("copany_contributor")
      .select("*")
      .eq("copany_id", copanyId);
    if (error) {
      console.error("Error fetching copany contributors:", error);
      throw new Error(`Failed to fetch copany contributors: ${error.message}`);
    }
    return data as CopanyContributor[];
  }

  static async createCopanyContributor(
    copanyId: string,
    userId: string
  ): Promise<CopanyContributor> {
    const supabase = await createSupabaseClient();
    // 首先检查是否已存在相同的 copany_id 和 user_id 组合
    const { data: existingData } = await supabase
      .from("copany_contributor")
      .select("*")
      .eq("copany_id", copanyId)
      .eq("user_id", userId)
      .single();

    if (existingData) {
      // 如果已存在，直接返回现有记录
      return existingData as CopanyContributor;
    }

    const adminSupabase = await createAdminSupabaseClient();
    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.getUserById(userId);
    if (userError) {
      console.error("Error fetching user:", userError);
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }

    // 如果不存在，创建新记录
    const { data, error } = await supabase
      .from("copany_contributor")
      .insert({
        copany_id: copanyId,
        user_id: userId,
        name: userData.user.user_metadata.name,
        email: userData.user.email,
        avatar_url: userData.user.user_metadata.avatar_url,
        contribution: 0,
      })
      .select()
      .single();
    if (error) {
      console.error("Error creating copany contributor:", error);
      throw new Error(`Failed to create copany contributor: ${error.message}`);
    }
    return data as CopanyContributor;
  }
}
