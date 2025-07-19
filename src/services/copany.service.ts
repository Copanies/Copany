import { createSupabaseClient } from "@/utils/supabase/server";
import { Copany } from "@/types/database.types";

/**
 * Copany data service - Handles all operations related to Copany data
 */
export class CopanyService {
  /**
   * Get all companies list
   */
  static async getCopanies(): Promise<Copany[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("copany")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching copanies:", error);
      throw new Error(`Failed to fetch copanies: ${error.message}`);
    }

    return data as Copany[];
  }

  /**
   * Get a single company by ID
   */
  static async getCopanyById(id: string): Promise<Copany | null> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("copany")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching copany:", error);
      throw new Error(`Failed to fetch copany: ${error.message}`);
    }

    return data as Copany;
  }

  /**
   * Create new company
   */
  static async createCopany(
    copany: Omit<Copany, "id" | "created_at" | "updated_at">
  ): Promise<Copany> {
    console.log("📋 CopanyService.createCopany received data:", copany);
    console.log("🖼️ CopanyService.createCopany logo_url:", copany.logo_url);

    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("copany")
      .insert(copany)
      .select()
      .single();

    if (error) {
      console.error("Error creating copany:", error);
      throw new Error(`Failed to create copany: ${error.message}`);
    }

    console.log(
      "✅ CopanyService.createCopany created successfully, returned data:",
      data
    );
    return data as Copany;
  }

  static async updateCopany(
    copany: Omit<Copany, "created_at" | "updated_at">
  ): Promise<Copany> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("copany")
      .update({
        ...copany,
        updated_at: new Date().toISOString(),
      })
      .eq("id", copany.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating copany:", error);
      throw new Error(`Failed to update copany: ${error.message}`);
    }

    return data as Copany;
  }

  static async deleteCopany(id: string) {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.from("copany").delete().eq("id", id);
    if (error) {
      console.error("Error deleting copany:", error);
      throw new Error(`Failed to delete copany: ${error.message}`);
    }
  }
}
