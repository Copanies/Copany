"use server";

import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";
import { saveUserMetadataToCache } from "@/services/userMetadataProtection.service";

const AUTH_TIMEOUT_MS = 20_000; // Fail fast instead of waiting 300s for Cloud Run

function withAuthTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS)
  );
  return Promise.race([promise, timeout]);
}

/**
 * GitHub OAuth login - Using PKCE flow
 */
export async function signInWithGitHub() {
  await withAuthTimeout(
    (async () => {
      console.log("🚀 Starting GitHub OAuth login");
      try {
        await saveUserMetadataToCache();
      } catch (error) {
        console.warn("⚠️ Failed to save user metadata to cache:", error);
      }

      const supabase = await createSupabaseClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        throw new Error(
          "NEXT_PUBLIC_SITE_URL environment variable is not set. Please check your .env.local file."
        );
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${siteUrl}/auth/callback?provider=github`,
          scopes: "read:user read:org",
        },
      });

      if (error) throw new Error(`GitHub login failed: ${error.message}`);
      if (data.url) redirect(data.url);
      throw new Error("Failed to get GitHub authorization URL");
    })(),
    "GitHub login timed out. Please try again."
  );
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, name: string) {
  return withAuthTimeout(
    (async () => {
      console.log("📝 Starting email sign up for:", email);
      const supabase = await createSupabaseClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined,
          data: { full_name: name },
        },
      });
      if (error) throw new Error(`Sign up failed: ${error.message}`);
      console.log("✅ Email sign up successful");
      return data;
    })(),
    "Sign up timed out. Please try again."
  );
}

/**
 * Resend email verification for signup
 */
export async function resendVerificationEmail(email: string) {
  return withAuthTimeout(
    (async () => {
      console.log("📧 Resending verification email to:", email);
      const supabase = await createSupabaseClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: siteUrl ? `${siteUrl}/auth/callback` : undefined },
      });
      if (error) throw new Error(`Resend verification email failed: ${error.message}`);
      console.log("✅ Verification email resent");
      return data;
    })(),
    "Resend verification timed out. Please try again."
  );
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  return withAuthTimeout(
    (async () => {
      console.log("🔑 Starting email sign in for:", email);
      const supabase = await createSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(`Sign in failed: ${error.message}`);
      console.log("✅ Email sign in successful");
      return data;
    })(),
    "Login timed out. Please try again."
  );
}

/**
 * Google OAuth login
 */
export async function signInWithGoogle() {
  const step = (label: string) =>
    console.log(`[Google OAuth] ${Date.now()} ${label}`);
  step("1/5 Started");

  await withAuthTimeout(
    (async () => {
      try {
        step("2/5 Before saveUserMetadataToCache");
        await saveUserMetadataToCache();
        step("2/5 After saveUserMetadataToCache (ok or skipped)");
      } catch (error) {
        console.warn("[Google OAuth] saveUserMetadataToCache failed (non-blocking):", error);
      }

      step("3/5 Before createSupabaseClient");
      const supabase = await createSupabaseClient();
      step("3/5 After createSupabaseClient");

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        throw new Error(
          "NEXT_PUBLIC_SITE_URL environment variable is not set. Please check your .env.local file."
        );
      }
      step("4/5 Before signInWithOAuth");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${siteUrl}/auth/callback?provider=google` },
      });
      step("4/5 After signInWithOAuth");

      if (error) throw new Error(`Google login failed: ${error.message}`);
      if (data.url) redirect(data.url);
      throw new Error("Failed to get Google authorization URL");
    })(),
    "Login timed out. Please try again."
  );
}

/**
 * Figma OAuth login
 */
export async function signInWithFigma() {
  await withAuthTimeout(
    (async () => {
      console.log("🚀 Starting Figma OAuth login");
      try {
        await saveUserMetadataToCache();
      } catch (error) {
        console.warn("⚠️ Failed to save user metadata to cache:", error);
      }

      const supabase = await createSupabaseClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        throw new Error(
          "NEXT_PUBLIC_SITE_URL environment variable is not set. Please check your .env.local file."
        );
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "figma",
        options: { redirectTo: `${siteUrl}/auth/callback?provider=figma` },
      });

      if (error) throw new Error(`Figma login failed: ${error.message}`);
      if (data.url) redirect(data.url);
      throw new Error("Failed to get Figma authorization URL");
    })(),
    "Figma login timed out. Please try again."
  );
}

/**
 * Discord OAuth login
 */
export async function signInWithDiscord() {
  await withAuthTimeout(
    (async () => {
      console.log("🚀 Starting Discord OAuth login");
      try {
        await saveUserMetadataToCache();
      } catch (error) {
        console.warn("⚠️ Failed to save user metadata to cache:", error);
      }

      const supabase = await createSupabaseClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        throw new Error(
          "NEXT_PUBLIC_SITE_URL environment variable is not set. Please check your .env.local file."
        );
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${siteUrl}/auth/callback?provider=discord` },
      });

      if (error) throw new Error(`Discord login failed: ${error.message}`);
      if (data.url) redirect(data.url);
      throw new Error("Failed to get Discord authorization URL");
    })(),
    "Discord login timed out. Please try again."
  );
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
