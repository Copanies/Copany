"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";
import { saveUserMetadataToCache } from "@/services/userMetadataProtection.service";

/**
 * Authentication related Server Actions
 */

/**
 * GitHub OAuth login - Using PKCE flow
 */
export async function signInWithGitHub() {
  console.log("🚀 Starting GitHub OAuth login");

  // Save current user metadata to cache before linking (if user is already logged in)
  try {
    await saveUserMetadataToCache();
  } catch (error) {
    console.warn("⚠️ Failed to save user metadata to cache:", error);
    // Don't block the OAuth flow if caching fails
  }

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
      redirectTo: `${siteUrl!}/auth/callback?provider=github`,
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
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, name: string) {
  console.log("📝 Starting email sign up for:", email);

  const supabase = await createSupabaseClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    console.error("❌ Email sign up failed:", error.message);
    throw new Error(`Sign up failed: ${error.message}`);
  }

  console.log("✅ Email sign up successful");
  return data;
}

/**
 * Resend email verification for signup
 */
export async function resendVerificationEmail(email: string) {
  console.log("📧 Resending verification email to:", email);

  const supabase = await createSupabaseClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
    },
  });

  if (error) {
    console.error("❌ Resend verification email failed:", error.message);
    throw new Error(`Resend verification email failed: ${error.message}`);
  }

  console.log("✅ Verification email resent");
  return data;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  console.log("🔑 Starting email sign in for:", email);

  const supabase = await createSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("❌ Email sign in failed:", error.message);
    throw new Error(`Sign in failed: ${error.message}`);
  }

  console.log("✅ Email sign in successful");
  return data;
}

/**
 * Google OAuth login
 */
export async function signInWithGoogle() {
  const step = (label: string) =>
    console.log(`[Google OAuth] ${Date.now()} ${label}`);

  step("1/5 Started");

  // Save current user metadata to cache before linking (if user is already logged in)
  try {
    step("2/5 Before saveUserMetadataToCache");
    await saveUserMetadataToCache();
    step("2/5 After saveUserMetadataToCache (ok or skipped)");
  } catch (error) {
    console.warn("[Google OAuth] saveUserMetadataToCache failed (non-blocking):", error);
    step("2/5 After saveUserMetadataToCache (error, continuing)");
  }

  step("3/5 Before createSupabaseClient");
  const supabase = await createSupabaseClient();
  step("3/5 After createSupabaseClient");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.error("[Google OAuth] NEXT_PUBLIC_SITE_URL not set");
    throw new Error(
      "NEXT_PUBLIC_SITE_URL environment variable is not set. Please check your .env.local file."
    );
  }
  step(`3/5 NEXT_PUBLIC_SITE_URL=${siteUrl}`);

  step("4/5 Before signInWithOAuth (calling Supabase Auth API)");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?provider=google`,
    },
  });
  step("4/5 After signInWithOAuth");

  if (error) {
    console.error("[Google OAuth] signInWithOAuth error:", error.message);
    throw new Error(`Google login failed: ${error.message}`);
  }

  if (data.url) {
    step("5/5 Redirecting to Google authorization page");
    redirect(data.url); // This will throw NEXT_REDIRECT, which is normal
  } else {
    console.error("[Google OAuth] No URL in signInWithOAuth response");
    throw new Error("Failed to get Google authorization URL");
  }
}

/**
 * Figma OAuth login
 */
export async function signInWithFigma() {
  console.log("🚀 Starting Figma OAuth login");

  // Save current user metadata to cache before linking (if user is already logged in)
  try {
    await saveUserMetadataToCache();
  } catch (error) {
    console.warn("⚠️ Failed to save user metadata to cache:", error);
    // Don't block the OAuth flow if caching fails
  }

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
    provider: "figma",
    options: {
      redirectTo: `${siteUrl!}/auth/callback?provider=figma`,
    },
  });

  if (error) {
    console.error("❌ Figma login failed:", error.message);
    throw new Error(`Figma login failed: ${error.message}`);
  }

  if (data.url) {
    console.log("↗️ Redirecting to Figma authorization page");
    redirect(data.url); // This will throw NEXT_REDIRECT, which is normal
  } else {
    console.log("⚠️ Failed to get Figma authorization URL");
    throw new Error("Failed to get Figma authorization URL");
  }
}

/**
 * Discord OAuth login
 */
export async function signInWithDiscord() {
  console.log("🚀 Starting Discord OAuth login");

  // Save current user metadata to cache before linking (if user is already logged in)
  try {
    await saveUserMetadataToCache();
  } catch (error) {
    console.warn("⚠️ Failed to save user metadata to cache:", error);
    // Don't block the OAuth flow if caching fails
  }

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
    provider: "discord",
    options: {
      redirectTo: `${siteUrl!}/auth/callback?provider=discord`,
    },
  });

  if (error) {
    console.error("❌ Discord login failed:", error.message);
    throw new Error(`Discord login failed: ${error.message}`);
  }

  if (data.url) {
    console.log("↗️ Redirecting to Discord authorization page");
    redirect(data.url); // This will throw NEXT_REDIRECT, which is normal
  } else {
    console.log("⚠️ Failed to get Discord authorization URL");
    throw new Error("Failed to get Discord authorization URL");
  }
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
