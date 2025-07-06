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
  return await IssueService.getIssues(copanyId);
}

export async function createIssueAction(
  issue: Omit<
    Issue,
    "id" | "created_at" | "updated_at" | "assignee" | "closed_at" | "created_by"
  >
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }
  return await IssueService.createIssue({
    ...issue,
    created_by: user.id,
  });
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

export async function updateIssueAction(
  issue: Omit<
    Issue,
    | "created_at"
    | "updated_at"
    | "assignee"
    | "closed_at"
    | "created_by"
    | "copany_id"
  >
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not found");
  }
  return await IssueService.updateIssue({
    ...issue,
  });
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
