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
  website_url: string | null;
  apple_app_store_url: string | null;
  google_play_store_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  github_repository_id: string | null;
  is_connected_github: boolean;
  license: string | null;
}

export interface CopanyWithUser extends Copany {
  created_by_name: string;
}

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
  closed_at: string | null;
  assignee: string | null;
}

export interface IssueWithAssignee extends Issue {
  assignee_user: AssigneeUser | null;
}

// Issue status enum
export enum IssueState {
  Backlog = 1,
  Todo = 2,
  InProgress = 3,
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

export interface CopanyContributor {
  id: string;
  copany_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  avatar_url: string;
  contribution: number;
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
