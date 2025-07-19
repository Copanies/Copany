"use server";
import { IssueService } from "@/services/issue.service";
import { Contribution, IssueState } from "@/types/database.types";

/**
 * Generate Contribution data from completed Issues
 */
export async function generateContributionsFromIssuesAction(
  copanyId: string
): Promise<Contribution[]> {
  try {
    // Get all issues for this copany
    const issues = await IssueService.getIssues(copanyId);

    // Filter for completed Issues
    const completedIssues = issues.filter(
      (issue) =>
        issue.state === IssueState.Done && issue.assignee && issue.closed_at
    );

    // Generate contribution data
    const contributions = completedIssues.map((issue) => {
      const closedDate = new Date(issue.closed_at!);

      return {
        id: `${issue.id}-contribution`, // Generate temporary ID
        user_id: issue.assignee!,
        copany_id: copanyId,
        issue_id: issue.id,
        issue_title: issue.title || "Untitled Issue",
        issue_level: issue.level || 0,
        year: closedDate.getFullYear(),
        month: closedDate.getMonth() + 1, // JavaScript months start from 0
        day: closedDate.getDate(),
      } as Contribution;
    });

    return contributions;
  } catch (error) {
    console.error("❌ Failed to generate contribution records:", error);
    throw new Error("Failed to generate contribution records");
  }
}
