# CONTRIBUTING

> [中文版本](https://github.com/Copanies/Copany/blob/main/CONTRIBUTING.zh.md) | English

This guide will help you set up the full Supabase development environment locally and connect it to your frontend project.

## How to Contribute

1. **Create and Complete a Task (Issue)**

   1. **Start a discussion:**

      Before creating an Issue, open a discussion to align with others on ideas and direction.

   2. **Create an Issue:**

      Once agreed, create one or more Issues, assign an owner, and set a complexity level.

   3. **Submit for Review:**

      When done, change the Issue status to In Review for quality and complexity evaluation.

   4. **Mark as Done:**

      After approval, change the status to Done. The result (code, design, etc.) will be merged, and contribution points granted accordingly.

2. **Claim and Complete an Existing Task**
   1. Browse available Issues in the Collaboration section, reviewing details and complexity levels.
   2. Assign yourself as the Assignee.
   3. After review by the project lead or Issue creator, begin execution.
   4. Follow the same review and completion process as above.

## Development Environment Setup

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

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE

# Figma OAuth Configuration
NEXT_PUBLIC_FIGMA_CLIENT_ID=YOUR_FIGMA_CLIENT_ID_HERE
FIGMA_CLIENT_SECRET=YOUR_FIGMA_CLIENT_SECRET_HERE

# AES Encryption Key for Payment Links (32 bytes in hex format)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AES_KEY=YOUR_32_BYTE_HEX_KEY_HERE
```

## 4.1. OAuth Configuration Guide (Optional)

### GitHub OAuth Setup

1. **Create a GitHub OAuth App:**

   - Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in:
     - **Application name**: Your app name
     - **Homepage URL**: `http://localhost:3000`
     - **Authorization callback URL**: `http://127.0.0.1:54321/auth/v1/callback`

2. **Get your credentials:**

   - Copy the **Client ID** and **Client Secret** from your OAuth App
   - Update the environment variables:
     ```env
     SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=your_github_client_id
     SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=your_github_client_secret
     ```

3. **Without GitHub OAuth:** You cannot use GitHub login.

### Google OAuth Setup

1. **Create a Google OAuth App:**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to "Credentials" > "Create Credentials" > "OAuth 2.0 Client IDs"
   - Fill in:
     - **Application type**: Web application
     - **Authorized redirect URIs**: `http://127.0.0.1:54321/auth/v1/callback`

2. **Get your credentials:**

   - Copy the **Client ID** and **Client Secret**
   - Update the environment variables:
     ```env
     NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
     GOOGLE_CLIENT_SECRET=your_google_client_secret
     ```

3. **Without Google OAuth:** You cannot use Google login.

### Figma OAuth Setup

1. **Create a Figma App:**

   - Go to [Figma Developer Settings](https://www.figma.com/developers/apps)
   - Click "Create new app"
   - Fill in:
     - **App name**: Your app name
     - **Redirect URI**: `http://127.0.0.1:54321/auth/v1/callback`

2. **Get your credentials:**

   - Copy the **Client ID** and **Client Secret** from your Figma App
   - Update the environment variables:
     ```env
     NEXT_PUBLIC_FIGMA_CLIENT_ID=your_figma_client_id
     FIGMA_CLIENT_SECRET=your_figma_client_secret
     ```

3. **Without Figma OAuth:** You cannot use Figma login.

## 5. Access Frontend

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 5.1. Local Build Test (Optional)

To test the production build locally:

```bash
./build.local.sh
```

This will build the project and start a local production server for testing.

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
- Migrations will be reviewed before applying to production.

---

Thank you for contributing! If you encounter issues, please open an issue or contact the maintainer.
