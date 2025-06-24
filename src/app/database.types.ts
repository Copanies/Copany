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
  created_by: string | null;
  updated_at: string | null;
  closed_at: string | null;
  assignee: string | null;
}
