"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";
import { clearGithubTokenCookie } from "@/services/github.service";

/**
 * Authentication related Server Actions
 */

/**
 * GitHub OAuth login - Using PKCE flow
 */
export async function signInWithGitHub() {
  console.log("🚀 Starting GitHub OAuth login");

  const supabase = await createSupabaseClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  // Check required environment variables
  if (!siteUrl) {
    console.error("❌ NEXT_PUBLIC_SITE_URL not set");
    throw new Error(
      "NEXT_PUBLIC_SITE_URL environment variable is not set. Please check your .env.local file."
    );
  }

  console.log("🔍 NEXT_PUBLIC_SITE_URL set to:", siteUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${siteUrl!}/auth/callback`,
      scopes: "read:user read:org",
    },
  });

  if (error) {
    console.error("❌ GitHub login failed:", error.message);
    throw new Error(`GitHub login failed: ${error.message}`);
  }

  if (data.url) {
    console.log("↗️ Redirecting to GitHub authorization page");
    redirect(data.url); // This will throw NEXT_REDIRECT, which is normal
  } else {
    console.log("⚠️ Failed to get GitHub authorization URL");
    throw new Error("Failed to get GitHub authorization URL");
  }
}

/**
 * User sign out
 */
export async function signOut() {
  console.log("🔓 Starting user sign out");

  const supabase = await createSupabaseClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("❌ Sign out failed:", error.message);
    throw new Error(`Sign out failed: ${error.message}`);
  }

  // Clear GitHub access token Cookie
  await clearGithubTokenCookie();

  console.log("✅ User sign out successful");
  redirect("/"); // This will throw NEXT_REDIRECT, which is normal
}

/**
 * Get current user information
 * Note: In SSR environment, if there's no authentication session, returns null instead of throwing an error
 */
export async function getCurrentUser(): Promise<User | null> {
  console.log("👤 Getting current user information");

  try {
    const supabase = await createSupabaseClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // If it's an authentication session missing error, this is normal (user not logged in)
      if (error.message?.includes("Auth session missing")) {
        console.log("ℹ️ User not logged in (session missing)");
        return null;
      }
      console.error("❌ Failed to get user information:", error.message);
      return null;
    }

    if (user) {
      console.log("✅ User logged in:", user.email || user.id);
    } else {
      console.log("ℹ️ User not logged in");
    }

    return user;
  } catch (error) {
    // Catch any unexpected errors to avoid crashes
    console.error("❌ Exception when getting user information:", error);
    return null;
  }
}
