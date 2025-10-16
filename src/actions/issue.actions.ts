"use server";
import { getCurrentUser } from "@/actions/auth.actions";
import { CopanyContributorService } from "@/services/copanyContributor.service";
import { IssueService } from "@/services/issue.service";
import {
  Issue,
  IssueWithAssignee,
  IssuePriority,
  IssueState,
  IssueLevel,
} from "@/types/database.types";

export async function getIssuesAction(copanyId: string) {
  console.log("🔍 Action: getIssuesAction", copanyId);
  return await IssueService.getIssues(copanyId);
}

export async function createIssueAction(
  issue: Omit<
    Issue,
    "id" | "created_at" | "updated_at" | "created_by"
  > & {
    closed_at?: string | null;
  }
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }
  const newIssue = await IssueService.createIssue({
    ...issue,
    created_by: user.id,
  });
  // Note: activities for initial properties are logged by DB trigger on insert.
  if (newIssue.state === IssueState.Done && newIssue.copany_id) {
    await CopanyContributorService.createCopanyContributor(
      newIssue.copany_id,
      user.id
    );
  }
  return newIssue;
}

export async function createHistoryIssuesAction(
  copanyId: string,
  issues: Array<{
    title: string;
    level: IssueLevel;
    closedAt: string; // ISO date string
    assignee: string | null;
  }>
): Promise<IssueWithAssignee[]> {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Not authenticated");
  
  const createdIssues = await Promise.all(
    issues.map(async (issue) => {
      const newIssue = await IssueService.createIssue({
        copany_id: copanyId,
        title: issue.title,
        level: issue.level,
        state: IssueState.Done,
        closed_at: issue.closedAt, // Use provided date
        assignee: issue.assignee, // Use provided assignee
        created_by: currentUser.id,
        is_history_issue: true,
        description: "",
        priority: IssuePriority.None,
      });
      
      // Create contributor if needed
      if (newIssue.copany_id && newIssue.assignee) {
        await CopanyContributorService.createCopanyContributor(
          newIssue.copany_id,
          newIssue.assignee
        );
      }
      
      return newIssue;
    })
  );
  
  return createdIssues;
}

export async function getIssueAction(issueId: string) {
  return await IssueService.getIssue(issueId);
}

export async function deleteIssueAction(issueId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }
  return await IssueService.deleteIssue(issueId);
}

export async function updateIssueTitleAndDescriptionAction(
  issueId: string,
  title: string,
  description: string,
  expectedVersion?: number,
  baseTitle?: string | null,
  baseDescription?: string | null
): Promise<IssueWithAssignee> {
  const user = await getCurrentUser();
  return await IssueService.updateIssueTitleAndDescription(
    issueId,
    title,
    description,
    expectedVersion,
    baseTitle,
    baseDescription,
    user?.id
  );
}

export async function updateIssueStateAction(
  issueId: string,
  state: IssueState
): Promise<IssueWithAssignee> {
  const issue = await IssueService.updateIssueState(issueId, state);
  if (state === IssueState.Done && issue.copany_id && issue.assignee) {
    await CopanyContributorService.createCopanyContributor(
      issue.copany_id,
      issue.assignee
    );
  }
  return issue;
}

export async function updateIssuePriorityAction(
  issueId: string,
  priority: IssuePriority
): Promise<IssueWithAssignee> {
  return await IssueService.updateIssuePriority(issueId, priority);
}

export async function updateIssueLevelAction(
  issueId: string,
  level: IssueLevel
): Promise<IssueWithAssignee> {
  return await IssueService.updateIssueLevel(issueId, level);
}

export async function updateIssueAssigneeAction(
  issueId: string,
  assignee: string | null
): Promise<IssueWithAssignee> {
  return await IssueService.updateIssueAssignee(issueId, assignee);
}
