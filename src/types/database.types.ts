// Table: copany

export interface Copany {
  id: string;
  name: string;
  description: string;
  github_url: string | null;
  figma_url: string | null;
  notion_url: string | null;
  telegram_url: string | null;
  discord_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  website_url: string | null;
  apple_app_store_url: string | null;
  google_play_store_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  github_repository_id: string | null;
  is_connected_github: boolean;
  license: string | null;
  isDefaultUseCOSL: boolean;
  star_count?: number;
}

// Table: issue
export interface Issue {
  id: string;
  created_at: string;
  copany_id: string | null;
  title: string | null;
  description: string | null;
  state: number | null;
  priority: number | null;
  level: number | null;
  created_by: string | null;
  updated_at: string | null;
  content_version_updated_by?: string | null;
  content_version_updated_at?: string | null;
  closed_at: string | null;
  assignee: string | null;
  version?: number; // optimistic locking version
}

// Table: copany_contributor (after migration - removed name and avatar_url)
export interface CopanyContributor {
  id: string;
  copany_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  email: string;
  contribution: number;
}

// Extended type with user information from auth.users
export interface CopanyContributorWithUserInfo extends CopanyContributor {
  name: string;
  avatar_url: string;
}

// Table: issue_comment
export interface IssueComment {
  id: string;
  created_at: string;
  updated_at: string;
  issue_id: string;
  content: string;
  created_by: string;
  is_edited: boolean;
  parent_id: string | null;
}

export interface CopanyWithUser extends Copany {
  created_by_name: string;
}

export interface IssueWithAssignee extends Issue {
  assignee_user: AssigneeUser | null;
}

// Issue status enum
export enum IssueState {
  Backlog = 1,
  Todo = 2,
  InProgress = 3,
  InReview = 7,
  Done = 4,
  Canceled = 5,
  Duplicate = 6,
}

// Issue priority enum
export enum IssuePriority {
  None = 0,
  Urgent = 1,
  High = 2,
  Medium = 3,
  Low = 4,
}

// Issue level enum
export enum IssueLevel {
  level_None = 0,
  level_C = 1,
  level_B = 2,
  level_A = 3,
  level_S = 4,
}

export interface AssigneeUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface Contribution {
  id: string;
  user_id: string;
  copany_id: string;
  issue_id: string;
  issue_title: string;
  issue_level: number;
  year: number;
  month: number;
  day: number;
}

// Level score configuration
export const LEVEL_SCORES: Record<IssueLevel, number> = {
  [IssueLevel.level_C]: 5,
  [IssueLevel.level_B]: 20,
  [IssueLevel.level_A]: 60,
  [IssueLevel.level_S]: 200,
  [IssueLevel.level_None]: 0,
};

// Notification payload schema (fields are optional and may vary by type)
export interface NotificationPayload {
  from_user_name?: string;
  to_user_name?: string;
  from_state?: number | null;
  to_state?: number | null;
  from_priority?: number | null;
  to_priority?: number | null;
  from_level?: number | null;
  to_level?: number | null;
  issue_title?: string | null;
  discussion_title?: string | null;
  preview?: string | null;
  // Allow forward-compat fields without using `any`
  [key: string]: unknown;
}

// Notification
export type NotificationType =
  | "comment_reply"
  | "new_comment"
  | "new_issue"
  | "issue_assigned"
  | "issue_state_changed"
  | "issue_priority_changed"
  | "issue_level_changed"
  | "issue_closed"
  | "mention"
  | "assignment_request_received"
  | "assignment_request_accepted"
  | "assignment_request_refused"
  | "review_requested"
  | "review_approved"
  | "copany_starred"
  | "discussion_created"
  | "discussion_voted"
  | "discussion_comment_created"
  | "discussion_comment_voted"
  | "discussion_comment_reply";

export interface Notification {
  id: string;
  created_at: string;
  user_id: string;
  actor_id: string | null;
  copany_id: string | null;
  issue_id: string | null;
  comment_id: string | null;
  discussion_id: string | null;
  discussion_comment_id: string | null;
  type: NotificationType;
  payload: NotificationPayload;
  read_at: string | null;
  is_read: boolean;
}

// Issue Activity
export type IssueActivityType =
  | "issue_created"
  | "title_changed"
  | "state_changed"
  | "priority_changed"
  | "level_changed"
  | "assignee_changed"
  | "issue_closed"
  | "review_requested"
  | "review_approved"
  | "assignment_requested"
  | "assignment_request_accepted"
  | "assignment_request_refused";

export interface IssueActivityPayload {
  issue_title?: string | null;
  from_title?: string | null;
  to_title?: string | null;
  from_state?: number | null;
  to_state?: number | null;
  from_priority?: number | null;
  to_priority?: number | null;
  from_level?: number | null;
  to_level?: number | null;
  from_user_id?: string | null;
  to_user_id?: string | null;
  from_user_name?: string | null;
  to_user_name?: string | null;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  requester_id?: string | null;
  requester_name?: string | null;
  recipient_id?: string | null;
  recipient_name?: string | null;
  [key: string]: unknown;
}

export interface IssueActivity {
  id: string;
  created_at: string;
  copany_id: string | null;
  issue_id: string;
  actor_id: string | null;
  type: IssueActivityType;
  payload: IssueActivityPayload;
}

// Issue Reviewer
export type ReviewerStatus = "requested" | "approved";

export interface IssueReviewer {
  id: string;
  created_at: string;
  updated_at: string;
  issue_id: string;
  reviewer_id: string;
  status: ReviewerStatus;
}

// Assignment Request
export interface AssignmentRequest {
  id: string;
  created_at: string;
  updated_at: string;
  copany_id: string;
  issue_id: string;
  requester_id: string;
  recipient_id: string;
  message: string | null;
}

// Finance: Distribute & Transactions
export type DistributeStatus = "in_progress" | "in_review" | "confirmed";

export interface DistributeRow {
  id: string;
  created_at: string;
  updated_at: string;
  copany_id: string;
  to_user: string;
  bank_card_number: string;
  status: DistributeStatus;
  contribution_percent: number; // numeric(5,2)
  amount: number; // numeric(18,2)
  currency: string; // e.g., USD
  evidence_url: string | null;
}

export type TransactionType = "income" | "expense";
export type TransactionReviewStatus = "in_review" | "confirmed";

export interface TransactionRow {
  id: string;
  created_at: string;
  updated_at: string;
  copany_id: string;
  actor_id: string;
  type: TransactionType;
  description: string | null;
  amount: number;
  currency: string;
  status: TransactionReviewStatus;
  occurred_at: string; // when the income/expense happened
  evidence_url: string | null;
}

// Table: discussion
export interface Discussion {
  id: string;
  created_at: string;
  updated_at: string;
  copany_id: string;
  title: string;
  description: string | null;
  creator_id: string | null;
  labels: string[]; // Array of discussion_label IDs
  issue_id: string | null;
  vote_up_count: number;
  comment_count: number;
}

// Table: discussion_label
export interface DiscussionLabel {
  id: string;
  created_at: string;
  updated_at: string;
  copany_id: string;
  creator_id: string;
  name: string;
  color: string;
  description: string | null;
}

// Table: discussion_comment
export interface DiscussionComment {
  id: string;
  created_at: string;
  updated_at: string;
  discussion_id: string;
  content: string | null;
  created_by: string | null;
  is_edited: boolean;
  parent_id: string | null;
  vote_up_count: number;
  deleted_at: string | null;
}

// Table: discussion_vote
export interface DiscussionVoteRow {
  id: string;
  created_at: string;
  discussion_id: string;
  user_id: string;
}

// Table: discussion_comment_vote
export interface DiscussionCommentVoteRow {
  id: string;
  created_at: string;
  comment_id: string;
  user_id: string;
}
