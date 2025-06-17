import { Copany, Issue } from "@/types/types";

export class DatabaseService {
  constructor(private db: D1Database) {}
  async getAllCopanies() {
    const { results } = await this.db
      .prepare(
        `
        SELECT 
          Copany.*,
          users.name AS created_by_name
        FROM 
          Copany
        LEFT JOIN 
          users
        ON 
          Copany.created_by = users.id
        ORDER BY 
          Copany.created_at DESC
      `
      )
      .all();
    return results;
  }

  async getCopanyById(id: number) {
    const { results } = await this.db
      .prepare("SELECT * FROM Copany WHERE id = ?")
      .bind(id)
      .all();
    return results[0];
  }

  async createCopany(data: Omit<Copany, "id" | "created_at" | "updated_at">) {
    const now = new Date().toISOString();
    return await this.db
      .prepare(
        `
      INSERT INTO Copany (
        github_url, name, description, created_by, organization_avatar_url,
        project_type, project_stage, main_language, 
        license, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .bind(
        data.github_url,
        data.name,
        data.description,
        data.created_by,
        data.organization_avatar_url,
        data.project_type,
        data.project_stage,
        data.main_language,
        data.license,
        now,
        now
      )
      .run();
  }

  async deleteCopany(id: number) {
    return await this.db
      .prepare("DELETE FROM Copany WHERE id = ?")
      .bind(id)
      .run();
  }

  async updateCopany(
    id: number,
    data: Partial<Omit<Copany, "id" | "created_at" | "updated_at">>
  ) {
    const now = new Date().toISOString();
    const {
      github_url,
      name,
      description,
      organization_avatar_url,
      project_type,
      project_stage,
      main_language,
      license,
    } = data;
    return await this.db
      .prepare(
        `
        UPDATE Copany SET 
        github_url = ?, 
        name = ?, 
        description = ?, 
        organization_avatar_url = ?,
        project_type = ?, 
        project_stage = ?, 
        main_language = ?, 
        license = ?, 
        updated_at = ? 
        WHERE id = ?`
      )
      .bind(
        github_url,
        name,
        description,
        organization_avatar_url,
        project_type,
        project_stage,
        main_language,
        license,
        now,
        id
      )
      .run();
  }

  async getAccessToken(userId: string) {
    const { results } = await this.db
      .prepare(
        "SELECT access_token FROM accounts WHERE userId = ? AND provider = 'github' AND scope LIKE '%read:user%' AND scope LIKE '%read:org%'"
      )
      .bind(userId)
      .all();
    console.log("results", results);
    return results[0].access_token;
  }

  // Issues
  async getAllIssues(copanyId: number) {
    const { results } = await this.db
      .prepare("SELECT * FROM issues WHERE copany_id = ?")
      .bind(copanyId)
      .all();
    return results;
  }

  async getIssueById(id: number) {
    const { results } = await this.db
      .prepare("SELECT * FROM issues WHERE id = ?")
      .bind(id)
      .all();
    return results[0];
  }
  async createIssue(data: Omit<Issue, "id" | "created_at" | "updated_at">) {
    const now = new Date().toISOString();
    return await this.db
      .prepare(
        "INSERT INTO issues (copany_id, title, description, url, state, created_by_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        data.copany_id,
        data.title,
        data.description,
        data.url,
        data.state,
        data.created_by_id,
        now,
        now
      )
      .run();
  }

  async updateIssue(data: Partial<Issue>) {
    const now = new Date().toISOString();
    return await this.db
      .prepare(
        "UPDATE issues SET title = ?, description = ?, updated_at = ? WHERE id = ?"
      )
      .bind(data.title, data.description, now, data.id)
      .run();
  }

  async deleteIssue(id: number) {
    return await this.db
      .prepare("DELETE FROM issues WHERE id = ?")
      .bind(id)
      .run();
  }
}
