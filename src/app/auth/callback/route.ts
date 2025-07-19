import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";

  console.log("🔄 OAuth callback handling - code:", !!code, "next:", next);

  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
    console.log("⚠️ next parameter is not a relative path, resetting to /");
  }

  if (code) {
    try {
      const supabase = await createSupabaseClient();
      console.log("🔑 Exchanging authorization code...");

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        console.log("✅ Authorization code exchange successful");

        // First verify user identity, then get the provider_token from the session
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        let providerToken: string | null = null;

        if (userError || !user) {
          console.warn("⚠️ User verification failed, cannot set Cookie");
        } else {
          // After user identity verification, get provider_token from session
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (!sessionError && session?.provider_token) {
            console.log("🍪 Retrieved GitHub access token");
            providerToken = session.provider_token;
          } else {
            console.warn("⚠️ provider_token not found, cannot set Cookie");
          }
        }

        const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
        const isLocalEnv = process.env.NODE_ENV === "development";

        let redirectUrl: string;
        if (isLocalEnv) {
          // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
          redirectUrl = `${origin}${next}`;
        } else if (forwardedHost) {
          redirectUrl = `https://${forwardedHost}${next}`;
        } else {
          redirectUrl = `${origin}${next}`;
        }

        console.log("↗️ Redirecting to:", redirectUrl);
        const response = NextResponse.redirect(redirectUrl);

        // If user verification passes and provider_token exists, set it in a Cookie
        if (!userError && user && providerToken) {
          // Set HttpOnly Cookie with 7-day validity
          response.cookies.set("github_access_token", providerToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
          });
          console.log("✅ GitHub access token saved to Cookie");
        }

        return response;
      } else {
        console.error("❌ Authorization code exchange failed:", error.message);
      }
    } catch (error) {
      console.error("❌ OAuth callback handling exception:", error);
    }
  } else {
    console.log("⚠️ No authorization code received");
  }

  // return the user to an error page with instructions
  const errorUrl = `${origin}/auth/auth-code-error`;
  console.log("❌ Redirecting to error page:", errorUrl);
  return NextResponse.redirect(errorUrl);
}
