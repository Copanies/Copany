// Global empty value constants for stable references
// These constants provide stable references to avoid unnecessary re-renders and effect dependencies
import { UserInfo } from "@/actions/user.actions";
import type { IssueWithAssignee, CopanyContributorWithUserInfo, AssignmentRequest, IssueReviewer, Contribution } from "@/types/database.types";

export const EMPTY_ARRAY = [] as const;
export const EMPTY_OBJECT = {} as const;
export const EMPTY_STRING = "" as const;
export const EMPTY_FUNCTION = (() => {});

// Type-safe empty arrays for specific types
export const EMPTY_ISSUES_ARRAY = [] as IssueWithAssignee[];
export const EMPTY_CONTRIBUTION_ARRAY = [] as Contribution[];
export const EMPTY_CONTRIBUTORS_ARRAY = [] as CopanyContributorWithUserInfo[];
export const EMPTY_ASSIGNMENT_REQUESTS_ARRAY = [] as AssignmentRequest[];
export const EMPTY_REVIEWERS_ARRAY = [] as IssueReviewer[];
export const EMPTY_REVIEWERS_OBJECT = {} as Record<string, IssueReviewer[]>;
export const EMPTY_USER_INFOS_OBJECT = {} as Record<string, UserInfo>;

// Type-safe empty objects for specific types
export const EMPTY_ISSUE_DATA = null;
export const EMPTY_CAN_EDIT_BY_ISSUE = {} as Record<string, boolean>;
export const EMPTY_REVIEWERS_BY_ISSUE = {} as Record<string, IssueReviewer[]>;
export const EMPTY_PENDING_REQUESTERS_BY_ISSUE = {} as Record<string, string[]>;

// Common text constants
export const NO_TITLE_TEXT = "No title" as const;
