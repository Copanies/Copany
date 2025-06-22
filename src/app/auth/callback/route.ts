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
        return NextResponse.redirect(redirectUrl);
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
