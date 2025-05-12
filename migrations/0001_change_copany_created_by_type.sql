-- Migration number: 0001 	 2025-05-10T02:08:53.993Z
-- npx wrangler d1 migrations create DB change_copany_created_by_type
-- Create new table, change created_by to TEXT type
CREATE TABLE Copany_new (
  id INTEGER PRIMARY KEY,
  github_url TEXT,
  name TEXT,
  description TEXT,
  created_by TEXT, -- ← type changed to TEXT
  project_type TEXT,
  project_stage TEXT,
  main_language TEXT,
  license TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Copy old table data, CAST created_by to TEXT
INSERT INTO Copany_new (
  id, github_url, name, description, created_by,
  project_type, project_stage, main_language,
  license, created_at, updated_at
)
SELECT
  id, github_url, name, description, CAST(created_by AS TEXT),
  project_type, project_stage, main_language,
  license, created_at, updated_at
FROM Copany;

-- Drop old table
DROP TABLE Copany;

-- Rename new table
ALTER TABLE Copany_new RENAME TO Copany;

-- npx wrangler d1 migrations apply DB