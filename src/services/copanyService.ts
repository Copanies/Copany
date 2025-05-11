import { Copany } from "@/types/types";

export class CopanyService {
  constructor(private db: D1Database) {}

  async getAll() {
    const { results } = await this.db.prepare("SELECT * FROM Copany").all();
    return results;
  }

  async create(data: Omit<Copany, "id" | "created_at" | "updated_at">) {
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

  async delete(id: number) {
    return await this.db
      .prepare("DELETE FROM Copany WHERE id = ?")
      .bind(id)
      .run();
  }

  async update(
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
}
