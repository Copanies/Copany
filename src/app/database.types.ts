export interface Copany {
  id: string;
  name: string;
  description: string;
  github_url: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CopanyWithUser extends Copany {
  created_by_name: string;
}
