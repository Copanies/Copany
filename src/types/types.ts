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

// If more related data is needed, can continue to extend
export interface CopanyWithDetails extends CopanyWithUser {
  // Other related data
  // For example: contributors, stars, forks etc.
}
