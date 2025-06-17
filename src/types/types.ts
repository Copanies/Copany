// Basic type, corresponding to database table structure
export interface Copany {
  id: number;
  github_url: string;
  name: string;
  description: string;
  created_by: string;
  organization_avatar_url: string | null;
  project_type: string;
  project_stage: string;
  main_language: string;
  license: string;
  created_at: string;
  updated_at: string | null;
}

// Extended type, including related data
export interface CopanyWithUser extends Copany {
  created_by_name: string | null;
}

export interface Issue {
  id: number;
  copany_id: number;
  title: string;
  description: string;
  url: string;
  state: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
}

// export interface CopanyPR {
//   id: number;
//   title: string;
//   created_at: string;
//   updated_at: string;
//   user: GithubUser;
//   url: string;
//   html_url: string;
//   diff_url: string;
//   issue_url: string;
//   state: string;
//   diff: string;
// }

// export interface GithubUser {
//   id: string;
//   login: string;
//   avatar_url: string;
//   name: string;
//   html_url: string;
// }
