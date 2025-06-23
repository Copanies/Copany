import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";

  console.log("🔄 OAuth 回调处理 - code:", !!code, "next:", next);

  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
    console.log("⚠️ next 参数不是相对路径，重置为 /");
  }

  if (code) {
    try {
      const supabase = await createClient();
      console.log("🔑 正在交换授权码...");

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        console.log("✅ 授权码交换成功");

        // 先验证用户身份，然后获取会话中的 provider_token
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        let providerToken: string | null = null;

        if (userError || !user) {
          console.warn("⚠️ 用户验证失败，无法设置 Cookie");
        } else {
          // 用户身份验证成功后，获取会话中的 provider_token
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (!sessionError && session?.provider_token) {
            console.log("🍪 获取到 GitHub access token");
            providerToken = session.provider_token;
          } else {
            console.warn("⚠️ 未找到 provider_token，无法设置 Cookie");
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

        console.log("↗️ 重定向到:", redirectUrl);
        const response = NextResponse.redirect(redirectUrl);

        // 如果用户验证通过且有 provider_token，设置到 Cookie
        if (!userError && user && providerToken) {
          // 设置 HttpOnly Cookie，有效期 7 天
          response.cookies.set("github_access_token", providerToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 天
            path: "/",
          });
          console.log("✅ GitHub access token 已保存到 Cookie");
        }

        return response;
      } else {
        console.error("❌ 授权码交换失败:", error.message);
      }
    } catch (error) {
      console.error("❌ OAuth 回调处理异常:", error);
    }
  } else {
    console.log("⚠️ 未收到授权码");
  }

  // return the user to an error page with instructions
  const errorUrl = `${origin}/auth/auth-code-error`;
  console.log("❌ 重定向到错误页面:", errorUrl);
  return NextResponse.redirect(errorUrl);
}
