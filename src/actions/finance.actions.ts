"use server";

import { FinanceService } from "@/services/finance.service";
import { DistributeRow, TransactionReviewStatus, TransactionRow } from "@/types/database.types";
import { getCurrentUser } from "@/actions/auth.actions";
import { CopanyService } from "@/services/copany.service";
import { createAdminSupabaseClient } from "@/utils/supabase/server";
import { IssueLevel, LEVEL_SCORES, Issue } from "@/types/database.types";

export async function getDistributesAction(copanyId: string) {
  return await FinanceService.getDistributes(copanyId);
}

export async function createDistributeAction(payload: Omit<DistributeRow, "id" | "created_at" | "updated_at">) {
  return await FinanceService.createDistribute(payload);
}

export async function updateDistributeAction(id: string, changes: Partial<Omit<DistributeRow, "id" | "created_at" | "updated_at">>) {
  return await FinanceService.updateDistribute(id, changes);
}

export async function getTransactionsAction(copanyId: string) {
  return await FinanceService.getTransactions(copanyId);
}

export async function createTransactionAction(payload: Omit<TransactionRow, "id" | "created_at" | "updated_at" | "actor_id">) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Not authenticated");
  return await FinanceService.createTransaction({ ...payload, actor_id: me.id });
}

export async function reviewTransactionAction(id: string, status: TransactionReviewStatus) {
  return await FinanceService.reviewTransaction(id, status);
}

/**
 * Delete all distributes for this copany, and regenerate for current month
 * Period: month 1st 00:00:00 to next month 1st 00:00:00 (UTC)
 * Logic: netIncome = sum(confirmed income) - sum(confirmed expense)
 * Amount per contributor = netIncome * (contribution / totalContribution)
 */
export async function regenerateDistributesForCurrentMonthAction(copanyId: string) {
  console.log(`[DEBUG] Starting regenerateDistributesForCurrentMonthAction for copanyId: ${copanyId}`);
  
  const me = await getCurrentUser();
  if (!me) throw new Error("Not authenticated");
  console.log(`[DEBUG] Current user authenticated: ${me.id}`);

  const copany = await CopanyService.getCopanyById(copanyId);
  if (!copany) throw new Error("Copany not found");
  if (copany.created_by !== me.id) throw new Error("Forbidden");
  console.log(`[DEBUG] Copany found: ${copany.name}, created by: ${copany.created_by}`);

  const admin = await createAdminSupabaseClient();
  console.log(`[DEBUG] Admin client created successfully`);

  // Time range for current month (UTC)
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  console.log(`[DEBUG] Time range: ${start.toISOString()} to ${nextMonth.toISOString()}`);

  // Fetch confirmed transactions of this month
  console.log(`[DEBUG] Fetching confirmed transactions for current month...`);
  // Ensure copanyId type matches DB (bigint). Using parseInt where possible.
  const copanyIdNumeric = Number.isNaN(Number(copanyId)) ? copanyId : Number(copanyId);
  const { data: txs, error: txErr } = await admin
    .from("transactions")
    .select("*")
    .eq("copany_id", copanyIdNumeric)
    .eq("status", "confirmed")
    .gte("occurred_at", start.toISOString())
    .lt("occurred_at", nextMonth.toISOString());
  if (txErr) throw new Error(txErr.message);
  
  console.log(`[DEBUG] Found ${txs?.length || 0} confirmed transactions`);

  const incomes = (txs || []).filter((t: TransactionRow) => t.type === "income");
  const expenses = (txs || []).filter((t: TransactionRow) => t.type === "expense");
  console.log(`[DEBUG] Transaction breakdown: ${incomes.length} incomes, ${expenses.length} expenses`);
  
  const sum = (arr: TransactionRow[]) => arr.reduce((acc, x) => acc + Number(x.amount || 0), 0);
  const totalIncome = sum(incomes);
  const totalExpense = sum(expenses);
  const netIncome = totalIncome - totalExpense;
  console.log(`[DEBUG] Financial summary: Income=${totalIncome}, Expense=${totalExpense}, Net=${netIncome}`);

  // Fetch contributors
  console.log(`[DEBUG] Fetching contributors...`);
  const { data: contributors, error: cErr } = await admin
    .from("copany_contributor")
    .select("user_id, name, contribution")
    .eq("copany_id", copanyId);
  if (cErr) throw new Error(cErr.message);
  
  console.log(`[DEBUG] Found ${contributors?.length || 0} contributors`);

  // Fetch completed issues (contribution data) for this copany
  console.log(`[DEBUG] Fetching completed issues for contribution calculation...`);
  const { data: completedIssues, error: issuesErr } = await admin
    .from("issue")
    .select("*")
    .eq("copany_id", copanyId)
    .eq("state", 4) // IssueState.Done = 4
    .not("assignee", "is", null)
    .not("closed_at", "is", null);
  if (issuesErr) throw new Error(issuesErr.message);
  
  console.log(`[DEBUG] Found ${completedIssues?.length || 0} completed issues`);
  
  // Calculate contribution score for each user based on completed issues and LEVEL_SCORES
  const userContributionScores: { [userId: string]: number } = {};
  
  (completedIssues || []).forEach((issue: Issue) => {
    const level = issue.level;
    if (level !== null && [IssueLevel.level_C, IssueLevel.level_B, IssueLevel.level_A, IssueLevel.level_S].includes(level)) {
      const score = LEVEL_SCORES[level as IssueLevel] || 0;
      if (issue.assignee) {
        userContributionScores[issue.assignee] = (userContributionScores[issue.assignee] || 0) + score;
      }
    }
  });
  
  // Map contributors to their calculated contribution scores
  const contributorsWithScores = (contributors || []).map((c: { user_id: string; name: string; contribution: number }) => ({
    ...c,
    contribution_score: userContributionScores[c.user_id] || 0
  }));
  
  const totalContributionScore = Object.values(userContributionScores).reduce((sum, score) => sum + score, 0);
  const currency = (incomes[0]?.currency as string) || (txs && txs[0]?.currency) || "USD";
  
  console.log(`[DEBUG] Contribution scores calculated:`, userContributionScores);
  console.log(`[DEBUG] Total contribution score: ${totalContributionScore}`);
  console.log(`[DEBUG] Total contribution score: ${totalContributionScore}, Currency: ${currency}`);

  // Delete existing distributes for this copany
  console.log(`[DEBUG] Deleting existing distributes for copany...`);
  const { error: delErr } = await admin.from("distribute").delete().eq("copany_id", copanyId);
  if (delErr) throw new Error(delErr.message);
  console.log(`[DEBUG] Existing distributes deleted successfully`);

  if (!contributors || contributors.length === 0) {
    console.log(`[DEBUG] No contributors found, returning early`);
    return { success: true, inserted: 0, netIncome } as const;
  }

  if (netIncome <= 0) {
    console.log(`[DEBUG] No positive profit (netIncome: ${netIncome}), generating zero-amount rows for traceability`);
    // No positive profit; still can generate zero rows or skip. We'll generate zero-amount rows for traceability.
    const rows = contributorsWithScores.map((c: { user_id: string; contribution_score: number }) => ({
      copany_id: copanyId,
      to_user: c.user_id,
      bank_card_number: "0000 0000 0000 0000",
      status: "in_progress",
      contribution_percent: totalContributionScore > 0 ? (c.contribution_score / totalContributionScore) * 100 : 0,
      amount: 0,
      currency,
      evidence_url: null,
    }));
    
    console.log(`[DEBUG] Generated ${rows.length} zero-amount distribute rows`);
    console.log(`[DEBUG] Sample row:`, rows[0]);
    
    const { error: insErr } = await admin.from("distribute").insert(rows);
    if (insErr) throw new Error(insErr.message);
    console.log(`[DEBUG] Zero-amount rows inserted successfully`);
    return { success: true, inserted: rows.length, netIncome } as const;
  }

  console.log(`[DEBUG] Generating distribute rows with positive amounts...`);
      const rows = contributorsWithScores.map((c: { user_id: string; name: string; contribution_score: number }) => {
          const ratio = totalContributionScore > 0 ? c.contribution_score / totalContributionScore : 0;
    const amount = Math.round(netIncome * ratio * 100) / 100;
          console.log(`[DEBUG] Contributor ${c.name} (${c.user_id}): contribution_score=${c.contribution_score}, ratio=${ratio.toFixed(4)}, amount=${amount}`);
    return {
      copany_id: copanyId,
      to_user: c.user_id,
      bank_card_number: "0000 0000 0000 0000",
      status: "in_progress",
      contribution_percent: ratio * 100,
      amount,
      currency,
      evidence_url: null,
    };
  });

  console.log(`[DEBUG] Generated ${rows.length} distribute rows with total amount: ${rows.reduce((sum, r) => sum + r.amount, 0)}`);
  console.log(`[DEBUG] Sample row:`, rows[0]);

  const { error: insErr } = await admin.from("distribute").insert(rows);
  if (insErr) throw new Error(insErr.message);
  console.log(`[DEBUG] Distribute rows inserted successfully`);
  
  console.log(`[DEBUG] regenerateDistributesForCurrentMonthAction completed successfully`);
  return { success: true, inserted: rows.length, netIncome } as const;
}


