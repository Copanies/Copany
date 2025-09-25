import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 为了减少额外网络请求的频率，这里做一个轻量节流：
// 当检测到已登录（存在 sb-* Cookie）时，最多每 refreshThrottleSeconds 秒才调用一次 getSession 刷新会话。
const refreshThrottleSeconds = 300; // 增加到5分钟，减少不必要的网络请求
const lastRefreshCookieName = "sb-last-refresh";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 环境变量缺失则直接跳过（不影响其他功能）
  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }

  // 如果根本没有 Supabase 认证相关的 Cookie，则无需刷新
  const hasAuthCookies = req.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") || c.name.startsWith("supabase-auth-"));

  if (!hasAuthCookies) {
    return res;
  }

  // 节流：若距离上次刷新不足阈值，则跳过
  const nowSec = Math.floor(Date.now() / 1000);
  const lastRefreshSec = Number(req.cookies.get(lastRefreshCookieName)?.value || 0);
  if (lastRefreshSec && nowSec - lastRefreshSec < refreshThrottleSeconds) {
    return res;
  }

  // 对于静态资源或API路由，跳过认证检查以提高性能
  if (req.nextUrl.pathname.startsWith('/_next') || 
      req.nextUrl.pathname.startsWith('/api') ||
      req.nextUrl.pathname.includes('.')) {
    return res;
  }

  // 通过 SSR 客户端拉起一次 getSession：
  // - 若会话即将过期/已过期，会触发刷新并回写 Cookie
  // - 若会话健康，不会产生不必要的网络请求
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    // 添加超时机制，避免长时间等待
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    
    await Promise.race([sessionPromise, timeoutPromise]);
  } catch {
    // 不影响页面继续执行，静默跳过
  }

  // 记录本次刷新时间，控制后续一段时间内不重复刷新
  res.cookies.set(lastRefreshCookieName, String(nowSec), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 天（仅作为节流标记）
  });

  return res;
}

// 仅对业务页面生效，排除静态资源与 Next 内部路径，避免无谓开销
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)).*)",
  ],
};

