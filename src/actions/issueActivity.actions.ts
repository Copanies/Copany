"use server";
import { IssueActivityService } from "@/services/issueActivity.service";
import type { IssueActivity } from "@/types/database.types";

export async function listIssueActivityAction(
  issueId: string,
  limit = 100
): Promise<IssueActivity[]> {
  console.log("🔍 Action: listIssueActivityAction", issueId, limit);
  return await IssueActivityService.listByIssue(issueId, limit);
}

