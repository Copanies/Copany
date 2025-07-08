"use server";
import { IssueService } from "@/services/issue.service";
import {
  Contribution,
  IssueWithAssignee,
  IssueState,
} from "@/types/database.types";

/**
 * 从已完成的 Issues 生成 Contribution 数据
 */
export async function generateContributionsFromIssuesAction(
  copanyId: string
): Promise<Contribution[]> {
  try {
    // 获取该 copany 的所有 issues
    const issues = await IssueService.getIssues(copanyId);

    // 过滤出已完成的 Issues
    const completedIssues = issues.filter(
      (issue) =>
        issue.state === IssueState.Done && issue.assignee && issue.closed_at
    );

    // 生成 contribution 数据
    const contributions = completedIssues.map((issue) => {
      const closedDate = new Date(issue.closed_at!);

      return {
        id: `${issue.id}-contribution`, // 生成临时 ID
        user_id: issue.assignee!,
        copany_id: copanyId,
        issue_id: issue.id,
        issue_title: issue.title || "未命名 Issue",
        issue_level: issue.level || 0,
        year: closedDate.getFullYear(),
        month: closedDate.getMonth() + 1, // JavaScript 月份从 0 开始
        day: closedDate.getDate(),
      } as Contribution;
    });

    return contributions;
  } catch (error) {
    console.error("❌ 生成贡献记录失败:", error);
    throw new Error("生成贡献记录失败");
  }
}
