import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createSupabaseClient() {
  const cookieStore = await cookies();

  // Debug logs: Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check required environment variables
  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL not set");
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL environment variable is not set. Please check your .env.local file."
    );
  }

  if (!supabaseAnonKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set. Please check your .env.local file."
    );
  }

  try {
    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll();
          return allCookies;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn(
              "⚠️ Server component called setAll, can be ignored",
              error
            );
          }
        },
      },
    });

    console.log("✅ Supabase server client created successfully");
    return client;
  } catch (error) {
    console.error("❌ Failed to create Supabase server client:", error);
    throw error;
  }
}

export async function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL not set");
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL environment variable is not set. Please check your .env.local file."
    );
  }

  if (!supabaseServiceRoleKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set");
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Please check your .env.local file."
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase;
}
