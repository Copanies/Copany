# Local Development Setup Guide

> [中文版本](local-development-setup.zh.md) | English

This guide will help you set up the full Supabase development environment locally and connect it to your frontend project.

## 1. Install Docker

👉 [https://www.docker.com/](https://www.docker.com/)

## 2. Install Supabase CLI

👉 [https://supabase.com/docs/guides/local-development](https://supabase.com/docs/guides/local-development)

```bash
npm install -g supabase
```

## 3. Start Supabase in Your Project

```bash
npx supabase start
```

Example output:

```
        API URL: http://127.0.0.1:54321
    GraphQL URL: http://127.0.0.1:54321/graphql/v1
 S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
         DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
     Studio URL: http://127.0.0.1:54323
   Inbucket URL: http://127.0.0.1:54324
     JWT secret: XXXXXX
       anon key: XXXXXX
service_role key: XXXXXX
  S3 Access Key: XXXXXX
  S3 Secret Key: XXXXXX
      S3 Region: local
```

## 4. Create Environment File

Create a `.env.local` file and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=XXXXXX
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=XXXXXX

# GitHub OAuth Configuration
# Below is for Copany-dev (GitHub OAuth App for testing), you can also create your own GitHub OAuth App for testing
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=Ov23liDG2Vih89RwzedN
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=36e167a99f9f9cdcae7f4c9a3937303b9de221dd
```

## 5. Access Frontend

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 6. Use Supabase Studio

Visit [http://127.0.0.1:54323](http://127.0.0.1:54323)

More: [https://supabase.com/docs/reference/cli/introduction](https://supabase.com/docs/reference/cli/introduction)

## 7. Generate Migrations

After updating any database schema:

```bash
npx supabase db diff -f <migration_name>
```

This ensures your changes are tracked and can be deployed.

## 8. Follow Git Workflow

To contribute to this project, follow the standard Git flow:

1. **Create a new branch** based on `main` or `develop`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes locally** and test thoroughly.

3. **Commit your changes** with a meaningful message:

   ```bash
   git add .
   git commit -m "feat: implement your feature"
   ```

4. **Push your branch** to the remote repository:

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub and request a review.

6. After review and approval, your PR will be merged and migrations (if any) deployed by the maintainer.

## 9. Code Review & Deployment

- All code changes should go through Pull Requests.
- Automated CI/CD will run tests and check migrations.
- Migrations will be reviewed before applying to production.

---

Thank you for contributing! If you encounter issues, please open an issue or contact the maintainer.
