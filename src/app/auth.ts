import NextAuth from "next-auth";
import { NextAuthResult } from "next-auth";
import { D1Adapter } from "@auth/d1-adapter";
import GithubProvider from "next-auth/providers/github";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const authResult = async (): Promise<NextAuthResult> => {
  return NextAuth({
    providers: [
      GithubProvider({
        clientId: (await getCloudflareContext({ async: true })).env
          .GITHUB_CLIENT_ID,
        clientSecret: (await getCloudflareContext({ async: true })).env
          .GITHUB_CLIENT_SECRET,
        authorization: { params: { scope: "read:user read:org" } },
      }),
    ],
    adapter: D1Adapter((await getCloudflareContext({ async: true })).env.DB),
    callbacks: {
      async signIn({ account }) {
        if (account?.provider === "github" && account?.access_token) {
          // Manually update the scope and access_token fields in D1
          const db = (await getCloudflareContext({ async: true })).env.DB;
          await db
            .prepare(
              `
            UPDATE accounts
            SET scope = ?, access_token = ?
            WHERE provider = 'github' AND providerAccountId = ?
          `
            )
            .bind(
              account.scope,
              account.access_token,
              account.providerAccountId
            )
            .run();
        }
        return true;
      },
    },
  });
};

export const { handlers, signIn, signOut, auth } = await authResult();
