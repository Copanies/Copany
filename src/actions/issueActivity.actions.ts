"use server";
import { IssueActivityService } from "@/services/issueActivity.service";
import type { IssueActivity } from "@/types/database.types";

export async function listIssueActivityAction(
  issueId: string,
  limit = 100
): Promise<IssueActivity[]> {
  return await IssueActivityService.listByIssue(issueId, limit);
}

