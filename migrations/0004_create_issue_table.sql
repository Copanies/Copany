-- Migration number: 0004 	 2025-06-17T09:39:59.917Z
-- npx wrangler d1 migrations create DB create_issue_table
-- Create issues table
CREATE TABLE issues (
  id INTEGER PRIMARY KEY,
  copany_id INTEGER,
  title TEXT,
  description TEXT,
  url TEXT,
  state TEXT,
  created_by_id TEXT,
  created_at TEXT,
  updated_at TEXT,
  closed_at TEXT,
  FOREIGN KEY (copany_id) REFERENCES Copany(id) ON DELETE CASCADE
);

-- npx wrangler d1 migrations apply DB
