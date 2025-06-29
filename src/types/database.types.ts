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
  created_by: string | null;
  updated_at: string | null;
  closed_at: string | null;
  assignee: string | null;
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
