import { createSupabaseClient } from "@/utils/supabase/server";
import type { Discussion } from "@/types/database.types";

export interface PaginatedDiscussions {
  discussions: Discussion[];
  hasMore: boolean;
}

export class DiscussionService {
  static async listByCopany(
    copanyId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedDiscussions> {
    const supabase = await createSupabaseClient();
    
    let query = supabase
      .from("discussion")
      .select("*")
      .order("hot_score", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    if (copanyId === "null") {
      query = query.is("copany_id", null);
    } else {
      query = query.eq("copany_id", copanyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching discussions:", error);
      throw new Error(`Failed to fetch discussions: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return { discussions: [], hasMore: false };
    }
    
    const discussions = data as Discussion[];
    const hasMore = data.length === pageSize;
    
    return { discussions, hasMore };
  }

  static async get(discussionId: string, copanyId: string): Promise<Discussion> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion")
      .select("*")
      .eq("id", discussionId)
      .eq("copany_id", copanyId)
      .single();
    if (error) {
      console.error("Error fetching discussion:", error);
      throw new Error(`Failed to fetch discussion: ${error.message}`);
    }
    return data as Discussion;
  }

  static async getById(discussionId: string): Promise<Discussion> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion")
      .select("*")
      .eq("id", discussionId)
      .single();
    if (error) {
      console.error("Error fetching discussion by ID:", error);
      throw new Error(`Failed to fetch discussion: ${error.message}`);
    }
    return data as Discussion;
  }

  static async create(input: {
    copany_id: string | null;
    title: string;
    description?: string | null;
    creator_id: string;
    labels?: string[];
    issue_id?: string | null;
  }): Promise<Discussion> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion")
      .insert({
        copany_id: input.copany_id,
        title: input.title,
        description: input.description ?? null,
        creator_id: input.creator_id,
        labels: input.labels ?? [],
        issue_id: input.issue_id ?? null,
      })
      .select()
      .single();
    if (error) {
      console.error("Error creating discussion:", error);
      throw new Error(`Failed to create discussion: ${error.message}`);
    }
    return data as Discussion;
  }

  static async update(
    discussionId: string,
    updates: Partial<Pick<Discussion, "title" | "description" | "labels" | "issue_id">>
  ): Promise<Discussion> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("discussion")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", discussionId)
      .select()
      .single();
    if (error) {
      console.error("Error updating discussion:", error);
      throw new Error(`Failed to update discussion: ${error.message}`);
    }
    return data as Discussion;
  }

  static async remove(discussionId: string): Promise<void> {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("discussion")
      .delete()
      .eq("id", discussionId);
    if (error) {
      console.error("Error deleting discussion:", error);
      throw new Error(`Failed to delete discussion: ${error.message}`);
    }
  }

  static async listAll(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedDiscussions> {
    const supabase = await createSupabaseClient();
    
    const { data, error } = await supabase
      .from("discussion")
      .select("*")
      .order("hot_score", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    if (error) {
      console.error("Error fetching all discussions:", error);
      throw new Error(`Failed to fetch all discussions: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return { discussions: [], hasMore: false };
    }
    
    const discussions = data as Discussion[];
    const hasMore = data.length === pageSize;
    
    return { discussions, hasMore };
  }
}


