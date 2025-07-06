export interface Copany {
  id: string;
  name: string;
  description: string;
  github_url: string;
  organization_avatar_url: string;
  created_at: string;
  updated_at: string;
  created_by: string;
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

// Issue 状态枚举
export enum IssueState {
  Backlog = 1,
  Todo = 2,
  InProgress = 3,
  Done = 4,
  Canceled = 5,
  Duplicate = 6,
}

// Issue 优先级枚举
export enum IssuePriority {
  None = 0,
  Urgent = 1,
  High = 2,
  Medium = 3,
  Low = 4,
}

// Issue 等级枚举
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
