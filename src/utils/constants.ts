// Global empty value constants for stable references
// These constants provide stable references to avoid unnecessary re-renders and effect dependencies
import type { IssueWithAssignee, CopanyContributor, AssignmentRequest, IssueReviewer } from "@/types/database.types";

export const EMPTY_ARRAY = [] as const;
export const EMPTY_OBJECT = {} as const;
export const EMPTY_STRING = "" as const;
export const EMPTY_FUNCTION = (() => {});

// Type-safe empty arrays for specific types
export const EMPTY_ISSUES_ARRAY = [] as IssueWithAssignee[];
export const EMPTY_CONTRIBUTORS_ARRAY = [] as CopanyContributor[];
export const EMPTY_ASSIGNMENT_REQUESTS_ARRAY = [] as AssignmentRequest[];
export const EMPTY_REVIEWERS_ARRAY = [] as IssueReviewer[];
export const EMPTY_USER_INFOS_OBJECT = {} as Record<string, { name: string; email: string; avatar_url: string }>;

// Type-safe empty objects for specific types
export const EMPTY_ISSUE_DATA = null;
export const EMPTY_CAN_EDIT_BY_ISSUE = {} as Record<string, boolean>;
export const EMPTY_REVIEWERS_BY_ISSUE = {} as Record<string, IssueReviewer[]>;
export const EMPTY_PENDING_REQUESTERS_BY_ISSUE = {} as Record<string, string[]>;

// Common text constants
export const NO_TITLE_TEXT = "No title" as const;
