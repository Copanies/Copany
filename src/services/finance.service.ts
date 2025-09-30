import { createSupabaseClient } from "@/utils/supabase/server";
import { DistributeRow, TransactionRow, TransactionReviewStatus } from "@/types/database.types";

export class FinanceService {
  // Distribute
  static async getDistributes(copanyId: string): Promise<DistributeRow[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("distribute")
      .select("*")
      .eq("copany_id", copanyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as unknown as DistributeRow[];
  }

  static async createDistribute(payload: Omit<DistributeRow, "id" | "created_at" | "updated_at">): Promise<DistributeRow> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("distribute")
      .insert(payload as object)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as DistributeRow;
  }

  static async updateDistribute(id: string, changes: Partial<Omit<DistributeRow, "id" | "created_at" | "updated_at">>): Promise<DistributeRow> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("distribute")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as DistributeRow;
  }

  // Transactions
  static async getTransactions(copanyId: string): Promise<TransactionRow[]> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("copany_id", copanyId)
      .order("occurred_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as unknown as TransactionRow[];
  }

  static async createTransaction(payload: Omit<TransactionRow, "id" | "created_at" | "updated_at">): Promise<TransactionRow> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("transactions")
      .insert(payload as object)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as TransactionRow;
  }

  static async updateTransaction(id: string, changes: Partial<Omit<TransactionRow, "id" | "created_at" | "updated_at">>): Promise<TransactionRow> {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase
      .from("transactions")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as TransactionRow;
  }

  static async reviewTransaction(id: string, status: TransactionReviewStatus): Promise<TransactionRow> {
    return await FinanceService.updateTransaction(id, { status });
  }

  static async deleteTransaction(id: string): Promise<boolean> {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }
}


