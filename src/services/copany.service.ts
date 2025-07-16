import { createSupabaseClient } from "@/utils/supabase/server";
import { Copany } from "@/types/database.types";

/**
 * Copany 数据服务 - 处理所有与 Copany 相关的数据操作
 */
export class CopanyService {
  /**
   * 获取所有公司列表
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
   * 根据 ID 获取单个公司
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
   * 创建新公司
   */
  static async createCopany(
    copany: Omit<Copany, "id" | "created_at" | "updated_at">
  ): Promise<Copany> {
    console.log("📋 CopanyService.createCopany 接收到的数据:", copany);
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

    console.log("✅ CopanyService.createCopany 创建成功，返回数据:", data);
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
