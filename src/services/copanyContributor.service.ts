import {
  createAdminSupabaseClient,
  createSupabaseClient,
} from "@/utils/supabase/server";
import { CopanyContributor, CopanyContributorWithUserInfo } from "@/types/database.types";

export class CopanyContributorService {
  static async getCopanyContributorsByCopanyId(
    copanyId: string
  ): Promise<CopanyContributorWithUserInfo[]> {
    const supabase = await createSupabaseClient();
    const adminSupabase = await createAdminSupabaseClient();
    
    // First get contributors from copany_contributor table
    const { data: contributors, error } = await supabase
      .from("copany_contributor")
      .select("*")
      .eq("copany_id", copanyId);
    
    if (error) {
      console.error("Error fetching copany contributors:", error);
      throw new Error(`Failed to fetch copany contributors: ${error.message}`);
    }
    
    // Then fetch user info for each contributor
    const contributorsWithUserInfo: CopanyContributorWithUserInfo[] = [];
    
    for (const contributor of contributors) {
      try {
        const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(contributor.user_id);
        
        if (userError || !userData.user) {
          console.warn(`Failed to fetch user ${contributor.user_id}:`, userError);
          // Use fallback data
          contributorsWithUserInfo.push({
            ...contributor,
            name: contributor.email || "",
            avatar_url: "",
          });
          continue;
        }
        
        const user = userData.user;
        const userName = user.user_metadata?.name || 
                        user.user_metadata?.user_name || 
                        user.user_metadata?.full_name || 
                        user.email || 
                        "";
        
        contributorsWithUserInfo.push({
          ...contributor,
          name: userName,
          avatar_url: user.user_metadata?.avatar_url || "",
        });
      } catch (error) {
        console.warn(`Error fetching user ${contributor.user_id}:`, error);
        // Use fallback data
        contributorsWithUserInfo.push({
          ...contributor,
          name: contributor.email || "",
          avatar_url: "",
        });
      }
    }
    
    return contributorsWithUserInfo;
  }

  static async createCopanyContributor(
    copanyId: string,
    userId: string
  ): Promise<CopanyContributor> {
    const supabase = await createSupabaseClient();
    // First check if the combination of copany_id and user_id already exists
    const { data: existingData } = await supabase
      .from("copany_contributor")
      .select("*")
      .eq("copany_id", copanyId)
      .eq("user_id", userId)
      .single();

    if (existingData) {
      // If it exists, return the existing record
      return existingData as CopanyContributor;
    }

    const adminSupabase = await createAdminSupabaseClient();
    const { data: userData, error: userError } =
      await adminSupabase.auth.admin.getUserById(userId);
    if (userError) {
      console.error("Error fetching user:", userError);
      throw new Error(`Failed to fetch user: ${userError.message}`);
    }

    // If it doesn't exist, create a new record (without name and avatar_url)
    const { data, error } = await supabase
      .from("copany_contributor")
      .insert({
        copany_id: copanyId,
        user_id: userId,
        email: userData.user.email,
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
