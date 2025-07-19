import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
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
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey);

    console.log("✅ Supabase browser client created successfully");
    return client;
  } catch (error) {
    console.error("❌ Failed to create Supabase browser client:", error);
    throw error;
  }
}
