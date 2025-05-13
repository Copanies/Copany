import { Copany } from "@/types/types";

export class DatabaseService {
  constructor(private db: D1Database) {}
  async getAllCopaniesWithUser() {
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

  async getById(id: number) {
    const { results } = await this.db
      .prepare("SELECT * FROM Copany WHERE id = ?")
      .bind(id)
      .all();
    return results[0];
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

  // async getGithubUser(githubId: string) {
  //   const { results: accounts } = await this.db
  //     .prepare(
  //       "SELECT * FROM accounts WHERE provider = 'github' AND providerAccountId = ?"
  //     )
  //     .bind(githubId)
  //     .all();
  //   if (accounts.length === 0) {
  //     return null;
  //   }

  //   const account = accounts[0];
  //   const { results: users } = await this.db
  //     .prepare("SELECT * FROM users WHERE id = ?")
  //     .bind(account.userId)
  //     .all();
  //   if (users.length === 0) {
  //     return null;
  //   }

  //   return {
  //     id: String(account.userId),
  //     avatar_url: String(users[0].avatar_url),
  //     name: String(users[0].name),
  //   };
  // }
}
